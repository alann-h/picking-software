import OAuthClient from 'intuit-oauth';
import { AccessError, AuthenticationError } from './errorHandler.mjs';

function initializeOAuthClient() {
  const environment = process.env.NODE_ENV;
  const clientId =  process.env.CLIENT_ID_PROD;
  const clientSecret = process.env.CLIENT_SECRET_PROD;
  const redirectUri = process.env.REDIRECT_URI_PROD;

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

export function getBaseURL(oauthClient) {
  return oauthClient.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production;
}

export function getCompanyId(oauthClient) {
  return oauthClient.getToken().realmId;
}

export async function refreshToken(token) {
  const oauthClient = initializeOAuthClient();
  oauthClient.setToken(token);

  if (oauthClient.isAccessTokenValid()) {
    return token;
  }

  if (!oauthClient.token.isRefreshTokenValid()) {
    console.warn('Refresh Token has expired!');
    throw new AuthenticationError('The Refresh token is invalid, please reauthenticate.');
  }

  try {
    const response = await oauthClient.refreshUsingToken(token.refresh_token);
    console.log('Token Refreshed!');
    return response.getToken();
  } catch (e) {
    // 💡 CHECK FOR THE SPECIFIC ERROR FROM INTUIT
    if (e.error === 'invalid_grant') {
      throw new AuthenticationError('QBO_TOKEN_REVOKED');
    }
    throw new AccessError('Failed to refresh token: ' + e.message);
  }
}

export async function getOAuthClient(token) {
  if (!token) {
    return null;
  }
  try {
    const refreshedToken = await refreshToken(token);
    const oauthClient = initializeOAuthClient();
    oauthClient.setToken(refreshedToken);
    return oauthClient;
  } catch (e) {
    throw new AccessError('Error getting OAuth client: ' + e.message);
  }
}
