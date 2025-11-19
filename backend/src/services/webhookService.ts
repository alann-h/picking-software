import { prisma } from '../lib/prisma.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { getEstimate, estimateToDB, fetchQuoteData } from './quoteService.js';
import { FilteredQuote, QuoteFetchError, ProductInfo } from '../types/quote.js';

export interface WebhookEvent {
  id: string;
  operation: 'Create' | 'Update' | 'Delete';
  name: string;
  lastUpdated: string;
}

export interface WebhookNotification {
  realmId: string;
  dataChangeEvent: {
    entities: WebhookEvent[];
  };
}

export class WebhookService {
  /**
   * Process webhook notifications for QuickBooks Online
   */
  static async processQBOWebhook(notifications: WebhookNotification[]): Promise<void> {
    for (const notification of notifications) {
      if (!notification.dataChangeEvent?.entities) {
        console.warn('No entities found in webhook notification');
        continue;
      }

      const { realmId } = notification;
      console.log(`Processing webhook for company ${realmId}`);

      for (const event of notification.dataChangeEvent.entities) {
        try {
          await this.processWebhookEvent(event, realmId);
        } catch (error) {
          console.error(`Error processing webhook event ${event.id}:`, error);
          // Continue processing other events even if one fails
        }
      }
    }
  }

  /**
   * Process individual webhook event
   */
  private static async processWebhookEvent(event: WebhookEvent, realmId: string): Promise<void> {
    console.log(`Processing ${event.operation} event for ${event.name} (ID: ${event.id})`);

    // Process Item events (products)
    if (event.name === 'Item') {
      switch (event.operation) {
        case 'Create':
          await this.handleCreateProduct(event.id, realmId);
          break;
        case 'Update':
          await this.handleUpdateProduct(event.id, realmId);
          break;
        case 'Delete':
          await this.handleDeleteProduct(event.id, realmId);
          break;
        default:
          console.warn(`Unknown operation: ${event.operation}`);
      }
      return;
    }

    // Process Estimate events (quotes)
    if (event.name === 'Estimate') {
      switch (event.operation) {
        case 'Create':
          await this.handleCreateEstimate(event.id, realmId);
          break;
        case 'Update':
          await this.handleUpdateEstimate(event.id, realmId);
          break;
        case 'Delete':
          console.log(`Skipping delete operation for estimate: ${event.id}`);
          break;
        default:
          console.warn(`Unknown operation: ${event.operation}`);
      }
      return;
    }

    console.log(`Skipping unsupported event type: ${event.name}`);
  }

  /**
   * Handle product creation webhook
   */
  private static async handleCreateProduct(itemId: string, realmId: string): Promise<void> {
    try {
      console.log(`Creating product with ID: ${itemId}`);
      
      // Get company ID from realmId
      const company = await prisma.company.findFirst({
        where: { qboRealmId: realmId },
        select: { id: true, connectionType: true }
      });

      if (!company) {
        console.error(`Company not found for realmId: ${realmId}`);
        return;
      }

      // Get product details from QuickBooks
      const productData = await this.getProductFromQBO(itemId, company.id, company.connectionType as 'qbo' | 'xero');
      
      if (!productData) {
        console.error(`Failed to fetch product data from QBO for ID: ${itemId}`);
        return;
      }

      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: {
          externalItemId: itemId,
          companyId: company.id
        }
      });

      if (existingProduct) {
        console.log(`Product with external ID ${itemId} already exists, updating instead`);
        await this.handleUpdateProduct(itemId, realmId);
        return;
      }

      // Create new product
      await prisma.product.create({
        data: {
          companyId: company.id,
          productName: productData.productName,
          sku: productData.sku,
          externalItemId: itemId,
          taxCodeRef: productData.tax_code_ref,
          price: productData.price || 0,
          quantityOnHand: productData.quantity_on_hand || 0,
          isArchived: false,
        }
      });

