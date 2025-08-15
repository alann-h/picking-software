// src/server.js

// --- Core & External Imports
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import pgSession from 'connect-pg-simple';
import swaggerUi from 'swagger-ui-express';
import { doubleCsrf } from 'csrf-csrf';
import { readFile } from 'fs/promises';
import { createReadStream, unlink as fsUnlink } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';

// --- AWS SDK Imports
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// --- Local Imports
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import productRoutes from './routes/productRoutes.js';
import runRoutes from './routes/runRoutes.js';

import asyncHandler from './middlewares/asyncHandler.js';
import { isAuthenticated } from './middlewares/authMiddleware.js';
import errorHandler from './middlewares/errorHandler.js';
import { transaction } from './helpers.js';
import { insertProductsTempTable } from './services/productService.js';
import { getOAuthClient } from './services/authService.js';
import pool from './db.js';

const app = express();
const unlinkAsync = promisify(fsUnlink);

// — CORS
const corsOptions = {
  origin: process.env.VITE_APP_ENV === 'production'
    ? ['https://smartpicker.au']
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
};
app.use(cors(corsOptions));

// --- AWS Clients
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
const S3_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// — Express proxy/trust
app.set('trust proxy', 1);

// — Sessions with Postgres store
const PgStore = pgSession(session);
app.use(cookieParser());
app.use(session({
  store: new PgStore({ pool, tableName: 'sessions' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.VITE_APP_ENV === 'production',
    sameSite: process.env.VITE_APP_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // Default: 24 hours
    domain: process.env.VITE_APP_ENV === 'production' ? '.smartpicker.au' : undefined,
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

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Material-UI
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// — CSRF protection
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.VITE_APP_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.VITE_APP_ENV === 'production',
    domain: process.env.VITE_APP_ENV === 'production' ? '.smartpicker.au' : undefined,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: req => req.headers['x-csrf-token'],
  getSessionIdentifier: (req) => req.session.id,
});

// Middleware to protect internal endpoints by checking for a secret key
const verifyInternalRequest = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// --- ROUTES ---

// --- INTERNAL ROUTES (NO CSRF) ---
const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

app.post('/internal/process-s3-job', verifyInternalRequest, asyncHandler(async (req, res) => {
  const { companyId, processedDataS3Key } = req.body;

  // 1. Download the processed JSON file from S3
  const getCommand = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: processedDataS3Key,
  });
  const s3Response = await s3Client.send(getCommand);

  // 2. Parse the file content
  const bodyContents = await streamToString(s3Response.Body);
  const { products } = JSON.parse(bodyContents);

  // 3. Insert products into the database using your existing logic
  const client = await pool.connect();
  try {
    await transaction(async (transactionClient) => {
      await insertProductsTempTable(products, companyId, transactionClient);
    });
    res.status(200).json({ message: `Successfully processed and saved products from S3 key: ${processedDataS3Key}` });
  } finally {
    client.release();
  }
}));

app.post('/internal/jobs/:jobId/progress', verifyInternalRequest, asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { status, percentage, message, errorDetails } = req.body;
  await pool.query(
    `UPDATE jobs SET
        status = $1,
        progress_percentage = $2,
        progress_message = $3,
        error_message = $4
     WHERE id = $5`,
    [status, percentage, message, errorDetails, jobId]
  );
  res.sendStatus(200);
}));

app.get('/jobs/:jobId/progress', isAuthenticated, asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const companyId = req.session.companyId;
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1 AND companyid = $2', [jobId, companyId]);

  const job = rows[0];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: job.id,
    state: job.status,
    progress: {
      percentage: job.progress_percentage,
      message: job.progress_message
    },
    error: job.error_message
  });
}));

app.use(doubleCsrfProtection);

// Rate limiting for security
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: Math.ceil(15 * 60 / 1000),
      message: 'Account temporarily locked due to too many failed attempts. Please try again later.'
    });
  },
  skipSuccessfulRequests: true,
  keyGenerator: ipKeyGenerator
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to sensitive endpoints
app.use('/auth/login', loginLimiter);
app.use('/auth/register', generalLimiter);
app.use('/auth', generalLimiter);

