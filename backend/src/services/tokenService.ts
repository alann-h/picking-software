import { encryptToken, decryptToken } from '../helpers.js';
import { prisma } from '../lib/prisma.js';
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
  private oauthClients: Map<string, OauthClient>;

  constructor() {
    this.tokenRefreshPromises = new Map();
    this.connectionHandlers = new Map();
    this.oauthClients = new Map();
    this.initializeConnectionHandlers();
  }

  clearCachedClient(companyId: string, connectionType: ConnectionType): void {
    const cacheKey = `${companyId}_${connectionType}`;
    if (this.oauthClients.has(cacheKey)) {
      this.oauthClients.delete(cacheKey);
      console.log(`Cleared cached OAuth client for company ${companyId} (${connectionType})`);
    }
  }

  initializeConnectionHandlers(): void {
    const handlers: Record<string, ConnectionHandler> = {
      qbo: {
        fields: ['qboTokenData', 'connectionType', 'qboRealmId'],
        tokenField: 'qboTokenData',
        validate: this.validateQBOToken.bind(this),
        refresh: authSystem.refreshQBOToken.bind(authSystem),
        initClient: () => authSystem.initializeQBO(),
        setClientToken: (client, token) => client.setToken(token)
      },
      xero: {
        fields: ['xeroTokenData', 'connectionType', 'xeroTenantId'],
        tokenField: 'xeroTokenData',
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
      const result = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          qboTokenData: handler.fields.includes('qboTokenData'),
          xeroTokenData: handler.fields.includes('xeroTokenData'),
          connectionType: handler.fields.includes('connectionType'),
          qboRealmId: handler.fields.includes('qboRealmId'),
          xeroTenantId: handler.fields.includes('xeroTenantId'),
        },
      });
      if (!result) {
        throw new AuthenticationError(connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
      }

      let currentToken: TokenData;
      try {
        currentToken = this.constructToken({
          connectionType: result.connectionType,
          qboTokenData: result.qboTokenData,
          xeroTokenData: result.xeroTokenData,
          qboRealmId: result.qboRealmId,
          xeroTenantId: result.xeroTenantId,
        } as CompanyTokenDataFromDB, connectionType, handler);
      } catch (tokenError: unknown) {
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

    } catch (error: unknown) {
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
          realmId: handler.fields.includes('qboRealmId') ? dbRow.qboRealmId : tokenData.realm_id,
          created_at: tokenData.created_at
        };
      } else { // connectionType === 'xero'
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          tenant_id: handler.fields.includes('xeroTenantId') ? dbRow.xeroTenantId : tokenData.tenant_id,
          created_at: tokenData.created_at
        };
      }
    } catch (error: unknown) {
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

  private async refreshWithBackoff(companyId: string, currentToken: TokenData, connectionType: ConnectionType, attempt = 1): Promise<TokenData> {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    try {
      this.clearCachedClient(companyId, connectionType);
      const refreshedToken = await handler.refresh(currentToken);
      
      // If successful, log the attempt count for monitoring
      if (attempt > 1) {
        console.log(`✅ Token refresh succeeded on attempt ${attempt} for company ${companyId} (${connectionType})`);
      }
      
      return refreshedToken;
    } catch (error: unknown) {
      // Check if we should retry
      if (attempt < 3 && this.isRetryableError(error)) {
        const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Token refresh attempt ${attempt} failed for company ${companyId} (${connectionType}), retrying in ${delayMs}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.refreshWithBackoff(companyId, currentToken, connectionType, attempt + 1);
      }
      
      // Log final failure
      console.error(`❌ Token refresh failed after ${attempt} attempts for company ${companyId} (${connectionType}):`, error);
      throw error;
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    
    // Don't retry authentication errors (need re-auth)
    if (message.includes('refresh_token_expired') || 
        message.includes('reauth_required') ||
        message.includes('invalid_grant') ||
        message.includes('token_revoked')) {
      return false;
    }
    
    // Retry network/temporary errors
    return message.includes('timeout') ||
           message.includes('network') ||
           message.includes('econnreset') ||
           message.includes('enotfound') ||
           message.includes('rate limit') ||
           message.includes('too many requests') ||
           message.includes('service unavailable') ||
           message.includes('internal server error');
  }

  async refreshCompanyToken(companyId: string, currentToken: TokenData, connectionType: ConnectionType): Promise<TokenData> {
    // Use the new backoff method
    const refreshedToken = await this.refreshWithBackoff(companyId, currentToken, connectionType);
    let tokenDataToStore;
    if (connectionType === 'qbo') {
      const qboToken = refreshedToken as QboToken;
      tokenDataToStore = {
        access_token: qboToken.access_token,
        refresh_token: qboToken.refresh_token,
        expires_in: qboToken.expires_in,
        x_refresh_token_expires_in: qboToken.x_refresh_token_expires_in,
        realm_id: qboToken.realmId,
        created_at: qboToken.created_at || Date.now()
      };
    } else {
      const xeroToken = refreshedToken as XeroToken;
      tokenDataToStore = {
        access_token: xeroToken.access_token,
        refresh_token: xeroToken.refresh_token,
        expires_at: xeroToken.expires_at,
        tenant_id: xeroToken.tenant_id,
        created_at: Date.now()
      };
    }

    const encryptedTokenData = encryptToken(JSON.stringify(tokenDataToStore));

    const updateField = connectionType === 'qbo' ? 'qboTokenData' : 'xeroTokenData';
    const realmField = connectionType === 'qbo' ? 'qboRealmId' : 'xeroTenantId';
    const realmValue = connectionType === 'qbo' ? (refreshedToken as QboToken).realmId : (refreshedToken as XeroToken).tenant_id;
    
    const updateData: any = {
      [ updateField ]: encryptedTokenData,
    };

    // Only update realm field if we have a valid value, to prevent clearing existing realm data
    if (realmValue) {
      updateData[realmField] = realmValue;
    }
    
    await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    return refreshedToken;
  }

  async getOAuthClient(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<OauthClient> {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    // Always get a valid token first (this will refresh if needed)
    const validToken = await this.getValidToken(companyId, connectionType);
    
    const cacheKey = `${companyId}_${connectionType}`;
    
    // If we have a cached client, update its token and return it
    if (this.oauthClients.has(cacheKey)) {
      const cachedClient = this.oauthClients.get(cacheKey)!;
      handler.setClientToken(cachedClient, validToken);
      return cachedClient;
    }

    // Otherwise create a new client
    const client = handler.initClient();
    handler.setClientToken(client, validToken);

    this.oauthClients.set(cacheKey, client);
    return client;
  }

  async checkReAuthRequired(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<boolean> {
    try {
      await this.getValidToken(companyId, connectionType);
      return false;
    } catch (error: unknown) {
      return error instanceof Error && (error.message.includes('REAUTH_REQUIRED') || error.message.includes('REFRESH_TOKEN_EXPIRED'));
    }
  }

  async getTokenStatus(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<TokenStatusResult> {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) return { status: 'ERROR', message: `Unsupported connection type: ${connectionType}` };

    try {
      const result = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          connectionType: true,
          qboTokenData: handler.tokenField === 'qboTokenData',
          xeroTokenData: handler.tokenField === 'xeroTokenData',
        },
      });
      
      if (!result || !result[handler.tokenField as keyof typeof result]) {
        return { status: 'NO_TOKEN', message: `No ${connectionType.toUpperCase()} token found` };
      }

      const currentToken = this.constructToken({
        connectionType: result.connectionType,
        qboTokenData: result.qboTokenData,
        xeroTokenData: result.xeroTokenData,
      } as CompanyTokenDataFromDB, connectionType, handler);
      const isValid = handler.validate(currentToken);
      
      return {
        status: isValid ? 'VALID' : 'EXPIRED',
        message: `Token is ${isValid ? 'valid' : 'expired'}`,
        connectionType,
        realmId: connectionType === 'qbo' ? (currentToken as QboToken).realmId : (currentToken as XeroToken).tenant_id
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { status: 'ERROR', message: error.message };
      }
      return { status: 'ERROR', message: 'An unknown error occurred while checking token status.' };
    }
  }

  async getCompanyConnections(companyId: string): Promise<CompanyConnection[]> {
    try {
      const result = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          connectionType: true,
          qboTokenData: true,
          xeroTokenData: true,
        },
      });
      if (!result) return [];

      const connections: CompanyConnection[] = [];

      if (result.connectionType === 'qbo' && result.qboTokenData) {
        try {
          const qboToken = this.constructToken({ qboTokenData: result.qboTokenData } as CompanyTokenDataFromDB, 'qbo', this.connectionHandlers.get('qbo')!);
          connections.push({
            type: 'qbo',
            realmId: (qboToken as QboToken).realmId,
            status: await this.getTokenStatus(companyId, 'qbo')
          });
        } catch (error: unknown) {
          console.error('Error parsing QBO token:', error);
        }
      }

      if (result.connectionType === 'xero' && result.xeroTokenData) {
        try {
          const xeroToken = this.constructToken({ xeroTokenData: result.xeroTokenData } as CompanyTokenDataFromDB, 'xero', this.connectionHandlers.get('xero')!);
          connections.push({
            type: 'xero',
            tenantId: (xeroToken as XeroToken).tenant_id,
            status: await this.getTokenStatus(companyId, 'xero')
          });
        } catch (error: unknown) {
          console.error('Error parsing Xero token:', error);
        }
      }

      return connections;
    } catch (error: unknown) {
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
      const updateField = connectionType === 'qbo' ? 'qboTokenData' : 'xeroTokenData';
      const realmField = connectionType === 'qbo' ? 'qboRealmId' : 'xeroTenantId';
      const realmValue = connectionType === 'qbo' ? tokenData.realmId : tokenData.tenant_id;
      
      const updateData: any = {
        [updateField]: encryptedTokenData,
      };

      // Only update realm field if we have a valid value, to prevent clearing existing realm data
      if (realmValue) {
        updateData[realmField] = realmValue;
      }
      
      await prisma.company.update({
        where: { id: companyId },
        data: updateData,
      });

      console.log(`Successfully stored ${connectionType.toUpperCase()} token data for company ${companyId}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error storing ${connectionType} token data:`, error);
        throw new Error(`Failed to store ${connectionType.toUpperCase()} token data: ${error.message}`);
      }
      console.error(`Error storing ${connectionType} token data:`, error);
      throw new Error(`An unknown error occurred while storing ${connectionType.toUpperCase()} token data.`);
    }
  }
}

export const tokenService = new TokenService();
export default tokenService;