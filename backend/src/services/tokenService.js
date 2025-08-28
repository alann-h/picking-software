import { query, encryptToken, decryptToken } from '../helpers.js';
import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { authSystem } from './authSystem.js';
import { AUTH_ERROR_CODES } from '../constants/errorCodes.js';
import { permissionService } from './permissionService.js';
import { auditService } from './auditService.js';

class TokenService {
  constructor() {
    this.tokenRefreshPromises = new Map();
    this.connectionHandlers = new Map();
    this.initializeConnectionHandlers();
  }

  initializeConnectionHandlers() {
    const handlers = {
      qbo: {
        fields: ['qbo_token_data', 'connection_type', 'qbo_realm_id'],
        tokenField: 'qbo_token_data',
        validate: this.validateQBOToken.bind(this),
        refresh: authSystem.refreshQBOToken.bind(authSystem),
        initClient: () => authSystem.initializeQBO(),
        setClientToken: (client, token) => client.setToken(token)
      },
      xero: {
        fields: ['xero_token_data', 'connection_type', 'xero_tenant_id'],
        tokenField: 'xero_token_data',
        validate: this.validateXeroToken.bind(this),
        refresh: authSystem.refreshXeroToken.bind(authSystem),
        initClient: () => authSystem.initializeXero(),
        setClientToken: (client, token) => client.setClientToken(token)
      }
    };

    Object.entries(handlers).forEach(([type, handler]) => {
      this.connectionHandlers.set(type, handler);
    });
  }

  async getValidToken(companyId, connectionType = 'qbo', userId = null) {
    if (!companyId) throw new Error('Company ID is required');
    
    // Check user permissions if userId is provided
    if (userId) {
      const permission = await permissionService.checkUserPermission(userId, companyId, connectionType, 'read');
      if (!permission.hasAccess) {
        throw new AccessError(`User does not have permission to access ${connectionType.toUpperCase()}`);
      }
    }
    
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    const cacheKey = `${companyId}_${connectionType}`;
    if (this.tokenRefreshPromises.has(cacheKey)) {
      return await this.tokenRefreshPromises.get(cacheKey);
    }

    try {
      const result = await query(
        `SELECT ${handler.fields.join(', ')} FROM companies WHERE id = $1`,
        [companyId]
      );

      if (!result?.length) {
        throw new AuthenticationError(connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
      }

      let currentToken;
      try {
        currentToken = this.constructToken(result[0], connectionType, handler);
      } catch (tokenError) {
        if (tokenError instanceof AuthenticationError) throw tokenError;
        throw new AuthenticationError(connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
      }
      
      if (handler.validate(currentToken)) return currentToken;

      const refreshPromise = this.refreshCompanyToken(companyId, currentToken, connectionType);
      this.tokenRefreshPromises.set(cacheKey, refreshPromise);

      try {
        const refreshedToken = await refreshPromise;
        
        if (userId) {
          await auditService.logApiCall({
            userId,
            companyId,
            apiEndpoint: 'token_refresh_automatic',
            connectionType,
            requestMethod: 'POST',
            responseStatus: 200
          });
        }
        
        // Update connection health
        await auditService.updateConnectionHealth(companyId, connectionType, 'healthy');
        
        return refreshedToken;
      } finally {
        this.tokenRefreshPromises.delete(cacheKey);
      }

    } catch (error) {
      console.error(`Error getting valid token for company ${companyId} (${connectionType}):`, error);
      throw error;
    }
  }

  constructToken(dbRow, connectionType, handler) {
    if (!dbRow[handler.tokenField]) {
      throw new AuthenticationError(
        connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED
      );
    }

    try {
      // Decrypt and parse the consolidated token data
      const decryptedData = decryptToken(dbRow[handler.tokenField]);
      const tokenData = JSON.parse(decryptedData);

      if (connectionType === 'qbo') {
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
          realmId: tokenData.realm_id
        };
      } else if (connectionType === 'xero') {
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          tenant_id: tokenData.tenant_id
        };
      }
    } catch (error) {
      console.error('Error parsing token data:', error);
      throw new AuthenticationError(
        connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED
      );
    }
  }

  validateQBOToken(token) {
    if (!token?.access_token || !token.expires_in) {
      return false;
    }
    // expires_in is seconds until expiry, so check if it's greater than 5 minutes (300 seconds)
    const buffer = 5 * 60; // 5 minutes in seconds
    return token.expires_in > buffer;
  }

  validateXeroToken(token) {
    if (!token?.access_token) return false;
    
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    return token.expires_at && new Date(token.expires_at * 1000) > new Date(now.getTime() + buffer);
  }

  async refreshCompanyToken(companyId, currentToken, connectionType) {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    try {
      const refreshedToken = await handler.refresh(currentToken);
      
      // Prepare the consolidated token data
      let tokenDataToStore;
      if (connectionType === 'qbo') {
        tokenDataToStore = {
          access_token: refreshedToken.access_token,
          refresh_token: refreshedToken.refresh_token,
          expires_in: refreshedToken.expires_in,
          x_refresh_token_expires_in: refreshedToken.x_refresh_token_expires_in,
          realm_id: refreshedToken.realmId,
          created_at: new Date().toISOString()
        };
      } else {
        tokenDataToStore = {
          access_token: refreshedToken.access_token,
          refresh_token: refreshedToken.refresh_token,
          expires_at: refreshedToken.expires_at,
          tenant_id: refreshedToken.tenant_id,
          created_at: new Date().toISOString()
        };
      }

      // Encrypt the consolidated data
      const encryptedTokenData = await encryptToken(JSON.stringify(tokenDataToStore));

      // Update the database
      const updateField = connectionType === 'qbo' ? 'qbo_token_data' : 'xero_token_data';
      const realmField = connectionType === 'qbo' ? 'qbo_realm_id' : 'xero_tenant_id';
      const realmValue = connectionType === 'qbo' ? refreshedToken.realmId : refreshedToken.tenant_id;
      
      await query(
        `UPDATE companies SET ${updateField} = $1, ${realmField} = $2 WHERE id = $3 RETURNING *`,
        [encryptedTokenData, realmValue, companyId]
      );

      return refreshedToken;

    } catch (error) {
      if (error.message.includes('REFRESH_TOKEN_EXPIRED') || error.message.includes('REAUTH_REQUIRED')) {
        const errorCode = connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED;
        throw new AuthenticationError(errorCode);
      }
      throw new AccessError(`Failed to refresh ${connectionType.toUpperCase()} token: ${error.message}`);
    }
  }

