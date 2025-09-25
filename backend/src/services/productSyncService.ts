import { prisma } from '../lib/prisma.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { IntuitOAuthClient } from '../types/authSystem.js';

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  updatedProducts: number;
  newProducts: number;
  errors: string[];
  duration: number;
}

export interface Category {
  id: string;
  name: string;
  fullyQualifiedName: string;
  active: boolean;
}

export class ProductSyncService {
  /**
   * Get all categories from QuickBooks Online for a company
   */
  static async getCategoriesFromQBO(companyId: string): Promise<Category[]> {
    try {
      console.log(`🔍 Fetching categories for company: ${companyId}`);

      // Get company details
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { 
          id: true, 
          connectionType: true, 
          qboRealmId: true 
        }
      });

      if (!company || company.connectionType !== 'qbo' || !company.qboRealmId) {
        throw new Error(`Company ${companyId} is not connected to QuickBooks Online`);
      }

      // Get OAuth client
      const oauthClient = await getOAuthClient(companyId, 'qbo');
      const baseURL = await getBaseURL(oauthClient, 'qbo');
      const realmId = getRealmId(oauthClient as IntuitOAuthClient);

      // Fetch all item categories (Groups in QBO)
      const queryStr = `SELECT * FROM Item WHERE Type = 'Category' ORDERBY Name`;
      const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;

      const response = await (oauthClient as IntuitOAuthClient).makeApiCall({ url });
      const categories = response.json?.QueryResponse?.Item || [];

      const formattedCategories: Category[] = categories.map((cat: any) => ({
        id: cat.Id,
        name: cat.Name,
        fullyQualifiedName: cat.FullyQualifiedName || cat.Name,
        active: cat.Active !== false
      }));

      console.log(`📂 Found ${formattedCategories.length} categories`);
      return formattedCategories;

    } catch (error) {
      console.error(`❌ Failed to fetch categories for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Sync products with category filtering
   */
  static async syncProductsWithCategories(companyId: string, selectedCategoryIds: string[]): Promise<SyncResult> {
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
      console.log(`🔄 Starting category-filtered product sync for company: ${companyId}`);
      console.log(`📂 Selected categories: ${selectedCategoryIds.length} categories`);

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
      const oauthClient = await getOAuthClient(companyId, 'qbo');
      const baseURL = await getBaseURL(oauthClient, 'qbo');
      const realmId = getRealmId(oauthClient as IntuitOAuthClient);

      // Fetch items with category filtering
      const allItems = await this.fetchItemsByCategories(oauthClient as IntuitOAuthClient, baseURL, realmId, selectedCategoryIds);
      result.totalProducts = allItems.length;

      console.log(`📦 Found ${allItems.length} items in selected categories`);

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

      console.log(`✅ Category-filtered product sync completed for company ${companyId}:`, {
        total: result.totalProducts,
        updated: result.updatedProducts,
        new: result.newProducts,
        errors: result.errors.length,
        duration: `${result.duration}ms`
      });

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`❌ Category-filtered product sync failed for company ${companyId}:`, error);
      return result;
    }
  }

  /**
   * Fetch items by selected categories from QuickBooks Online
   */
  private static async fetchItemsByCategories(
    oauthClient: IntuitOAuthClient, 
    baseURL: string, 
    realmId: string,
    selectedCategoryIds: string[]
  ): Promise<any[]> {
    const allItems: any[] = [];
    let startPosition = 1;
    const maxResults = 500; // QBO max per page

    while (true) {
      // Build query with category filtering
      let queryStr = 'SELECT * FROM Item WHERE Active = true';
      
      if (selectedCategoryIds.length > 0) {
        // Filter by selected categories (Groups in QBO)
        const categoryConditions = selectedCategoryIds.map(id => `ParentRef = '${id}'`).join(' OR ');
        queryStr += ` AND (${categoryConditions})`;
      }
      
      queryStr += ` ORDERBY Id STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
      const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;

      try {
        const response = await oauthClient.makeApiCall({ url });
        const items = response.json?.QueryResponse?.Item || [];

        if (items.length === 0) {
          break; // No more items
        }

        // Filter items that require SKU
        const filteredItems = items.filter((item: any) => {
          // Require SKU
          if (!item.Sku || item.Sku.trim() === '') {
            console.log(`🚫 Filtering out item without SKU: ${item.Name}`);
            return false;
          }
          return true;
        });

        allItems.push(...filteredItems);
        console.log(`📄 Fetched ${items.length} items, filtered to ${filteredItems.length} (total: ${allItems.length})`);

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
      const oauthClient = await getOAuthClient(companyId, 'qbo');
      const baseURL = await getBaseURL(oauthClient, 'qbo');
      const realmId = getRealmId(oauthClient as IntuitOAuthClient);

      // Fetch all items from QuickBooks
      const allItems = await this.fetchAllItemsFromQBO(oauthClient as IntuitOAuthClient, baseURL, realmId);
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
        total: result.totalProducts,
        updated: result.updatedProducts,
        new: result.newProducts,
        errors: result.errors.length,
        duration: `${result.duration}ms`
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
  private static async fetchAllItemsFromQBO(
    oauthClient: IntuitOAuthClient, 
    baseURL: string, 
    realmId: string
  ): Promise<any[]> {
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

    // Transform QBO data to our format
    const productData = {
      productName: productName,
      sku: sku,
      category: itemData.ParentRef?.name || null,
      price: parseFloat(itemData.UnitPrice) || 0,
      quantity_on_hand: parseFloat(itemData.QtyOnHand) || 0,
      tax_code_ref: itemData.SalesTaxCodeRef?.value || null,
      is_active: itemData.Active !== false,
      external_item_id: externalItemId
    };

    // Check if product exists by external ID
    const existingProduct = await prisma.product.findFirst({
      where: {
        externalItemId: externalItemId,
        companyId: companyId
      }
    });

    if (existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          productName: productData.productName,
          sku: productData.sku,
          category: productData.category,
          taxCodeRef: productData.tax_code_ref,
          price: productData.price,
          quantityOnHand: productData.quantity_on_hand,
          isArchived: !productData.is_active,
        }
      });
      return 'updated';
    } else {
      // Check for SKU conflicts before creating
      if (sku) {
        const conflictingProduct = await prisma.product.findUnique({
          where: {
            companyId_sku: {
              companyId: companyId,
              sku: sku
            }
          }
        });

        if (conflictingProduct) {
          console.warn(`SKU conflict: Cannot create product "${productName}" with SKU "${sku}" - already exists`);
          return 'skipped';
        }
      }

      // Create new product
      await prisma.product.create({
        data: {
          companyId: companyId,
          productName: productData.productName,
          sku: productData.sku,
          externalItemId: externalItemId,
          category: productData.category,
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
   * Sync products for all companies with QBO connections
   */
  static async syncAllCompanies(): Promise<{ [companyId: string]: SyncResult }> {
    console.log('🔄 Starting product sync for all companies...');
    
    const companies = await prisma.company.findMany({
      where: { 
        connectionType: 'qbo',
        qboRealmId: { not: null }
      },
      select: { id: true, companyName: true }
    });

    console.log(`📊 Found ${companies.length} companies with QBO connections`);

    const results: { [companyId: string]: SyncResult } = {};

    for (const company of companies) {
      try {
        console.log(`🔄 Syncing products for company: ${company.companyName} (${company.id})`);
        results[company.id] = await this.syncAllProductsFromQBO(company.id);
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

    console.log(`✅ All companies sync completed:`, {
      companies: companies.length,
      totalUpdated,
      totalNew,
      totalErrors
    });

    return results;
  }
}