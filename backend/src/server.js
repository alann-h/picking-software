import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from "csrf-csrf";
import { getAuthUri, handleCallback, login, saveUserQbButton, getAllUsers, register, deleteUser, updateUser, revokeQuickBooksToken } from './auth.js';
import { getQbEstimate, estimateToDB, checkQuoteExists, fetchQuoteData, 
  getCustomerQuotes, processBarcode, addProductToQuote, adjustProductQuantity, 
  getQuotesWithStatus, setOrderStatus, updateQuoteInQuickBooks
} from './quotes.js';
import { getProductName, getProductFromDB, getAllProducts, saveForLater, setUnavailable, setProductFinished, updateProductDb, deleteProductDb, addProductDb } from './products.js';
import { fetchCustomers, saveCustomers } from './customers.js';
import { saveCompanyInfo, removeQuickBooksData } from './company.js';
import { encryptToken, decryptToken, validateAndRoundQty, productIdToQboId } from './helpers.js';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import pgSession from 'connect-pg-simple';
import pool from './db.js';
import { AccessError } from './error.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const app = express();

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const productQueue = new Queue('products', { connection });

dotenv.config({ path: '.env' });

app.set('trust proxy', 1);

app.use(cookieParser(process.env.SESSION_SECRET));


const environment = process.env.NODE_ENV;

const corsOptions = {
  origin: environment === 'production' 
  ? ['https://smartpicker.au', 'https://api.smartpicker.au'] 
  : ['http://localhost:3000',  'http://localhost:5033'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan(':method :url :status'));

const upload = multer({ dest: './uploads' });

const PgSession = pgSession(session);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: environment === 'production',
    sameSite: environment === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours,
    domain: environment === 'production' ? '.smartpicker.au' : undefined
  }
}));

const deleteSessions = () => {
  const store = new PgSession({
    pool: pool,
    tableName: 'sessions'
  });
  store.pruneSessions();
};

setInterval(deleteSessions, 24 * 60 * 60 * 1000);

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  cookieName: "x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: environment=== 'production' ? 'none' : 'lax',
    secure: environment=== 'production',
    signed: true,
    domain: environment === 'production' ? '.smartpicker.au' : undefined
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => req.headers["x-csrf-token"]
});

// Wrapper for async route handlers
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const isAuthenticated = (req, res, next) => {
  if (req.session.token) {
    next();
  } else {
    res.status(401).json({ error: 'You are not logged in. Please log in to continue.' });
  }
};

const decryptSessionToken = (req, res, next) => {
  if (req.session.token) {
    try {
      req.decryptedToken = decryptToken(req.session.token);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid session token' });
    }
  }
  next();
};

app.use(decryptSessionToken);

/***************************************************************
                       User Auth Functions
***************************************************************/

app.get('/authUri', asyncHandler(async (_, res) => {
  const authUri = await getAuthUri();
  res.json(authUri);
}));

app.get('/callback', asyncHandler(async (req, res) => {
  const token = await handleCallback(req.url);
  // I will now save the company information and save the user if not registered
  // Also when a user logins here they are guarenteed to be an admin due to using OAuth login
  const companyinfo = await saveCompanyInfo(token);
  const user = await saveUserQbButton(token, companyinfo.companyid);

  req.session.token = encryptToken(token);
  req.session.companyId = companyinfo.companyid;
  req.session.isAdmin = true;
  req.session.userId = user.id;

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).send('Internal server error');
    }
    const redirectUri = environment === 'production' ? 'https://smartpicker.au/oauth/callback' : 'http://localhost:3000/oauth/callback';
    res.redirect(redirectUri);
  });

}));

app.get('/csrf-token', (req, res) => {
  const csrfToken = generateToken(req, res);
  res.json({csrfToken});
});

app.use(doubleCsrfProtection);

app.get('/verifyUser', asyncHandler(async (req, res) => {
  if (req.session.token) {
    res.status(200).json({ isValid: true });
  } else {
    res.status(200).json({ isValid: false });
  }
}));

app.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await login(email, password);

  req.session.token = encryptToken(user.token);
  req.session.isAdmin = user.is_admin;
  req.session.userId = user.id;
  req.session.companyId = user.companyid;

  res.json(user);
}));