  async getOAuthClient(companyId, connectionType = 'qbo') {
    const validToken = await this.getValidToken(companyId, connectionType);
    const handler = this.connectionHandlers.get(connectionType);
    const client = handler.initClient();
    handler.setClientToken(client, validToken);
    return client;
  }

  async checkReAuthRequired(companyId, connectionType = 'qbo') {
    try {
      await this.getValidToken(companyId, connectionType);
      return false;
    } catch (error) {
      return error.message.includes('REAUTH_REQUIRED') || error.message.includes('REFRESH_TOKEN_EXPIRED');
    }
  }

  /**
   * Gets a fully authenticated node-quickbooks client for data operations.
   * @param {string} companyId - The ID of the company.
   * @param {string} [userId=null] - Optional user ID for permission checks.
   * @returns {Promise<QuickBooks>} An initialized node-quickbooks client instance.
   */
  async getQBODataClient(companyId, userId = null) {
    const validToken = await this.getValidToken(companyId, 'qbo', userId);
    const qboClient = authSystem.createQBOClient(validToken);
    
    return qboClient;
  }

  async getTokenStatus(companyId, connectionType = 'qbo') {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) return { status: 'ERROR', message: `Unsupported connection type: ${connectionType}` };

    try {
      const result = await query(`SELECT ${handler.tokenField} FROM companies WHERE id = $1`, [companyId]);
      
      if (!result?.length || !result[0][handler.tokenField]) {
        return { status: 'NO_TOKEN', message: `No ${connectionType.toUpperCase()} token found` };
      }

      const currentToken = this.constructToken(result[0], connectionType, handler);
      const isValid = handler.validate(currentToken);
      
      return {
        status: isValid ? 'VALID' : 'EXPIRED',
        message: `Token is ${isValid ? 'valid' : 'expired'}`,
        connectionType,
        realmId: connectionType === 'qbo' ? currentToken.realmId : currentToken.tenant_id
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async getCompanyConnections(companyId) {
    try {
      const result = await query('SELECT connection_type, qbo_token_data, xero_token_data FROM companies WHERE id = $1', [companyId]);
      if (!result?.length) return [];

      const company = result[0];
      const connections = [];

      if (company.connection_type === 'qbo' && company.qbo_token_data) {
        try {
          const qboToken = this.constructToken({ qbo_token_data: company.qbo_token_data }, 'qbo', this.connectionHandlers.get('qbo'));
          connections.push({
            type: 'qbo',
            realmId: qboToken.realmId,
            status: await this.getTokenStatus(companyId, 'qbo')
          });
        } catch (error) {
          console.error('Error parsing QBO token:', error);
        }
      }

      if (company.connection_type === 'xero' && company.xero_token_data) {
        try {
          const xeroToken = this.constructToken({ xero_token_data: company.xero_token_data }, 'xero', this.connectionHandlers.get('xero'));
          connections.push({
            type: 'xero',
            tenantId: xeroToken.tenant_id,
            status: await this.getTokenStatus(companyId, 'xero')
          });
        } catch (error) {
          console.error('Error parsing Xero token:', error);
        }
      }

      return connections;
    } catch (error) {
      console.error(`Error getting company connections for ${companyId}:`, error);
      return [];
    }
  }

  /**
   * Store new token data in consolidated format
   * @param {string} companyId - Company ID
   * @param {string} connectionType - 'qbo' or 'xero'
   * @param {Object} tokenData - Token data from OAuth callback
   */
  async storeTokenData(companyId, connectionType, tokenData) {
    try {
      let tokenDataToStore;
      
      if (connectionType === 'qbo') {
        tokenDataToStore = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in || 7776000,
          realm_id: tokenData.realmId,
          created_at: new Date().toISOString()
        };
      } else if (connectionType === 'xero') {
        tokenDataToStore = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          tenant_id: tokenData.tenant_id,
          created_at: new Date().toISOString()
        };
      }

      const encryptedTokenData = await encryptToken(JSON.stringify(tokenDataToStore));
      const updateField = connectionType === 'qbo' ? 'qbo_token_data' : 'xero_token_data';
      const realmField = connectionType === 'qbo' ? 'qbo_realm_id' : 'xero_tenant_id';
      const realmValue = connectionType === 'qbo' ? tokenData.realmId : tokenData.tenant_id;
      
      await query(
        `UPDATE companies SET ${updateField} = $1, connection_type = $2, ${realmField} = $3 WHERE id = $4 RETURNING *`,
        [encryptedTokenData, connectionType, realmValue, companyId]
      );

      console.log(`Successfully stored ${connectionType.toUpperCase()} token data for company ${companyId}`);
    } catch (error) {
      console.error(`Error storing ${connectionType} token data:`, error);
      throw new Error(`Failed to store ${connectionType.toUpperCase()} token data: ${error.message}`);
    }
  }
}

export const tokenService = new TokenService();
export default tokenService;
