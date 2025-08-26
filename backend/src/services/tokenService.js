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
        fields: ['qb_token', 'qb_refresh_token', 'qb_token_expires_at', 'qb_realm_id'],
        tokenField: 'qb_token',
        realmField: 'qb_realm_id',
        validate: this.validateQBOToken.bind(this),
        refresh: authSystem.refreshQBOToken.bind(authSystem),
        initClient: () => authSystem.initializeQBO(),
        setClientToken: (client, token) => client.setToken(token)
      },
      xero: {
        fields: ['xero_token', 'xero_refresh_token', 'xero_token_expires_at', 'xero_tenant_id'],
        tokenField: 'xero_token',
        tenantIdField: 'xero_tenant_id',
        validate: this.validateXeroToken.bind(this),
        refresh: authSystem.refreshXeroToken.bind(authSystem),
        initClient: () => authSystem.initializeXero(),
        setClientToken: (client, token) => client.setToken(token)
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

    if (connectionType === 'xero' && !dbRow.xero_refresh_token) {
      throw new AuthenticationError(AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
    }

    const accessToken = decryptToken(dbRow[handler.tokenField]);
    const refreshToken = decryptToken(dbRow[connectionType === 'qbo' ? 'qb_refresh_token' : 'xero_refresh_token']);
    
    let connectionTokenInfo = {};

    if (connectionType === 'qbo') {
      // **QBO requires a duration in seconds (`expires_in`)**
      const expirationTime = new Date(dbRow.qb_token_expires_at).getTime();
      const expiresInSeconds = Math.floor((expirationTime - Date.now()) / 1000);

      connectionTokenInfo = {
        expires_in: expiresInSeconds > 0 ? expiresInSeconds : 0,
        realmId: dbRow.qb_realm_id
      };
    } else if (connectionType === 'xero') {
      // **Xero requires a UNIX timestamp in seconds (`expires_at`)**
      const expirationTime = new Date(dbRow.xero_token_expires_at).getTime();
      const expiresAtSeconds = Math.floor(expirationTime / 1000);

      connectionTokenInfo = {
        expires_at: expiresAtSeconds,
        tenant_id: dbRow.xero_tenant_id
      };
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      ...connectionTokenInfo
    };
}

  validateQBOToken(token) {
    if (!token?.access_token || !token.expires_at) {
      return false;
  }
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    return new Date(token.expires_at) > new Date(now.getTime() + buffer);
  }

  validateXeroToken(token) {
    if (!token?.access_token) return false;
    
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    return token.expires_at && new Date(token.expires_at) > new Date(now.getTime() + buffer);
  }

  async refreshCompanyToken(companyId, currentToken, connectionType) {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    try {
      const refreshedToken = await handler.refresh(currentToken);
      const encryptedAccessToken = await encryptToken(refreshedToken.access_token);
      const encryptedRefreshToken = await encryptToken(refreshedToken.refresh_token);

      let expiresAt;
      if (connectionType === 'qbo') {
        const now = new Date();
        expiresAt = new Date(now.getTime() + (refreshedToken.expires_in * 1000));
      } else {
        expiresAt = new Date(refreshedToken.expires_at * 1000);
      }

      const updateFields = connectionType === 'qbo' ? {
        qb_token: encryptedAccessToken,
        qb_refresh_token: encryptedRefreshToken,
        qb_token_expires_at: expiresAt
      } : {
        xero_token: encryptedAccessToken,
        xero_refresh_token: encryptedRefreshToken,
        xero_token_expires_at: expiresAt
      };

      const setClause = Object.keys(updateFields).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [companyId, ...Object.values(updateFields)];

      await query(`UPDATE companies SET ${setClause} WHERE id = $1 RETURNING *`, values);

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
      const result = await query(`SELECT ${handler.tokenField}, ${handler.realmField} FROM companies WHERE id = $1`, [companyId]);
      
      if (!result?.length || !result[0][handler.tokenField]) {
        return { status: 'NO_TOKEN', message: `No ${connectionType.toUpperCase()} token found` };
      }

      const currentToken = decryptToken(result[0][handler.tokenField]);
      const isValid = handler.validate(currentToken);
      
      return {
        status: isValid ? 'VALID' : 'EXPIRED',
        message: `Token is ${isValid ? 'valid' : 'expired'}`,
        connectionType,
        realmId: result[0][handler.realmField]
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async getCompanyConnections(companyId) {
    try {
      const result = await query('SELECT connection_type, qb_realm_id, xero_tenant_id FROM companies WHERE id = $1', [companyId]);
      if (!result?.length) return [];

      const company = result[0];
      const connections = [];

      if (company.connection_type === 'qbo' && company.qb_realm_id) {
        connections.push({
          type: 'qbo',
          realmId: company.qb_realm_id,
          status: await this.getTokenStatus(companyId, 'qbo')
        });
      }

      if (company.connection_type === 'xero' && company.xero_tenant_id) {
        connections.push({
          type: 'xero',
          tenantId: company.xero_tenant_id,
          status: await this.getTokenStatus(companyId, 'xero')
        });
      }

      return connections;
    } catch (error) {
      console.error(`Error getting company connections for ${companyId}:`, error);
      return [];
    }
  }
}

export const tokenService = new TokenService();
export default tokenService;
