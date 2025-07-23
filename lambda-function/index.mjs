import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, unlink as fsUnlink } from 'fs';
import { join, basename } from 'path';
import { promisify } from 'util';

// Import your existing service functions that DO NOT use the database
import { processFile, enrichWithQBOData } from './productService.mjs';

const unlinkAsync = promisify(fsUnlink);

// --- S3 Client (configure once outside the handler)
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const S3_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

/**
 * Helper to update job progress by calling a secure backend endpoint.
 * This replaces the direct database query.
 */
async function updateJobProgress(jobId, status, percentage, message, errorDetails = null) {
  console.log(`[${jobId}] Progress: ${percentage}% - ${message}`);
  const progressUrl = `${process.env.BACKEND_PROGRESS_URL}/${jobId}/progress`;

  await fetch(progressUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': process.env.INTERNAL_API_KEY,
    },
    body: JSON.stringify({
      status,
      percentage,
      message,
      errorDetails,
    }),
  });
}

// --- THE LAMBDA HANDLER ---
export const handler = async (event) => {
  const { jobId, s3Key, companyId, token } = event;
  let tempLocalFilePath = null;

  try {
    // 1. Download file from S3
    await updateJobProgress(jobId, 'processing', 5, 'Downloading file...');
    tempLocalFilePath = join('/tmp', basename(s3Key));
    let response;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second in milliseconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            const getObjectCommand = new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: s3Key });
            response = await s3Client.send(getObjectCommand);
            console.log(`[${jobId}] Successfully fetched file on attempt ${i + 1}`);
            break; // Success, exit the loop
        } catch (error) {
            if (error.name === 'NoSuchKey' && i < maxRetries - 1) {
                console.warn(`[${jobId}] File not found on attempt ${i + 1}. Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                throw error; // Re-throw the error on the last attempt or for other errors
            }
        }
    }
    const writeStream = createWriteStream(tempLocalFilePath);
    await new Promise((resolve, reject) => response.Body.pipe(writeStream).on('finish', resolve).on('error', reject));

    // 2. Parse file
    await updateJobProgress(jobId, 'processing', 10, 'Parsing file...');
    const list = await processFile(tempLocalFilePath);

    // 3. Enrich with QBO data
    await updateJobProgress(jobId, 'processing', 40, 'Enriching with QBO data...');
    const enriched = await enrichWithQBOData(list, token);

    // 4. Send processed data to backend for insertion
    await updateJobProgress(jobId, 'processing', 60, 'Saving to database...');
    const saveResponse = await fetch(process.env.BACKEND_SAVE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.INTERNAL_API_KEY,
        },
        body: JSON.stringify({ products: enriched, companyId }),
    });

    if (!saveResponse.ok) {
        throw new Error(`Backend failed to save data: ${await saveResponse.text()}`);
    }

    // 5. Final completion status
    await updateJobProgress(jobId, 'completed', 100, 'Completed!');

    // 6. Delete file from S3
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: s3Key }));

  } catch (error) {
    console.error(`[${jobId}] ❌ Processing failed:`, error);
    // Update the job with an error status via the backend
    await updateJobProgress(jobId, 'failed', 0, 'Processing failed.', error.message);
    throw error; // Re-throw to mark the Lambda invocation as failed
  } finally {
    // 7. Clean up temporary file
    if (tempLocalFilePath) {
      try {
        await unlinkAsync(tempLocalFilePath);
        console.log(`[${jobId}] Cleaned up temporary file.`);
      } catch (cleanupError) {
        console.warn(`[${jobId}] ⚠️ Failed to clean up temporary file:`, cleanupError);
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Processing delegated to backend successfully', jobId }),
  };
};