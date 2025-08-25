// src/controllers/authController.js
import * as authService from '../services/authService.js';
import { saveCompanyInfo, removeCompanyData } from '../services/companyService.js';
import { logSecurityEvent } from '../services/securityService.js'; // Added import for security logging

// GET /auth/qbo-uri
export async function qboAuthUri(req, res, next) {
  try {
    const rememberMe = req.query.rememberMe === 'true';
    const uri = await authService.getAuthUri('qbo', rememberMe);
    res.redirect(uri);
  } catch (err) {
    next(err);
  }
}

// GET /auth/xero-uri
export async function xeroAuthUri(req, res, next) {
  try {
    const rememberMe = req.query.rememberMe === 'true';
    const uri = await authService.getAuthUri('xero', rememberMe);
    res.redirect(uri);
  } catch (err) {
    next(err);
  }
}

// GET /auth/qbo-callback or /auth/xero-callback
export async function callback(req, res, next) {
  try {
    // Determine platform from the route
    const isXero = req.path.includes('xero-callback');
    const connectionType = isXero ? 'xero' : 'qbo';
    
    console.log(`Processing ${connectionType.toUpperCase()} callback`);

    // Construct full URL for OAuth callback processing
    const fullUrl = req.url.startsWith('http') ? req.url : `${req.protocol}://${req.get('host')}${req.url}`;

    const token = await authService.handleCallback(fullUrl, connectionType);
    const companyInfo = await saveCompanyInfo(token, connectionType);
    const user = await authService.saveUserFromOAuth(token, companyInfo.id, connectionType);

    req.session.companyId = companyInfo.id;
    req.session.isAdmin = true;
    req.session.userId = user.id;
    req.session.name = user.given_name + ' ' + user.family_name;
    req.session.email = user.display_email;
    req.session.connectionType = connectionType; // Store which platform was used

    // Check if "Remember Me" was requested (stored in state or query param)
    const rememberMe = req.query.rememberMe === 'true' || req.query.state?.includes('rememberMe=true');
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    req.session.save(err => {
      if (err) return next(err);
      const redirectUri =
        process.env.VITE_APP_ENV === 'production'
          ? 'https://smartpicker.au/oauth/callback'
          : 'http://localhost:5173/oauth/callback';
      res.redirect(redirectUri);
    });
  } catch (err) {
    next(err);
  }
}

// POST /auth/login
export async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await authService.login(email, password, req.ip, req.headers['user-agent']);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate(async (err) => {
      if (err) {
        console.error('Error regenerating session during login:', err);
        return next(err);
      }
      
      // Set session data in new session
      req.session.isAdmin = user.is_admin;
      req.session.userId = user.id;
      req.session.companyId = user.company_id; // Database UUID
      req.session.name = user.given_name + ' ' + user.family_name;
      req.session.email = user.display_email;
      req.session.loginTime = new Date().toISOString();
      req.session.userAgent = req.headers['user-agent'];
      req.session.ipAddress = req.ip;

      // Handle "Remember Me" - extend session to 30 days
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      // Log successful login
      try {
        await logSecurityEvent({
          userId: user.id,
          event: 'LOGIN_SUCCESS',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
          metadata: {
            rememberMe,
            companyId: user.company_id
          }
        });
      } catch (logError) {
        console.warn('Failed to log security event:', logError);
        // Don't fail login if logging fails
      }

      res.json(user);
    });
  } catch (err) {
    // Security service handles failed login logging with proper context
    next(err);
  }
}

