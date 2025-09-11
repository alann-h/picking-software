import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { decryptToken } from '../helpers.js';
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
  } catch (e: unknown) {
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
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'QBO_TOKEN_REVOKED' || e.message === 'XERO_TOKEN_REVOKED') {
        throw new AuthenticationError(AUTH_ERROR_CODES.TOKEN_REVOKED);
      }
      throw new AccessError('Failed to refresh token: ' + e.message);
    }
    throw new AccessError('Failed to refresh token: An unknown error occurred');
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

    const userWithCompany = await prisma.user.findUnique({
      where: { normalisedEmail: email },
      include: {
        company: {
          select: {
            connectionType: true,
            qboTokenData: true,
            xeroTokenData: true,
            qboRealmId: true,
            xeroTenantId: true,
          },
        },
      },
    });

    if (!userWithCompany) {
      await incrementFailedAttempts(email, ipAddress, userAgent);
      throw new AuthenticationError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const user: LoginUser = {
      id: userWithCompany.id,
      company_id: userWithCompany.companyId!,
      given_name: userWithCompany.givenName,
      family_name: userWithCompany.familyName,
      display_email: userWithCompany.displayEmail,
      normalised_email: userWithCompany.normalisedEmail,
      password_hash: userWithCompany.passwordHash,
      is_admin: userWithCompany.isAdmin,
      failed_attempts: userWithCompany.failedAttempts,
      last_failed_attempt: userWithCompany.lastFailedAttempt,
      locked_until: userWithCompany.lockedUntil,
      password_reset_token: userWithCompany.passwordResetToken,
      password_reset_expires: userWithCompany.passwordResetExpires,
      created_at: userWithCompany.createdAt,
      updated_at: userWithCompany.updatedAt,
      connectionType: (userWithCompany.company?.connectionType as ConnectionType) || 'qbo',
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
        const encryptedTokenData = connectionType === 'qbo' ? userWithCompany.company?.qboTokenData : userWithCompany.company?.xeroTokenData;
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
    } catch (error: unknown) {
      if (error instanceof Error && (error.message === 'QBO_TOKEN_REVOKED' || error.message === 'XERO_TOKEN_REVOKED' || error.message.includes('REAUTH_REQUIRED'))) {
        user.reAuthRequired = true;
      } else {
        console.error('Token refresh error:', error);
        user.reAuthRequired = true;
      }
    }

    return user;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
    }
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'An unknown error occurred during login.');
  }
}

export async function register(displayEmail: string, password: string, is_admin: boolean, givenName: string, familyName: string | null, companyId: string): Promise<UserFromDB> {
  const saltRounds = 10;
  const normalisedEmail = validator.normalizeEmail(displayEmail) as string;

  const existingUser = await prisma.user.findUnique({
    where: { normalisedEmail },
    select: { id: true },
  });

  if (existingUser) {
    throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'An account with this email address already exists. Please log in.');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const newUser = await prisma.user.create({
    data: {
      normalisedEmail,
      passwordHash: hashedPassword,
      isAdmin: is_admin,
      givenName,
      familyName,
      companyId,
      displayEmail,
    },
  });

  if (companyId) {
    try {
      await permissionService.setDefaultPermissions(newUser.id, companyId, is_admin);
    } catch (permissionError) {
      console.warn('Failed to set default permissions for user:', permissionError);
    }
  }

  return {
    id: newUser.id,
      company_id: newUser.companyId!,
    given_name: newUser.givenName,
    family_name: newUser.familyName,
    display_email: newUser.displayEmail,
    normalised_email: newUser.normalisedEmail,
    password_hash: newUser.passwordHash,
    is_admin: newUser.isAdmin,
    failed_attempts: newUser.failedAttempts,
    last_failed_attempt: newUser.lastFailedAttempt,
    locked_until: newUser.lockedUntil,
    password_reset_token: newUser.passwordResetToken,
    password_reset_expires: newUser.passwordResetExpires,
    created_at: newUser.createdAt,
    updated_at: newUser.updatedAt,
  };
}

