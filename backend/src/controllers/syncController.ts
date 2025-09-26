import { Request, Response, NextFunction } from 'express';
import { ProductSyncService } from '../services/productSyncService.js';
import { prisma } from '../lib/prisma.js';

export const syncProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get company connection type
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { connectionType: true }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    console.log(`Manual product sync requested for company: ${companyId} (${company.connectionType})`);
    
    let result;
    if (company.connectionType === 'qbo') {
      result = await ProductSyncService.syncAllProductsFromQBO(companyId);
    } else if (company.connectionType === 'xero') {
      result = await ProductSyncService.syncAllProductsFromXero(companyId);
    } else {
      return res.status(400).json({ error: 'Company is not connected to QuickBooks or Xero' });
    }
    
    res.json({
      message: 'Product sync completed',
      result
    });
  } catch (err: unknown) {
    console.error('Manual sync error:', err);
    next(err);
  }
};





export const getSyncSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`Fetching sync settings for company: ${companyId}`);
    
    const settings = await prisma.sync_settings.findUnique({
      where: { companyId },
      select: {
        id: true,
        enabled: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Sync settings fetched successfully',
      settings: settings || {
        enabled: true
      }
    });
  } catch (err: unknown) {
    console.error('Get sync settings error:', err);
    next(err);
  }
};

export const saveSyncSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    console.log(`Saving sync settings for company: ${companyId}`);
    console.log(`Enabled: ${enabled}`);
    
    const settings = await prisma.sync_settings.upsert({
      where: { companyId },
      update: {
        enabled,
        updatedAt: new Date()
      },
      create: {
        companyId,
        enabled
      },
      select: {
        id: true,
        enabled: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Sync settings saved successfully',
      settings
    });
  } catch (err: unknown) {
    console.error('Save sync settings error:', err);
    next(err);
  }
};

