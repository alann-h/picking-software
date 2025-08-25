import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { query, transaction, encryptToken, decryptToken } from '../helpers.js';
import bcrypt from 'bcrypt';
import validator from 'validator';
import crypto from 'crypto';
import { isAccountLocked, incrementFailedAttempts, resetFailedAttempts } from './securityService.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { AUTH_ERROR_CODES } from '../constants/errorCodes.js';
import { permissionService } from './permissionService.js';

// Generic OAuth client initialization - supports both QBO and Xero
export function initializeOAuthClient(connectionType) {
  if (connectionType === 'qbo') {
    return authSystem.initializeQBO();
  } else if (connectionType === 'xero') {
    return authSystem.initializeXero();
  }
  throw new Error(`Unsupported connection type: ${connectionType}`);
}

// Get auth URI for specified platform
export function getAuthUri(connectionType, rememberMe = false) {
  if (connectionType === 'qbo') {
    return authSystem.getQBOAuthUri(rememberMe);
  } else if (connectionType === 'xero') {
    return authSystem.getXeroAuthUri(rememberMe);
  }
  throw new Error(`Unsupported connection type: ${connectionType}`);
}

// Get base URL for specified platform
export function getBaseURL(oauthClient, connectionType) {
  if (connectionType === 'qbo') {
    return authSystem.getQBOBaseURL(oauthClient);
  } else if (connectionType === 'xero') {
    return authSystem.getXeroBaseURL();
  }
  throw new Error(`Unsupported connection type: ${connectionType}`);
}

// Get realm/tenant ID for specified platform
export function getRealmId(oauthClient) {
  return authSystem.getQBORealmId(oauthClient);
}

export async function getTenantId(oauthClient) {
  return await authSystem.getXeroTenantId(oauthClient);
}

export async function handleCallback(url, connectionType) {
  try {
    if (connectionType === 'qbo') {
      return await authSystem.handleQBOCallback(url);
    } else if (connectionType === 'xero') {
      return await authSystem.handleXeroCallback(url);
    }
    throw new Error(`Unsupported connection type: ${connectionType}`);
  } catch (e) {
    console.error(e);
    throw new AccessError('Could not create token.');
  }
}

export async function refreshToken(token, connectionType) {
  try {
    if (connectionType === 'qbo') {
      return await authSystem.refreshQBOToken(token);
    } else if (connectionType === 'xero') {
      return await authSystem.refreshXeroToken(token);
    }
    throw new Error(`Unsupported connection type: ${connectionType}`);
  } catch (e) {
    if (e.message === 'QBO_TOKEN_REVOKED') {
      throw new AuthenticationError('QBO_TOKEN_REVOKED');
    } else if (e.message === 'XERO_TOKEN_REVOKED') {
      throw new AuthenticationError('XERO_TOKEN_REVOKED');
    }
    throw new AccessError('Failed to refresh token: ' + e.message);
  }
}

export async function getOAuthClient(companyId, connectionType = 'qbo') {
  if (!companyId) {
    throw new Error('A companyId is required to get the OAuth client.');
  }

  try {
    // Use the new generic token service for better token management
    return await tokenService.getOAuthClient(companyId, connectionType);
  } catch (error) {
    console.error(`Error getting OAuth client for company ${companyId} (${connectionType}):`, error);
    throw error;
  }
}

