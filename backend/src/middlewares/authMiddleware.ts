import { Request, Response, NextFunction } from 'express';

import { prisma } from '../lib/prisma.js';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId && req.session.companyId) {
    return next();
  }
  // Check if it's an AJAX request or browser navigation
  if (req.xhr || req.accepts('json')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  // Optional: Redirect for browser navigation? Usually APIs just 401.
  return res.status(401).json({ error: 'Authentication required. Please log in.' });
};

/**
 * Checks if the logged-in user's company accepts a valid subscription.
 * This performs a DB lookup to ensure real-time enforcement.
 */
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.companyId) {
    return res.status(401).json({ error: 'Unauthorized: No company ID in session.' });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: req.session.companyId },
      select: { subscriptionStatus: true, subscriptionExpiresAt: true }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const isActive = company.subscriptionStatus === 'active';
    // Optional: You could also check expiration date here for double-safety
    // const isNotExpired = !company.subscriptionExpiresAt || new Date(company.subscriptionExpiresAt) > new Date();

    if (isActive) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Subscription required.', 
      code: 'SUBSCRIPTION_REQUIRED' 
    });

  } catch (error) {
    console.error('Subscription check failed:', error);
    return res.status(500).json({ error: 'Internal server error during subscription check.' });
  }
};

/**
 * Checks if the logged-in user is an administrator.
 * If not, it sends a 403 Forbidden error.
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
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
export const isSelfOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const { userId: targetUserId } = req.params;
  const { userId: sessionUserId, isAdmin } = req.session;

  if (isAdmin || targetUserId === sessionUserId) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden. You do not have permission to access this resource.' });
};
