import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { ProductSyncService } from '../src/services/productSyncService';

// --- MOCKS ---

const { MOCK_ITEMS } = vi.hoisted(() => {
  const generateMockProducts = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      itemID: `mock-item-${i}`,
      code: `SKU-${i}`,
      name: `Mock Product ${i}`,
      isSold: true,
      salesDetails: {
        unitPrice: 10 + (i % 100),
        taxType: 'OUTPUT'
      },
      isTrackedAsInventory: true,
      quantityOnHand: 100
    }));
  };
  return { MOCK_ITEMS: generateMockProducts(5000) };
});

// Mock authService to return our mock client
vi.mock('../src/services/authService', () => {
    const mockClient = {
        accountingApi: {
          getItems: vi.fn().mockResolvedValue({
            body: {
              items: MOCK_ITEMS
            }
          })
        }
    };
    return {
        getOAuthClient: vi.fn().mockResolvedValue(mockClient),
        getBaseURL: vi.fn().mockResolvedValue('https://mock.api'),
        getRealmId: vi.fn().mockReturnValue('mock-realm-id')
    }
});

// Mock authSystem
vi.mock('../src/services/authSystem', () => ({
  authSystem: {
    getXeroTenantId: vi.fn().mockResolvedValue({ tenantId: 'mock-tenant-id' })
  }
}));

// Mock quoteSyncService to avoid "quote" sync noise during this product load test
vi.mock('../src/services/quoteSyncService', () => ({
  QuoteSyncService: {
    syncAllPendingQuotes: vi.fn().mockResolvedValue({ success: true })
  }
}));


describe('Load Test: Xero Product Sync', () => {
    // Increase timeout significantly for load test
  const TEST_COMPANY_IDS: string[] = [];
  const NUM_COMPANIES = 5;

  beforeAll(async () => {
    // 1. Create 5 Dummy Companies in the DB
    console.log(`Creating ${NUM_COMPANIES} test companies...`);
    for (let i = 0; i < NUM_COMPANIES; i++) {
      const company = await prisma.company.create({
        data: {
          companyName: `Load Test Company ${i}`,
          connectionType: 'xero',
          xeroTenantId: `mock-tenant-${i}`,
          // Create associated sync settings
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
    console.log('Cleaning up test data...');
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

  it('should handle syncing 5 companies with 5000 products each within reasonable time', async () => {
    console.log('--- STARTING LOAD TEST ---');
    console.log(`Simulating ${NUM_COMPANIES} companies, each with ${MOCK_ITEMS.length} products.`);
    console.log(`Total items to process: ${NUM_COMPANIES * MOCK_ITEMS.length}`);

    const startTime = Date.now();

    // FORCE MOCKING findMany to only return our test companies.
    // This is critical because syncAllCompaniesWithSettings fetches ALL companies from the DB.
    // If we don't spy/mock this, it will try to sync REAL companies using our MOCK auth client, which might fail or be confusing.
    // Also we only want to measure the performance of these 5 specific companies.
    
    vi.spyOn(prisma.company, 'findMany').mockResolvedValue(
      TEST_COMPANY_IDS.map(id => ({
        id,
        companyName: 'Load Test Company',
        connectionType: 'xero',
        xeroTenantId: 'mock-tenant-id',
        qboRealmId: null
      })) as any
    );

    const results = await ProductSyncService.syncAllCompaniesWithSettings();

    const duration = Date.now() - startTime;
    console.log(`--- LOAD TEST COMPLETE ---`);
    console.log(`Total Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    
    // Usage stats
    const usage = process.memoryUsage();
    console.log('Memory Usage:', {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`,
    });

    // Assertions
    expect(Object.keys(results).length).toBe(NUM_COMPANIES);
    
    let totalUpdated = 0;
    let totalNew = 0;
    
    for (const id of TEST_COMPANY_IDS) {
      const res = results[id];
      expect(res.success).toBe(true);
      expect(res.totalProducts).toBe(MOCK_ITEMS.length);
      totalUpdated += res.updatedProducts;
      totalNew += res.newProducts;
    }

    console.log(`Total Database Writes (Create/Update): ${totalUpdated + totalNew}`);
    
    // Restore spy
    vi.restoreAllMocks(); 
    
  }, 300000); // 5 minute timeout for safety
});
