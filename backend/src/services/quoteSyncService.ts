import { fetchCustomers } from './customerService.js';
import { getCustomerQuotes, estimateToDB } from './quoteService.js';
import { ConnectionType } from '../types/auth.js';
import { CustomerQuote, QuoteFetchError, FilteredQuote } from '../types/quote.js';

export interface QuoteSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ quoteId?: string; error: string; customerName?: string }>;
  duration: number;
}

export class QuoteSyncService {
  /**
   * Sync all pending quotes from QuickBooks/Xero for all customers
   */
  static async syncAllPendingQuotes(companyId: string, connectionType: ConnectionType): Promise<QuoteSyncResult> {
    const startTime = Date.now();
    const errors: Array<{ quoteId?: string; error: string; customerName?: string }> = [];
    let syncedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      console.log(`Starting quote sync for company: ${companyId}`);

      // Get all customers for this company
      const customers = await fetchCustomers(companyId, connectionType);
      console.log(`Found ${customers.length} customers to sync quotes from`);

      // Fetch quotes for each customer
      for (const customer of customers) {
        try {
          console.log(`Fetching quotes for customer: ${customer.customer_name} (${customer.id})`);
          
          // Get quotes from QuickBooks/Xero for this customer
          const quotes = await getCustomerQuotes(customer.id, companyId, connectionType) as CustomerQuote[];
          
          if (!quotes || quotes.length === 0) {
            console.log(`No quotes found for customer: ${customer.customer_name}`);
            continue;
          }

          console.log(`Found ${quotes.length} quotes for ${customer.customer_name}`);

          // Filter for pending quotes only (not assigned to runs)
          const pendingQuotes = quotes.filter(q => 
            typeof q.id === 'string' && 
            (!q.orderStatus || q.orderStatus === 'pending')
          );

          if (pendingQuotes.length === 0) {
            console.log(`No pending quotes for customer: ${customer.customer_name}`);
            continue;
          }

          console.log(`Found ${pendingQuotes.length} pending quotes for ${customer.customer_name}`);

          // Fetch and save each pending quote
          for (const quoteSummary of pendingQuotes) {
            try {
              // Import the full quote from QuickBooks/Xero
              const { getEstimate } = await import('./quoteService.js');
              const quoteData = await getEstimate(String(quoteSummary.id), companyId, false, connectionType);

              if (!quoteData) {
                console.warn(`Could not fetch quote ${quoteSummary.id} for ${customer.customer_name}`);
                skippedCount++;
                continue;
              }

              // Check if it's an error response
              if ((quoteData as QuoteFetchError).error) {
                const error = quoteData as QuoteFetchError;
                console.warn(`Error fetching quote ${quoteSummary.id}: ${error.message}`);
                errors.push({
                  quoteId: String(quoteSummary.id),
                  error: error.message,
                  customerName: customer.customer_name
                });
                failedCount++;
                continue;
              }

              // Save to database
              await estimateToDB(quoteData as FilteredQuote);
              syncedCount++;
              console.log(`✅ Synced quote ${quoteSummary.quoteNumber || quoteSummary.id} for ${customer.customer_name}`);

            } catch (quoteError) {
              const errorMessage = quoteError instanceof Error ? quoteError.message : 'Unknown error';
              console.error(`Error syncing quote ${quoteSummary.id}:`, errorMessage);
              errors.push({
                quoteId: String(quoteSummary.id),
                error: errorMessage,
                customerName: customer.customer_name
              });
              failedCount++;
            }
          }

        } catch (customerError) {
          const errorMessage = customerError instanceof Error ? customerError.message : 'Unknown error';
          console.error(`Error processing customer ${customer.customer_name}:`, errorMessage);
          errors.push({
            error: `Failed to process customer ${customer.customer_name}: ${errorMessage}`,
            customerName: customer.customer_name
          });
          failedCount++;
        }
      }

      const duration = Date.now() - startTime;
      const result: QuoteSyncResult = {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        skippedCount,
        errors,
        duration
      };

      console.log(`Quote sync completed in ${duration}ms:`, {
        synced: syncedCount,
        failed: failedCount,
        skipped: skippedCount
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Quote sync failed:', error);
      
      return {
        success: false,
        syncedCount,
        failedCount: failedCount + 1,
        skippedCount,
        errors: [...errors, {
          error: error instanceof Error ? error.message : 'Unknown error during sync'
        }],
        duration
      };
    }
  }
}

