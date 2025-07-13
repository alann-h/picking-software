// src/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { doubleCsrf } from 'csrf-csrf';
import swaggerUi from 'swagger-ui-express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import pgSession from 'connect-pg-simple';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, unlink as fsUnlink } from 'fs';
import { promisify } from 'util';

import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import productRoutes from './routes/productRoutes.js';

import asyncHandler from './middlewares/asyncHandler.js';
import { isAuthenticated, decryptSessionToken } from './middlewares/authMiddleware.js';
import errorHandler from './middlewares/errorHandler.js';

import pool from './db.js';

dotenv.config({ path: '.env' });

const app = express();

const unlinkAsync = promisify(fsUnlink);

// — CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://smartpicker.au', 'https://api.smartpicker.au']
    : ['http://localhost:3000', 'http://localhost:5033'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
};
app.use(cors(corsOptions));

// — Redis & BullMQ setup
const redisConn = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  family: 6,
});
export const productQueue = new Queue('products', { connection: redisConn });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const S3_BUCKET_NAME = process.env.AWS_BUCKET_NAME; 

// — Express proxy/trust
app.set('trust proxy', 1);

// — Sessions with Postgres store
const PgStore = pgSession(session);
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(session({
  store: new PgStore({ pool, tableName: 'sessions' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    domain: process.env.NODE_ENV === 'production' ? '.smartpicker.au' : undefined,
  },
}));

// — Prune sessions daily
setInterval(() => {
  new PgStore({ pool, tableName: 'sessions' }).pruneSessions();
}, 24 * 60 * 60 * 1000);

// — Body parsing & logging
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan(':method :url :status'));

// — CSRF protection
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    domain: process.env.NODE_ENV === 'production' ? '.smartpicker.au' : undefined,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: req => req.headers['x-csrf-token'],
});

app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: generateToken(req, res) });
});

app.use(doubleCsrfProtection);

// — Decrypt token on every request
app.use(decryptSessionToken);

// — Mount feature routers
app.use('/auth', authRoutes);
app.use('/customers', customerRoutes);
app.use('/quotes', quoteRoutes);
app.use('/products', productRoutes);

app.get('/verifyUser', asyncHandler(async (req, res) => {
  res.json({ isValid: !!req.session.token });
}));

app.get('/user-status', isAuthenticated, asyncHandler(async (req, res) => {
  res.json({
    isAdmin: req.session.isAdmin || false,
    userId: req.session.userId,
  });
}));

const upload = multer({ dest: '/tmp/' });

app.post('/upload',
  isAuthenticated,
  upload.single('input'),
  asyncHandler(async (req, res) => {
    if (!req.file?.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const localFilePath = req.file.path;
    const originalFileName = req.file.originalname;
    // Create a unique key for S3 to avoid collisions and keep original name accessible
    // Using Date.now() + original name to ensure uniqueness and readability
    const s3Key = `uploads/${Date.now()}-${originalFileName}`;

    try {
      // 1. Upload the file to S3
      const fileStream = createReadStream(localFilePath);
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileStream,
        ContentType: req.file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`Successfully uploaded ${s3Key} to S3.`);

      // 2. Add job to BullMQ queue, passing the S3 key
      const job = await productQueue.add('process-and-save', {
        s3Key: s3Key,
        companyId: req.session.companyId,
        token: req.decryptedToken,
      });

      res.status(202).json({ message: 'File queued for processing', jobId: job.id });

    } catch (error) {
      console.error('Error during file upload to S3 or queueing job:', error);
      res.status(500).json({ error: 'Failed to process file upload.' });
    } finally {
      // 3. Clean up the local temporary file after upload (important!)
      try {
        await unlinkAsync(localFilePath);
        console.log(`Cleaned up temporary local file: ${localFilePath}`);
      } catch (cleanupError) {
        console.warn(`Failed to clean up temporary file ${localFilePath}:`, cleanupError);
      }
    }
  })
);


app.get('/job/:jobId/progress', isAuthenticated, asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const job = await productQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress;

  res.json({ jobId, state, progress });
}));

// — Swagger docs
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const swaggerDoc = JSON.parse(
  await readFile(join(__dirname, '../swagger.json'), 'utf8')
);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// — Global error handler
app.use(errorHandler);

// — Start server
const port = process.env.BACKEND_PORT;
app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`Docs at https://api.smartpicker.au/docs`);
});

export default app;
