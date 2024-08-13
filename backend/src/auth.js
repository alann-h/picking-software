import OAuthClient from 'intuit-oauth';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { InputError, AccessError, NotFoundError, AuthenticationError } from './error';
import { query } from './helpers';

dotenv.config({ path: 'config.env' });

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

function initializeOAuthClient() {
  return new OAuthClient({
    clientId,
    clientSecret,
    environment: 'sandbox',
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
    const userId = uuidv4();
    await saveUser(userId, token);
    return userId;
  } catch (e) {
    console.error(e);
    throw new AccessError('Could not create token.');
  }
}

async function saveUser(userId, token) {
  const text = 'INSERT INTO UserTokens(userId, tokenData) VALUES($1, $2) ON CONFLICT (userId) DO UPDATE SET tokenData = $2';
  const values = [userId, JSON.stringify(token)];
  try {
    await query(text, values);
  } catch (e) {
    throw new AccessError('Could not save user token: ' + e.message);
  }
}

export async function getOAuthClient(userId) {
  if (!userId) {
    return null;
  }
  try {
    const userToken = await getUserToken(userId);
    if (userToken) {
      const oauthClient = initializeOAuthClient();
      oauthClient.setToken(userToken);
      return oauthClient;
    }
  } catch (e) {
    throw new AccessError('Error getting OAuth client: ' + e.message);
  }
  return null;
}

export async function getUserToken(userId) {
  if (!userId) {
    throw new InputError('User Id is not valid');
  }

  const text = 'SELECT tokenData FROM UserTokens WHERE userId = $1';
  const values = [userId];

  try {
    const result = await query(text, values);
    if (result.length === 0) {
      throw new NotFoundError('User not found');
    }
    const userToken = result[0].tokendata;

    if (!userToken.access_token || !userToken.refresh_token) {
      throw new AccessError('Token not found for user');
    }

    const oauthClient = initializeOAuthClient();
    oauthClient.setToken(userToken);

    if (oauthClient.isAccessTokenValid()) {
      return userToken;
    }

    if (!oauthClient.token.isRefreshTokenValid()) {
      await deleteUserToken(userId);
      throw new AuthenticationError('The Refresh token is invalid, please reauthenticate.');
    }

    const response = await oauthClient.refreshUsingToken(userToken.refresh_token);
    const newToken = response.getToken();
    await saveUser(userId, newToken);
    return newToken;
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof AuthenticationError) {
      throw e;
    }
    throw new NotFoundError('Failed to refresh token: ' + e.message);
  }
}

async function deleteUserToken(userId) {
  const text = 'DELETE FROM UserTokens WHERE userId = $1';
  const values = [userId];
  try {
    await query(text, values);
  } catch (e) {
    throw new AccessError('Could not delete user token: ' + e.message);
  }
}