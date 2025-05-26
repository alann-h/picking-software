// src/worker.js
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processFile, enrichWithQBOData, insertProducts } from './products.js';
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

    const list     = await processFile(filePath);
    console.log(`    → Parsed ${list.length} products`);

    const enriched = await enrichWithQBOData(list, token);
    console.log(`    → Enriched ${enriched.length} products with QBO`);

    const batchSize = 100;
    for (let offset = 0; offset < enriched.length; offset += batchSize) {
        const batch = enriched.slice(offset, offset + batchSize);

        await transaction(async (client) => {
            await insertProducts(batch, companyId, client);
        });
    }
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
