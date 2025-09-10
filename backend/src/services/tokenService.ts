import { query, encryptToken, decryptToken } from '../helpers.js';
import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { authSystem } from './authSystem.js';
import { AUTH_ERROR_CODES } from '../constants/errorCodes.js';
import { auditService } from './auditService.js';
import { ConnectionType } from '../types/auth.js';
import {
    TokenData,
    ConnectionHandler,
    CompanyTokenDataFromDB,
    TokenStatusResult,
    CompanyConnection,
    OauthClient,
    QboToken,
    XeroToken
} from '../types/token.js';

class TokenService {
  private tokenRefreshPromises: Map<string, Promise<TokenData>>;
  private connectionHandlers: Map<string, ConnectionHandler>;

  constructor() {
    this.tokenRefreshPromises = new Map();
    this.connectionHandlers = new Map();
    this.initializeConnectionHandlers();
  }

  initializeConnectionHandlers(): void {
    const handlers: Record<string, ConnectionHandler> = {
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
        setClientToken: (client, token) => client.setTokenSet(token)
      }
    };

    Object.entries(handlers).forEach(([type, handler]) => {
      this.connectionHandlers.set(type, handler);
    });
  }

  async getValidToken(companyId: string, connectionType: ConnectionType = 'qbo', userId: string | null = null): Promise<TokenData> {
    if (!companyId) throw new Error('Company ID is required');
       
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    const cacheKey = `${companyId}_${connectionType}`;
    if (this.tokenRefreshPromises.has(cacheKey)) {
      return this.tokenRefreshPromises.get(cacheKey)!;
    }

    try {
      const result: CompanyTokenDataFromDB[] = await query(
        `SELECT ${handler.fields.join(', ')} FROM companies WHERE id = $1`,
        [companyId]
      );

      if (!result?.length) {
        throw new AuthenticationError(connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
      }

      let currentToken: TokenData;
      try {
        currentToken = this.constructToken(result[0], connectionType, handler);
      } catch (tokenError: any) {
        if (tokenError instanceof AuthenticationError) throw tokenError;
        throw new AuthenticationError(connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
      }
      if (handler.validate(currentToken)) return currentToken;
      console.log('Refreshing token');
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
            responseStatus: 200,
            ipAddress: '',
            userAgent: ''
          });
        }
        
        await auditService.updateConnectionHealth(companyId, connectionType, 'healthy');
        
        return refreshedToken;
      } finally {
        this.tokenRefreshPromises.delete(cacheKey);
      }

    } catch (error: any) {
      console.error(`Error getting valid token for company ${companyId} (${connectionType}):`, error);
      throw error;
    }
  }

  constructToken(dbRow: CompanyTokenDataFromDB, connectionType: ConnectionType, handler: ConnectionHandler): TokenData {
    const tokenField = handler.tokenField;
    if (!dbRow[tokenField]) {
      throw new AuthenticationError(
        connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED
      );
    }
    try {
      const decryptedData = decryptToken<string>(dbRow[tokenField]!);
      const tokenData = JSON.parse(decryptedData);

      if (connectionType === 'qbo') {
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
          realmId: tokenData.realm_id,
          created_at: tokenData.created_at
        };
      } else { // connectionType === 'xero'
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          tenant_id: tokenData.tenant_id,
          created_at: tokenData.created_at
        };
      }
    } catch (error: any) {
      console.error('Error parsing token data:', error);
      throw new AuthenticationError(
        connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED
      );
    }
  }

  validateQBOToken(token: QboToken): boolean {
    if (!token?.access_token || !token.expires_in || typeof token.created_at !== 'number') {
      return false;
    }
    
    const expiresAt = token.created_at + (token.expires_in * 1000);
    const now = Date.now();
    const buffer = 5 * 60 * 1000;

    return expiresAt > (now + buffer);
  }

  validateXeroToken(token: XeroToken): boolean {
    if (!token?.access_token) return false;
    
    const now = new Date();
    const buffer = 5 * 60 * 1000;
    const expiresAt = token.expires_at * 1000;
    return expiresAt > (now.getTime() + buffer);
  }

  async refreshCompanyToken(companyId: string, currentToken: TokenData, connectionType: ConnectionType): Promise<TokenData> {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    try {
      const refreshedToken = await handler.refresh(currentToken);
      let tokenDataToStore;
      if (connectionType === 'qbo') {
        tokenDataToStore = {
          access_token: refreshedToken.access_token,
          refresh_token: refreshedToken.refresh_token,
          expires_in: refreshedToken.expires_in,
          x_refresh_token_expires_in: refreshedToken.x_refresh_token_expires_in,
          realm_id: refreshedToken.realmId,
          created_at: refreshedToken.createdAt || Date.now()
        };
      } else {
        tokenDataToStore = {
          access_token: refreshedToken.access_token,
          refresh_token: refreshedToken.refresh_token,
          expires_at: refreshedToken.expires_at,
          tenant_id: refreshedToken.tenant_id,
          created_at: Date.now()
        };
      }

      const encryptedTokenData = encryptToken(JSON.stringify(tokenDataToStore));

      const updateField = connectionType === 'qbo' ? 'qbo_token_data' : 'xero_token_data';
      const realmField = connectionType === 'qbo' ? 'qbo_realm_id' : 'xero_tenant_id';
      const realmValue = connectionType === 'qbo' ? (refreshedToken as QboToken).realmId : (refreshedToken as XeroToken).tenant_id;
      
      await query(
        `UPDATE companies SET ${updateField} = $1, ${realmField} = $2 WHERE id = $3 RETURNING *`,
        [encryptedTokenData, realmValue, companyId]
      );

      return refreshedToken;

    } catch (error: any) {
      if (error.message.includes('REFRESH_TOKEN_EXPIRED') || error.message.includes('REAUTH_REQUIRED')) {
        const errorCode = connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED;
        throw new AuthenticationError(errorCode);
      }
      throw new AccessError(`Failed to refresh ${connectionType.toUpperCase()} token: ${error.message}`);
    }
  }

  async getOAuthClient(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<OauthClient> {
    const validToken = await this.getValidToken(companyId, connectionType);
    const handler = this.connectionHandlers.get(connectionType)!;
    const client = handler.initClient();
    handler.setClientToken(client, validToken);
    return client;
  }

  async checkReAuthRequired(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<boolean> {
    try {
      await this.getValidToken(companyId, connectionType);
      return false;
    } catch (error: any) {
      return error.message.includes('REAUTH_REQUIRED') || error.message.includes('REFRESH_TOKEN_EXPIRED');
    }
  }

  async getTokenStatus(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<TokenStatusResult> {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) return { status: 'ERROR', message: `Unsupported connection type: ${connectionType}` };

    try {
      const result: CompanyTokenDataFromDB[] = await query(`SELECT ${handler.tokenField} FROM companies WHERE id = $1`, [companyId]);
      
      if (!result?.length || !result[0][handler.tokenField]) {
        return { status: 'NO_TOKEN', message: `No ${connectionType.toUpperCase()} token found` };
      }

      const currentToken = this.constructToken(result[0], connectionType, handler);
      const isValid = handler.validate(currentToken);
      
      return {
        status: isValid ? 'VALID' : 'EXPIRED',
        message: `Token is ${isValid ? 'valid' : 'expired'}`,
        connectionType,
        realmId: connectionType === 'qbo' ? (currentToken as QboToken).realmId : (currentToken as XeroToken).tenant_id
      };
    } catch (error: any) {
      return { status: 'ERROR', message: error.message };
    }
  }

  async getCompanyConnections(companyId: string): Promise<CompanyConnection[]> {
    try {
      const result: CompanyTokenDataFromDB[] = await query('SELECT connection_type, qbo_token_data, xero_token_data FROM companies WHERE id = $1', [companyId]);
      if (!result?.length) return [];

      const company = result[0];
      const connections: CompanyConnection[] = [];

      if (company.connection_type === 'qbo' && company.qbo_token_data) {
        try {
          const qboToken = this.constructToken({ qbo_token_data: company.qbo_token_data } as any, 'qbo', this.connectionHandlers.get('qbo')!);
          connections.push({
            type: 'qbo',
            realmId: (qboToken as QboToken).realmId,
            status: await this.getTokenStatus(companyId, 'qbo')
          });
        } catch (error: any) {
          console.error('Error parsing QBO token:', error);
        }
      }

      if (company.connection_type === 'xero' && company.xero_token_data) {
        try {
          const xeroToken = this.constructToken({ xero_token_data: company.xero_token_data } as any, 'xero', this.connectionHandlers.get('xero')!);
          connections.push({
            type: 'xero',
            tenantId: (xeroToken as XeroToken).tenant_id,
            status: await this.getTokenStatus(companyId, 'xero')
          });
        } catch (error: any) {
          console.error('Error parsing Xero token:', error);
        }
      }

      return connections;
    } catch (error: any) {
      console.error(`Error getting company connections for ${companyId}:`, error);
      return [];
    }
  }

  async storeTokenData(companyId: string, connectionType: ConnectionType, tokenData: any): Promise<void> {
    try {
      let tokenDataToStore;
      
      if (connectionType === 'qbo') {
        tokenDataToStore = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in || 7776000,
          realm_id: tokenData.realmId,
          created_at: tokenData.createdAt || Date.now()
        };
      } else if (connectionType === 'xero') {
        tokenDataToStore = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          tenant_id: tokenData.tenant_id,
          created_at: tokenData.created_at || Date.now()
        };
      }

      const encryptedTokenData = encryptToken(JSON.stringify(tokenDataToStore));
      const updateField = connectionType === 'qbo' ? 'qbo_token_data' : 'xero_token_data';
      const realmField = connectionType === 'qbo' ? 'qbo_realm_id' : 'xero_tenant_id';
      const realmValue = connectionType === 'qbo' ? tokenData.realmId : tokenData.tenant_id;
      
      await query(
        `UPDATE companies SET ${updateField} = $1, connection_type = $2, ${realmField} = $3 WHERE id = $4 RETURNING *`,
        [encryptedTokenData, connectionType, realmValue, companyId]
      );

      console.log(`Successfully stored ${connectionType.toUpperCase()} token data for company ${companyId}`);
    } catch (error: any) {
      console.error(`Error storing ${connectionType} token data:`, error);
      throw new Error(`Failed to store ${connectionType.toUpperCase()} token data: ${error.message}`);
    }
  }
}

export const tokenService = new TokenService();
export default tokenService;