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
import { 
    ConnectionType, 
    UserFromDB, 
    CompanyFromDB,
    LoginUser, 
    UpdateUserPayload, 
    OAuthUserInfo,
    UserForFrontend
} from '../types/auth.js';
import { OauthClient, QboToken, XeroToken } from '../types/token.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient } from 'xero-node';

export function initializeOAuthClient(connectionType: ConnectionType): OauthClient {
  if (connectionType === 'qbo') {
    return authSystem.initializeQBO();
  } else if (connectionType === 'xero') {
    return authSystem.initializeXero();
  }
  throw new Error(`Unsupported connection type: ${connectionType}`);
}

export async function getAuthUri(connectionType: ConnectionType, rememberMe: boolean = false): Promise<string> {
  if (connectionType === 'qbo') {
    return authSystem.getQBOAuthUri(rememberMe);
  } else if (connectionType === 'xero') {
    return await authSystem.getXeroAuthUri(rememberMe);
  }
  throw new Error(`Unsupported connection type: ${connectionType}`);
}

export async function getBaseURL(oauthClient: OauthClient, connectionType: ConnectionType): Promise<string> {
  if (connectionType === 'qbo') {
    return await authSystem.getQBOBaseURL(oauthClient as IntuitOAuthClient);
  } else if (connectionType === 'xero') {
    return authSystem.getXeroBaseURL();
  }
  throw new Error(`Unsupported connection type: ${connectionType}`);
}

export function getRealmId(oauthClient: IntuitOAuthClient): string {
  return authSystem.getQBORealmId(oauthClient);
}

export async function getTenantId(oauthClient: XeroClient): Promise<string> {
  return await authSystem.getXeroTenantId(oauthClient);
}

export async function handleCallback(url: string, connectionType: ConnectionType): Promise<QboToken | XeroToken> {
  try {
    if (connectionType === 'qbo') {
      return await authSystem.handleQBOCallback(url);
    } else if (connectionType === 'xero') {
      return await authSystem.handleXeroCallback(url);
    }
    throw new Error(`Unsupported connection type: ${connectionType}`);
  } catch (e: any) {
    console.error(e);
    throw new AccessError('Could not create token.');
  }
}

export async function refreshToken(token: QboToken | XeroToken, connectionType: ConnectionType): Promise<QboToken | XeroToken> {
  try {
    if (connectionType === 'qbo') {
      return await authSystem.refreshQBOToken(token as QboToken);
    } else if (connectionType === 'xero') {
      return await authSystem.refreshXeroToken(token as XeroToken);
    }
    throw new Error(`Unsupported connection type: ${connectionType}`);
  } catch (e: any) {
    if (e.message === 'QBO_TOKEN_REVOKED') {
      throw new AuthenticationError(AUTH_ERROR_CODES.TOKEN_REVOKED);
    } else if (e.message === 'XERO_TOKEN_REVOKED') {
      throw new AuthenticationError(AUTH_ERROR_CODES.TOKEN_REVOKED);
    }
    throw new AccessError('Failed to refresh token: ' + e.message);
  }
}

