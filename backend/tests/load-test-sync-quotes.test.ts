import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { QuoteSyncService } from '../src/services/quoteSyncService';

// --- GENERATE MOCK DATA ---
const TOTAL_QUOTES = 500; // Test with 500 quotes
const BATCH_SIZE = 500; // QBO max results

const MOCK_ESTIMATES = Array.from({ length: TOTAL_QUOTES }, (_, i) => ({
  Id: `mock-quote-${i}`,
  DocNumber: `Q-${1000 + i}`,
  TotalAmt: 100 + i,
  TxnStatus: 'Pending',
  TxnDate: '2023-01-01',
  MetaData: { LastUpdatedTime: new Date().toISOString() },
  CustomerRef: { value: `cust-${i}`, name: `Customer ${i}` },
  Line: [
      {
          Id: `line-${i}`,
          Amount: 50,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
              ItemRef: { value: `product-${i % 10}`, name: `Product ${i % 10}` }, // Reuse same 10 products
              Qty: 1
          }
      }
  ]
}));

// --- MOCKS ---

// Mock authService
vi.mock('../src/services/authService', () => {
    return {
        getOAuthClient: vi.fn(), 
        getBaseURL: vi.fn().mockResolvedValue('https://mock.qbo.api/'),
        getRealmId: vi.fn().mockReturnValue('mock-realm-id')
    }
});

vi.mock('../src/services/authSystem', () => ({
  authSystem: {
      refreshQBOToken: vi.fn(),
      initializeQBO: vi.fn(),
      getXeroTenantId: vi.fn(),
      refreshXeroToken: vi.fn(),
      initializeXero: vi.fn()
  }
}));

// Mock tokenService
vi.mock('../src/services/tokenService', () => ({
  tokenService: {
    getOAuthClient: vi.fn(),
    getValidToken: vi.fn().mockResolvedValue({ access_token: 'mock_access', refresh_token: 'mock_refresh' })
  }
}));

describe('Load Test: QBO Quote Sync (Bulk)', () => {
  const TEST_COMPANY_IDS: string[] = [];
  const NUM_COMPANIES = 1;

  beforeAll(async () => {
    // 1. Create Test Company
    console.log(`Creating ${NUM_COMPANIES} QBO test companies...`);
    for (let i = 0; i < NUM_COMPANIES; i++) {
        // ... (rest of beforeAll is fine)
      const company = await prisma.company.create({
        data: {
          companyName: `QBO Quote Load Test Company ${i}`,
          connectionType: 'qbo',
          qboRealmId: `mock-realm-${i}`,
          syncSettings: {
            create: {
              enabled: true,
              lastSyncTime: new Date(0)
            }
          }
        }
      });
      TEST_COMPANY_IDS.push(company.id);

      // Create dummy customers for the quotes
      await prisma.customer.createMany({
          data: Array.from({ length: TOTAL_QUOTES }, (_, k) => ({
              id: `cust-${k}`,
              companyId: company.id,
              customerName: `Customer ${k}`
          }))
      });

      // Create dummy products so the sync finds them
      await prisma.product.createMany({
          data: Array.from({ length: 10 }, (_, j) => ({
              companyId: company.id,
              externalItemId: `product-${j}`,
              productName: `Product ${j}`,
              sku: `SKU-${j}`,
              quantityOnHand: 100
          }))
      });
    }
  });

  afterAll(async () => {
    // Cleanup
    console.log('Cleaning up QBO test data...');
    try {
        await prisma.quoteItem.deleteMany({
             where: { quote: { companyId: { in: TEST_COMPANY_IDS } } }
        });
        await prisma.quote.deleteMany({
             where: { companyId: { in: TEST_COMPANY_IDS } }
        });
        await prisma.product.deleteMany({
          where: { companyId: { in: TEST_COMPANY_IDS } }
        });
        await prisma.sync_settings.deleteMany({
          where: { companyId: { in: TEST_COMPANY_IDS } }
        });
        await prisma.company.deleteMany({
          where: { id: { in: TEST_COMPANY_IDS } }
        });
    } catch(e) {
        console.error('Cleanup failed', e);
    }
  });

  it('should sync 500 quotes using bulk processing', async () => {
    console.log('--- STARTING QBO QUOTE LOAD TEST ---');
    
    const startTime = Date.now();

    // 1. Mock QBO API Call
    const mockMakeApiCall = vi.fn().mockImplementation(async ({ url }: { url: string }) => {
        // Return all estimates in one go
        return {
            json: {
                QueryResponse: {
                    Estimate: MOCK_ESTIMATES
                }
            }
        };
    });

    const { tokenService } = await import('../src/services/tokenService');
    (tokenService.getOAuthClient as any).mockResolvedValue({
        makeApiCall: mockMakeApiCall
    });


    // 2. EXECUTE SYNC
    // Call service directly for the first company
    const result = await QuoteSyncService.syncAllPendingQuotes(TEST_COMPANY_IDS[0], 'qbo');


    // 3. ASSERTIONS
    const duration = Date.now() - startTime;
    console.log(`--- QBO QUOTE TEST COMPLETE in ${duration}ms ---`);

    if (!result.success) {
        console.error('Sync Failed with Errors:', JSON.stringify(result.errors, null, 2));
    }

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(TOTAL_QUOTES);
    expect(result.failedCount).toBe(0);
    
    // Valid DB
    const dbQuoteCount = await prisma.quote.count({
        where: { companyId: TEST_COMPANY_IDS[0] }
    });
    expect(dbQuoteCount).toBe(TOTAL_QUOTES);

    const dbItemCount = await prisma.quoteItem.count({
        where: { quote: { companyId: TEST_COMPANY_IDS[0] } }
    });
    expect(dbItemCount).toBe(TOTAL_QUOTES); // 1 item per quote

    // Restore
    vi.restoreAllMocks();

  }, 30000);
});
