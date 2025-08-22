import { query, encryptToken, decryptToken } from '../helpers.js';
import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { authSystem } from './authSystem.js';

/**
 * Generic Token Management Service
 * Handles token sharing, refresh, and expiration for multiple accounting software connections
 * Supports QBO, Xero, and is extensible for future connections (MYOB, etc.)
 */

class TokenService {
  constructor() {
    this.tokenRefreshPromises = new Map(); // Prevent multiple simultaneous refreshes
    this.connectionHandlers = new Map();
    this.initializeConnectionHandlers();
  }

  /**
   * Initialize handlers for different connection types
   * This makes the system extensible for future accounting software
   */
  initializeConnectionHandlers() {
    // QBO Handler
    this.connectionHandlers.set('qbo', {
      getTokenField: 'qb_token',
      getRealmField: 'qb_realm_id',
      getToken: (company) => company.qb_token,
      setToken: (company) => ({ 
        qb_token: company.accessToken, 
        qb_refresh_token: company.refreshToken,
        qb_token_expires_at: company.expiresAt
      }),
      getRealmId: (company) => company.qb_realm_id,
      validateToken: (token) => this.validateQBOToken(token),
      refreshToken: (token) => authSystem.refreshQBOToken(token),
      getUserInfo: (token) => authSystem.getQBOUserInfo(token),
      revokeToken: (token) => authSystem.revokeQBOToken(token),
      getBaseURL: (client) => authSystem.getQBOBaseURL(client),
      getRealmId: (client) => authSystem.getQBORealmId(client)
    });

    // Xero Handler
    this.connectionHandlers.set('xero', {
      getTokenField: 'xero_token',
      getRealmField: 'xero_tenant_id',
      getToken: (company) => company.xero_token,
      setToken: (company) => ({ 
        xero_token: company.token,
        xero_refresh_token: company.refreshToken,
        xero_token_expires_at: company.expiresAt
      }),
      getRealmId: (company) => company.xero_tenant_id,
      validateToken: (token) => this.validateXeroToken(token),
      refreshToken: (token) => authSystem.refreshXeroToken(token),
      getUserInfo: (token) => authSystem.getXeroUserInfo(token),
      revokeToken: (token) => authSystem.revokeXeroToken(token),
      getBaseURL: () => 'https://api.xero.com',
      getRealmId: (client) => client.tenantId || null
    });
  }

  /**
   * Get valid token for a company with automatic refresh
   * Uses promise caching to prevent multiple simultaneous refreshes
   */
  async getValidToken(companyId, connectionType = 'qbo') {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) {
      throw new Error(`Unsupported connection type: ${connectionType}`);
    }

