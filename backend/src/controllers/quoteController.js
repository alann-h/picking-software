// src/controllers/quoteController.js
import {
  getCustomerQuotes,
  checkQuoteExists,
  fetchQuoteData,
  getQbEstimate,
  estimateToDB,
  getQuotesWithStatus,
  setOrderStatus,
  updateQuoteInQuickBooks,
  addProductToQuote,
  adjustProductQuantity,
  processBarcode
} from '../services/quoteService.js';
import { validateAndRoundQty } from '../helpers.js';

// GET /quotes/customer/:customerId
export async function getEstimates(req, res, next) {
  try {
    const { customerId } = req.params;
    const quotes = await getCustomerQuotes(customerId, req.decryptedToken);
    res.json(quotes);
  } catch (err) {
    next(err);
  }
}

// GET /quotes/:quoteId
export async function getEstimateById(req, res, next) {
  try {
    const { quoteId } = req.params;
    const exists = await checkQuoteExists(quoteId);
    if (exists) {
      const quote = await fetchQuoteData(quoteId);
      return res.json({ source: 'database', data: quote });
    }
    const [apiQuote] = await getQbEstimate(quoteId, req.decryptedToken, false);
    await estimateToDB(apiQuote);
    res.json({ source: 'api', data: apiQuote });
  } catch (err) {
    next(err);
  }
}

// GET /quotes?status=...
export async function listQuotes(req, res, next) {
  try {
    const status = req.query.status;
    const quotes = await getQuotesWithStatus(status);
    res.json(quotes);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/status
export async function updateStatus(req, res, next) {
  try {
    const { quoteId, newStatus } = req.body;
    if (!quoteId || !newStatus) {
      return res.status(400).json({ error: 'Quote ID and new status are required' });
    }
    const updated = await setOrderStatus(quoteId, newStatus);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/:quoteId/quickbooks
export async function syncToQuickBooks(req, res, next) {
  try {
    const { quoteId } = req.params;
    const localQuote = await fetchQuoteData(quoteId);
    const rawData = await getQbEstimate(quoteId, req.decryptedToken, true);
    const result = await updateQuoteInQuickBooks(quoteId, localQuote, rawData, req.decryptedToken);
    res.json({ message: result.message });
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/products
export async function addProduct(req, res, next) {
  try {
    let { quoteId, productId, qty } = req.body;
    if (!quoteId || !productId || qty == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    qty = validateAndRoundQty(qty);
    if (qty === 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }
    const response = await addProductToQuote(
      productId,
      quoteId,
      qty,
      req.decryptedToken,
      req.session.companyId
    );
    res.json(response);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/products/qty
export async function adjustQty(req, res, next) {
  try {
    let { quoteId, productId, newQty } = req.body;
    if (!quoteId || !productId || newQty == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    newQty = validateAndRoundQty(newQty);
    const updated = await adjustProductQuantity(quoteId, productId, newQty);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/products/scan
export async function scanProduct(req, res, next) {
  try {
    const { barcode, quoteId, newQty } = req.body;
    let qty;
    try {
      qty = validateAndRoundQty(newQty);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const message = await processBarcode(barcode, quoteId, qty);
    res.json(message);
  } catch (err) {
    next(err);
  }
}
