import OAuthClient from 'intuit-oauth';
import { XeroClient, TokenSet } from 'xero-node';
import crypto from 'crypto';
import { oauth, currentEnv, ENV } from '../config/index.js';
import { OAuthUserInfo } from '../types/auth.js';
import { 
    IntuitOAuthClient, 
    QBOCompanyInfo,
    XeroCompanyInfo
} from '../types/authSystem.js';
import { QboToken, XeroToken } from '../types/token.js';

/**
 * Authentication System Class
 * Handles both QuickBooks Online (QBO) and Xero authentication
 */
export class AuthSystem {
    private environment: 'sandbox' | 'production';
    private baseUrl: string;
    private qboClientId: string;
    private qboClientSecret: string;
    private xeroClientId: string;
    private xeroClientSecret: string;

    constructor() {
        this.environment = currentEnv as 'sandbox' | 'production';
        this.baseUrl = oauth.baseUrl;
        
        // QBO Configuration
        this.qboClientId = oauth.qbo.clientId;
        this.qboClientSecret = oauth.qbo.clientSecret;
        
        // Xero Configuration
        this.xeroClientId = oauth.xero.clientId;
        this.xeroClientSecret = oauth.xero.clientSecret;
        
        this.validateConfiguration();
    }

    /**
     * Validate that all required environment variables are set
     */
    validateConfiguration(): void {
        if (!this.environment) {
            throw new Error('Missing required environment variables: VITE_APP_ENV');
        }
        
        if (!this.qboClientId || !this.qboClientSecret) {
            throw new Error('Missing QBO environment variables: CLIENT_ID_DEV/PROD, CLIENT_SECRET_DEV/PROD');
        }
        
        if (!this.xeroClientId || !this.xeroClientSecret) {
            throw new Error('Missing Xero environment variables: XERO_CLIENT_ID, XERO_CLIENT_SECRET');
        }
    }

    /**
     * Initialize QBO OAuth Client
     * @returns {IntuitOAuthClient} Initialized QBO OAuth client
     */
    initializeQBO(): IntuitOAuthClient {
        return new (OAuthClient as new (options: unknown) => IntuitOAuthClient)({
            clientId: this.qboClientId,
            clientSecret: this.qboClientSecret,
            environment: this.environment,
            redirectUri: `${oauth.qbo.redirectUri}`
        });
    }

    /**
     * Initialize Xero OAuth Client
     * @returns {XeroClient} Initialized Xero client
     */
    initializeXero(): XeroClient {
        return new XeroClient({
            clientId: this.xeroClientId,
            clientSecret: this.xeroClientSecret,
            redirectUris: [`${oauth.xero.redirectUri}`],
            scopes: oauth.xero.scopes,
        });
    }

    /**
     * Get QBO authorization URI
     * @param {boolean} rememberMe - Whether to remember the user
     * @returns {string} Authorization URI
     */
    getQBOAuthUri(rememberMe = false): string {
        const oauthClient = this.initializeQBO();
        const state = rememberMe ? `rememberMe=true&${crypto.randomBytes(16).toString('hex')}` : crypto.randomBytes(16).toString('hex');
        
        return oauthClient.authorizeUri({ 
            scope: oauth.qbo.scopes, 
            state: state
        });
    }

    /**
     * Get Xero authorization URI
     * @param {boolean} rememberMe - Whether to remember the user
     * @returns {Promise<string>} Authorization URI
     */
    async getXeroAuthUri(_rememberMe = false): Promise<string> {
        const xeroClient = this.initializeXero();

        return await xeroClient.buildConsentUrl();
    }

    /**
     * Handle QBO OAuth callback
     * @param {string} url - Callback URL
     * @returns {Promise<QboToken>} Token object
     */
    async handleQBOCallback(url: string): Promise<QboToken> {   
        const oauthClient = this.initializeQBO();
        try {
            const authResponse = await oauthClient.createToken(url);
            return authResponse.getToken();
        } catch (error: unknown) {
            console.error('QBO callback error:', error);
            if (error instanceof Error) {
                throw new Error('Could not create QBO token: ' + error.message);
            }
            throw new Error('Could not create QBO token due to an unknown error.');
        }
    }

