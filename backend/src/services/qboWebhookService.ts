// src/services/qboWebhookService.ts

import { getOAuthClient, getBaseURL } from './authService.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { upsertProducts } from './productService.js';
import { EnrichableProduct } from '../types/product.js';

interface QBOWebhookEvent {
  id: string;
  operation: 'Create' | 'Update' | 'Delete';
  name: string;
  lastUpdated: string;
}

/**
 * Handles a single QuickBooks webhook event, fetching detailed item data and updating the local database.
 * @param event The webhook event object.
 * @param realmId The company ID (realmId) from the webhook payload.
 */
async function processQBOItemEvent(event: QBOWebhookEvent, realmId: string, companyId: string) {
  if (event.name !== 'Item') {
    console.warn(`Skipping non-Item event: ${event.name}`);
    return;
  }

  try {
    const oauthClient = await getOAuthClient(companyId, 'qbo');
    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const url = `${baseURL}v3/company/${realmId}/item/${event.id}?minorversion=75`;

    const response = await (oauthClient as IntuitOAuthClient).makeApiCall({ url });
    const itemData = response.json?.Item;

    if (!itemData) {
      console.warn(`No item data found for ID ${event.id} after webhook notification.`);
      return;
    }

    // Handle 'Delete' operation
    if (event.operation === 'Delete') {
      console.log(`Item ${event.id} was deleted. Archiving locally...`);
      // Update the product in your database to be archived
      const productToUpdate: EnrichableProduct = {
        sku: itemData.Sku,
        productName: itemData.Name,
        is_archived: true,
      };
      await upsertProducts([productToUpdate], realmId);
      return;
    }
    
    // Check if the item is inactive for 'Update' and 'Create'
    if (itemData.Active === false) {
      console.log(`Item ${event.id} is inactive. Archiving locally.`);
      // Update the product in your database to be archived
      const productToUpdate: EnrichableProduct = {
        sku: itemData.Sku,
        productName: itemData.Name,
        is_archived: true,
      };
      await upsertProducts([productToUpdate], realmId);
      return;
    }

    const productToUpsert: EnrichableProduct = {
      sku: itemData.Sku,
      productName: itemData.Name,
      barcode: itemData.BarCode,
      price: itemData.UnitPrice,
      quantity_on_hand: itemData.QtyOnHand,
      external_item_id: itemData.Id,
      is_archived: false,
      category: itemData.subType, // Example: could be 'Inventory', 'Service', etc.
      tax_code_ref: itemData.SalesTaxCodeRef?.value,
    };

    console.log(`Processing ${event.operation} for item ${itemData.Id} (SKU: ${itemData.Sku})`);
    await upsertProducts([productToUpsert], realmId);

  } catch (err) {
    console.error(`Error processing QBO event for item ${event.id}:`, err);
  }
}

/**
 * Main handler to process an array of webhook notifications from QuickBooks.
 * @param eventNotifications The `eventNotifications` array from the webhook body.
 */
export async function handleQBOEventNotifications(eventNotifications: any[], companyId: string ) {
  if (!eventNotifications || !Array.isArray(eventNotifications)) {
    console.warn('No eventNotifications array provided.');
    return;
  }
  
  for (const notification of eventNotifications) {
    const realmId = notification.realmId;
    if (!realmId) {
      console.warn('Notification missing realmId. Skipping.');
      continue;
    }

    if (notification.dataChangeEvent && notification.dataChangeEvent.entities) {
      for (const event of notification.dataChangeEvent.entities as QBOWebhookEvent[]) {
        await processQBOItemEvent(event, realmId, companyId);
      }
    }
  }
}