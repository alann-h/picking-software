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
import { processFile, getProductName, getProductFromDB, getAllProducts, saveForLater, setUnavailable, setProductFinished } from './products.js';
import { fetchCustomers, saveCustomers, getCustomerId } from './customers.js';
import { saveCompanyInfo, removeQuickBooksData } from './company.js';
import { encryptToken, decryptToken } from './helpers.js';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import pgSession from 'connect-pg-simple';
import pool from './db.js';
import { AccessError } from './error.js';

const app = express();

dotenv.config({ path: '.env' });

app.set('trust proxy', 1);

app.use(cookieParser(process.env.SESSION_SECRET));

app.use(cors({ origin: ['https://smartpicker.au','https://api.smartpicker.au'], credentials: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan(':method :url :status'));

const upload = multer({ dest: process.cwd() });

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
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours,
    domain: '.smartpicker.au'
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    domain: '.smartpicker.au'
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
    res.status(401).json({ error: 'Unauthorized' });
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
  const user = await saveUserQbButton(token, companyinfo.id);

  req.session.token = encryptToken(token);
  req.session.companyId = companyinfo.id;
  req.session.isAdmin = true;
  req.session.userId = user.id;

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).send('Internal server error');
    }
    res.redirect('https://smartpicker.au/oauth/callback');
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
  req.session.companyId = user.company_id;

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

app.get('/getAllUsers', isAuthenticated, asyncHandler(async (_, res) => {
  const users = await getAllUsers();
  res.json(users);
}));

app.put('/updateUser/:userId', isAuthenticated, asyncHandler(async (req, res) => {
  // Check if user is admin or updating their own profile
  if (!req.session.isAdmin && req.params.userId !== req.session.userId) {
    throw new AccessError('Unauthorized to update this user');
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

app.get('/getCustomerId/:customerName', isAuthenticated, asyncHandler(async (req, res) => {
  const customerId = await getCustomerId(req.params.customerName);
  res.json({ customerId });
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
  const estimates = await getQbEstimate(quoteId, req.decryptedToken, false, req.session.companyId);
  await estimateToDB(estimates[0]);
  res.json({ source: 'api', data: estimates[0] });
}));

// app.post('/saveQuote', isAuthenticated, asyncHandler(async (req, res) => {
//   await estimateToDB(req.body.quote);
//   res.status(200).json({ message: 'Quote saved successfully in database' });
// }));

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
  const productData = await getProductFromDB(req.params.productId);
  res.status(200).json(productData);
}));

app.put('/addProduct', isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productName, qty } = req.body;
  const response = await addProductToQuote(productName, quoteId, qty, req.decryptedToken, req.session.companyId);
  res.status(200).json(response);
}));

app.put('/adjustProductQty', isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId, newQty } = req.body;
  const data = await adjustProductQuantity(quoteId, productId, newQty);
  res.status(200).json(data);
}));

app.get('/getAllProducts', isAuthenticated, asyncHandler(async (req, res) => {
  const products = await getAllProducts();
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

/***************************************************************
                       Other Functions
***************************************************************/

app.post('/upload', isAuthenticated, upload.single('input'), asyncHandler(async (req, res) => {
  if (!req.file || req.file.filename === null || req.file.filename === 'undefined') {
    return res.status(403).json('No File');
  }

  const filePath = process.cwd() + '/' + req.file.filename;
  const data = await processFile(filePath, req.session.companyId);
  res.status(200).json(data);
}));

app.put('/productScan', isAuthenticated, asyncHandler(async (req, res) => {
  const { barcode, quoteId, newQty } = req.body;
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
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
});

const port = process.env.BACKEND_PORT;
const server = app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`For API docs, navigate to https://api.smartpicker.au/docs`);
});

export default server;