    try {
      // Check if we're already refreshing this company's token
      const cacheKey = `${companyId}_${connectionType}`;
      if (this.tokenRefreshPromises.has(cacheKey)) {
        console.log(`Token refresh already in progress for company ${companyId} (${connectionType}), waiting...`);
        return await this.tokenRefreshPromises.get(cacheKey);
      }

      // Get current token from database
      let result;
      if (connectionType === 'qbo') {
        result = await query(
          `SELECT qb_token, qb_refresh_token, qb_token_expires_at, qb_realm_id FROM companies WHERE id = $1`,
          [companyId]
        );
      } else if (connectionType === 'xero') {
        result = await query(
          `SELECT xero_token, xero_refresh_token, xero_token_expires_at, xero_tenant_id FROM companies WHERE id = $1`,
          [companyId]
        );
      } else {
        result = await query(
          `SELECT ${handler.getTokenField}, ${handler.getRealmField} FROM companies WHERE id = $1`,
          [companyId]
        );
      }
      
      if (!result || result.length === 0) {
        throw new AuthenticationError(`${connectionType.toUpperCase()}_REAUTH_REQUIRED`);
      }

              let currentToken;
        if (connectionType === 'qbo') {
          // For QBO, construct token object from separate fields
          if (!result[0].qb_token || !result[0].qb_refresh_token) {
            throw new AuthenticationError('QBO_REAUTH_REQUIRED');
          }
          
          const decryptedAccessToken = decryptToken(result[0].qb_token);
          const decryptedRefreshToken = decryptToken(result[0].qb_refresh_token);
          
          currentToken = {
            access_token: decryptedAccessToken,
            refresh_token: decryptedRefreshToken,
            access_token_expires_at: result[0].qb_token_expires_at ? 
              Math.floor(new Date(result[0].qb_token_expires_at).getTime() / 1000) : null,
            realmId: result[0].qb_realm_id
          };
        } else if (connectionType === 'xero') {
          // For Xero, construct token object from separate fields
          if (!result[0].xero_token || !result[0].xero_refresh_token) {
            throw new AuthenticationError('XERO_REAUTH_REQUIRED');
          }
          
          const decryptedAccessToken = decryptToken(result[0].xero_token);
          const decryptedRefreshToken = decryptToken(result[0].xero_refresh_token);
          
          currentToken = {
            access_token: decryptedAccessToken,
            refresh_token: decryptedRefreshToken,
            expires_at: result[0].xero_token_expires_at ? 
              Math.floor(new Date(result[0].xero_token_expires_at).getTime() / 1000) : null,
            tenant_id: result[0].xero_tenant_id
          };
        } else {
          // For other platforms, decrypt the main token field
          if (!result[0][handler.getTokenField]) {
            throw new AuthenticationError(`${connectionType.toUpperCase()}_REAUTH_REQUIRED`);
          }
          const encryptedToken = result[0][handler.getTokenField];
          currentToken = decryptToken(encryptedToken);
        }

      // Check if token is still valid
      if (handler.validateToken(currentToken)) {
        console.log(`Token for company ${companyId} (${connectionType}) is still valid`);
        return currentToken;
      }

      // Token needs refresh, start refresh process
      console.log(`Token for company ${companyId} (${connectionType}) needs refresh, starting refresh process...`);
      const refreshPromise = this.refreshCompanyToken(companyId, currentToken, connectionType);
      this.tokenRefreshPromises.set(cacheKey, refreshPromise);

      try {
        const refreshedToken = await refreshPromise;
        return refreshedToken;
      } finally {
        // Clean up the promise cache
        this.tokenRefreshPromises.delete(cacheKey);
      }

    } catch (error) {
      console.error(`Error getting valid token for company ${companyId} (${connectionType}):`, error);
      throw error;
    }
  }

  /**
   * Validate QBO token
   */
  validateQBOToken(token) {
    if (!token || !token.access_token) {
      return false;
    }

    // Check if access token is still valid (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = token.access_token_expires_at;
    const buffer = 5 * 60; // 5 minutes

    return expiresAt && (expiresAt - buffer) > now;
  }

  /**
   * Validate Xero token
   */
  validateXeroToken(token) {
    if (!token || !token.access_token) {
      return false;
    }

    // Check if access token is still valid (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = token.expires_at;
    const buffer = 5 * 60; // 5 minutes

    return expiresAt && (expiresAt - buffer) > now;
  }

  /**
   * Refresh a company's token for a specific connection type
   */
  async refreshCompanyToken(companyId, currentToken, connectionType) {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) {
      throw new Error(`Unsupported connection type: ${connectionType}`);
    }

    try {
      // Attempt to refresh the token using the appropriate handler
      const refreshedToken = await handler.refreshToken(currentToken);

      console.log(`Successfully refreshed token for company ${companyId} (${connectionType})`);

      // Save the new token to the database
      const encryptedToken = encryptToken(refreshedToken);
      const updateData = handler.setToken({ token: encryptedToken });
      
      const setClause = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [companyId, ...Object.values(updateData)];
      
      await query(
        `UPDATE companies SET ${setClause} WHERE id = $1`,
        values
      );

      return refreshedToken;

    } catch (error) {
      console.error(`Failed to refresh token for company ${companyId} (${connectionType}):`, error);
      
      if (error.message.includes('REFRESH_TOKEN_EXPIRED') || error.message.includes('REAUTH_REQUIRED')) {
        throw new AuthenticationError(`${connectionType.toUpperCase()}_REAUTH_REQUIRED`);
      }
      
      throw new AccessError(`Failed to refresh ${connectionType.toUpperCase()} token: ${error.message}`);
    }
  }

  /**
   * Get OAuth client with valid token for a company
   */
  async getOAuthClient(companyId, connectionType = 'qbo') {
    const validToken = await this.getValidToken(companyId, connectionType);
    
    if (connectionType === 'qbo') {
      const oauthClient = authSystem.initializeQBO();
      oauthClient.setToken(validToken);
      return oauthClient;
    } else if (connectionType === 'xero') {
      const xeroClient = authSystem.initializeXero();
      xeroClient.setTokenSet({
        access_token: validToken.access_token,
        refresh_token: validToken.refresh_token,
        expires_at: validToken.expires_at
      });
      return xeroClient;
    }
    
    throw new Error(`Unsupported connection type: ${connectionType}`);
  }

  /**
   * Check if a company needs re-authentication for a specific connection type
   */
  async checkReAuthRequired(companyId, connectionType = 'qbo') {
    try {
      await this.getValidToken(companyId, connectionType);
      return false;
    } catch (error) {
      return error.message.includes('REAUTH_REQUIRED') || 
             error.message.includes('REFRESH_TOKEN_EXPIRED');
    }
  }

  /**
   * Get token status for debugging
   */
  async getTokenStatus(companyId, connectionType = 'qbo') {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) {
      return { status: 'ERROR', message: `Unsupported connection type: ${connectionType}` };
    }

    try {
      const result = await query(
        `SELECT ${handler.getTokenField}, ${handler.getRealmField} FROM companies WHERE id = $1`,
        [companyId]
      );
      
      if (!result || result.length === 0 || !result[0][handler.getTokenField]) {
        return { status: 'NO_TOKEN', message: `No ${connectionType.toUpperCase()} token found` };
      }

      const currentToken = decryptToken(result[0][handler.getTokenField]);
      const isValid = handler.validateToken(currentToken);
      
      return {
        status: isValid ? 'VALID' : 'EXPIRED',
        message: `Token is ${isValid ? 'valid' : 'expired'}`,
        connectionType,
        realmId: result[0][handler.getRealmField],
        expiresAt: currentToken.expires_at || currentToken.access_token_expires_at,
        refreshTokenValid: this.isRefreshTokenValid(currentToken, connectionType)
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  /**
   * Check if refresh token is valid
   */
  isRefreshTokenValid(token, connectionType) {
    if (connectionType === 'qbo') {
      return token.refresh_token_expires_at > Math.floor(Date.now() / 1000);
    } else if (connectionType === 'xero') {
      // Xero refresh tokens don't expire unless revoked
      return !!token.refresh_token;
    }
    return false;
  }

  /**
   * Get all connection types for a company
   */
  async getCompanyConnections(companyId) {
    try {
      const result = await query(
        'SELECT connection_type, qb_realm_id, xero_tenant_id FROM companies WHERE id = $1',
        [companyId]
      );
      
      if (!result || result.length === 0) {
        return [];
      }

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

  /**
   * Add a new connection type handler (for future extensibility)
   */
  addConnectionHandler(connectionType, handler) {
    if (this.connectionHandlers.has(connectionType)) {
      console.warn(`Connection handler for ${connectionType} already exists, overwriting...`);
    }
    
    this.connectionHandlers.set(connectionType, handler);
    console.log(`Added connection handler for ${connectionType}`);
  }

  /**
   * Remove a connection type handler
   */
  removeConnectionHandler(connectionType) {
    if (this.connectionHandlers.has(connectionType)) {
      this.connectionHandlers.delete(connectionType);
      console.log(`Removed connection handler for ${connectionType}`);
    }
  }

  /**
   * Get list of supported connection types
   */
  getSupportedConnectionTypes() {
    return Array.from(this.connectionHandlers.keys());
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default tokenService;
