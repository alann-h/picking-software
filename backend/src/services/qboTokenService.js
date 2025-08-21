import OAuthClient from 'intuit-oauth';
import { query, transaction, encryptToken, decryptToken } from '../helpers.js';
import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';

/**
 * Enhanced QBO Token Management Service
 * Handles token sharing, refresh, and expiration gracefully
 */

class QBOTokenService {
  constructor() {
    this.tokenRefreshPromises = new Map(); // Prevent multiple simultaneous refreshes
  }

  initializeOAuthClient() {
    const environment = process.env.VITE_APP_ENV;
    const clientId = environment === 'production' ? process.env.CLIENT_ID_PROD : process.env.CLIENT_ID_DEV;
    const clientSecret = environment === 'production' ? process.env.CLIENT_SECRET_PROD : process.env.CLIENT_SECRET_DEV;
    const redirectUri = environment === 'production' ? process.env.REDIRECT_URI_PROD : process.env.REDIRECT_URI_DEV;

    if (!clientId || !clientSecret || !redirectUri || !environment) {
      throw new Error('Missing required environment variables');
    }

    return new OAuthClient({
      clientId,
      clientSecret,
      environment,
      redirectUri
    });
  }

  /**
   * Get QBO token for a company with automatic refresh
   * Uses promise caching to prevent multiple simultaneous refreshes
   */
  async getValidToken(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    try {
      // Check if we're already refreshing this company's token
      if (this.tokenRefreshPromises.has(companyId)) {
        console.log(`Token refresh already in progress for company ${companyId}, waiting...`);
        return await this.tokenRefreshPromises.get(companyId);
      }

      // Get current token from database
      const result = await query('SELECT qb_token FROM companies WHERE companyid = $1', [companyId]);
      if (!result || result.length === 0 || !result[0].qb_token) {
        throw new AuthenticationError('QBO_REAUTH_REQUIRED');
      }

      const encryptedToken = result[0].qb_token;
      const currentToken = decryptToken(encryptedToken);

      // Check if token is still valid
      if (this.isTokenValid(currentToken)) {
        console.log(`Token for company ${companyId} is still valid`);
        return currentToken;
      }

      // Token needs refresh, start refresh process
      console.log(`Token for company ${companyId} needs refresh, starting refresh process...`);
      const refreshPromise = this.refreshCompanyToken(companyId, currentToken);
      this.tokenRefreshPromises.set(companyId, refreshPromise);

      try {
        const refreshedToken = await refreshPromise;
        return refreshedToken;
      } finally {
        // Clean up the promise cache
        this.tokenRefreshPromises.delete(companyId);
      }

    } catch (error) {
      console.error(`Error getting valid token for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a token is still valid
   */
  isTokenValid(token) {
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
   * Refresh a company's QBO token
   */
  async refreshCompanyToken(companyId, currentToken) {
    try {
      const oauthClient = this.initializeOAuthClient();
      oauthClient.setToken(currentToken);

      // Check if refresh token is still valid
      if (!oauthClient.token.isRefreshTokenValid()) {
        console.warn(`Refresh token expired for company ${companyId}`);
        throw new AuthenticationError('QBO_REFRESH_TOKEN_EXPIRED');
      }

      // Attempt to refresh the token
      const response = await oauthClient.refreshUsingToken(currentToken.refresh_token);
      const refreshedToken = response.getToken();

      console.log(`Successfully refreshed token for company ${companyId}`);

      // Save the new token to the database
      const encryptedToken = encryptToken(refreshedToken);
      await query(
        'UPDATE companies SET qb_token = $1 WHERE companyid = $2',
        [encryptedToken, companyId]
      );

      return refreshedToken;

    } catch (error) {
      console.error(`Failed to refresh token for company ${companyId}:`, error);
      
      if (error.message === 'QBO_REFRESH_TOKEN_EXPIRED') {
        throw new AuthenticationError('QBO_REAUTH_REQUIRED');
      }
      
      throw new AccessError(`Failed to refresh QBO token: ${error.message}`);
    }
  }

  /**
   * Get OAuth client with valid token for a company
   */
  async getOAuthClient(companyId) {
    const validToken = await this.getValidToken(companyId);
    const oauthClient = this.initializeOAuthClient();
    oauthClient.setToken(validToken);
    return oauthClient;
  }

  /**
   * Check if a company needs QBO re-authentication
   */
  async checkReAuthRequired(companyId) {
    try {
      await this.getValidToken(companyId);
      return false;
    } catch (error) {
      return error.message === 'QBO_REAUTH_REQUIRED' || 
             error.message === 'QBO_REFRESH_TOKEN_EXPIRED';
    }
  }

  /**
   * Get token status for debugging
   */
  async getTokenStatus(companyId) {
    try {
      const result = await query('SELECT qb_token FROM companies WHERE companyid = $1', [companyId]);
      if (!result || result.length === 0 || !result[0].qb_token) {
        return { status: 'NO_TOKEN', message: 'No QBO token found' };
      }

      const currentToken = decryptToken(result[0].qb_token);
      const isValid = this.isTokenValid(currentToken);
      
      return {
        status: isValid ? 'VALID' : 'EXPIRED',
        message: isValid ? 'Token is valid' : 'Token has expired',
        expiresAt: currentToken.access_token_expires_at,
        refreshTokenValid: currentToken.refresh_token_expires_at > Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }
}

// Export singleton instance
export const qboTokenService = new QBOTokenService();
export default qboTokenService;