// admin will registers users in
app.post('/register', isAuthenticated, asyncHandler(async (req, res) => {
  const { email, givenName, familyName, password, isAdmin } = req.body;
  const registeredUser = await register(email, password, isAdmin, givenName, familyName, req.session.companyId);
  res.json({ message: `Registered user id ${registeredUser.id}` });
}));

app.delete('/deleteUser/:userId', isAuthenticated, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check if user is deleting their own account
  if (req.session.userId === userId) {
    const deletedUser = await deleteUser(userId, req.session.id);
    // Clear the session cookie
    req.session.destroy((err) => {
      if (err) {
        throw new Error('Failed to destroy session');
      }
      res.clearCookie('connect.sid');
      res.json(deletedUser);
    });
  } else {
    // Deleting another user's account
    const deletedUser = await deleteUser(userId, null);
    res.json(deletedUser);
  }
}));

app.get('/user-status', isAuthenticated, asyncHandler(async (req, res) => {
  res.json({
    isAdmin: req.session.isAdmin || false,
    userId: req.session.userId
  });
}));

app.get('/getAllUsers', isAuthenticated, asyncHandler(async (req, res) => {
  const users = await getAllUsers(req.session.companyId);
  res.json(users);
}));

app.put('/updateUser/:userId', isAuthenticated, asyncHandler(async (req, res) => {
  // Check if user is admin or updating their own profile
  if (!req.session.isAdmin && req.params.userId !== req.session.userId) {
    throw new AccessError('Unauthorised to update this user');
  } 

  const { userId } = req.params;
  const updatedUser = await updateUser(userId, req.body);
  res.json(updatedUser);
}));

/***************************************************************
                       Customer Functions
***************************************************************/

app.get('/getCustomers', isAuthenticated, asyncHandler(async (req, res) => {
  const data = await fetchCustomers(req.decryptedToken);
  res.json(data);
}));

app.post('/saveCustomers', isAuthenticated, asyncHandler(async (req, res) => {
  await saveCustomers(req.body, req.session.companyId);
  res.status(200).json({ message: 'Customers saved successfully in database' });
}));

/***************************************************************
                       Quote Functions
***************************************************************/

app.get('/getEstimates/:customerId', isAuthenticated, asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const quotes = await getCustomerQuotes(customerId, req.decryptedToken);
  res.json(quotes);
}));

app.get('/estimate/:quoteId', isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId } = req.params;
  const isValid = await checkQuoteExists(quoteId);

  if (isValid) {
    const quote = await fetchQuoteData(quoteId);
    return res.json({ source: 'database', data: quote });
  }
  const estimates = await getQbEstimate(quoteId, req.decryptedToken, false);
  await estimateToDB(estimates[0]);
  res.json({ source: 'api', data: estimates[0] });
}));

app.get('/quotes', isAuthenticated, asyncHandler(async (req, res) => {
  const status = req.query.status;
  const quotes = await getQuotesWithStatus(status);
  res.status(200).json(quotes);
}));

app.put('/quote-status', isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, newStatus } = req.body;
  if (!quoteId || !newStatus) {
    throw new Error('Quote ID and new status are required');
  }
  const updatedStatus = await setOrderStatus(quoteId, newStatus);
  res.status(200).json(updatedStatus);
}));

app.put('/updateQuoteInQuickBooks/:quoteId', isAuthenticated, asyncHandler(async (req, res) => {
  const quoteId = req.params.quoteId;
  const quoteLocalDb = await fetchQuoteData(quoteId);
  const rawQuoteData = await getQbEstimate(quoteId, req.decryptedToken, true);
  const updatedQuote = await updateQuoteInQuickBooks(quoteId, quoteLocalDb, rawQuoteData, req.decryptedToken);

  res.status(200).json( [ updatedQuote.message ]);
}));
/***************************************************************
                       Product Functions
***************************************************************/

app.get('/getProduct/:productId', isAuthenticated, asyncHandler(async (req, res) => {
  const { productId }= req.params;

  const qboItemId = await productIdToQboId(productId);
  const productData = await getProductFromDB(qboItemId);
  res.status(200).json(productData);
}));