      console.log(`✅ Successfully created product: ${productData.productName} (SKU: ${productData.sku})`);
    } catch (error) {
      console.error(`Error creating product ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Handle product update webhook
   */
  private static async handleUpdateProduct(itemId: string, realmId: string): Promise<void> {
    try {
      console.log(`Updating product with ID: ${itemId}`);
      
      // Get company ID from realmId
      const company = await prisma.company.findFirst({
        where: { qboRealmId: realmId },
        select: { id: true, connectionType: true }
      });

      if (!company) {
        console.error(`Company not found for realmId: ${realmId}`);
        return;
      }

      // Get product details from QuickBooks
      const productData = await this.getProductFromQBO(itemId, company.id, company.connectionType as 'qbo' | 'xero');
      
      if (!productData) {
        console.error(`Failed to fetch product data from QBO for ID: ${itemId}`);
        return;
      }

      // Find the existing product by external ID
      const existingProduct = await prisma.product.findFirst({
        where: {
          externalItemId: itemId,
          companyId: company.id
        }
      });

      if (!existingProduct) {
        console.log(`Product with external ID ${itemId} not found in database`);
        return;
      }

      // Check if the new SKU conflicts with another product
      if (productData.sku !== existingProduct.sku) {
        const conflictingProduct = await prisma.product.findUnique({
          where: {
            companyId_sku: {
              companyId: company.id,
              sku: productData.sku
            }
          }
        });

        if (conflictingProduct) {
          console.warn(`SKU conflict detected: Product ${itemId} trying to update SKU from "${existingProduct.sku}" to "${productData.sku}", but another product (ID: ${conflictingProduct.id}) already uses this SKU`);
          
          // Option 1: Skip the SKU update and update other fields
          console.log(`Skipping SKU update to avoid conflict, updating other fields only`);
          
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              productName: productData.productName,
              taxCodeRef: productData.tax_code_ref,
              price: productData.price || 0,
              quantityOnHand: productData.quantity_on_hand || 0,
              isArchived: !productData.is_active, // If not active in QBO, mark as archived
            }
          });
          
          console.log(`✅ Successfully updated product (SKU unchanged): ${productData.productName} (SKU: ${existingProduct.sku})`);
          return;
        }
      }

      // No SKU conflict, proceed with full update
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          productName: productData.productName,
          sku: productData.sku,
          taxCodeRef: productData.tax_code_ref,
          price: productData.price || 0,
          quantityOnHand: productData.quantity_on_hand || 0,
          isArchived: !productData.is_active, // If not active in QBO, mark as archived
        }
      });

      console.log(`✅ Successfully updated product: ${productData.productName} (SKU: ${productData.sku})`);
    } catch (error) {
      console.error(`Error updating product ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Handle product deletion webhook
   */
  private static async handleDeleteProduct(itemId: string, realmId: string): Promise<void> {
    try {
      console.log(`Deleting product with ID: ${itemId}`);
      
      // Get company ID from realmId
      const company = await prisma.company.findFirst({
        where: { qboRealmId: realmId },
        select: { id: true }
      });

      if (!company) {
        console.error(`Company not found for realmId: ${realmId}`);
        return;
      }

      // Delete product from database
      const deletedProduct = await prisma.product.deleteMany({
        where: {
          externalItemId: itemId,
          companyId: company.id
        }
      });

      if (deletedProduct.count === 0) {
        console.log(`Product with external ID ${itemId} not found in database`);
        return;
      }

      console.log(`✅ Successfully deleted product with external ID: ${itemId}`);
    } catch (error) {
      console.error(`Error deleting product ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get product data from QuickBooks Online
   */
  private static async getProductFromQBO(itemId: string, companyId: string, connectionType: 'qbo' | 'xero'): Promise<any> {
    try {
      if (connectionType !== 'qbo') {
        console.log(`Skipping QBO fetch for non-QBO connection type: ${connectionType}`);
        return null;
      }

      const oauthClient = await getOAuthClient(companyId, 'qbo');
      const baseURL = await getBaseURL(oauthClient, 'qbo');
      const realmId = getRealmId(oauthClient as IntuitOAuthClient);
      
      const url = `${baseURL}v3/company/${realmId}/item/${itemId}?minorversion=75`;
      
      const response = await (oauthClient as IntuitOAuthClient).makeApiCall({ url });
      const itemData = response.json?.QueryResponse?.Item?.[0] || response.json?.Item;

      if (!itemData) {
        console.error(`No item data found for ID: ${itemId}`);
        return null;
      }

      // Transform QBO data to our format
      const productData = {
        productName: itemData.Name || '',
        sku: itemData.Sku || '',
        price: parseFloat(itemData.UnitPrice) || 0,
        quantity_on_hand: parseFloat(itemData.QtyOnHand) || 0,
        tax_code_ref: itemData.SalesTaxCodeRef?.value || null,
        is_active: itemData.Active !== false,
        external_item_id: itemId
      };

      return productData;
    } catch (error) {
      console.error(`Error fetching product from QBO for ID ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Handle estimate (quote) creation webhook
   */
  private static async handleCreateEstimate(estimateId: string, realmId: string): Promise<void> {
    try {
      console.log(`Creating estimate with ID: ${estimateId}`);
      
      // Get company ID from realmId
      const company = await prisma.company.findFirst({
        where: { qboRealmId: realmId },
        select: { id: true, connectionType: true }
      });

      if (!company) {
        console.error(`Company not found for realmId: ${realmId}`);
        return;
      }

      // Check if estimate already exists in database
      const existingEstimate = await prisma.quote.findUnique({
        where: { id: estimateId }
      });

      if (existingEstimate) {
        // Check if quote is completed before updating
        if (['preparing', 'checking', 'completed'].includes(existingEstimate.status)) {
          console.log(`⏭️  Skipping webhook create for quote ${estimateId} - status is ${existingEstimate.status}, work in progress or completed`);
          return;
        }

        console.log(`Estimate ${estimateId} already exists, treating as update`);
        await this.handleUpdateEstimate(estimateId, realmId);
        return;
      }

      // Fetch estimate from QuickBooks
      const estimateData = await getEstimate(
        estimateId, 
        company.id, 
        false, 
        company.connectionType as 'qbo' | 'xero'
      );

      if (!estimateData || (estimateData as QuoteFetchError).error) {
        console.error(`Failed to fetch estimate data from QBO for ID: ${estimateId}`);
        if ((estimateData as QuoteFetchError).error) {
          console.error(`Error: ${(estimateData as QuoteFetchError).message}`);
        }
        return;
      }

      // Save to database
      await estimateToDB(estimateData as FilteredQuote);

      console.log(`✅ Successfully created estimate: ${(estimateData as FilteredQuote).quoteNumber}`);
    } catch (error) {
      console.error(`Error creating estimate ${estimateId}:`, error);
      throw error;
    }
  }

  /**
   * Handle estimate (quote) update webhook
   * Compares the updated estimate with the existing one and syncs changes
   */
  private static async handleUpdateEstimate(estimateId: string, realmId: string): Promise<void> {
    try {
      console.log(`Updating estimate with ID: ${estimateId}`);
      
      // Check if quote has been sent to admin or completed - if so, skip update to preserve final work
      const existingQuote = await prisma.quote.findUnique({
        where: { id: estimateId },
        select: { status: true }
      });

      if (existingQuote && ['preparing', 'checking', 'completed'].includes(existingQuote.status)) {
        console.log(`⏭️  Skipping webhook update for quote ${estimateId} - status is ${existingQuote.status}, work in progress or completed`);
        return;
      }
      
      // Get company ID from realmId
      const company = await prisma.company.findFirst({
        where: { qboRealmId: realmId },
        select: { id: true, connectionType: true }
      });

      if (!company) {
        console.error(`Company not found for realmId: ${realmId}`);
        return;
      }

      // Fetch updated estimate from QuickBooks
      const updatedEstimateData = await getEstimate(
        estimateId, 
        company.id, 
        false, 
        company.connectionType as 'qbo' | 'xero'
      );

      if (!updatedEstimateData || (updatedEstimateData as QuoteFetchError).error) {
        console.error(`Failed to fetch estimate data from QBO for ID: ${estimateId}`);
        if ((updatedEstimateData as QuoteFetchError).error) {
          console.error(`Error: ${(updatedEstimateData as QuoteFetchError).message}`);
        }
        return;
      }

      const updatedEstimate = updatedEstimateData as FilteredQuote;

      // Get existing estimate from database
      const existingEstimate = await fetchQuoteData(estimateId);

      if (!existingEstimate) {
        console.log(`Estimate ${estimateId} not found in database, creating new one`);
        await estimateToDB(updatedEstimate);
        console.log(`✅ Successfully created estimate: ${updatedEstimate.quoteNumber}`);
        return;
      }

      // Combine quantities for items with the same product name
      const combinedProductInfo = this.combineProductQuantities(updatedEstimate.productInfo);
      
      // Create a new FilteredQuote with combined quantities
      const processedEstimate: FilteredQuote = {
        ...updatedEstimate,
        productInfo: combinedProductInfo
      };

      // Compare and log changes
      const changes = this.compareEstimates(existingEstimate, processedEstimate);
      
      if (changes.hasChanges) {
        console.log(`📋 Estimate changes detected:`);
        if (changes.addedItems.length > 0) {
          console.log(`  ➕ Added items: ${changes.addedItems.map(item => `${item.productName} (Qty: ${item.originalQty})`).join(', ')}`);
        }
        if (changes.removedItems.length > 0) {
          console.log(`  ➖ Removed items: ${changes.removedItems.map(item => `${item.productName} (Qty: ${item.originalQty})`).join(', ')}`);
        }
        if (changes.quantityChanges.length > 0) {
          console.log(`  🔄 Quantity changes: ${changes.quantityChanges.map(item => `${item.productName} (${item.oldQty} → ${item.newQty})`).join(', ')}`);
        }

        // Update the database with the processed estimate
        await estimateToDB(processedEstimate);

        console.log(`✅ Successfully updated estimate: ${processedEstimate.quoteNumber}`);
      } else {
        console.log(`ℹ️  No item changes detected for estimate: ${processedEstimate.quoteNumber}`);
        
        // Still update in case other fields changed (like total amount, notes, etc.)
        await estimateToDB(processedEstimate);
      }
    } catch (error) {
      console.error(`Error updating estimate ${estimateId}:`, error);
      throw error;
    }
  }

  /**
   * Combine quantities for items with the same product name
   * This handles cases where the same product appears on multiple lines
   */
  private static combineProductQuantities(productInfo: Record<string, ProductInfo>): Record<string, ProductInfo> {
    const productsByName = new Map<string, { ids: string[], items: ProductInfo[] }>();
    
    // Group products by name
    for (const [productId, item] of Object.entries(productInfo)) {
      const existingGroup = productsByName.get(item.productName);
      
      if (existingGroup) {
        existingGroup.ids.push(productId);
        existingGroup.items.push(item);
      } else {
        productsByName.set(item.productName, {
          ids: [productId],
          items: [item]
        });
      }
    }

    // Combine quantities for duplicate product names
    const combinedProductInfo: Record<string, ProductInfo> = {};
    
    for (const [productName, group] of productsByName.entries()) {
      if (group.items.length === 1) {
        // No duplicates, use as-is
        combinedProductInfo[group.ids[0]] = group.items[0];
      } else {
        // Multiple items with same name, combine quantities
        const firstItem = group.items[0];
        const combinedQty = group.items.reduce((sum, item) => sum + item.originalQty, 0);
        
        console.log(`🔗 Combining ${group.items.length} line items for "${productName}": ${group.items.map(i => i.originalQty).join(' + ')} = ${combinedQty}`);
        
        combinedProductInfo[group.ids[0]] = {
          ...firstItem,
          originalQty: combinedQty,
          pickingQty: combinedQty
        };
      }
    }

    return combinedProductInfo;
  }

  /**
   * Compare two estimates and detect changes
   */
  private static compareEstimates(
    oldEstimate: FilteredQuote, 
    newEstimate: FilteredQuote
  ): {
    hasChanges: boolean;
    addedItems: ProductInfo[];
    removedItems: ProductInfo[];
    quantityChanges: Array<{ productName: string; oldQty: number; newQty: number }>;
  } {
    const addedItems: ProductInfo[] = [];
    const removedItems: ProductInfo[] = [];
    const quantityChanges: Array<{ productName: string; oldQty: number; newQty: number }> = [];

    const oldProductIds = new Set(Object.keys(oldEstimate.productInfo));
    const newProductIds = new Set(Object.keys(newEstimate.productInfo));

    // Find added items
    for (const productId of newProductIds) {
      if (!oldProductIds.has(productId)) {
        addedItems.push(newEstimate.productInfo[productId]);
      }
    }

    // Find removed items
    for (const productId of oldProductIds) {
      if (!newProductIds.has(productId)) {
        removedItems.push(oldEstimate.productInfo[productId]);
      }
    }

    // Find quantity changes
    for (const productId of newProductIds) {
      if (oldProductIds.has(productId)) {
        const oldItem = oldEstimate.productInfo[productId];
        const newItem = newEstimate.productInfo[productId];
        
        if (oldItem.originalQty !== newItem.originalQty) {
          quantityChanges.push({
            productName: newItem.productName,
            oldQty: oldItem.originalQty,
            newQty: newItem.originalQty
          });
        }
      }
    }

    const hasChanges = addedItems.length > 0 || removedItems.length > 0 || quantityChanges.length > 0;

    return {
      hasChanges,
      addedItems,
      removedItems,
      quantityChanges
    };
  }

  /**
   * Test webhook endpoint
   */
  static async testWebhook(): Promise<{ message: string; timestamp: string }> {
    return {
      message: 'Webhook endpoint is working correctly',
      timestamp: new Date().toISOString()
    };
  }
}