    /**
     * Handle Xero OAuth callback
     * @param {string} url - Callback URL (can be full URL or just path)
     * @returns {Promise<XeroToken>} Token object
     */
    async handleXeroCallback(url: string): Promise<XeroToken> {
        const xeroClient = this.initializeXero();
        try {
            const tokenSet: TokenSet = await xeroClient.apiCallback(url);
            xeroClient.setTokenSet(tokenSet);
            const { tenantId } = await this.getXeroTenantId(xeroClient);
            return {
                access_token: tokenSet.access_token!,
                refresh_token: tokenSet.refresh_token!,
                expires_at: tokenSet.expires_at!,
                tenant_id: tenantId,
                created_at: Date.now() / 1000
            };
        } catch (error: unknown) {
            console.error('Xero callback error:', error);
            throw new Error('Failed to handle Xero callback.');
        }
    }

    /**
     * Refresh QBO token
     * @param {QboToken} token - Current token object
     * @returns {Promise<QboToken>} Refreshed token
     */
    async refreshQBOToken(token: QboToken): Promise<QboToken> {
        const oauthClient = this.initializeQBO();
        oauthClient.setToken(token);
        
        if (!oauthClient.token.isRefreshTokenValid()) {
            throw new Error('QBO refresh token has expired, please reauthenticate');
        }

        try {
            const response = await oauthClient.refreshUsingToken(token.refresh_token);
            const tokenData: QboToken = response.getToken();
            console.log('QBO token refreshed!');
            return tokenData;
        } catch (error: unknown) {
            if (error instanceof Object && 'error' in error && error.error === 'invalid_grant') {
                throw new Error('QBO_TOKEN_REVOKED');
            }
            if (error instanceof Error) {
                throw new Error('Failed to refresh QBO token: ' + error.message);
            }
            throw new Error('Failed to refresh QBO token due to an unknown error.');
        }
    }

    /**
     * Refresh Xero token
     * @param {XeroTokenData} token - Current token object
     * @returns {Promise<XeroTokenData>} Refreshed token
     */
    async refreshXeroToken(token: XeroToken): Promise<XeroToken> {
        const xeroClient = this.initializeXero();
        
        try {
            const tokenSet = await xeroClient.refreshWithRefreshToken(this.xeroClientId, this.xeroClientSecret, token.refresh_token);
            xeroClient.setTokenSet(tokenSet);
            const { tenantId } = await this.getXeroTenantId(xeroClient);
            return {
                access_token: tokenSet.access_token!,
                refresh_token: tokenSet.refresh_token!,
                expires_at: tokenSet.expires_at!,
                tenant_id: tenantId,
                created_at: Date.now() / 1000
            };
        } catch (error: unknown) {
            console.error('Xero token refresh error:', error);
            if (error instanceof Error) {
                if (error.message.includes('invalid_grant')) {
                    throw new Error('XERO_TOKEN_REVOKED');
                }
                throw new Error('Failed to refresh Xero token.');
            }
            throw new Error('Failed to refresh Xero token due to an unknown error.');
        }
    }

    /**
     * Get QBO base URL based on environment
     * @param {IntuitOAuthClient} oauthClient - QBO OAuth client
     * @returns {string} Base URL
     */
    getQBOBaseURL(oauthClient: IntuitOAuthClient): string {
        return oauthClient.environment === ENV.PRODUCTION ? 
            OAuthClient.environment.production : 
            OAuthClient.environment.sandbox;
    }

    /**
     * Get Xero base URL
     * @returns {string} Base URL
     */
    getXeroBaseURL(): string {
        return oauth.xero.baseUrl;
    }

    /**
     * Get QBO realm ID from token
     * @param {IntuitOAuthClient} oauthClient - QBO OAuth client
     * @returns {string} Realm ID
     */
    getQBORealmId(oauthClient: IntuitOAuthClient): string {
        console.log('OAuth client:', oauthClient);
        console.log('Token:', oauthClient.getToken());
        console.log('Realm ID:', oauthClient.getToken().realmId);
        return oauthClient.getToken().realmId;
    }

