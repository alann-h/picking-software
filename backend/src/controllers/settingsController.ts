import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export async function getDeliveryRates(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { forkliftPrice: true, handUnloadPrice: true }
    });

    if (!company) {
        return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (err) {
    next(err);
  }
}

export async function updateDeliveryRates(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { forkliftPrice, handUnloadPrice } = req.body;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        forkliftPrice,
        handUnloadPrice
      },
      select: { forkliftPrice: true, handUnloadPrice: true }
    });

    res.json(company);
  } catch (err) {
    next(err);
  }
}