// Public & CSRF-protected routes
// src/server.js
app.get('/csrf-token', (req, res, next) => {
  try {
    const csrfToken = generateCsrfToken(req, res);
    req.session.csrfSessionEnsured = true;

    req.session.save(err => {
      if (err) {
        console.error("Error saving session after CSRF token generation:", err);
        return next(err);
      }
      res.json({ csrfToken });
    });
  } catch (err) {
    next(err);
  }
});

// Feature routes
app.use('/auth', authRoutes);
app.use('/customers', customerRoutes);
app.use('/quotes', quoteRoutes);
app.use('/products', productRoutes);
app.use('/runs', runRoutes);

// Utility routes
app.get('/verifyUser', asyncHandler(async (req, res) => {
  // Check if session exists and has required user data
  const hasValidSession = req.session && 
                         req.session.userId && 
                         req.session.companyId && 
                         req.session.email;
  
  if (hasValidSession) {
    res.json({ 
      isValid: true, 
      user: {
        userId: req.session.userId,
        companyId: req.session.companyId,
        name: req.session.name,
        email: req.session.email,
        isAdmin: req.session.isAdmin
      }
    });
  } else {
    res.json({ isValid: false, user: null });
  }
}));

// Debug endpoint to troubleshoot session issues
app.get('/debug/session', asyncHandler(async (req, res) => {
  res.json({
    sessionExists: !!req.session,
    sessionId: req.session?.id,
    sessionData: req.session,
    cookies: req.headers.cookie
  });
}));

// Security monitoring endpoint (admin only)
app.get('/security/monitoring', asyncHandler(async (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { getSecurityStats } = await import('./services/securityService.js');
    const stats = await getSecurityStats();
    
    res.json({
      message: 'Security Monitoring Dashboard',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error getting security stats:', error);
    res.status(500).json({ error: 'Failed to get security statistics' });
  }
}));

// Global logout endpoint - logout from all devices
app.post('/logout-all', asyncHandler(async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No active session found' });
  }

  const userId = req.session.userId;
  const companyId = req.session.companyId;
  
  console.log(`User ${userId} from company ${companyId} is logging out from all devices`);
  
  try {
    // Delete all sessions for this user from the database using JSON operator
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM sessions WHERE sess->>\'userId\' = $1 RETURNING sid',
        [userId]
      );
      
      console.log(`Deleted ${result.rowCount} sessions for user ${userId}`);
    } finally {
      client.release();
    }
    
    // Destroy current session
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session during global logout:', err);
        return res.status(500).json({ error: 'Failed to destroy session' });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        httpOnly: true,
        secure: process.env.VITE_APP_ENV === 'production',
        sameSite: process.env.VITE_APP_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.VITE_APP_ENV === 'production' ? '.smartpicker.au' : undefined,
        path: '/'
      });
      
      console.log(`Successfully logged out user ${userId} from all devices`);
      res.json({ 
        message: 'Successfully logged out from all devices',
        deletedSessions: result.rowCount,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Error during global logout:', error);
    res.status(500).json({ error: 'Failed to logout from all devices' });
  }
}));

