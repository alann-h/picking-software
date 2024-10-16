import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { getAuthUri, handleCallback } from './auth.js';
import { getQbEstimate, estimateToDB, checkQuoteExists, fetchQuoteData, 
  getCustomerQuotes, processBarcode, addProductToQuote, adjustProductQuantity, 
  getQuotesWithStatus, setOrderStatus, updateQuoteInQuickBooks
} from './quotes.js';
import { processFile, getProductName, getProductFromDB, getAllProducts, saveForLater, setUnavailable } from './products.js';
import { fetchCustomers, saveCustomers, getCustomerId } from './customers.js';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';
import multer from 'multer';
import pgSession from 'connect-pg-simple';
import pool from './db.js';

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan(':method :url :status'));
app.use(cookieParser());

const upload = multer({ dest: process.cwd() });
dotenv.config({ path: 'config.env' });

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
  req.session.token = token;
  res.redirect(`http://localhost:3000/oauth/callback`);
}));

app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get('/verifyUser', csrfProtection, asyncHandler(async (req, res) => {
  if (req.session.token) {
    res.json({ isValid: true });
  } else {
    res.status(401).json({ isValid: false });
  }
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
  console.log(`Backend is now listening on port ${port}!`);
  console.log(`For API docs, navigate to http://localhost:${port}`);
});

export default server;