export async function login(email, password, ipAddress = null, userAgent = null) {
  try {
    // Check if account is locked
    const lockoutStatus = await isAccountLocked(email);
    if (lockoutStatus.isLocked) {
      const remainingTime = Math.ceil((new Date(lockoutStatus.lockedUntil) - new Date()) / 1000 / 60);
      throw new AuthenticationError(AUTH_ERROR_CODES.ACCOUNT_LOCKED, `Account temporarily locked. Try again in ${remainingTime} minutes.`);
    }

    const result = await query(`
      SELECT 
        u.*,
        c.qb_token as token,
        c.qb_realm_id as realm_id
      FROM users u
      JOIN companies c ON u.company_id = c.id
      WHERE u.normalised_email = $1
    `, [email]);

    if (result.length === 0) {
      // Increment failed attempts for non-existent user
      await incrementFailedAttempts(email, ipAddress, userAgent);
      throw new AuthenticationError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const user = result[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment failed attempts for invalid password
      await incrementFailedAttempts(email, ipAddress, userAgent);
      throw new AuthenticationError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(email);

    const decryptedToken = decryptToken(user.token);

    try {
      const refreshedToken = await refreshToken(decryptedToken);

      if (JSON.stringify(refreshedToken) !== JSON.stringify(decryptedToken)) {
        const encryptedToken = encryptToken(refreshedToken);
        // Update the company's token in the database with the newly encrypted token
        await query(
          'UPDATE companies SET qb_token = $1 WHERE id = $2',
          [encryptedToken, user.company_id]
        );
        user.token = refreshedToken;
      }
    } catch (error) {
      // 💡 CATCH THE SPECIFIC REVOKED TOKEN ERROR
      if (error.message === 'QBO_TOKEN_REVOKED') {
        user.qboReAuthRequired = true;
      } else {
        throw new AuthenticationError(AUTH_ERROR_CODES.TOKEN_INVALID, error.message);
      }
    }
    return user;
  } catch (error) {
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
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
    throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'An account with this email address already exists. Please log in.');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const result = await query(`
    INSERT INTO users (normalised_email, password_hash, is_admin, given_name, family_name, company_id, display_email) 
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [normalisedEmail, hashedPassword, is_admin, givenName, familyName, companyId, displayEmail]
  );
  
  if (result.length === 0) {
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Unable to register user.');
  }

  // Set default permissions for the new user
  if (companyId) {
    try {
      await permissionService.setDefaultPermissions(result[0].id, companyId, is_admin);
    } catch (permissionError) {
      console.warn('Failed to set default permissions for user:', permissionError);
      // Don't fail user registration if permission setting fails
    }
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
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
  }
};

async function getUserInfo(token, connectionType) {
  try {
    if (connectionType === 'qbo') {
      return await authSystem.getQBOUserInfo(token);
    } else if (connectionType === 'xero') {
      return await authSystem.getXeroUserInfo(token);
    }
    throw new Error(`Unsupported connection type: ${connectionType}`);
  } catch (e) {
    throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information: ' + e.message);
  }
}

export async function saveUserFromOAuth(token, companyId, connectionType) {
  try {
    const userInfo = await getUserInfo(token, connectionType);
    const normalisedEmail = validator.normalizeEmail(userInfo.email);

    const existingUserResult = await query(
      'SELECT * FROM users WHERE normalised_email = $1',
      [normalisedEmail]
    );

    if (existingUserResult.length > 0) {
      const existingUser = existingUserResult[0];
      
      if (existingUser.company_id !== companyId) {
        console.log(`User ${normalisedEmail} switching from company ${existingUser.company_id} to ${companyId} via ${connectionType}`);
        
        await query(
          'UPDATE users SET company_id = $1 WHERE id = $2',
          [companyId, existingUser.id]
        );
        
        existingUser.company_id = companyId;
        
        try {
          await permissionService.setDefaultPermissions(existingUser.id, companyId, existingUser.is_admin);
        } catch (permissionError) {
          console.warn('Failed to set default permissions for user switching companies:', permissionError);
        }
      } else {
        console.log(`Existing user re-authenticated via ${connectionType}: ${normalisedEmail}`);
      }
      
      return existingUser;
    } 
    
    else {
      console.log(`New user registering via ${connectionType}: ${normalisedEmail}`);
      const password = crypto.randomBytes(16).toString('hex');
      
      const newUser = await register(
        userInfo.email,
        password,
        true, // is_admin
        userInfo.givenName,
        userInfo.familyName,
        companyId,
        connectionType
      );
      return newUser;
    }
  } catch (e) {
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Failed during ${connectionType} user processing: ${e.message}`);
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
        company_id
      FROM 
        users 
      WHERE 
        company_id = $1
    `, [companyId]);
    return result;
  } catch (e) {
    throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information: ' + e.message);
  }
}

export async function updateUser(userId, userData) {
  const fields = Object.keys(userData);
  const saltRounds = 10;

  if (fields.length === 0) {
    throw new AccessError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'No update data provided.');
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
      throw new AccessError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'The provided update data does not contain any valid fields for update.');
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
      throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'User not found or no update was necessary.');
    }

    delete result[0].password;
    return result[0];
  } catch (error) {
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}

export async function revokeToken(token, connectionType = 'qbo') {
  try {
    if (connectionType === 'qbo') {
      await authSystem.revokeQBOToken(token);
    } else if (connectionType === 'xero') {
      await authSystem.revokeXeroToken(token);
    } else {
      throw new Error(`Unsupported connection type: ${connectionType}`);
    }
  } catch (e) {
    console.error(`Error revoking ${connectionType} token:`, e);
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Could not revoke ${connectionType} token: ` + e.message);
  }
}

// Keep backward compatibility
export async function revokeQuickBooksToken(token) {
  return revokeToken(token, 'qbo');
}
