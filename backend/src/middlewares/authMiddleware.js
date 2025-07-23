
export const isAuthenticated = (req, res, next) => {
  if (req.session.userId && req.session.companyId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required. Please log in.' });
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
