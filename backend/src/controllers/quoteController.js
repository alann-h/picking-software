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
  processBarcode,
  savePickerNote,
  deleteQuotesBulk
} from '../services/quoteService.js';

// GET /quotes/customer/:customerId
export async function getEstimates(req, res, next) {
  try {
    const { customerId } = req.params;
    const quotes = await getCustomerQuotes(customerId, req.session.companyId);
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
    const [apiQuote] = await getQbEstimate(quoteId, req.session.companyId, false);
   if (!apiQuote) {
      return res.status(404).json({
        source: 'api',
        data: {
          message: `Quote with ID ${quoteId} not found in QuickBooks.`
        }
      });
    }

    if (apiQuote.error) {
      return res.status(409).json({source: 'api', data: apiQuote});
    }
    
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
    const rawData = await getQbEstimate(quoteId, req.session.companyId, true);
    const result = await updateQuoteInQuickBooks(quoteId, localQuote, rawData, req.session.companyId);
    res.json({ message: result.message });
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/products
export async function addProduct(req, res, next) {
  try {
    let { quoteId, productId, qty } = req.body;

    const response = await addProductToQuote(
      productId,
      quoteId,
      qty,
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
    const userName = req.session.name;
    const message = await processBarcode(barcode, quoteId, newQty, userName);
    res.json(message);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/picker-note
export async function savePickerNoteController(req, res, next) {
  try {
    const { quoteId, note } = req.body;
    if (!quoteId) {
      return res.status(400).json({ error: 'Quote ID is required' });
    }
    const updated = await savePickerNote(quoteId, note);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /quotes/bulk-delete
export async function bulkDeleteQuotes(req, res, next) {
  try {
    const { quoteIds } = req.body;
    const result = await deleteQuotesBulk(quoteIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
}