export async function getOAuthClient(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<OauthClient> {
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

export async function login(email: string, password: string, ipAddress: string | null = null, userAgent: string | null = null): Promise<LoginUser> {
  try {
    const lockoutStatus = await isAccountLocked(email);
    if (lockoutStatus.isLocked && lockoutStatus.lockedUntil) {
      const remainingTime = Math.ceil((new Date(lockoutStatus.lockedUntil).getTime() - new Date().getTime()) / 1000 / 60);
      throw new AuthenticationError(AUTH_ERROR_CODES.ACCOUNT_LOCKED, `Account temporarily locked. Try again in ${remainingTime} minutes.`);
    }

    const result: (UserFromDB & CompanyFromDB)[] = await query(`
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
      await incrementFailedAttempts(email, ipAddress, userAgent);
      throw new AuthenticationError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const userWithCompany: (UserFromDB & CompanyFromDB) = result[0];

    const user: LoginUser = {
        ...userWithCompany,
        connectionType: userWithCompany.connection_type || 'qbo'
    };

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await incrementFailedAttempts(email, ipAddress, userAgent);
      throw new AuthenticationError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    await resetFailedAttempts(email);

    let tokenData: QboToken | XeroToken | null = null;
    let connectionType = user.connectionType;

    try {
        const encryptedTokenData = connectionType === 'qbo' ? result[0].qbo_token_data : result[0].xero_token_data;
        if (!encryptedTokenData) {
            throw new Error('No valid token data found');
        }

        const decryptedData = decryptToken(encryptedTokenData);
        const parsedData = JSON.parse(decryptedData as string);
        
        if (connectionType === 'qbo') {
            tokenData = {
                access_token: parsedData.access_token,
                refresh_token: parsedData.refresh_token,
                expires_in: parsedData.expires_in,
                x_refresh_token_expires_in: parsedData.x_refresh_token_expires_in,
                realmId: parsedData.realmId,
                created_at: parsedData.created_at
            };
        } else {
            tokenData = {
                access_token: parsedData.access_token,
                refresh_token: parsedData.refresh_token,
                expires_at: parsedData.expires_at,
                tenant_id: parsedData.tenant_id,
                created_at: parsedData.created_at
            };
        }

      if(tokenData) {
        const refreshedToken = await refreshToken(tokenData, connectionType);

        if (JSON.stringify(refreshedToken) !== JSON.stringify(tokenData)) {
            await tokenService.storeTokenData(user.company_id, connectionType, refreshedToken);
            user.token = refreshedToken;
        } else {
            user.token = tokenData;
        }
      }
    } catch (error: any) {
      if (error.message === 'QBO_TOKEN_REVOKED' || error.message === 'XERO_TOKEN_REVOKED' || error.message.includes('REAUTH_REQUIRED')) {
        user.reAuthRequired = true;
      } else {
        console.error('Token refresh error:', error);
        user.reAuthRequired = true;
      }
    }

    return user;
  } catch (error: any) {
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}

export async function register(displayEmail: string, password: string, is_admin: boolean, givenName: string, familyName: string | null, companyId: string): Promise<UserFromDB> {
  const saltRounds = 10;
  const normalisedEmail = validator.normalizeEmail(displayEmail) as string;

  const existingUser: { id: string }[] = await query(
    'SELECT id FROM users WHERE normalised_email = $1',
    [normalisedEmail]
  );

  if (existingUser.length > 0) {
    throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'An account with this email address already exists. Please log in.');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const result: UserFromDB[] = await query(`
    INSERT INTO users (normalised_email, password_hash, is_admin, given_name, family_name, company_id, display_email) 
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [normalisedEmail, hashedPassword, is_admin, givenName, familyName, companyId, displayEmail]
  );
  
  if (result.length === 0) {
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Unable to register user.');
  }

  if (companyId) {
    try {
      await permissionService.setDefaultPermissions(result[0].id, companyId, is_admin);
    } catch (permissionError) {
      console.warn('Failed to set default permissions for user:', permissionError);
    }
  }

  return result[0];
}

export async function deleteUser(userId: string, sessionId: string): Promise<UserFromDB> {
  try {
    return await transaction(async (client) => {
      if (sessionId) {
        await client.query(
          'DELETE FROM sessions WHERE sid = $1',
          [sessionId]
        );
      }
      
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
  } catch (error: any) {
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
  }
};

async function getUserInfo(token: QboToken | XeroToken, connectionType: ConnectionType): Promise<OAuthUserInfo> {
  try {
    if (connectionType === 'qbo') {
      return await authSystem.getQBOUserInfo(token as QboToken);
    } else if (connectionType === 'xero') {
      return await authSystem.getXeroUserInfo(token as XeroToken);
    }
    throw new Error(`Unsupported connection type: ${connectionType}`);
  } catch (e: any) {
    throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information: ' + e.message);
  }
}

export async function saveUserFromOAuth(token: QboToken | XeroToken, companyId: string, connectionType: ConnectionType): Promise<UserFromDB> {
  try {
    const userInfo = await getUserInfo(token, connectionType);
    const normalisedEmail = validator.normalizeEmail(userInfo.email) as string;

    const existingUserResult: UserFromDB[] = await query(
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
  } catch (e: any) {
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Failed during ${connectionType} user processing: ${e.message}`);
  }
}

export async function getAllUsers(companyId: string): Promise<UserForFrontend[]> {
  try {
    const result: UserForFrontend[] = await query( `
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
  } catch (e: any) {
    throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information: ' + e.message);
  }
}

export async function updateUser(userId: string, userData: UpdateUserPayload): Promise<UserFromDB> {
  const fields = Object.keys(userData) as (keyof UpdateUserPayload)[];
  const saltRounds = 10;

  if (fields.length === 0) {
    throw new AccessError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'No update data provided.');
  }

  const setClauses: string[] = [];
  const values: (string | boolean | number)[] = [];
  let paramIndex = 1;

  for (const field of fields) {
    let value = userData[field];
      
    if (field === 'password') {
        if(typeof value === 'string'){
            value = await bcrypt.hash(value, saltRounds);
        }
    }
    
    if (field === 'display_email' && typeof value === 'string') {
      const normalisedEmail = validator.normalizeEmail(value);
      setClauses.push(`${field} = $${paramIndex++}`);
      values.push(value);
      setClauses.push(`normalised_email = $${paramIndex++}`);
      values.push(normalisedEmail as string);
    } else {
      setClauses.push(`${field} = $${paramIndex++}`);
      values.push(value!);
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
    const result: UserFromDB[] = await query(sql, values);

    if (result.length === 0) {
      throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'User not found or no update was necessary.');
    }

    delete (result[0] as any).password;
    return result[0];
  } catch (error: any) {
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}

export async function revokeToken(token: QboToken | XeroToken, connectionType: ConnectionType = 'qbo'): Promise<void> {
  try {
    if (connectionType === 'qbo') {
      await authSystem.revokeQBOToken(token as QboToken);
    } else if (connectionType === 'xero') {
      await authSystem.revokeXeroToken(token as XeroToken);
    } else {
      throw new Error(`Unsupported connection type: ${connectionType}`);
    }
  } catch (e: any) {
    console.error(`Error revoking ${connectionType} token:`, e);
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Could not revoke ${connectionType} token: ` + e.message);
  }
}

export async function revokeQuickBooksToken(token: QboToken): Promise<void> {
  return revokeToken(token, 'qbo');
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  try {
    const normalisedEmail = validator.normalizeEmail(email);
    
    const result: { id: string, display_email: string, given_name: string, family_name: string }[] = await query(
      'SELECT id, display_email, given_name, family_name FROM users WHERE normalised_email = $1',
      [normalisedEmail]
    );

    if (result.length === 0) {
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const user = result[0];
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, tokenExpiry, user.id]
    );

    const userName = `${user.given_name} ${user.family_name}`.trim();
    await sendPasswordResetEmail(user.display_email, resetToken, userName);

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  } catch (error: any) {
    console.error('Error requesting password reset:', error);
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to process password reset request');
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  try {
    const result: { id: string, display_email: string, given_name: string, family_name: string, password_reset_expires: Date }[] = await query(
      'SELECT id, display_email, given_name, family_name, password_reset_expires FROM users WHERE password_reset_token = $1',
      [token]
    );

    if (result.length === 0) {
      throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Invalid or expired reset token');
    }

    const user = result[0];

    if (new Date() > new Date(user.password_reset_expires)) {
      throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Reset token has expired');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    const userName = `${user.given_name} ${user.family_name}`.trim();
    await sendPasswordResetConfirmationEmail(user.display_email, userName);

    return { message: 'Password has been successfully reset' };
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    console.error('Error resetting password:', error);
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to reset password');
  }
}