// Get active sessions for current user
app.get('/sessions', asyncHandler(async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No active session found' });
  }

  const userId = req.session.userId;
  
  try {
    const client = await pool.connect();
    try {
      // Use JSONB operators for better performance with jsonb type column
      // Consider adding an index: CREATE INDEX idx_sessions_userid ON sessions USING GIN ((sess->>'userId'))
      const result = await client.query(
        'SELECT sid, sess, expire FROM sessions WHERE sess->>\'userId\' = $1',
        [userId]
      );
      
      const userSessions = result.rows.map(row => ({
        sessionId: row.sid,
        userId: row.sess.userId,
        companyId: row.sess.companyId,
        email: row.sess.email,
        name: row.sess.name,
        isAdmin: row.sess.isAdmin,
        expiresAt: row.expire,
        isCurrentSession: row.sid === req.session.id
      }));
      
      res.json({
        userId,
        activeSessions: userSessions,
        totalSessions: userSessions.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Failed to fetch user sessions' });
  }
}));

// Enhanced sessions endpoint with JSONB filtering capabilities
app.get('/sessions/enhanced', asyncHandler(async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No active session found' });
  }

  const userId = req.session.userId;
  const companyId = req.session.companyId;
  const { includeExpired = false, adminOnly = false } = req.query;
  
  try {
    const client = await pool.connect();
    try {
      let query = `
        SELECT sid, sess, expire 
        FROM sessions 
        WHERE sess->>'userId' = $1 
        AND sess->>'companyId' = $2
      `;
      
      const params = [userId, companyId];
      
      // Add admin filter if requested
      if (adminOnly === 'true') {
        query += ` AND sess->>'isAdmin' = 'true'`;
      }
      
      // Add expiration filter
      if (includeExpired !== 'true') {
        query += ` AND expire > NOW()`;
      }
      
      // Add ordering
      query += ` ORDER BY expire DESC`;
      
      const result = await client.query(query, params);
      
      const userSessions = result.rows.map(row => ({
        sessionId: row.sid,
        userId: row.sess.userId,
        companyId: row.sess.companyId,
        email: row.sess.email,
        name: row.sess.name,
        isAdmin: row.sess.isAdmin,
        expiresAt: row.expire,
        isExpired: row.expire < new Date(),
        isCurrentSession: row.sid === req.session.id
      }));
      
      res.json({
        userId,
        companyId,
        activeSessions: userSessions,
        totalSessions: userSessions.length,
        filters: {
          includeExpired: includeExpired === 'true',
          adminOnly: adminOnly === 'true'
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching enhanced sessions:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced sessions' });
  }
}));

app.get('/user-status', isAuthenticated, asyncHandler(async (req, res) => {
  res.json({
    isAdmin: req.session.isAdmin || false,
    userId: req.session.userId,
    companyId: req.session.companyId,
    name: req.session.name,
    email: req.session.email
  });
}));

// File upload route
const upload = multer({ dest: '/tmp/' });
app.post('/upload', isAuthenticated, upload.single('input'), asyncHandler(async (req, res) => {
    if (!req.file?.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.mimetype !== 'text/csv') {
      await unlinkAsync(req.file.path);
      return res.status(400).json({ error: 'Invalid file format. Please upload a CSV file.' });
    }
    
    const localFilePath = req.file.path;
    const originalFileName = req.file.originalname;
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

      // 2. Create a job record in your database
      const dbResponse = await pool.query(
        `INSERT INTO jobs (s3_key, companyid) VALUES ($1, $2) RETURNING id`,
        [s3Key, req.session.companyId]
      );
      const jobId = dbResponse.rows[0].id;

      const oauthClient = await getOAuthClient(req.session.companyId);
      const freshTokenForLambda = oauthClient.getToken();

      // 3. Prepare the payload for the Lambda function
      const lambdaPayload = {
        jobId: jobId,
        s3Key: s3Key,
        companyId: req.session.companyId,
        token: freshTokenForLambda,
      };

      // 4. Invoke the Lambda function asynchronously
      const invokeCommand = new InvokeCommand({
        FunctionName: 'product-processor',
        InvocationType: 'Event',
        Payload: JSON.stringify(lambdaPayload),
      });
      await lambdaClient.send(invokeCommand);

      // 5. Respond to the client with the new job ID from the database
      res.status(202).json({ message: 'File queued for processing', jobId: jobId });

    } catch (error) {
      console.error('Error during file upload or Lambda invocation:', error);
      res.status(500).json({ error: 'Failed to process file upload.' });
    } finally {
      try {
        await unlinkAsync(localFilePath);
        console.log(`Cleaned up temporary local file: ${localFilePath}`);
      } catch (cleanupError) {
        console.warn(`Failed to clean up temporary file ${localFilePath}:`, cleanupError);
      }
    }
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