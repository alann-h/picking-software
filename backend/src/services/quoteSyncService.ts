import { estimateToDB } from './quoteService.js';
import { ConnectionType } from '../types/auth.js';
import { QuoteFetchError, FilteredQuote } from '../types/quote.js';
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

      // 1. Get the last sync time from sync_settings (passed down or fetched)
      // For now, let's fetch it again to be safe, or default to 0 if not provided
      const syncSettings = await prisma.sync_settings.findUnique({
        where: { companyId }
      });

      // Default to syncing strictly new things if no history, OR sync last 24h as safety net?
      // Better: if never synced, sync last 30 days? Or all?
      // Let's default to last 30 days if no history to be safe but not fetch forever
      // Actually, if we want "all pending", we might need a "full sync" option.
      // But usually "sync since last time" is the standard.
      // If no last sync time, let's look back 30 days.
      const DEFAULT_LOOKBACK_DAYS = 30;
      const lastSyncTime = syncSettings?.lastSyncTime 
        ? new Date(syncSettings.lastSyncTime) 
        : new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

      console.log(`Fetching quotes updated since: ${lastSyncTime.toISOString()}`);

      // 2. Fetch ALL changed quotes at once for this company
      const { fetchQuotesSince, getEstimate } = await import('./quoteService.js');
      const changedQuotes = await fetchQuotesSince(companyId, connectionType, lastSyncTime);
      
      console.log(`Found ${changedQuotes.length} updated/new quotes`);
      
      // 3. Process the changed quotes
      for (const quoteSummary of changedQuotes) {
         try {
            // Check if quote is being checked or completed - if so, skip it to preserve final work
            const existingQuote = await prisma.quote.findUnique({
              where: { id: String(quoteSummary.id) },
              select: { status: true }
            });

            if (existingQuote && ['checking', 'completed'].includes(existingQuote.status)) {
              console.log(`⏭️  Skipping quote ${quoteSummary.quoteNumber || quoteSummary.id} - status is ${existingQuote.status}, being checked or completed`);
              skippedCount++;
              continue;
            }

            // Import the full quote
            const quoteData = await getEstimate(String(quoteSummary.id), companyId, false, connectionType);

            if (!quoteData) {
              console.warn(`Could not fetch quote ${quoteSummary.id} data`);
              skippedCount++;
              continue;
            }

            if ((quoteData as QuoteFetchError).error) {
              const error = quoteData as QuoteFetchError;
              console.warn(`Error fetching quote ${quoteSummary.id}: ${error.message}`);
              errors.push({
                quoteId: String(quoteSummary.id),
                error: error.message,
                customerName: quoteSummary.customerName
              });
              failedCount++;
              continue;
            }

            // Save to database
            await estimateToDB(quoteData as FilteredQuote);
            syncedCount++;
            console.log(`✅ Synced quote ${quoteSummary.quoteNumber || quoteSummary.id} for ${quoteSummary.customerName}`);

         } catch (quoteError) {
            const errorMessage = quoteError instanceof Error ? quoteError.message : 'Unknown error';
            console.error(`Error syncing quote ${quoteSummary.id}:`, errorMessage);
            errors.push({
              quoteId: String(quoteSummary.id),
              error: errorMessage,
              customerName: quoteSummary.customerName
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
