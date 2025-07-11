import OAuthClient from 'intuit-oauth';
import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { query, transaction, encryptToken, decryptToken } from '../helpers.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';


const environment = process.env.NODE_ENV;
const clientId = environment === 'production' ? process.env.CLIENT_ID_PROD : process.env.CLIENT_ID_DEV;
const clientSecret = environment === 'production' ? process.env.CLIENT_SECRET_PROD : process.env.CLIENT_SECRET_DEV;
const redirectUri = environment === 'production' ? process.env.REDIRECT_URI_PROD : process.env.REDIRECT_URI_DEV;

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
    const result = await query(`
      SELECT 
        u.*,
        c.qb_token as token
      FROM users u
      JOIN companies c ON u.companyid = c.companyid
      WHERE u.email = $1
    `, [email]);

    if (result.length === 0) {
      throw new AuthenticationError('Invalid email');
    }

    const user = result[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password');
    }

    // Decrypt the token before using it if it's stored encrypted
    const decryptedToken = decryptToken(user.token);

    try {
      const refreshedToken = await refreshToken(decryptedToken);

      // Encrypt the refreshed token for storage if it has changed
      if (JSON.stringify(refreshedToken) !== JSON.stringify(decryptedToken)) {
        const encryptedToken = encryptToken(refreshedToken);
        // Update the company's token in the database with the newly encrypted token
        await query(
          'UPDATE companies SET qb_token = $1::jsonb WHERE id = $2',
          [encryptedToken, user.companyid]
        );
        user.token = refreshedToken; // Optionally update the user object
      }
    } catch (error) {
      throw new AuthenticationError('Failed to refresh token: ' + error.message);
    }

    return user;
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}

export async function register(email, password, is_admin, givenName, familyName, companyId) {
  const userId = uuidv4();
  const saltRounds = 10;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await query(`
      INSERT INTO users (id, email, password, is_admin, given_name, family_name, companyid) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE 
      SET 
          password = EXCLUDED.password,
          is_admin = EXCLUDED.is_admin,
          given_name = EXCLUDED.given_name,
          family_name = EXCLUDED.family_name,
          companyid = EXCLUDED.companyid
      RETURNING *`,
      [userId, email, hashedPassword, is_admin, givenName, familyName, companyId]
    );    
    if (result.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }
    return result[0];
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}

export async function deleteUser(userId, sessionId) {
  try {
    await transaction(async (client) => {
      if (sessionId) {
        await client.query(
          'DELETE FROM sessions WHERE sid = $1',
          [sessionId]
        );
      }
      
      // Delete the user
      const result = await client.query(
        `DELETE FROM users 
         WHERE id = $1 
         RETURNING *`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    });
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
};

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
    const password = process.env.QBO_PASS;
    const response = await register(userInfo.email, password, true, userInfo.givenName, userInfo.familyName, companyId, userInfo.sub);
    return response;
  } catch (e) {
    throw new AccessError('Could not get user information: ' + e.message);
  }
}

export async function getAllUsers(companyId) {
  try {
    const result = await query('select * from users WHERE companyid = $1', [companyId]);
    return result;
  } catch (e) {
    throw new AccessError('Could not get user information: ' + e.message);
  }
}

export async function updateUser(userId, userData) {
  try {
    const result = await query(
      `UPDATE users 
       SET email = $1,
           password = $2,
           given_name = $3,
           family_name = $4,
           is_admin = $5
       WHERE id = $6
       RETURNING *`,
      [
        userData.email,
        userData.password,
        userData.givenName,
        userData.familyName,
        userData.isAdmin,
        userId
      ]
    );

    if (result.length === 0) {
      throw new AccessError('User not found');
    }

    return result[0];
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function revokeQuickBooksToken(token) {
  try {
    const oauthClient = initializeOAuthClient();
    oauthClient.setToken(token);

    await oauthClient.revoke();
  } catch (e) {
    console.error('Error revoking QuickBooks token:', e);
    throw new AccessError('Could not revoke QuickBooks token: ' + e.message);
  }
}