export async function deleteUser(userId: string, sessionId: string): Promise<UserFromDB> {
  try {
    return await prisma.$transaction(async (tx) => {
      if (sessionId) {
        await tx.session.delete({
          where: { sid: sessionId },
        });
      }
      
      const deletedUser = await tx.user.delete({
        where: { id: userId },
      });
      
      return {
        id: deletedUser.id,
        company_id: deletedUser.companyId!,
        given_name: deletedUser.givenName,
        family_name: deletedUser.familyName,
        display_email: deletedUser.displayEmail,
        normalised_email: deletedUser.normalisedEmail,
        password_hash: deletedUser.passwordHash,
        is_admin: deletedUser.isAdmin,
        failed_attempts: deletedUser.failedAttempts,
        last_failed_attempt: deletedUser.lastFailedAttempt,
        locked_until: deletedUser.lockedUntil,
        password_reset_token: deletedUser.passwordResetToken,
        password_reset_expires: deletedUser.passwordResetExpires,
        created_at: deletedUser.createdAt,
        updated_at: deletedUser.updatedAt,
      };
    });
  } catch (error: unknown) {
    if (error instanceof Object && 'code' in error && error.code === 'P2025') {
      // Prisma error for record not found
      throw new AuthenticationError(AUTH_ERROR_CODES.NOT_FOUND, 'User not found');
    }
    if (error instanceof Error) {
      throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
    }
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'An unknown error occurred while deleting the user.');
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
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information: ' + e.message);
    }
    throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information due to an unknown error.');
  }
}

export async function saveUserFromOAuth(token: QboToken | XeroToken, companyId: string, connectionType: ConnectionType): Promise<UserFromDB> {
  try {
    const userInfo = await getUserInfo(token, connectionType);
    const normalisedEmail = validator.normalizeEmail(userInfo.email) as string;

    const existingUser = await prisma.user.findUnique({
      where: { normalisedEmail },
    });

    if (existingUser) {
      if (existingUser.companyId !== companyId) {
        console.log(`User ${normalisedEmail} switching from company ${existingUser.companyId} to ${companyId} via ${connectionType}`);
        
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { companyId },
        });
        
        try {
          await permissionService.setDefaultPermissions(updatedUser.id, companyId, updatedUser.isAdmin);
        } catch (permissionError) {
          console.warn('Failed to set default permissions for user switching companies:', permissionError);
        }
        
        return {
          id: updatedUser.id,
          company_id: updatedUser.companyId!,
          given_name: updatedUser.givenName,
          family_name: updatedUser.familyName,
          display_email: updatedUser.displayEmail,
          normalised_email: updatedUser.normalisedEmail,
          password_hash: updatedUser.passwordHash,
          is_admin: updatedUser.isAdmin,
          failed_attempts: updatedUser.failedAttempts,
          last_failed_attempt: updatedUser.lastFailedAttempt,
          locked_until: updatedUser.lockedUntil,
          password_reset_token: updatedUser.passwordResetToken,
          password_reset_expires: updatedUser.passwordResetExpires,
          created_at: updatedUser.createdAt,
          updated_at: updatedUser.updatedAt,
        };
      } else {
        console.log(`Existing user re-authenticated via ${connectionType}: ${normalisedEmail}`);
        
        return {
          id: existingUser.id,
          company_id: existingUser.companyId,
          given_name: existingUser.givenName,
          family_name: existingUser.familyName,
          display_email: existingUser.displayEmail,
          normalised_email: existingUser.normalisedEmail,
          password_hash: existingUser.passwordHash,
          is_admin: existingUser.isAdmin,
          failed_attempts: existingUser.failedAttempts,
          last_failed_attempt: existingUser.lastFailedAttempt,
          locked_until: existingUser.lockedUntil,
          password_reset_token: existingUser.passwordResetToken,
          password_reset_expires: existingUser.passwordResetExpires,
          created_at: existingUser.createdAt,
          updated_at: existingUser.updatedAt,
        };
      }
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
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Failed during ${connectionType} user processing: ${e.message}`);
    }
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Failed during ${connectionType} user processing due to an unknown error.`);
  }
}

