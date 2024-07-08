import OAuthClient from 'intuit-oauth';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { InputError, AccessError, NotFoundError, AuthenticationError } from './error';
import { readDatabase, writeDatabase } from './helpers';

dotenv.config({ path: 'config.env' });

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const databasePath = './database.json';

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
    saveUser(userId, token);
    return userId;
  } catch (e) {
    console.error(e);
    throw new AccessError('Could not create token.');
  }
}

function saveUser(userId, token) {
  const database = readDatabase(databasePath);
  database.users[userId] = token;
  writeDatabase(databasePath, database);
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

  const database = readDatabase(databasePath);
  const userToken = database.users[userId];
  if (!userToken) {
    throw new NotFoundError('User not found');
  }

  if (!userToken.access_token || !userToken.refresh_token) {
    throw new AccessError('Token not found for user');
  }

  const oauthClient = initializeOAuthClient();
  oauthClient.setToken(userToken);

  if (oauthClient.isAccessTokenValid()) {
    return userToken;
  }

  if (!oauthClient.token.isRefreshTokenValid()) {
    deleteUserToken(userId);
    throw new AuthenticationError('The Refresh token is invalid, please reauthenticate.');
  }

  try {
    const response = await oauthClient.refreshUsingToken(userToken.refresh_token);
    const newToken = response.getToken();
    saveUser(userId, newToken);
    return newToken;
  } catch (e) {
    throw new NotFoundError('Failed to refresh token');
  }
}

function deleteUserToken(userId) {
  const database = readDatabase(databasePath);
  delete database.users[userId];
  writeDatabase(databasePath, database);
}