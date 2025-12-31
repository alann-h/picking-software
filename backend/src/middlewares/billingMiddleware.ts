import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.companyId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Skip subscription check for specific bypass scenarios if needed (e.g. admins or specific routes)
  // For now, strict check.

  const company = await prisma.company.findUnique({
    where: { id: req.session.companyId },
    select: { subscriptionStatus: true }
  });

  if (!company) {
    return res.status(401).json({ error: 'Company not found' });
  }

  if (company.subscriptionStatus !== 'active') {
    return res.status(402).json({ 
      error: 'Subscription required',
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'An active subscription is required to access this resource.' 
    });
  }

  next();
};
