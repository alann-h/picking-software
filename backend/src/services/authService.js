import OAuthClient from 'intuit-oauth';
import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { query, transaction, encryptToken, decryptToken } from '../helpers.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import validator from 'validator';
import crypto from 'crypto';

export function initializeOAuthClient() {
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

export function getAuthUri() {
  const oauthClient = initializeOAuthClient();
  const authUri = oauthClient.authorizeUri({ 
    scope: [
      OAuthClient.scopes.Accounting,
      OAuthClient.scopes.OpenId,
      OAuthClient.scopes.Profile,
      OAuthClient.scopes.Email,
    ], 
    state: crypto.randomBytes(16).toString('hex') 
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

export async function getOAuthClient(companyId) {
  if (!companyId) {
    throw new Error('A companyId is required to get the QuickBooks client.');
  }

  const result = await query('SELECT qb_token FROM companies WHERE companyid = $1', [companyId]);
  if (!result || result.length === 0 || !result[0].qb_token) {
    throw new AuthenticationError('QBO_REAUTH_REQUIRED');
  }

  const encryptedTokenFromDB = result[0].qb_token;
  const decryptedToken = decryptToken(encryptedTokenFromDB);

  const refreshedToken = await refreshToken(decryptedToken);


  if (refreshedToken.access_token !== decryptedToken.access_token) {
    console.log('Saving new token to the database for company:', companyId);
    const newlyEncryptedToken = encryptToken(refreshedToken);
    await query(
      'UPDATE companies SET qb_token = $1 WHERE companyid = $2',
      [newlyEncryptedToken, companyId]
    );
  }

  const oauthClient = initializeOAuthClient();
  oauthClient.setToken(refreshedToken);
  return oauthClient;
}

export async function login(email, password) {
  try {
    const result = await query(`
      SELECT 
        u.*,
        c.qb_token as token
      FROM users u
      JOIN companies c ON u.companyid = c.companyid
      WHERE u.normalised_email = $1
    `, [email]);

    if (result.length === 0) {
      throw new AuthenticationError('Invalid email');
    }

    const user = result[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password');
    }

    const decryptedToken = decryptToken(user.token);

    try {
      const refreshedToken = await refreshToken(decryptedToken);

      if (JSON.stringify(refreshedToken) !== JSON.stringify(decryptedToken)) {
        const encryptedToken = encryptToken(refreshedToken);
        // Update the company's token in the database with the newly encrypted token
        await query(
          'UPDATE companies SET qb_token = $1 WHERE companyid = $2',
          [encryptedToken, user.companyid]
        );
        user.token = refreshedToken;
      }
    } catch (error) {
      // 💡 CATCH THE SPECIFIC REVOKED TOKEN ERROR
      if (error.message === 'QBO_TOKEN_REVOKED') {
        user.qboReAuthRequired = true;
      } else {
        throw new AuthenticationError(error.message);
      }
    }
    return user;
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
}

export async function register(displayEmail, password, is_admin, givenName, familyName, companyId) {
  const saltRounds = 10;
  const normalisedEmail = validator.normalizeEmail(displayEmail);

  const existingUser = await query(
    'SELECT id FROM users WHERE normalised_email = $1',
    [normalisedEmail]
  );

  if (existingUser.length > 0) {
    throw new AuthenticationError('An account with this email address already exists. Please log in.');
  }

  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const result = await query(`
    INSERT INTO users (id, normalised_email, password, is_admin, given_name, family_name, companyid, display_email) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [userId, normalisedEmail, hashedPassword, is_admin, givenName, familyName, companyId, displayEmail]
  );
  
  if (result.length === 0) {
    throw new AccessError('Unable to register user.');
  }
  return result[0];
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
    const normalisedEmail = validator.normalizeEmail(userInfo.email);

    // Check if a user with this email already exists in your database
    const existingUserResult = await query(
      'SELECT * FROM users WHERE normalised_email = $1',
      [normalisedEmail]
    );

    // If the user exists, return their data immediately.
    if (existingUserResult.length > 0) {
      console.log(`Existing user re-authenticated: ${normalisedEmail}`);
      return existingUserResult[0];
    } 
    
    else {
      console.log(`New user registering via QuickBooks: ${normalisedEmail}`);
      const password = crypto.randomBytes(16).toString('hex');
      
      const newUser = await register(
        userInfo.email,
        password,
        true, // is_admin
        userInfo.givenName,
        userInfo.familyName,
        companyId
      );
      return newUser;
    }
  } catch (e) {
    throw new AccessError(`Failed during QuickBooks user processing: ${e.message}`);
  }
}

export async function getAllUsers(companyId) {
  try {
    const result = await query( `
      SELECT 
        id, 
        display_email, 
        normalised_email, 
        given_name, 
        family_name, 
        is_admin,
        companyid
      FROM 
        users 
      WHERE 
        companyid = $1
    `, [companyId]);
    return result;
  } catch (e) {
    throw new AccessError('Could not get user information: ' + e.message);
  }
}

export async function updateUser(userId, userData) {
  const fields = Object.keys(userData);
  const saltRounds = 10;

  if (fields.length === 0) {
    throw new AccessError('No update data provided.');
  }

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const field of fields) {
    let value = userData[field];
      
    if (field === 'password') {
      value = await bcrypt.hash(value, saltRounds);
    }
    
    if (field === 'display_email') {
      const normalisedEmail = validator.normalizeEmail(value);
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
      setClauses.push(`normalised_email = $${paramIndex}`);
      values.push(normalisedEmail);
      paramIndex++;
    } else {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
      throw new AccessError('The provided update data does not contain any valid fields for update.');
  }

  values.push(userId);

  const sql = `
    UPDATE users 
    SET ${setClauses.join(', ')} 
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  try {
    const result = await query(sql, values);

    if (result.length === 0) {
      throw new AccessError('User not found or no update was necessary.');
    }

    delete result[0].password;
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
