import { Request, Response, NextFunction } from 'express';
import { ProductSyncService } from '../services/productSyncService.js';
import { prisma } from '../lib/prisma.js';

export const syncProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`Manual product sync requested for company: ${companyId}`);
    const result = await ProductSyncService.syncAllProductsFromQBO(companyId);
    
    res.json({
      message: 'Product sync completed',
      result
    });
  } catch (err: unknown) {
    console.error('Manual sync error:', err);
    next(err);
  }
};


export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`Fetching categories for company: ${companyId}`);
    
    // First, try to get categories from database
    let categories = await prisma.categories.findMany({
      where: { 
        companyId: companyId,
        active: true 
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        externalId: true,
        name: true,
        fullyQualifiedName: true,
        active: true,
        lastSyncedAt: true
      }
    });

    // Smart refresh logic - check multiple conditions
    const shouldSync = categories.length === 0 || 
      categories.some(cat => {
        const hoursSinceSync = (Date.now() - cat.lastSyncedAt.getTime()) / (7 * 1000 * 60 * 60);
        return hoursSinceSync > 7;
      }) ||
      // Check if we have very few categories (might be missing some)
      categories.length < 3;

    if (shouldSync) {
      console.log('Syncing categories from QuickBooks...');
      const qboCategories = await ProductSyncService.getCategoriesFromQBO(companyId);
      
      // Compare counts - if QBO has more categories, we're missing some
      if (qboCategories.length > categories.length) {
        console.log(`QBO has ${qboCategories.length} categories, DB has ${categories.length} - syncing...`);
      }
      
      // Upsert categories in database
      for (const qboCategory of qboCategories) {
        await prisma.categories.upsert({
          where: {
            companyId_externalId: {
              companyId: companyId,
              externalId: qboCategory.id
            }
          },
          update: {
            name: qboCategory.name,
            fullyQualifiedName: qboCategory.fullyQualifiedName,
            active: qboCategory.active,
            lastSyncedAt: new Date()
          },
          create: {
            companyId: companyId,
            externalId: qboCategory.id,
            name: qboCategory.name,
            fullyQualifiedName: qboCategory.fullyQualifiedName,
            active: qboCategory.active,
            lastSyncedAt: new Date()
          }
        });
      }

      // Fetch updated categories
      categories = await prisma.categories.findMany({
        where: { 
          companyId: companyId,
          active: true 
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          externalId: true,
          name: true,
          fullyQualifiedName: true,
          active: true,
          lastSyncedAt: true
        }
      });
    }

    // Transform to match frontend interface
    const formattedCategories = categories.map(cat => ({
      id: cat.externalId, // Use QBO external ID for frontend
      name: cat.name,
      fullyQualifiedName: cat.fullyQualifiedName,
      active: cat.active
    }));
    
    res.json({
      message: 'Categories fetched successfully',
      categories: formattedCategories
    });
  } catch (err: unknown) {
    console.error('Get categories error:', err);
    next(err);
  }
};

export const syncWithCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { selectedCategoryIds } = req.body;
    
    if (!Array.isArray(selectedCategoryIds)) {
      return res.status(400).json({ error: 'selectedCategoryIds must be an array' });
    }

    console.log(`Category-filtered sync requested for company: ${companyId}`);
    console.log(`Selected categories: ${selectedCategoryIds.length} categories`);
    
    const result = await ProductSyncService.syncProductsWithCategories(companyId, selectedCategoryIds);
    
    res.json({
      message: 'Category-filtered product sync completed',
      result
    });
  } catch (err: unknown) {
    console.error('Category sync error:', err);
    next(err);
  }
};

// Sync Settings Management
export const refreshCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`Force refreshing categories for company: ${companyId}`);
    
    // Always sync from QBO (force refresh)
    const qboCategories = await ProductSyncService.getCategoriesFromQBO(companyId);
    
    // Upsert categories in database
    for (const qboCategory of qboCategories) {
      await prisma.categories.upsert({
        where: {
          companyId_externalId: {
            companyId: companyId,
            externalId: qboCategory.id
          }
        },
        update: {
          name: qboCategory.name,
          fullyQualifiedName: qboCategory.fullyQualifiedName,
          active: qboCategory.active,
          lastSyncedAt: new Date()
        },
        create: {
          companyId: companyId,
          externalId: qboCategory.id,
          name: qboCategory.name,
          fullyQualifiedName: qboCategory.fullyQualifiedName,
          active: qboCategory.active,
          lastSyncedAt: new Date()
        }
      });
    }

    // Fetch updated categories
    const categories = await prisma.categories.findMany({
      where: { 
        companyId: companyId,
        active: true 
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        externalId: true,
        name: true,
        fullyQualifiedName: true,
        active: true,
        lastSyncedAt: true
      }
    });

    // Transform to match frontend interface
    const formattedCategories = categories.map(cat => ({
      id: cat.externalId,
      name: cat.name,
      fullyQualifiedName: cat.fullyQualifiedName,
      active: cat.active
    }));
    
    res.json({
      message: 'Categories refreshed successfully',
      categories: formattedCategories,
      refreshedAt: new Date().toISOString()
    });
  } catch (err: unknown) {
    console.error('Refresh categories error:', err);
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
        selectedCategoryIds: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Sync settings fetched successfully',
      settings: settings || {
        enabled: true,
        selectedCategoryIds: []
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

    const { enabled, selectedCategoryIds } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    if (!Array.isArray(selectedCategoryIds)) {
      return res.status(400).json({ error: 'selectedCategoryIds must be an array' });
    }

    console.log(`Saving sync settings for company: ${companyId}`);
    console.log(`Enabled: ${enabled}, Categories: ${selectedCategoryIds.length}`);
    
    const settings = await prisma.sync_settings.upsert({
      where: { companyId },
      update: {
        enabled,
        selectedCategoryIds,
        updatedAt: new Date()
      },
      create: {
        companyId,
        enabled,
        selectedCategoryIds
      },
      select: {
        id: true,
        enabled: true,
        selectedCategoryIds: true,
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
