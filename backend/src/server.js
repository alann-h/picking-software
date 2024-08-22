import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import { getAuthUri, handleCallback, getUserToken } from './auth.js';
import { getFilteredEstimates, estimateToDB, checkQuoteExists, fetchQuoteData, 
  getCustomerQuotes, processBarcode, addProductToQuote, adjustProductQuantity
} from './quotes.js';
import { processFile, getProductName, getProductFromDB, getAllProducts, saveForLater } from './products.js';
import { fetchCustomers, saveCustomers, getCustomerId } from './customers.js';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';
import multer from 'multer';

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan(':method :url :status'));

const upload = multer({ dest: process.cwd() });
dotenv.config({ path: 'config.env' });

// Wrapper for async route handlers
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/***************************************************************
                       User Auth Functions
***************************************************************/

app.get('/authUri', asyncHandler(async (_, res) => {
  const authUri = await getAuthUri();
  res.json(authUri);
}));

app.get('/callback', asyncHandler(async (req, res) => {
  const userId = await handleCallback(req.url);
  res.redirect(`http://localhost:3000/oauth/callback?userId=${userId}`);
}));

app.get('/retrieveToken/:userId', asyncHandler(async (req, res) => {
  const token = await getUserToken(req.params.userId);
  res.json(token);
}));

app.get('/verifyUser/:userId', asyncHandler(async (req, res) => {
  const userToken = await getUserToken(req.params.userId);
  res.json({ isValid: true, accessToken: userToken.access_token });
}));

/***************************************************************
                       Customer Functions
***************************************************************/

app.get('/getCustomers/:userId', asyncHandler(async (req, res) => {
  const data = await fetchCustomers(req.params.userId);
  res.json(data);
}));

app.post('/saveCustomers', asyncHandler(async (req, res) => {
  await saveCustomers(req.body);
  res.status(200).json({ message: 'Quote saved successfully in database' });
}));

app.get('/getCustomerId/:customerName', asyncHandler(async (req, res) => {
  const customerId = await getCustomerId(req.params.customerName);
  res.json({ customerId });
}));

/***************************************************************
                       Quote Functions
***************************************************************/

app.get('/getEstimates/:customerId/:userId', asyncHandler(async (req, res) => {
  const { customerId, userId } = req.params;
  const quotes = await getCustomerQuotes(customerId, userId);
  res.json(quotes);
}));

app.get('/estimate/:quoteId/:userId', asyncHandler(async (req, res) => {
  const { quoteId, userId } = req.params;
  const isValid = await checkQuoteExists(quoteId);

  if (isValid) {
    const quote = await fetchQuoteData(quoteId);
    return res.json({ source: 'database', data: quote });
  }
  const estimates = await getFilteredEstimates(quoteId, userId);
  res.json({ source: 'api', data: estimates[0] });
 }));
 

app.post('/saveQuote', asyncHandler(async (req, res) => {
  await estimateToDB(req.body.quote);
  res.status(200).json({ message: 'Quote saved successfully in database' });
}));

/***************************************************************
                       Product Functions
***************************************************************/

app.get('/getProduct/:productId', asyncHandler(async (req, res) => {
  const productData = await getProductFromDB(req.params.productId);
  res.status(200).json(productData);
}));

app.put('/addProduct', asyncHandler(async (req, res) => {
  const { quoteId, productName, qty, userId } = req.body;
  await addProductToQuote(productName, quoteId, qty, userId);
  res.status(200).json({ message: 'Product updated successfully in database' });
}));

app.put('/adjustProductQty', asyncHandler(async (req, res) => {
  const { quoteId, productId, newQty } = req.body;
  await adjustProductQuantity(quoteId, productId, newQty);
  res.status(200).json({ message: 'Adjusted quantity of product in quote successfully' });
}));

app.get('/getAllProducts', asyncHandler(async (req, res) => {
  const products = await getAllProducts();
  res.status(200).json(products);
}));

app.put('/saveProductForLater', asyncHandler(async (req, res) => {
  const { quoteId, productId } = req.body;
  const result = await saveForLater(quoteId, productId);
  res.status(200).json(result);
}));

/***************************************************************
                       Other Functions
***************************************************************/

app.post('/upload', upload.single('input'), asyncHandler(async (req, res) => {
  if (!req.file || req.file.filename === null || req.file.filename === 'undefined') {
    return res.status(403).json('No File');
  }

  const filePath = process.cwd() + '/' + req.file.filename;
  const data = await processFile(filePath);
  res.status(200).json(data);
}));

app.put('/productScan', asyncHandler(async (req, res) => {
  const { barcode, quoteId, newQty } = req.body;
  const message = await processBarcode(barcode, quoteId, newQty);
  res.status(200).json(message);
}));

app.get('/barcodeToName/:barcode', asyncHandler(async (req, res) => {
  const productName = await getProductName(req.params.barcode);
  res.json({ productName });
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