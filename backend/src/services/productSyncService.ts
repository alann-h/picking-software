import { prisma } from '../lib/prisma.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient } from 'xero-node';
import { authSystem } from './authSystem.js';
import pLimit from 'p-limit';

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  updatedProducts: number;
  newProducts: number;
  errors: string[];
  duration: number;
}


export class ProductSyncService {



  /**
   * Sync all products from QuickBooks Online for a company
   * This updates quantities and other product data
   */
  static async syncAllProductsFromQBO(companyId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      totalProducts: 0,
      updatedProducts: 0,
      newProducts: 0,
      errors: [],
      duration: 0
    };

    try {
      console.log(`🔄 Starting product sync for company: ${companyId}`);

      // Get company details
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { 
          id: true, 
          connectionType: true, 
          qboRealmId: true 
        }
      });

      if (!company) {
        throw new Error(`Company not found: ${companyId}`);
      }

      if (company.connectionType !== 'qbo') {
        throw new Error(`Company ${companyId} is not connected to QuickBooks Online`);
      }

      if (!company.qboRealmId) {
        throw new Error(`Company ${companyId} has no QBO realm ID`);
      }

      // Get OAuth client
      const oauthClient: IntuitOAuthClient = await getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
      const baseURL: string = await getBaseURL(oauthClient, 'qbo');
      const realmId: string = getRealmId(oauthClient);

      // Fetch all items from QuickBooks
      const allItems = await this.fetchAllItemsFromQBO(oauthClient, baseURL, realmId);
      result.totalProducts = allItems.length;

      console.log(`📦 Found ${allItems.length} items in QuickBooks`);

      // Process each item
      // Process each item with concurrency limit
      const limit = pLimit(10); // Process 10 items concurrently
      
      const promises = allItems.map(item => limit(async () => {
        try {
          const syncResult = await this.syncSingleProduct(item, companyId);
          if (syncResult === 'updated') {
            result.updatedProducts++;
          } else if (syncResult === 'created') {
            result.newProducts++;
          }
        } catch (error) {
          const errorMsg = `Failed to sync product ${item.Id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }));

      await Promise.all(promises);

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      console.log(`✅ Product sync completed for company ${companyId}:`, {
        total: result.totalProducts,
        updated: result.updatedProducts,
        new: result.newProducts,
        errors: result.errors.length,
        duration: `${result.duration}ms`
      });

      // Update last sync time in sync settings
      await prisma.sync_settings.upsert({
        where: { companyId },
        update: { lastSyncTime: new Date() },
        create: { 
          companyId, 
          enabled: true, 
          lastSyncTime: new Date() 
        }
      });

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`❌ Product sync failed for company ${companyId}:`, error);
      return result;
    }
  }

  /**
   * Fetch all items from QuickBooks Online using pagination
   */
  private static async fetchAllItemsFromQBO(oauthClient: IntuitOAuthClient, baseURL: string, realmId: string): Promise<any[]> {
    const allItems: any[] = [];
    let startPosition = 1;
    const maxResults = 500; // QBO max per page

    while (true) {
      const queryStr = `SELECT * FROM Item WHERE Active = true ORDERBY MetaData.LastUpdatedTime STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
      const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;

      try {
        const response = await oauthClient.makeApiCall({ url });
        const items = response.json?.QueryResponse?.Item || [];

        if (items.length === 0) {
          break; // No more items
        }

        allItems.push(...items);
        console.log(`📄 Fetched ${items.length} items (total: ${allItems.length})`);

        if (items.length < maxResults) {
          break; // Last page
        }

        startPosition += maxResults;
      } catch (error) {
        console.error(`Error fetching items from QBO:`, error);
        throw error;
      }
    }

    return allItems;
  }

  /**
   * Sync a single product from QBO data
   */
  private static async syncSingleProduct(itemData: any, companyId: string): Promise<'updated' | 'created' | 'skipped'> {
    const externalItemId = itemData.Id;
    const sku = itemData.Sku || '';
    const productName = itemData.Name || '';

    if (!externalItemId || !productName) {
      console.warn(`Skipping item with missing data: ID=${externalItemId}, Name=${productName}`);
      return 'skipped';
    }

    console.log(`🔍 Syncing product: ${productName} (SKU: "${sku}", External ID: ${externalItemId})`);

    // Transform QBO data to our format
    const productData = {
      productName: productName,
      sku: sku,
      price: parseFloat(itemData.UnitPrice) || 0,
      quantity_on_hand: parseFloat(itemData.QtyOnHand) || 0,
      tax_code_ref: itemData.SalesTaxCodeRef?.value || null,
      is_active: itemData.Active !== false,
      external_item_id: externalItemId
    };

    // Check if product exists by external ID first
    let existingProduct = await prisma.product.findFirst({
      where: {
        externalItemId: externalItemId,
        companyId: companyId
      }
    });

    // If not found by external ID, check by SKU (for products that might have been created manually)
    if (!existingProduct) {
      existingProduct = await prisma.product.findFirst({
        where: {
          sku: sku,
          companyId: companyId
        }
      });
    }

    if (existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          productName: productData.productName,
          sku: productData.sku,
          externalItemId: externalItemId, // Update external ID if it was missing
          taxCodeRef: productData.tax_code_ref,
          price: productData.price,
          quantityOnHand: productData.quantity_on_hand,
          isArchived: !productData.is_active,
        }
      });
      return 'updated';
    } else {
      // Create new product
      await prisma.product.create({
        data: {
          companyId: companyId,
          productName: productData.productName,
          sku: productData.sku,
          externalItemId: externalItemId,
          taxCodeRef: productData.tax_code_ref,
          price: productData.price,
          quantityOnHand: productData.quantity_on_hand,
          isArchived: !productData.is_active,
        }
      });
      return 'created';
    }
  }


  /**
   * Sync all companies using their saved sync settings (simplified - just sync all products)
   */
  static async syncAllCompaniesWithSettings(): Promise<{ [companyId: string]: SyncResult }> {
    console.log('🔄 Starting scheduled product sync...');
    
    const companies = await prisma.company.findMany({
      where: { 
        connectionType: { in: ['qbo', 'xero'] },
        OR: [
          { qboRealmId: { not: null } },
          { xeroTenantId: { not: null } }
        ]
      },
      select: { id: true, companyName: true, connectionType: true }
    });

    console.log(`📊 Found ${companies.length} companies with connections`);

    const results: { [companyId: string]: SyncResult } = {};

    for (const company of companies) {
      try {
        console.log(`🔄 Syncing products for company: ${company.companyName} (${company.id}) - ${company.connectionType}`);
        
        // Get sync settings for this company
        const syncSettings = await prisma.sync_settings.findUnique({
          where: { companyId: company.id }
        });

        if (syncSettings && !syncSettings.enabled) {
          console.log(`⏭️ Skipping company ${company.companyName} - sync disabled`);
          results[company.id] = {
            success: true,
            totalProducts: 0,
            updatedProducts: 0,
            newProducts: 0,
            errors: [],
            duration: 0
          };
          continue;
        }

        // SMART POLLING LOGIC
        // - Xero: Sync every 10 mins (because no product webhooks)
        // - QBO: Sync every 24 hours (because we have real-time webhooks, so this is just a safety net)
        
        const lastSync = syncSettings?.lastSyncTime ? new Date(syncSettings.lastSyncTime).getTime() : 0;
        const now = Date.now();
        const timeSinceLastSync = now - lastSync;

        const XERO_SYNC_THRESHOLD = 10 * 60 * 1000;      // 10 minutes
        const QBO_SYNC_THRESHOLD = 24 * 60 * 60 * 1000;  // 24 hours

        if (company.connectionType === 'qbo') {
          if (timeSinceLastSync < QBO_SYNC_THRESHOLD) {
             console.log(`⏳ QBO sync skipped for ${company.companyName} (Last sync: ${Math.round(timeSinceLastSync/1000/60)}m ago). Threshold: 24h.`);
             results[company.id] = {
                success: true, totalProducts: 0, updatedProducts: 0, newProducts: 0, errors: [], duration: 0
             };
             continue; // Skip
          }
          console.log(`🔄 Syncing all QBO products for ${company.companyName} (Scheduled Safety Sync)`);
          results[company.id] = await this.syncAllProductsFromQBO(company.id);

        } else if (company.connectionType === 'xero') {
          // For Xero, we respect the 10 min polling interval
          if (timeSinceLastSync < XERO_SYNC_THRESHOLD) {
             console.log(`⏳ Xero sync skipped for ${company.companyName} (Last sync: ${Math.round(timeSinceLastSync/1000/60)}m ago). Threshold: 10m.`);
             results[company.id] = {
                success: true, totalProducts: 0, updatedProducts: 0, newProducts: 0, errors: [], duration: 0
             };
             continue; // Skip
          }

          console.log(`🔄 Syncing all Xero products for ${company.companyName} (Polling Sync)`);
          results[company.id] = await this.syncAllProductsFromXero(company.id);

          // Sync Quotes as well (polling)
          console.log(`🔄 Syncing Xero quotes for ${company.companyName} (Polling Sync)`);
          try {
             const { QuoteSyncService } = await import('./quoteSyncService.js');
             await QuoteSyncService.syncAllPendingQuotes(company.id, 'xero');
             console.log(`✅ Xero quotes synced for ${company.companyName}`);
          } catch (quoteError) {
             console.error(`❌ Failed to sync Xero quotes for ${company.companyName}:`, quoteError);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to sync company ${company.companyName}:`, error);
        results[company.id] = {
          success: false,
          totalProducts: 0,
          updatedProducts: 0,
          newProducts: 0,
          errors: [`Company sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          duration: 0
        };
      }
    }

    const totalUpdated = Object.values(results).reduce((sum, result) => sum + result.updatedProducts, 0);
    const totalNew = Object.values(results).reduce((sum, result) => sum + result.newProducts, 0);
    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errors.length, 0);

    console.log(`✅ Scheduled sync completed:`, {
      companies: companies.length,
      totalUpdated,
      totalNew,
      totalErrors
    });

    return results;
  }


  /**
   * Sync all products from Xero for a company (BULK OPTIMIZED)
   */
  static async syncAllProductsFromXero(companyId: string): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`🔄 Starting Xero product sync for company: ${companyId}`);

    try {
      // Get company details
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          connectionType: true,
          xeroTenantId: true
        }
      });

      if (!company || company.connectionType !== 'xero' || !company.xeroTenantId) {
        throw new Error(`Company ${companyId} is not connected to Xero`);
      }

      // Get OAuth client
      const oauthClient = await getOAuthClient(companyId, 'xero') as XeroClient;
      const { tenantId } = await authSystem.getXeroTenantId(oauthClient);

      // Fetch all items from Xero
      const response = await oauthClient.accountingApi.getItems(tenantId);
      const items = response.body.items || [];
      console.log(`📦 Found ${items.length} items in Xero`);

      // 1. Fetch ALL existing products for this company
      const existingProducts = await prisma.product.findMany({
        where: { companyId },
        select: { id: true, sku: true, externalItemId: true, updatedAt: true }
      });

      // Create lookup maps for fast access
      const existingBySku = new Map(existingProducts.map(p => [p.sku, p]));
      const existingByExtId = new Map(existingProducts.map(p => [p.externalItemId, p]));

      const toCreate: any[] = [];
      const toUpdate: any[] = [];
      
      let totalProducts = 0;
      let updatedProducts = 0; // Will be verified after transaction
      let newProducts = 0; // Will be verified after transaction

      // 2. Process items in memory
      for (const item of items) {
        if (!item.isSold || !item.code) {
          continue;
        }
        totalProducts++;

        const sku = item.code;
        const name = item.name || sku;
        const unitPrice = item.salesDetails?.unitPrice || 0;
        const quantityOnHand = item.isTrackedAsInventory ? (item.quantityOnHand || 0) : 0;
        const externalId = item.itemID || null;
        
        // Find existing product
        let existing = externalId ? existingByExtId.get(externalId) : undefined;
        if (!existing && sku) {
          existing = existingBySku.get(sku);
        }

        const productData = {
          companyId,
          sku,
          productName: name,
          price: unitPrice,
          quantityOnHand,
          externalItemId: externalId,
          taxCodeRef: item.salesDetails?.taxType || null,
          barcode: null,
          isArchived: false,
          updatedAt: new Date() // Important for marking as updated
        };

        if (existing) {
            // Add to update list (we'll process these in a transaction)
            toUpdate.push({
                where: { id: existing.id },
                data: {
                    productName: productData.productName,
                    price: productData.price,
                    quantityOnHand: productData.quantityOnHand,
                    taxCodeRef: productData.taxCodeRef,
                    isArchived: productData.isArchived,
                    externalItemId: productData.externalItemId
                }
            });
        } else {
            // Add to create list
            toCreate.push(productData);
        }
      }

      console.log(`📊 Analysis Complete: ${toCreate.length} to Create, ${toUpdate.length} to Update`);

      // 3. Perform Bulk Operations in Transaction
      const BATCH_SIZE = 1000;
      
      await prisma.$transaction(async (tx) => {
          // Bulk Create
          if (toCreate.length > 0) {
              await tx.product.createMany({
                  data: toCreate,
                  skipDuplicates: true 
              });
              newProducts = toCreate.length;
          }

          // Bulk Update (Prisma doesn't have updateMany with different values, so we iterate promises)
          // However, we are inside a single transaction so it's atomic.
          if (toUpdate.length > 0) {
              // We can rely on p-limit here effectively because we are just queuing queries to the transaction buffer
              // But actually executing thousands of updates in one TX can be heavy.
              // Let's batch the promises to avoid call stack issues
              
              for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
                  const batch = toUpdate.slice(i, i + BATCH_SIZE);
                  await Promise.all(batch.map(op => tx.product.update(op)));
              }
              updatedProducts = toUpdate.length;
          }
      }, {
        maxWait: 20000, // Wait longer for connection
        timeout: 60000  // Allow 1 minute for the transaction to commit
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Xero sync completed for company ${companyId}:`, {
        total: totalProducts,
        updated: updatedProducts,
        new: newProducts,
        duration
      });

      // Update last sync time
      await prisma.sync_settings.upsert({
        where: { companyId },
        update: { lastSyncTime: new Date() },
        create: { 
          companyId, 
          enabled: true, 
          lastSyncTime: new Date() 
        }
      });

      return {
        success: true,
        totalProducts,
        updatedProducts,
        newProducts,
        errors: [],
        duration
      };

    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = `Xero sync failed for company ${companyId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      
      return {
        success: false,
        totalProducts: 0,
        updatedProducts: 0,
        newProducts: 0,
        errors: [errorMsg],
        duration
      };
    }
  }

  // syncSingleXeroProduct is deprecated/removed in favor of bulk flow
}