// POST /auth/register
export async function register(req, res, next) {
  try {
    const { email, password, isAdmin, givenName, familyName } = req.body;
    const companyId = req.session.companyId;
    const connectionType = req.session.connectionType;

    const newUser = await authService.register(
      email,
      password,
      isAdmin,
      givenName,
      familyName,
      companyId,
      connectionType
    );
    res.json(newUser);
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/delete/:userId
export async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    const currentUserId = req.session.userId;
    const companyId = req.session.companyId;
    
    console.log(`User ${currentUserId} from company ${companyId} is deleting user ${userId}`);
    
    const sessionId = req.session.userId === userId ? req.session.id : null;
    const deleted = await authService.deleteUser(userId, sessionId);

    if (sessionId) {
      // User is deleting their own account, destroy session
      console.log(`User ${userId} is deleting their own account, destroying session`);
      
      req.session.destroy(err => {
        if (err) {
          console.error('Error destroying session during user deletion:', err);
          return next(err);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid', {
          httpOnly: true,
          secure: process.env.VITE_APP_ENV === 'production',
          sameSite: process.env.VITE_APP_ENV === 'production' ? 'none' : 'lax',
          domain: process.env.VITE_APP_ENV === 'production' ? '.smartpicker.au' : undefined,
          path: '/'
        });
        
        console.log(`Successfully deleted user ${userId} and destroyed their session`);
        res.json({
          ...deleted,
          message: 'User account deleted and session terminated',
          timestamp: new Date().toISOString()
        });
      });
    } else {
      // Admin is deleting another user's account
      console.log(`Admin ${currentUserId} successfully deleted user ${userId}`);
      res.json({
        ...deleted,
        message: 'User account deleted successfully',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    next(err);
  }
}

// PUT /auth/update/:userId
export async function updateUser(req, res, next) {
  try {
    const { userId } = req.params;
    const updated = await authService.updateUser(userId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// GET /auth/users
export async function getAllUsers(req, res, next) {
  try {
    const users = await authService.getAllUsers(req.session.companyId);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/disconnect
export async function disconnect(req, res, next) {
  try {
    const userId = req.session.userId;
    const companyId = req.session.companyId;
    
    console.log(`User ${userId} from company ${companyId} is disconnecting from QuickBooks`);
    
    if (!companyId) {
      return res.status(400).json({ error: 'No company ID found in session' });
    }

    try {
      const oauthClient = await authService.getOAuthClient(companyId);
      const tokenToRevoke = oauthClient.getToken();

      await authService.revokeQuickBooksToken(tokenToRevoke);
      console.log(`Successfully revoked QuickBooks token for company ${companyId}`);
    } catch (tokenError) {
      console.warn(`Could not revoke QuickBooks token for company ${companyId}:`, tokenError.message);
      // Continue with disconnection even if token revocation fails
    }
    
    try {
      await removeCompanyData(companyId);
      console.log(`Successfully removed QuickBooks data for company ${companyId}`);
    } catch (dataError) {
      console.warn(`Could not remove QuickBooks data for company ${companyId}:`, dataError.message);
      // Continue with disconnection even if data removal fails
    }

    // Clear session data
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session during QuickBooks disconnect:', err);
        return next(err);
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        httpOnly: true,
        secure: process.env.VITE_APP_ENV === 'production',
        sameSite: process.env.VITE_APP_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.VITE_APP_ENV === 'production' ? '.smartpicker.au' : undefined,
        path: '/'
      });
      
      console.log(`Successfully disconnected user ${userId} from QuickBooks`);
      res.json({ 
        message: 'Successfully disconnected from QuickBooks',
        timestamp: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error('Unexpected error during QuickBooks disconnect:', err);
    next(err);
  }
}

// POST /auth/logout
export async function logout(req, res, next) {
  try {
    const userId = req.session?.userId;
    const companyId = req.session?.companyId;
    
    console.log(`User ${userId} from company ${companyId} is logging out`);
    
    // Clear session data
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session during logout:', err);
        return next(err);
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        httpOnly: true,
        secure: process.env.VITE_APP_ENV === 'production',
        sameSite: process.env.VITE_APP_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.VITE_APP_ENV === 'production' ? '.smartpicker.au' : undefined,
        path: '/'
      });
      
      console.log(`Successfully logged out user ${userId}`);
      res.json({ 
        message: 'Successfully logged out',
        timestamp: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error('Unexpected error during logout:', err);
    next(err);
  }
}
