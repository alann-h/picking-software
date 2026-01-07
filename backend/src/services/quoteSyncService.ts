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

      const syncSettings = await prisma.sync_settings.findUnique({
        where: { companyId }
      });

      const DEFAULT_LOOKBACK_DAYS = 30;
      const lastSyncTime = syncSettings?.lastSyncTime 
        ? new Date(syncSettings.lastSyncTime) 
        : new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

      console.log(`Fetching quotes updated since: ${lastSyncTime.toISOString()}`);

      // 2. Fetch ALL changed quotes at once for this company (Now returns full data)
      const { fetchQuotesSince } = await import('./quoteService.js');
      const changedQuotes = await fetchQuotesSince(companyId, connectionType, lastSyncTime);
      
      console.log(`Found ${changedQuotes.length} updated/new quotes`);

      // Filter out errors and valid quotes
      const validQuotes: FilteredQuote[] = [];
      
      for (const item of changedQuotes) {
          if ('error' in item && item.error) {
              const errItem = item as QuoteFetchError;
              console.warn(`Error fetching quote ${errItem.quoteId}: ${errItem.message}`);
              errors.push({
                  quoteId: String(errItem.quoteId),
                  error: errItem.message,
                  customerName: 'Unknown'
              });
              failedCount++;
          } else {
              validQuotes.push(item as FilteredQuote);
          }
      }

      if (validQuotes.length === 0) {
          return {
            success: failedCount === 0,
            syncedCount,
            failedCount,
            skippedCount,
            errors,
            duration: Date.now() - startTime
          };
      }

      // 3. BULK STATUS CHECK
      // Identify quotes that are already in 'checking' or 'completed' status locally
      // We should NOT overwrite these.
      const quoteIds = validQuotes.map(q => q.quoteId);
      const lockedQuotes = await prisma.quote.findMany({
          where: {
              id: { in: quoteIds },
              status: { in: ['checking', 'completed'] }
          },
          select: { id: true }
      });
      const lockedQuoteIds = new Set(lockedQuotes.map(q => q.id));

      const quotesToSync = validQuotes.filter(q => {
          if (lockedQuoteIds.has(q.quoteId)) {
               console.log(`⏭️  Skipping quote ${q.quoteNumber || q.quoteId} - status is locked (checking/completed)`);
               skippedCount++;
               return false;
          }
          return true;
      });

      // 4. BATCH SAVE TO DB
      // We process in small batches to avoid overwhelming the DB connection pool
      const BATCH_SIZE = 20;
      
      for (let i = 0; i < quotesToSync.length; i += BATCH_SIZE) {
          const batch = quotesToSync.slice(i, i + BATCH_SIZE);
          
          await Promise.all(batch.map(async (quote) => {
               try {
                   await estimateToDB(quote);
                   syncedCount++;
                   // console.log(`✅ Synced quote ${quote.quoteNumber} for ${quote.customerName}`); // Reduce noise
               } catch (err) {
                   const msg = err instanceof Error ? err.message : 'Unknown DB error';
                   console.error(`Error saving quote ${quote.quoteId}:`, msg);
                   errors.push({
                       quoteId: quote.quoteId,
                       error: msg,
                       customerName: quote.customerName
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
