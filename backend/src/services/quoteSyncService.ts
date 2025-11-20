import { fetchCustomers } from './customerService.js';
import { getCustomerQuotes, estimateToDB } from './quoteService.js';
import { ConnectionType } from '../types/auth.js';
import { CustomerQuote, QuoteFetchError, FilteredQuote } from '../types/quote.js';
import { prisma } from '../lib/prisma.js';

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

      // Process customers in parallel batches of 10 for better performance
      const BATCH_SIZE = 10;
      const { getEstimate } = await import('./quoteService.js');

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(customers.length / BATCH_SIZE)} (${batch.length} customers)`);

        // Process all customers in the batch in parallel
        await Promise.all(batch.map(async (customer) => {
          try {
            // Get quotes from QuickBooks/Xero for this customer
            const quotes = await getCustomerQuotes(customer.id, companyId, connectionType) as CustomerQuote[];
            
            if (!quotes || quotes.length === 0) {
              return; // Skip customers with no quotes
            }

            console.log(`Found ${quotes.length} quotes for ${customer.customer_name}`);

            // Fetch and save each quote
            for (const quoteSummary of quotes) {
              try {
                // Check if quote is being checked or completed - if so, skip it to preserve final work
                // Note: 'preparing' is allowed so admins can add items while picker is working
                const existingQuote = await prisma.quote.findUnique({
                  where: { id: String(quoteSummary.id) },
                  select: { status: true }
                });

                if (existingQuote && ['checking', 'completed'].includes(existingQuote.status)) {
                  console.log(`⏭️  Skipping quote ${quoteSummary.quoteNumber || quoteSummary.id} - status is ${existingQuote.status}, being checked or completed`);
                  skippedCount++;
                  continue;
                }

                // Import the full quote from QuickBooks/Xero
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

                // Save to database (only if not preparing/checking/completed)
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
        }));
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

