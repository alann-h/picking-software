import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { getAuthUri, handleCallback, login, saveUserQbButton, getAllUsers, register, deleteUser, updateUser } from './auth.js';
import { getQbEstimate, estimateToDB, checkQuoteExists, fetchQuoteData, 
  getCustomerQuotes, processBarcode, addProductToQuote, adjustProductQuantity, 
  getQuotesWithStatus, setOrderStatus, updateQuoteInQuickBooks
} from './quotes.js';
import { processFile, getProductName, getProductFromDB, getAllProducts, saveForLater, setUnavailable, setProductFinished } from './products.js';
import { fetchCustomers, saveCustomers, getCustomerId } from './customers.js';
import { saveCompanyInfo } from './company.js';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';
import multer from 'multer';
import pgSession from 'connect-pg-simple';
import pool from './db.js';
import { AccessError } from './error.js';

const app = express();

app.use(cors({ origin: ['https://smartpicker.au','https://api.smartpicker.au'], credentials: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan(':method :url :status'));
app.use(cookieParser());

const upload = multer({ dest: process.cwd() });
dotenv.config({ path: '.env' });

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
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

const csrfProtection = csrf({ cookie: true });

const deleteSessions = () => {
  const store = new PgSession({
    pool: pool,
    tableName: 'sessions'
  });
  store.pruneSessions();
};

setInterval(deleteSessions, 24 * 60 * 60 * 1000);

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

  req.session.token = token;
  req.session.companyId = companyinfo.id;
  req.session.isAdmin = true;
  req.session.userId = user.id;

  res.redirect(`https://smartpicker.au/oauth/callback`);
}));

app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get('/verifyUser', csrfProtection, asyncHandler(async (req, res) => {
  if (req.session.token) {
    res.status(200).json({ isValid: true });
  } else {
    res.status(200).json({ isValid: false });
  }
}));

app.post('/login', csrfProtection, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await login(email, password);

  req.session.token = user.token;
  req.session.isAdmin = user.is_admin;
  req.session.userId = user.id;
  req.session.companyId = user.company_id;

  res.json(user);
}));

// admin will registers users in
app.post('/register', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { email, givenName, familyName, password, isAdmin } = req.body;
  const registeredUser = await register(email, password, isAdmin, givenName, familyName, req.session.companyId);
  res.json({ message: `Registered user id ${registeredUser.id}` });
}));

app.delete('/deleteUser/:userId', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
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

app.get('/user-status', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  res.json({
    isAdmin: req.session.isAdmin || false,
    userId: req.session.userId
  });
}));

app.get('/getAllUsers', csrfProtection, isAuthenticated, asyncHandler(async (_, res) => {
  const users = await getAllUsers();
  res.json(users);
}));

app.put('/updateUser/:userId', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
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

app.get('/getCustomers', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const data = await fetchCustomers(req.session.token);
  res.json(data);
}));

app.post('/saveCustomers', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  await saveCustomers(req.body);
  res.status(200).json({ message: 'Customers saved successfully in database' });
}));

app.get('/getCustomerId/:customerName', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const customerId = await getCustomerId(req.params.customerName);
  res.json({ customerId });
}));


/***************************************************************
                       Quote Functions
***************************************************************/

app.get('/getEstimates/:customerId', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const quotes = await getCustomerQuotes(customerId, req.session.token);
  res.json(quotes);
}));

app.get('/estimate/:quoteId', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId } = req.params;
  const isValid = await checkQuoteExists(quoteId);

  if (isValid) {
    const quote = await fetchQuoteData(quoteId);
    return res.json({ source: 'database', data: quote });
  }
  const estimates = await getQbEstimate(quoteId, req.session.token, false);
  await estimateToDB(estimates[0]);
  res.json({ source: 'api', data: estimates[0] });
}));

// app.post('/saveQuote', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
//   await estimateToDB(req.body.quote);
//   res.status(200).json({ message: 'Quote saved successfully in database' });
// }));

app.get('/quotes', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const status = req.query.status;
  const quotes = await getQuotesWithStatus(status);
  res.status(200).json(quotes);
}));

app.put('/quote-status', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, newStatus } = req.body;
  if (!quoteId || !newStatus) {
    throw new Error('Quote ID and new status are required');
  }
  const updatedStatus = await setOrderStatus(quoteId, newStatus);
  res.status(200).json(updatedStatus);
}));

app.put('/updateQuoteInQuickBooks/:quoteId', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const quoteId = req.params.quoteId;
  const quoteLocalDb = await fetchQuoteData(quoteId);
  const rawQuoteData = await getQbEstimate(quoteId, req.session.token, true);
  const updatedQuote = await updateQuoteInQuickBooks(quoteId, quoteLocalDb, rawQuoteData, req.session.token);

  res.status(200).json( [ updatedQuote.message ]);
}));
/***************************************************************
                       Product Functions
***************************************************************/

app.get('/getProduct/:productId', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const productData = await getProductFromDB(req.params.productId);
  res.status(200).json(productData);
}));

app.put('/addProduct', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productName, qty } = req.body;
  const response = await addProductToQuote(productName, quoteId, qty, req.session.token);
  res.status(200).json(response);
}));

app.put('/adjustProductQty', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId, newQty } = req.body;
  const data = await adjustProductQuantity(quoteId, productId, newQty);
  res.status(200).json(data);
}));

app.get('/getAllProducts', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const products = await getAllProducts();
  res.status(200).json(products);
}));

app.put('/saveProductForLater', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId } = req.body;
  const result = await saveForLater(quoteId, productId);
  res.status(200).json(result);
}));

app.put('/setProductUnavailable', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId } = req.body;
  const result = await setUnavailable(quoteId, productId);
  res.status(200).json(result);
}));

app.put('/setProductFinished', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { quoteId, productId } = req.body;
  const result = await setProductFinished(quoteId, productId);
  res.status(200).json(result);
}));

/***************************************************************
                       Other Functions
***************************************************************/

app.post('/upload', csrfProtection, isAuthenticated, upload.single('input'), asyncHandler(async (req, res) => {
  if (!req.file || req.file.filename === null || req.file.filename === 'undefined') {
    return res.status(403).json('No File');
  }

  const filePath = process.cwd() + '/' + req.file.filename;
  const data = await processFile(filePath);
  res.status(200).json(data);
}));

app.put('/productScan', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const { barcode, quoteId, newQty } = req.body;
  const message = await processBarcode(barcode, quoteId, newQty);
  res.status(200).json(message);
}));

app.get('/barcodeToName/:barcode', csrfProtection, isAuthenticated, asyncHandler(async (req, res) => {
  const productName = await getProductName(req.params.barcode);
  res.status(200).json({ productName });
}));

/***************************************************************
                       Running Server
***************************************************************/
app.get('/', (req, res) => res.redirect('/docs'));

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