    /**
     * Get Xero tenant ID and shortCode from token
     * @param {XeroClient} xeroClient - Xero OAuth client
     * @returns {Promise<{tenantId: string; shortCode?: string}>} Tenant ID and shortCode
     */
    async getXeroTenantId(xeroClient: XeroClient): Promise<{ tenantId: string; shortCode?: string }> {
        let tenantId: string = '';
        let shortCode: string | undefined;
        try {
            const tenants = await xeroClient.updateTenants();
            if (tenants && tenants.length > 0) {
                tenantId = tenants[0].tenantId!;
                shortCode = tenants[0].orgData?.shortCode;
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.warn('Could not fetch Xero tenant ID:', error.message);
            } else {
                console.warn('Could not fetch Xero tenant ID due to an unknown error.');
            }
        }
        return { tenantId, shortCode };
    }
    /**
     * Revoke QBO token
     * @param {QboTokenData} token - Token to revoke
     */
    async revokeQBOToken(token: QboToken): Promise<void> {
        const oauthClient = this.initializeQBO();
        oauthClient.setToken(token);
        
        try {
            await oauthClient.revoke();
        } catch (error: unknown) {
            console.error('Error revoking QBO token:', error);
            if (error instanceof Error) {
                throw new Error('Could not revoke QBO token: ' + error.message);
            }
            throw new Error('Could not revoke QBO token due to an unknown error.');
        }
    }

    /**
     * Revoke Xero token
     * @param {XeroTokenData} token - Token to revoke
     */
    async revokeXeroToken(token: XeroToken): Promise<void> {
        const xeroClient = this.initializeXero();
        
        try {
            // Set the current token set
            xeroClient.setTokenSet({
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_at: token.expires_at
            });
            
            // Use the proper revoke method
            await xeroClient.revokeToken();
            console.log('Xero token revoked successfully');
        } catch (error: unknown) {
            console.error('Error revoking Xero token:', error);
            if (error instanceof Error) {
                throw new Error('Could not revoke Xero token: ' + error.message);
            }
            throw new Error('Could not revoke Xero token due to an unknown error.');
        }
    }

    /**
     * Get user info from QBO
     * @param {QboTokenData} token - QBO token
     * @returns {Promise<OAuthUserInfo>} User information
     */
    async getQBOUserInfo(token: QboToken): Promise<OAuthUserInfo> {
        const oauthClient = this.initializeQBO();
        oauthClient.setToken(token);
        
        try {
            const userInfo = await oauthClient.getUserInfo();
            return userInfo.json;
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error('Could not get QBO user information: ' + error.message);
            }
            throw new Error('Could not get QBO user information due to an unknown error.');
        }
    }

    /**
     * Get user info from Xero
     * @param {XeroTokenData} token - Xero token
     * @returns {Promise<OAuthUserInfo>} User information
     */
    async getXeroUserInfo(token: XeroToken): Promise<OAuthUserInfo> {
      const xeroClient = this.initializeXero();
      xeroClient.setTokenSet(token as unknown as TokenSet);
      const userInfo = await xeroClient.accountingApi.getUsers(token.tenant_id!);
      const mainUser = userInfo.body.users![0];
      return {
        givenName: mainUser.firstName!, 
        familyName: mainUser.lastName!,
        email: mainUser.emailAddress!
      }
    }

    /**
     * Get QBO company information
     * @param {QboTokenData} token - QBO token
     * @returns {Promise<QBOCompanyInfo | null>} Company information
     */
    async getQBOCompanyInfo(token: QboToken): Promise<QBOCompanyInfo | null> {
        try {
            const oauthClient = this.initializeQBO();
            oauthClient.setToken(token);
            

            const realmId = token.realmId;
            const baseURL = this.getQBOBaseURL(oauthClient);
            const queryStr = `SELECT * FROM CompanyInfo`;
            
            const response = await oauthClient.makeApiCall({
                url: `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
            });

            const responseJSON  = response.json;

            const companyInfoFull = responseJSON.QueryResponse.CompanyInfo[0];
            
            if (!companyInfoFull || !companyInfoFull.CompanyName) {
                throw new Error('No company information found');
            }
    
            return {
                companyName: companyInfoFull.CompanyName,
                realmId: realmId!,
            };
        } catch (error) {
            console.error('Could not get QBO company info:', error);
            return null;
        }
    }

    /**
     * Get Xero company information
     * @param {XeroTokenData} token - Xero token
     * @returns {Promise<XeroCompanyInfo>} Company information
     */
    async getXeroCompanyInfo(token: XeroToken): Promise<XeroCompanyInfo> {
         const xeroClient = this.initializeXero();
         xeroClient.setTokenSet(token as unknown as TokenSet);
         const companyInfo = await xeroClient.accountingApi.getOrganisations(token.tenant_id!);
         return {
             companyName: companyInfo.body.organisations?.[0]?.name || 'Unknown Company',
             tenantId: token.tenant_id!
         };
    }
}

// Export a singleton instance
export const authSystem = new AuthSystem();
