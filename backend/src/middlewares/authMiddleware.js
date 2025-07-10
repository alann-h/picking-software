import { decryptToken } from '../helpers.js';

export const isAuthenticated = (req, res, next) => {
  if (!req.session.token) {
    return res.status(401).json({ error: 'Please log in.' });
  }
  next();
};

export const decryptSessionToken = (req, res, next) => {
  if (req.session.token) {
    try {
      req.decryptedToken = decryptToken(req.session.token);
    } catch {
      return res.status(400).json({ error: 'Invalid session token' });
    }
  }
  next();
};

/**
 * Checks if the logged-in user is an administrator.
 * If not, it sends a 403 Forbidden error.
 */
export const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden. Administrator access required.' });
};

/**
 * Checks if the logged-in user is accessing their own resource OR is an administrator.
 * This is useful for routes like updating or deleting a user profile.
 * It compares the `userId` from the URL parameters with the `userId` in the session.
 */
export const isSelfOrAdmin = (req, res, next) => {
  const { userId: targetUserId } = req.params;
  const { userId: sessionUserId, isAdmin } = req.session;

  if (isAdmin || targetUserId === sessionUserId) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden. You do not have permission to access this resource.' });
};
