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

// — CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://smartpicker.au', 'https://api.smartpicker.au']
    : ['http://localhost:3000', 'http://localhost:5033'],
  credentials: true,
};
app.use(cors(corsOptions));

// — Redis & BullMQ setup
const redisConn = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
export const productQueue = new Queue('products', { connection: redisConn });

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

// — Endpoints still in server.js
app.get('/verifyUser', asyncHandler(async (req, res) => {
  res.json({ isValid: !!req.session.token });
}));

app.get('/user-status', isAuthenticated, asyncHandler(async (req, res) => {
  res.json({
    isAdmin: req.session.isAdmin || false,
    userId: req.session.userId,
  });
}));

app.get('/test-session', (req, res) => {
  req.session.token = 'testtoken';
  req.session.save((err) => {
    if (err) {
      console.error('Session save failed:', err);
      return res.status(500).send('Failed to save session');
    }
    res.send('Session saved');
  });
});


const upload = multer({ dest: './uploads' });
app.post('/upload',
  isAuthenticated,
  upload.single('input'),
  asyncHandler(async (req, res) => {
    if (!req.file?.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const job = await productQueue.add('process-and-save', {
      filePath: req.file.path,
      companyId: req.session.companyId,
      token: req.decryptedToken,
    });
    res.status(202).json({ message: 'File queued', jobId: job.id });
  })
);

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
