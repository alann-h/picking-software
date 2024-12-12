import OAuthClient from 'intuit-oauth';
import dotenv from 'dotenv';
import { AccessError, AuthenticationError } from './error';
import { query } from './helpers.js';

dotenv.config({ path: 'config.env' });

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const environment = process.env.NODE_ENV;

if (!clientId || !clientSecret || !redirectUri || !environment) {
  throw new Error('Missing required environment variables');
}

function initializeOAuthClient() {
  return new OAuthClient({
    clientId,
    clientSecret,
    environment,
    redirectUri
  });
}

export function getAuthUri() {
  const oauthClient = initializeOAuthClient();
  const authUri = oauthClient.authorizeUri({ scope: [OAuthClient.scopes.Accounting], state: 'intuit-test' });
  return Promise.resolve(authUri);
}

export function getBaseURL(oauthClient) {
  return oauthClient.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production;
}

export function getCompanyId(oauthClient) {
  return oauthClient.getToken().realmId;
}

export async function handleCallback(url) {
  const oauthClient = initializeOAuthClient();
  try {
    const authResponse = await oauthClient.createToken(url);
    const token = authResponse.getToken();
    return token;
  } catch (e) {
    console.error(e);
    throw new AccessError('Could not create token.');
  }
}

export async function refreshToken(token) {
  const oauthClient = initializeOAuthClient();
  oauthClient.setToken(token);

  if (oauthClient.isAccessTokenValid()) {
    return token;
  }

  if (!oauthClient.token.isRefreshTokenValid()) {
    throw new AuthenticationError('The Refresh token is invalid, please reauthenticate.');
  }

  try {
    const response = await oauthClient.refreshUsingToken(token.refresh_token);
    return response.getToken();
  } catch (e) {
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

export async function login(email, password) {
  try {
    const result = await query('SELECT token FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }
    return result[0].token;
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}

export async function register(email, password, is_admin) {
  try {
    const result = await query('INSERT into users (email, password, is_admin) RETURNING ($1, $2, $3) RETURNING *', [email, password, is_admin]);
    if (result.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }
    return result[0];
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}
