import OAuthClient from 'intuit-oauth';
import { XeroClient } from 'xero-node';
import QuickBooks from 'node-quickbooks';
import crypto from 'crypto';

/**
 * Authentication System Class
 * Handles both QuickBooks Online (QBO) and Xero authentication
 */
import { oauth, currentEnv, ENV } from '../config/index.js';

export class AuthSystem {
    constructor() {
        this.environment = currentEnv;
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
    validateConfiguration() {
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
     * @returns {OAuthClient} Initialized QBO OAuth client
     */
    initializeQBO() {
        return new OAuthClient({
            clientId: this.qboClientId,
            clientSecret: this.qboClientSecret,
            environment: this.environment,
            redirectUri: `${this.baseUrl}${oauth.qbo.redirectUri}`
        });
    }

    /**
     * Initialize Xero OAuth Client
     * @returns {XeroClient} Initialized Xero client
     */
    initializeXero() {
        return new XeroClient({
            clientId: this.xeroClientId,
            clientSecret: this.xeroClientSecret,
            redirectUris: [`${this.baseUrl}${oauth.xero.redirectUri}`],
            scopes: oauth.xero.scopes
        });
    }

    /**
     * Get QBO authorization URI
     * @param {boolean} rememberMe - Whether to remember the user
     * @returns {Promise<string>} Authorization URI
     */
    getQBOAuthUri(rememberMe = false) {
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
    async getXeroAuthUri(rememberMe = false) {
        const xeroClient = this.initializeXero();
        const state = rememberMe ? `rememberMe=true&${crypto.randomBytes(16).toString('hex')}` : crypto.randomBytes(16).toString('hex');

        const url = await xeroClient.buildConsentUrl(state);
        return url;
    }

    /**
     * Handle QBO OAuth callback
     * @param {string} url - Callback URL
     * @returns {Promise<Object>} Token object
     */
    async handleQBOCallback(url) {
        const oauthClient = this.initializeQBO();
        try {
            const authResponse = await oauthClient.createToken(url);
            return authResponse.getToken();
        } catch (error) {
            console.error('QBO callback error:', error);
            throw new Error('Could not create QBO token: ' + error.message);
        }
    }

    /**
     * Handle Xero OAuth callback
     * @param {string} url - Callback URL (can be full URL or just path)
     * @returns {Promise<Object>} Token object
     */
    async handleXeroCallback(url) {
        const xeroClient = this.initializeXero();
        try {
            const tokenSet = await xeroClient.apiCallback(url);
            xeroClient.setTokenSet(tokenSet);
            const tenantId = await this.getXeroTenantId(xeroClient);
            return {
                access_token: tokenSet.access_token,
                refresh_token: tokenSet.refresh_token,
                expires_at: tokenSet.expires_at,
                tenant_id: tenantId
            };
        } catch (error) {
            console.error('Xero callback error:', error);
            throw new Error('Could not create Xero token: ' + error.message);
        }
    }

    /**
     * Refresh QBO token
     * @param {Object} token - Current token object
     * @returns {Promise<Object>} Refreshed token
     */
    async refreshQBOToken(token) {
        const oauthClient = this.initializeQBO();
        oauthClient.setToken(token);

        if (oauthClient.isAccessTokenValid()) {
            return token;
        }

        if (!oauthClient.token.isRefreshTokenValid()) {
            throw new Error('QBO refresh token has expired, please reauthenticate');
        }

        try {
            const response = await oauthClient.refreshUsingToken(token.refresh_token);
            const tokenData = response.getToken();
            return tokenData;
        } catch (error) {
            if (error.error === 'invalid_grant') {
                throw new Error('QBO_TOKEN_REVOKED');
            }
            throw new Error('Failed to refresh QBO token: ' + error.message);
        }
    }

    /**
     * Refresh Xero token
     * @param {Object} token - Current token object
     * @returns {Promise<Object>} Refreshed token
     */
    async refreshXeroToken(token) {
        const xeroClient = this.initializeXero();
        
        try {
            // Set the current token
            xeroClient.setTokenSet({
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_at: token.expires_at
            });

            // Check if token is expired and refresh if needed
            if (token.expires_at && new Date() >= new Date(token.expires_at * 1000)) {
                const newTokenSet = await xeroClient.refreshToken();
                console.log('Xero Token Refreshed!');
                return {
                    access_token: newTokenSet.access_token,
                    refresh_token: newTokenSet.refresh_token,
                    expires_at: newTokenSet.expires_at,
                    tenant_id: token.tenant_id
                };
            }
            
            return token;
        } catch (error) {
            console.error('Xero token refresh error:', error);
            throw new Error('Failed to refresh Xero token: ' + error.message);
        }
    }

    /**
     * Get QBO base URL based on environment
     * @param {OAuthClient} oauthClient - QBO OAuth client
     * @returns {string} Base URL
     */
    getQBOBaseURL(oauthClient) {
        return oauthClient.environment === ENV.PRODUCTION ? 
            OAuthClient.environment.production : 
            OAuthClient.environment.sandbox;
    }

    /**
     * Get Xero base URL
     * @returns {string} Base URL
     */
    getXeroBaseURL() {
        return oauth.xero.baseUrl;
    }

    /**
     * Get QBO realm ID from token
     * @param {OAuthClient} oauthClient - QBO OAuth client
     * @returns {string} Realm ID
     */
    getQBORealmId(oauthClient) {
        return oauthClient.getToken().realmId;
    }

        /**
     * Creates an initialized node-quickbooks client instance
     * @param {Object} token - A valid QBO token object from your database
     * @returns {QuickBooks} Initialized node-quickbooks client
     */
    createQBOClient(token) {
        return new QuickBooks(
            this.qboClientId,               // consumerKey
            this.qboClientSecret,           // consumerSecret
            token.access_token,             // accessToken
            false,                          // no token secret for OAuth 2.0
            token.realmId,                  // realmId
            this.environment === 'sandbox', // useSandbox
            false,                          // enable debugging
            '75',                           // minorversion
            '2.0',                          // oAuth version
            token.refresh_token             // refreshToken
        );
    }

    /**
     * Get Xero tenant ID from token
     * @param {XeroClient} xeroClient - Xero OAuth client
     * @returns {string} Tenant ID
     */
    async getXeroTenantId(xeroClient) {
        let tenantId = null;
        try {
            const tenants = await xeroClient.updateTenants();
            if (tenants && tenants.length > 0) {
                tenantId = tenants[0].tenantId;
            }
        } catch (error) {
            console.warn('Could not fetch Xero tenant ID:', error.message);
        }
        return tenantId;
    }
    /**
     * Revoke QBO token
     * @param {Object} token - Token to revoke
     */
    async revokeQBOToken(token) {
        const oauthClient = this.initializeQBO();
        oauthClient.setToken(token);
        
        try {
            await oauthClient.revoke();
        } catch (error) {
            console.error('Error revoking QBO token:', error);
            throw new Error('Could not revoke QBO token: ' + error.message);
        }
    }

    /**
     * Revoke Xero token
     * @param {Object} token - Token to revoke
     */
    async revokeXeroToken(token) {
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
        } catch (error) {
            console.error('Error revoking Xero token:', error);
            throw new Error('Could not revoke Xero token: ' + error.message);
        }
    }

    /**
     * Get user info from QBO
     * @param {Object} token - QBO token
     * @returns {Promise<Object>} User information
     */
    async getQBOUserInfo(token) {
        const oauthClient = this.initializeQBO();
        oauthClient.setToken(token);
        
        try {
            const userInfo = await oauthClient.getUserInfo();
            return userInfo.json;
        } catch (error) {
            throw new Error('Could not get QBO user information: ' + error.message);
        }
    }

    /**
     * Get user info from Xero
     * @param {Object} token - Xero token
     * @returns {Promise<Object>} User information
     */
    async getXeroUserInfo(token) {
      const xeroClient = this.initializeXero();
      xeroClient.setTokenSet(token);
      const userInfo = await xeroClient.accountingApi.getUsers(token.tenant_id);
      const mainUser = userInfo.body.users.find(user => user.isOwner) || userInfo.body.users[0];
      return {
        givenName: mainUser.firstName, 
        familyName: mainUser.lastName,
        email: mainUser.emailAddress
      }
    }

    /**
     * Get QBO company information
     * @param {Object} token - QBO token
     * @returns {Promise<Object>} Company information
     */
    async getQBOCompanyInfo(token) {
        const qboClient = this.createQBOClient(token);
        try {
            const realmId = token.realmId;

            const companyInfo = await new Promise((resolve, reject) => {
                qboClient.getCompanyInfo(token.realmId, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });

            if (!companyInfo || !companyInfo.CompanyName) {
                throw new Error('No company information found');
            }

            return {
                companyName: companyInfo.CompanyName,
                realmId: realmId,
            };
        } catch (error) {
            console.error('Could not get QBO company info:', error);
            return null;
        }
    }

    /**
     * Get Xero company information
     * @param {Object} token - Xero token
     * @returns {Promise<Object>} Company information
     */
    async getXeroCompanyInfo(token) {
        const xeroClient = this.initializeXero();
        xeroClient.setTokenSet(token);
        const companyInfo = await xeroClient.accountingApi.getOrganisations(token.tenant_id);
        return {
            companyName: companyInfo.body.organisations[0].name,
            tenantId: token.tenant_id
        };
    }
}

// Export a singleton instance
export const authSystem = new AuthSystem();