export async function getAllUsers(companyId: string): Promise<UserForFrontend[]> {
  try {
    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        displayEmail: true,
        normalisedEmail: true,
        givenName: true,
        familyName: true,
        isAdmin: true,
        companyId: true,
      },
    });
    
    return users.map(user => ({
      id: user.id,
      display_email: user.displayEmail,
      normalised_email: user.normalisedEmail,
      given_name: user.givenName,
      family_name: user.familyName,
      is_admin: user.isAdmin,
      company_id: user.companyId!,
    }));
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information: ' + e.message);
    }
    throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'Could not get user information due to an unknown error.');
  }
}

export async function updateUser(userId: string, userData: UpdateUserPayload): Promise<UserFromDB> {
  const fields = Object.keys(userData) as (keyof UpdateUserPayload)[];
  const saltRounds = 10;

  if (fields.length === 0) {
    throw new AccessError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'No update data provided.');
  }

  const updateData: { [key: string]: string | boolean | null | undefined } = {};

  for (const field of fields) {
    let value = userData[field];
      
    if (field === 'password') {
        if(typeof value === 'string'){
            value = await bcrypt.hash(value, saltRounds);
        }
    }
    
    if (field === 'display_email' && typeof value === 'string') {
      const normalisedEmail = validator.normalizeEmail(value);
      updateData.displayEmail = value;
      updateData.normalisedEmail = normalisedEmail;
    } else {
      // Map field names to Prisma field names
      const fieldMap: { [key: string]: string } = {
        'given_name': 'givenName',
        'family_name': 'familyName',
        'is_admin': 'isAdmin',
        'password': 'passwordHash',
      };
      
      const prismaField: string = fieldMap[field] || field;
      updateData[prismaField] = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
      throw new AccessError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'The provided update data does not contain any valid fields for update.');
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      id: updatedUser.id,
      company_id: updatedUser.companyId!,
      given_name: updatedUser.givenName,
      family_name: updatedUser.familyName,
      display_email: updatedUser.displayEmail,
      normalised_email: updatedUser.normalisedEmail,
      password_hash: updatedUser.passwordHash,
      is_admin: updatedUser.isAdmin,
      failed_attempts: updatedUser.failedAttempts,
      last_failed_attempt: updatedUser.lastFailedAttempt,
      locked_until: updatedUser.lockedUntil,
      password_reset_token: updatedUser.passwordResetToken,
      password_reset_expires: updatedUser.passwordResetExpires,
      created_at: updatedUser.createdAt,
      updated_at: updatedUser.updatedAt,
    };
  } catch (error: unknown) {
    if (error instanceof Object && 'code' in error && error.code === 'P2025') {
      // Prisma error for record not found
      throw new AccessError(AUTH_ERROR_CODES.NOT_FOUND, 'User not found or no update was necessary.');
    }
    if (error instanceof Error) {
      throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
    }
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'An unknown error occurred during user update.');
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
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(`Error revoking ${connectionType} token:`, e);
      throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Could not revoke ${connectionType} token: ` + e.message);
    }
    console.error(`Error revoking ${connectionType} token:`, e);
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, `Could not revoke ${connectionType} token due to an unknown error.`);
  }
}

export async function revokeQuickBooksToken(token: QboToken): Promise<void> {
  return revokeToken(token, 'qbo');
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  try {
    const normalisedEmail = validator.normalizeEmail(email) as string;
    
    const user = await prisma.user.findUnique({
      where: { normalisedEmail },
      select: {
        id: true,
        displayEmail: true,
        givenName: true,
        familyName: true,
      },
    });

    if (!user) {
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: tokenExpiry,
      },
    });

    const userName = `${user.givenName} ${user.familyName}`.trim();
    await sendPasswordResetEmail(user.displayEmail, resetToken, userName);

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  } catch (error: unknown) {
    console.error('Error requesting password reset:', error);
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to process password reset request');
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  try {
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token },
      select: {
        id: true,
        displayEmail: true,
        givenName: true,
        familyName: true,
        passwordResetExpires: true,
      },
    });

    if (!user) {
      throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Invalid or expired reset token');
    }

    if (new Date() > new Date(user.passwordResetExpires!)) {
      throw new AuthenticationError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Reset token has expired');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    const userName = `${user.givenName} ${user.familyName}`.trim();
    await sendPasswordResetConfirmationEmail(user.displayEmail, userName);

    return { message: 'Password has been successfully reset' };
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    console.error('Error resetting password:', error);
    throw new AuthenticationError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to reset password');
  }
}
