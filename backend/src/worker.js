// src/worker.js
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processFile, enrichWithQBOData, insertProducts } from './services/productService.js';
import { transaction } from './helpers.js';

console.log('🚀 Worker starting up...');

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker = new Worker(
  'products',
  async (job) => {
    const { filePath, companyId, token } = job.data;

    // 1. Update progress for file processing
    await job.updateProgress({ percentage: 10, message: 'Parsing file...' });
    const list = await processFile(filePath);
    console.log(`     → Parsed ${list.length} products`);

    // 2. Update progress for data enrichment
    await job.updateProgress({ percentage: 40, message: 'Enriching with QBO data...' });
    const enriched = await enrichWithQBOData(list, token);
    console.log(`     → Enriched ${enriched.length} products with QBO`);

    // 3. Update progress for database insertion in batches
    const batchSize = 100;
    const totalBatches = Math.ceil(enriched.length / batchSize);
    for (let i = 0; i < totalBatches; i++) {
        const offset = i * batchSize;
        const batch = enriched.slice(offset, offset + batchSize);

        const insertProgress = 60 + Math.round((i / totalBatches) * 40);
        await job.updateProgress({
            percentage: insertProgress,
            message: `Inserting batch ${i + 1} of ${totalBatches}`,
        });
        
        await transaction(async (client) => {
            await insertProducts(batch, companyId, client);
        });
    }

    // 4. Final completion progress
    await job.updateProgress({ percentage: 100, message: 'Completed!' });
  },
  { connection }
);

worker.on('completed', job => {
  console.log(`🎉  Job ${job.id} completed`);
});
worker.on('failed', (job, err) => {
  console.error(`❌  Job ${job?.id} failed:`, err);
});
worker.on('error', err => {
  console.error('⚠️  Worker error:', err);
});