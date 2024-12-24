import OAuthClient from 'intuit-oauth';
import dotenv from 'dotenv';
import { AccessError, AuthenticationError } from './error';
import { query } from './helpers.js';

dotenv.config({ path: '.env' });

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
  const authUri = oauthClient.authorizeUri({ 
    scope: [
      OAuthClient.scopes.Accounting,
      OAuthClient.scopes.OpenId,
      OAuthClient.scopes.Profile,
      OAuthClient.scopes.Email,
    ], 
    state: 'intuit-test' 
  });
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
    return result[0];
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}

export async function register(email, password, is_admin, givenName, familyName, companyId, userId) {
  try {
  const result = await query(`
    INSERT INTO users (id, email, password, is_admin, given_name, family_name, company_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE 
    SET 
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        is_admin = EXCLUDED.is_admin,
        given_name = EXCLUDED.given_name,
        family_name = EXCLUDED.family_name,
        company_id = EXCLUDED.company_id
    RETURNING *`, 
    [userId, email, password, is_admin, givenName, familyName, companyId]
);    if (result.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }
    return result[0];
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}

async function getUserInfo(token) {
  try {
    const oauthClient = initializeOAuthClient();
    oauthClient.setToken(token);
    const userInfo = await oauthClient.getUserInfo();
    return userInfo.json;
  } catch (e) {
    throw new AccessError('Could not get user information: ' + e.message);
  }
}

export async function saveUserQbButton(token, companyId) {
  try {
    const userInfo = await getUserInfo(token);
    const password = 'GoldenShore2024';
    const response = await register(userInfo.email, password, true, userInfo.givenName, userInfo.familyName, companyId, userInfo.sub);
    return response;
  } catch (e) {
    throw new AccessError('Could not get user information: ' + e.message);
  }
}