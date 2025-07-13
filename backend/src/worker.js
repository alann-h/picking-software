// src/worker.js
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processFile, enrichWithQBOData, insertProducts } from './services/productService.js';
import { transaction } from './helpers.js';

import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, unlink as fsUnlink } from 'fs';
import { join, basename } from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fsUnlink);

console.log('🚀 Worker starting up...');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  family: 6,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const S3_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const worker = new Worker(
  'products',
  async (job) => {
    const { s3Key, companyId, token } = job.data;
    console.log(token);
    let tempLocalFilePath = null;

    try {
      // 1. Update progress for file downloading
      await job.updateProgress({ percentage: 5, message: 'Downloading file...' });

      // Create a temporary path in /tmp for the worker to save the downloaded file
      tempLocalFilePath = join('/tmp', basename(s3Key));

      // Download the file from S3
      console.log(`   → Downloading ${s3Key} from S3 to ${tempLocalFilePath}`);
      const getObjectCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
      });
      const response = await s3Client.send(getObjectCommand);

      if (!response.Body) {
        throw new Error(`S3 object body is empty for key: ${s3Key}`);
      }

      // Pipe the S3 response stream to a local writable stream
      const writeStream = createWriteStream(tempLocalFilePath);
      await new Promise((resolve, reject) => {
        response.Body.pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });
      console.log(`   → File downloaded successfully.`);

      // 2. Update progress for file processing (use the temporary local path)
      await job.updateProgress({ percentage: 10, message: 'Parsing file...' });
      const list = await processFile(tempLocalFilePath);
      console.log(`   → Parsed ${list.length} products`);

      // 3. Update progress for data enrichment
      await job.updateProgress({ percentage: 40, message: 'Enriching with QBO data...' });
      const enriched = await enrichWithQBOData(list, token);
      console.log(`   → Enriched ${enriched.length} products with QBO`);

      // 4. Update progress for database insertion in batches
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

      // 5. Final completion progress
      await job.updateProgress({ percentage: 100, message: 'Completed!' });

      // 6. Optional: Delete the file from S3 after successful processing
      // This is generally recommended for one-time processing files to save on S3 storage costs.
      // Iremove this block if i need to retain file.
      console.log(`   → Deleting ${s3Key} from S3...`);
      await s3Client.send(new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
      }));
      console.log(`   → ${s3Key} deleted from S3.`);

    } catch (error) {
      console.error(`❌ Job ${job?.id} failed:`, error);
      throw error; // Re-throw the error to mark the job as failed in BullMQ
    } finally {
      // 7. Clean up the temporary local file in the worker container
      if (tempLocalFilePath) { // Check if the path was successfully set
        try {
          await unlinkAsync(tempLocalFilePath);
          console.log(`   → Cleaned up temporary local file: ${tempLocalFilePath}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to clean up temporary file ${tempLocalFilePath}:`, cleanupError);
        }
      }
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