app.put('/addProduct', isAuthenticated, asyncHandler(async (req, res) => {
  let { quoteId, productId, qty } = req.body;

  if (!quoteId || !productId || qty == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    qty = validateAndRoundQty(qty);
    if (qty === 0) throw new Error('Quantity must be greater than zero');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const response = await addProductToQuote(
    productId,
    quoteId,
    qty,
    req.decryptedToken,
    req.session.companyId
  );
  
  res.status(200).json(response);
}));


app.put('/adjustProductQty', isAuthenticated, asyncHandler(async (req, res) => {
  let { quoteId, productId, newQty } = req.body;

  if (!quoteId || !productId || newQty == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    newQty = validateAndRoundQty(newQty);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const data = await adjustProductQuantity(quoteId, productId, newQty);
  res.status(200).json(data);
}));


app.get('/getAllProducts', isAuthenticated, asyncHandler(async (req, res) => {
  const products = await getAllProducts(req.session.companyId);
  res.status(200).json(products);
}));

app.put('/saveProductForLater', isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId } = req.body;
  const result = await saveForLater(quoteId, productId);
  res.status(200).json(result);
}));

app.put('/setProductUnavailable', isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId } = req.body;
  const result = await setUnavailable(quoteId, productId);
  res.status(200).json(result);
}));

app.put('/setProductFinished', isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId } = req.body;
  const result = await setProductFinished(quoteId, productId);
  res.status(200).json(result);
}));

app.put('/updateProduct/:productId', isAuthenticated, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const updateFields = req.body;

  const result = await updateProductDb(productId, updateFields);
  res.status(200).json(result);
}));

app.delete('/deleteProduct/:productId', isAuthenticated, asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const result = await deleteProductDb(productId);
  res.status(200).json(result);
}));

app.get('/products/:productId/qbo-item-id', isAuthenticated, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const pid = parseInt(productId, 10);
  if (isNaN(pid)) {
    throw new AccessError('Invalid productId parameter');
  }

  const qboItemId = await productIdToQboId(pid);
  res.status(200).json({ qboItemId });
}));
app.post('/addProduct', isAuthenticated, asyncHandler(async (req, res) => {
  const { productName, sku, barcode } = req.body;

  const product = [];

  product.push({productName, sku, barcode});

  const result = await addProductDb(product, req.session.companyId, req.decryptedToken);
  res.status(200).json(result);
}));

/***************************************************************
                       Other Functions
***************************************************************/

app.post('/upload', isAuthenticated, upload.single('input'), asyncHandler(async (req, res) => {
    if (!req.file?.path) {
      return res.status(400).json('No file uploaded');
    }

    // bundle all the data your worker will need
    const jobData = {
      filePath: req.file.path,
      companyId: req.session.companyId,
      token: req.decryptedToken,
    };

    // background job
    const job = await productQueue.add('process-and-save', jobData);

    // immediately return 202 Accepted + the job id
    res.status(202).json({
      message: 'File received and queued for processing',
      jobId: job.id,
    });
  })
);

app.put('/productScan', isAuthenticated, asyncHandler(async (req, res) => {
  let { barcode, quoteId, newQty } = req.body;

  try {
    newQty = validateAndRoundQty(newQty);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const message = await processBarcode(barcode, quoteId, newQty);
  res.status(200).json(message);
}));

app.get('/barcodeToName/:barcode', isAuthenticated, asyncHandler(async (req, res) => {
  const productName = await getProductName(req.params.barcode);
  res.status(200).json({ productName });
}));

app.delete('/disconnect', isAuthenticated, asyncHandler(async (req, res) => {
  const companyId = req.session.companyId;

  // Revoke the QuickBooks token (to disconnect the QuickBooks account)
  await revokeQuickBooksToken(req.decryptedToken);

  // remove any QuickBooks-related data (company info, quotes, quote items, products, customers)
  await removeQuickBooksData(companyId);

  // Clear the session and send confirmation response
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to disconnect' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Successfully disconnected from QuickBooks' });
  });
}));


/***************************************************************
                       Running Server
***************************************************************/
app.get('/', (req, res) => res.redirect('/docs'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const swaggerDocument = JSON.parse(
  await readFile(join(__dirname, '../swagger.json'), 'utf8')
);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
});

const port = process.env.BACKEND_PORT;
const server = app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`For API docs, navigate to https://api.smartpicker.au/docs`);
});

export default server;