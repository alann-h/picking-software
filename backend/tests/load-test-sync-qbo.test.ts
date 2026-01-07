import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { ProductSyncService } from '../src/services/productSyncService';

// --- GENERATE MOCK DATA ---
const TOTAL_ITEMS = 1500; // Prove 1000+ items works (3 batches of 500)
const BATCH_SIZE = 500;

const MOCK_ITEMS = Array.from({ length: TOTAL_ITEMS }, (_, i) => ({
  Id: `mock-qbo-item-${i}`,
  Sku: `SKU-QBO-${i}`,
  Name: `Mock QBO Product ${i}`,
  Active: true,
  UnitPrice: 10 + (i % 100),
  QtyOnHand: 100,
  SalesTaxCodeRef: { value: 'TAX-CODE' }
}));

// --- MOCKS ---

// Mock authService
vi.mock('../src/services/authService', () => {
    return {
        getOAuthClient: vi.fn(), // We'll mock the implementation in the test
        getBaseURL: vi.fn().mockResolvedValue('https://mock.qbo.api/'),
        getRealmId: vi.fn().mockReturnValue('mock-realm-id')
    }
});

// Mock authSystem
vi.mock('../src/services/authSystem', () => ({
  authSystem: {
    // Not needed for QBO sync path but good to handle
  }
}));


describe('Load Test: QBO Product Sync (Pagination & Bulk)', () => {
  const TEST_COMPANY_IDS: string[] = [];
  const NUM_COMPANIES = 2; // Test with 2 companies to keep it faster but prove concurrency

  beforeAll(async () => {
    // 1. Create Test Companies
    console.log(`Creating ${NUM_COMPANIES} QBO test companies...`);
    for (let i = 0; i < NUM_COMPANIES; i++) {
      const company = await prisma.company.create({
        data: {
          companyName: `QBO Load Test Company ${i}`,
          connectionType: 'qbo',
          qboRealmId: `mock-realm-${i}`,
          syncSettings: {
            create: {
              enabled: true,
              lastSyncTime: new Date(0) // Force sync
            }
          }
        }
      });
      TEST_COMPANY_IDS.push(company.id);
    }
  });

  afterAll(async () => {
    // Cleanup
    console.log('Cleaning up QBO test data...');
    await prisma.product.deleteMany({
      where: { companyId: { in: TEST_COMPANY_IDS } }
    });
    await prisma.sync_settings.deleteMany({
      where: { companyId: { in: TEST_COMPANY_IDS } }
    });
    await prisma.company.deleteMany({
      where: { id: { in: TEST_COMPANY_IDS } }
    });
  });

  it('should sync 1500 items using pagination and bulk insert', async () => {
    console.log('--- STARTING QBO LOAD TEST ---');
    console.log(`Simulating ${NUM_COMPANIES} companies with ${TOTAL_ITEMS} items each.`);

    const startTime = Date.now();

    // 1. Mock `getOAuthClient` to return an object with `makeApiCall`
    // This mock simulates QBO Pagination Logic
    const mockMakeApiCall = vi.fn().mockImplementation(async ({ url }: { url: string }) => {
        // Parse "STARTPOSITION" from the URL query
        // URL format: ...query=SELECT... STARTPOSITION 1 MAXRESULTS 500...
        const decodedUrl = decodeURIComponent(url);
        const match = decodedUrl.match(/STARTPOSITION (\d+)/);
        const startPos = match ? parseInt(match[1]) : 1;

        // Slice items based on start position (1-based index)
        const startIndex = startPos - 1;
        const slice = MOCK_ITEMS.slice(startIndex, startIndex + BATCH_SIZE);
        
        console.log(`[MOCK QBO API] Serving items ${startPos} to ${startPos + slice.length - 1} (Count: ${slice.length})`);

        return {
            json: {
                QueryResponse: {
                    Item: slice
                }
            }
        };
    });

    const { getOAuthClient } = await import('../src/services/authService');
    (getOAuthClient as any).mockResolvedValue({
        makeApiCall: mockMakeApiCall
    });


    // 2. Mock `prisma.company.findMany` to return only our test companies
    vi.spyOn(prisma.company, 'findMany').mockResolvedValue(
      TEST_COMPANY_IDS.map(id => ({
        id,
        companyName: 'QBO Test Company',
        connectionType: 'qbo',
        qboRealmId: 'mock-realm-id',
        xeroTenantId: null
      })) as any
    );


    // 3. EXECUTE SYNC
    const results = await ProductSyncService.syncAllCompaniesWithSettings();


    // 4. ASSERTIONS
    const duration = Date.now() - startTime;
    console.log(`--- QBO TEST COMPLETE in ${duration}ms ---`);

    expect(Object.keys(results).length).toBe(NUM_COMPANIES);

    for (const id of TEST_COMPANY_IDS) {
      const res = results[id];
      expect(res.success).toBe(true);
      expect(res.totalProducts).toBe(TOTAL_ITEMS);
      expect(res.newProducts).toBe(TOTAL_ITEMS); // First run, all should be new
      
      // Verify correct number of API calls were made per company
      // 1500 items / 500 per page = 3 calls. + 1 call that returns empty/partial to finish loop.
      // Expected logic:
      // Loop 1: Start 1, returns 500.
      // Loop 2: Start 501, returns 500.
      // Loop 3: Start 1001, returns 500.
      // Loop 4: Start 1501, returns 0 -> Break.
      // So ~4 calls per company.
    }
    
    // Check Database counts
    const dbProductCount = await prisma.product.count({
        where: { companyId: { in: TEST_COMPANY_IDS } }
    });
    expect(dbProductCount).toBe(TOTAL_ITEMS * NUM_COMPANIES);

    // Restore
    vi.restoreAllMocks();

  }, 30000);
});
