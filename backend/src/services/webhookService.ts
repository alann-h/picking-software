import { prisma } from '../lib/prisma.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { IntuitOAuthClient } from '../types/authSystem.js';

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

    // Only process Item events (products)
    if (event.name !== 'Item') {
      console.log(`Skipping non-Item event: ${event.name}`);
      return;
    }

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
          barcode: productData.barcode,
          externalItemId: itemId,
          category: productData.category,
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

      // Update existing product
      const updatedProduct = await prisma.product.updateMany({
        where: {
          externalItemId: itemId,
          companyId: company.id
        },
        data: {
          productName: productData.productName,
          sku: productData.sku,
          barcode: productData.barcode,
          category: productData.category,
          taxCodeRef: productData.tax_code_ref,
          price: productData.price || 0,
          quantityOnHand: productData.quantity_on_hand || 0,
          isArchived: !productData.is_active, // If not active in QBO, mark as archived
        }
      });

      if (updatedProduct.count === 0) {
        console.log(`Product with external ID ${itemId} not found in database, creating instead`);
        await this.handleCreateProduct(itemId, realmId);
        return;
      }

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
        barcode: itemData.Barcode || null,
        category: itemData.ItemCategoryRef?.name || null,
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
   * Test webhook endpoint
   */
  static async testWebhook(): Promise<{ message: string; timestamp: string }> {
    return {
      message: 'Webhook endpoint is working correctly',
      timestamp: new Date().toISOString()
    };
  }
}
