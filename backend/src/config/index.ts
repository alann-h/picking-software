/**
 * Centralized Configuration Management
 * Handles all environment variables and configuration settings
 */

import dotenv from 'dotenv';
import OAuthClient from 'intuit-oauth';

// Load environment variables
dotenv.config();

// Environment configuration
const ENV = {
  PRODUCTION: 'production',
  SANDBOX: 'sandbox',
};

// Current environment
const currentEnv = process.env.VITE_APP_ENV === 'production' ? ENV.PRODUCTION : ENV.SANDBOX;

// Base configuration
const baseConfig = {
  // Server configuration
  server: {
    port: parseInt(process.env.BACKEND_PORT || '5033', 10),
    trustProxy: process.env.TRUST_PROXY === 'true' ? 1 : 0,
    bodyParser: {
      limit: process.env.BODY_PARSER_LIMIT || '1mb', // Default 1MB for CSV files
      uploadLimit: process.env.UPLOAD_LIMIT || '1mb' // Default 1MB for file uploads
    }
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10)
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET!,
    cookie: {
      secure: currentEnv === ENV.PRODUCTION,
      sameSite: currentEnv === ENV.PRODUCTION ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      rolling: true,
      domain: currentEnv === ENV.PRODUCTION ? '.smartpicker.com.au' : undefined
    },
    store: {
      tableName: 'sessions',
      pruneInterval: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // CORS configuration
  cors: {
    origin: currentEnv === ENV.PRODUCTION 
      ? ['https://smartpicker.com.au']
      : ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
  },

  // Security configuration
  security: {
    csrf: {
      cookieName: 'x-csrf-token',
      size: 64,
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
    },
    rateLimit: {
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: 'Too many login attempts, please try again later.'
      },
      general: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 100 // 100 requests per minute (more reasonable for SPAs)
      }
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
          imgSrc: ["'self'", "data:", "https:", "https://www.google-analytics.com"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'", "https:", "https://www.google-analytics.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
          requireTrustedTypesFor: ["'script'"]
        }
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    bucketName: process.env.AWS_BUCKET_NAME!,
    lambda: {
      functionName: process.env.AWS_LAMBDA_FUNCTION || 'product-processor'
    }
  },

  // OAuth configuration
  oauth: {
    baseUrl: currentEnv === ENV.PRODUCTION ? 'https://api.smartpicker.com.au' : 'http://localhost:5033',
    
    // QuickBooks Online
    qbo: {
      clientId: process.env.QBO_CLIENT_ID!,
      clientSecret: process.env.QBO_CLIENT_SECRET!,
      redirectUri: process.env.QBO_REDIRECT_URI!,
      scopes: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId, OAuthClient.scopes.Profile, OAuthClient.scopes.Email]
    },

    // Xero
    xero: {
      baseUrl: 'https://api.xero.com',
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
      redirectUri: process.env.XERO_REDIRECT_URI!,
      scopes: [
        'offline_access',
        'accounting.transactions',
        'accounting.contacts.read',
        'accounting.settings.read'
      ]
    }
  },

  // Internal API configuration
  internal: {
    apiKey: process.env.INTERNAL_API_KEY!
  },

  // Logging configuration
  logging: {
    level: 'info',
    format: currentEnv === ENV.PRODUCTION ? 'json' : 'dev',
    morgan: ':method :url :status'
  }
};

// Validation function
function validateConfig() {
  const required = [
    'SESSION_SECRET',
    'AWS_BUCKET_NAME',
    'QBO_CLIENT_ID',
    'QBO_CLIENT_SECRET',
    'QBO_REDIRECT_URI',
    'XERO_CLIENT_ID',
    'XERO_CLIENT_SECRET',
    'XERO_REDIRECT_URI',
    'DATABASE_URL',
    'INTERNAL_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Get configuration for specific environment
function getConfig() {
  try {
    validateConfig();
    return baseConfig;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Configuration validation failed:', error.message);
    } else {
      console.error('An unknown error occurred during configuration validation:', error);
    }
    process.exit(1);
  }
}

// Export configuration
export const config = getConfig();
export default config;

// Export individual sections for convenience
export const { server, database, session, cors, security, aws, oauth, internal, logging } = config;

// Export environment helpers
export { ENV, currentEnv };
