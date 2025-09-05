import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { query, transaction, decryptToken } from '../helpers.js';
import bcrypt from 'bcrypt';
import validator from 'validator';
import crypto from 'crypto';
import { isAccountLocked, incrementFailedAttempts, resetFailedAttempts } from './securityService.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { AUTH_ERROR_CODES } from '../constants/errorCodes.js';
import { permissionService } from './permissionService.js';
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from './emailService.js';

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
    const oauthClient = await tokenService.getOAuthClient(companyId, connectionType);
    return oauthClient;
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

          // Get user and company info
      const result = await query(`
        SELECT 
          u.*,
          c.connection_type,
          c.qbo_token_data,
          c.xero_token_data,
          c.qbo_realm_id,
          c.xero_tenant_id
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

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // Increment failed attempts for invalid password
      await incrementFailedAttempts(email, ipAddress, userAgent);
      throw new AuthenticationError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(email);

    // Get the appropriate token data based on connection type
    let tokenData = null;
    let connectionType = user.connection_type || 'qbo';

    try {
      if (connectionType === 'qbo' && user.qbo_token_data) {
        // Decrypt and parse QBO token data
        const decryptedData = decryptToken(user.qbo_token_data);
        tokenData = JSON.parse(decryptedData);
        
        tokenData = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
          realmId: tokenData.realm_id
        };
      } else if (connectionType === 'xero' && user.xero_token_data) {
        // Decrypt and parse Xero token data
        const decryptedData = decryptToken(user.xero_token_data);
        tokenData = JSON.parse(decryptedData);
        
        tokenData = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          tenant_id: tokenData.tenant_id
        };
      } else {
        throw new Error('No valid token data found');
      }

      // Try to refresh the token if needed
      const refreshedToken = await refreshToken(tokenData, connectionType);

      if (JSON.stringify(refreshedToken) !== JSON.stringify(tokenData)) {
        // Token was refreshed, update the database
        await tokenService.storeTokenData(user.company_id, connectionType, refreshedToken);
        user.token = refreshedToken;
      } else {
        user.token = tokenData;
      }

      // Add connection type to user object for frontend use
      user.connectionType = connectionType;

    } catch (error) {
      // Handle specific token errors
      if (error.message === 'QBO_TOKEN_REVOKED' || error.message === 'XERO_TOKEN_REVOKED') {
        user.reAuthRequired = true;
        user.connectionType = connectionType;
      } else if (error.message.includes('REAUTH_REQUIRED')) {
        user.reAuthRequired = true;
        user.connectionType = connectionType;
      } else {
        console.error('Token refresh error:', error);
        user.reAuthRequired = true;
        user.connectionType = connectionType;
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
        companyId
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

/**
 * Request password reset - generates token and sends email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Success response
 */
export async function requestPasswordReset(email) {
  try {
    const normalisedEmail = validator.normalizeEmail(email);
    
    // Check if user exists
    const result = await query(
      'SELECT id, display_email, given_name, family_name FROM users WHERE normalised_email = $1',
      [normalisedEmail]
    );

    if (result.length === 0) {
      // Don't reveal if user exists or not for security
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const user = result[0];
    
    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Store reset token in database
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, tokenExpiry, user.id]
    );

    // Send password reset email
    const userName = `${user.given_name} ${user.family_name}`.trim();
    await sendPasswordResetEmail(user.display_email, resetToken, userName);

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to process password reset request');
  }
}

/**
 * Reset password using token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success response
 */
export async function resetPassword(token, newPassword) {
  try {
    // Find user with valid reset token
    const result = await query(
      'SELECT id, display_email, given_name, family_name, password_reset_expires FROM users WHERE password_reset_token = $1',
      [token]
    );

    if (result.length === 0) {
      throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Invalid or expired reset token');
    }

    const user = result[0];

    // Check if token is expired
    if (new Date() > new Date(user.password_reset_expires)) {
      throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Reset token has expired');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Send confirmation email
    const userName = `${user.given_name} ${user.family_name}`.trim();
    await sendPasswordResetConfirmationEmail(user.display_email, userName);

    return { message: 'Password has been successfully reset' };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    console.error('Error resetting password:', error);
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to reset password');
  }
}
