import { prisma } from '../lib/prisma.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient } from 'xero-node';
import { authSystem } from './authSystem.js';
import { fetchCustomers, saveCustomers } from './customerService.js';

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  updatedProducts: number;
  newProducts: number;
  totalCustomers?: number;
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


      // Sync customers first
      console.log(`👥 Syncing customers...`);
      try {
        const customers = await fetchCustomers(companyId, 'qbo');
        await saveCustomers(customers, companyId);
        result.totalCustomers = customers.length;
        console.log(`✅ Synced ${customers.length} customers`);
      } catch (error) {
        console.error(`⚠️ Failed to sync customers:`, error);
        result.errors.push(`Customer sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue with product sync even if customer sync fails
      }

      // Fetch all items from QuickBooks
      const allItems = await this.fetchAllItemsFromQBO(oauthClient, baseURL, realmId);
      result.totalProducts = allItems.length;

      console.log(`📦 Found ${allItems.length} items in QuickBooks`);

      // Process each item
      for (const item of allItems) {
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
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      console.log(`✅ Product sync completed for company ${companyId}:`, {
        customers: result.totalCustomers || 0,
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
      const queryStr = `SELECT * FROM Item WHERE Active = true ORDERBY Id STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
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

        if (!syncSettings || !syncSettings.enabled) {
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

        // Always sync all products regardless of categories
        if (company.connectionType === 'qbo') {
          console.log(`🔄 Syncing all QBO products for ${company.companyName}`);
          results[company.id] = await this.syncAllProductsFromQBO(company.id);
        } else if (company.connectionType === 'xero') {
          console.log(`🔄 Syncing all Xero products for ${company.companyName}`);
          results[company.id] = await this.syncAllProductsFromXero(company.id);
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
   * Sync all products from Xero for a company
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

      // Sync customers first
      let totalCustomers = 0;
      console.log(`👥 Syncing customers...`);
      try {
        const customers = await fetchCustomers(companyId, 'xero');
        await saveCustomers(customers, companyId);
        totalCustomers = customers.length;
        console.log(`✅ Synced ${customers.length} customers`);
      } catch (error) {
        console.error(`⚠️ Failed to sync customers:`, error);
        // Continue with product sync even if customer sync fails
      }

      // Fetch all items from Xero
      const response = await oauthClient.accountingApi.getItems(tenantId);

      const items = response.body.items || [];
      console.log(`📦 Found ${items.length} items in Xero`);

      let totalProducts = 0;
      let updatedProducts = 0;
      let newProducts = 0;
      const errors: string[] = [];

      // Process each item
      for (const item of items) {
        if (!item.isSold || !item.code) {
          continue; // Skip non-sold items or items without codes
        }

        totalProducts++;
        try {
          const result = await this.syncSingleXeroProduct(item, companyId);
          if (result === 'updated') {
            updatedProducts++;
          } else if (result === 'created') {
            newProducts++;
          }
        } catch (error: unknown) {
          const errorMsg = `Failed to sync product ${item.code}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Xero sync completed for company ${companyId}:`, {
        customers: totalCustomers,
        total: totalProducts,
        updated: updatedProducts,
        new: newProducts,
        errors: errors.length
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

      return {
        success: errors.length === 0,
        totalProducts,
        updatedProducts,
        newProducts,
        totalCustomers,
        errors,
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


  /**
   * Sync a single Xero product to the database
   */
  private static async syncSingleXeroProduct(itemData: any, companyId: string): Promise<'updated' | 'created' | 'skipped'> {
    try {
      const sku = itemData.code;
      const name = itemData.name || sku;
      
      // Get pricing information
      const unitPrice = itemData.salesDetails?.unitPrice || 0;
      const quantityOnHand = itemData.isTrackedAsInventory ? (itemData.quantityOnHand || 0) : 0;
      
      // Check if product already exists by external ID first
      let existingProduct = await prisma.product.findFirst({
        where: {
          externalItemId: itemData.itemID,
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

      const productData = {
        sku: sku,
        productName: name,
        price: unitPrice,
        quantityOnHand: quantityOnHand,
        externalItemId: itemData.itemID || null,
        taxCodeRef: itemData.salesDetails?.taxType || null,
        barcode: null,
        isArchived: false
      };

      if (existingProduct) {
        // Update existing product
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            ...productData,
            externalItemId: itemData.itemID || existingProduct.externalItemId // Update external ID if it was missing
          }
        });
        return 'updated';
      } else {
        // Create new product
        await prisma.product.create({
          data: {
            ...productData,
            companyId: companyId,
            externalItemId: itemData.itemID || null
          }
        });
        return 'created';
      }
    } catch (error: unknown) {
      console.error(`❌ Error syncing Xero product ${itemData.code}:`, error);
      throw error;
    }
  }

}