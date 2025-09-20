// src/controllers/quoteController.ts
import {
  getCustomerQuotes,
  checkQuoteExists,
  fetchQuoteData,
  getEstimate,
  estimateToDB,
  getQuotesWithStatus,
  setOrderStatus,
  updateQuoteInAccountingService,
  addProductToQuote,
  adjustProductQuantity,
  processBarcode,
  savePickerNote,
  deleteQuotesBulk
} from '../services/quoteService.js';
import { Request, Response, NextFunction } from 'express';
import {
    FilteredQuote,
    OrderStatus
} from '../types/quote.js';

// GET /quotes/customer/:customerId
export async function getEstimates(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId } = req.params;
    const connectionType = req.session.connectionType;
    const companyId = req.session.companyId;

    if (!companyId || !connectionType) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const quotes = await getCustomerQuotes(customerId, companyId, connectionType);
    res.json(quotes);
  } catch (err) {
    next(err);
  }
}

// GET /quotes/:quoteId
export async function getEstimateById(req: Request, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.params;
    const companyId = req.session.companyId;
    const connectionType = req.session.connectionType;
    if (!companyId || !connectionType) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exists = await checkQuoteExists(quoteId);
    if (exists) {
      const quote = await fetchQuoteData(quoteId);
      return res.json({ source: 'database', data: quote });
    }
    const apiQuote = await getEstimate(quoteId, companyId, false, connectionType);
    if (!apiQuote) {
      return res.status(404).json({
        source: 'api',
        data: {
          message: `Quote with ID ${quoteId} not found in QuickBooks.`
        }
      });
    }

    // Check if it's an error response
    if (typeof apiQuote === 'object' && 'error' in apiQuote && apiQuote.error === true) {
      return res.status(409).json({source: 'api', data: apiQuote});
    }
    
    // Type guard to ensure it's a FilteredQuote
    if ('quoteId' in apiQuote && 'quoteNumber' in apiQuote) {
      await estimateToDB(apiQuote as FilteredQuote);
      res.json({ source: 'api', data: apiQuote });
    } else {
      return res.status(500).json({ error: 'Invalid quote data received' });
    }
  } catch (err) {
    next(err);
  }
}

// GET /quotes?status=...
export async function listQuotes(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string;
    const companyId = req.session.companyId;
    if (status && !['pending', 'checking', 'finalised', 'cancelled', 'assigned', 'all'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const quotes = await getQuotesWithStatus(status as OrderStatus | 'all', companyId as string);
    res.json(quotes);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/status
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { quoteId, newStatus } = req.body;
    const updated = await setOrderStatus(quoteId, newStatus);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/:quoteId/sync
export async function syncToAccountingService(req: Request, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.params;
    const companyId = req.session.companyId;
    const connectionType = req.session.connectionType;

    if (!companyId || !connectionType) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const localQuote = await fetchQuoteData(quoteId);
    if (!localQuote) {
      return res.status(404).json({ error: 'Quote not found in local database' });
    }
    const rawData = await getEstimate(quoteId, companyId, true, connectionType);
    if (!rawData || typeof rawData !== 'object') {
      return res.status(500).json({ error: 'Failed to fetch quote data' });
    }
    const result = await updateQuoteInAccountingService(quoteId, localQuote, rawData as Record<string, unknown>, companyId, connectionType);
    res.json({ message: result.message, redirectUrl: result.redirectUrl });
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/products
export async function addProduct(req: Request, res: Response, next: NextFunction) {
  try {
    let { quoteId, productId, qty } = req.body;
    const companyId = req.session.companyId;

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = await addProductToQuote(
      productId,
      quoteId,
      qty,
      companyId
    );
    res.json(response);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/products/qty
export async function adjustQty(req: Request, res: Response, next: NextFunction) {
  try {
    let { quoteId, productId, newQty } = req.body;

    const updated = await adjustProductQuantity(quoteId, productId, newQty);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/products/scan
export async function scanProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { barcode, quoteId, newQty } = req.body;
    const userName = req.session.name;
    if (!userName) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const message = await processBarcode(barcode, quoteId, newQty, userName);
    res.json(message);
  } catch (err) {
    next(err);
  }
}

// PUT /quotes/picker-note
export async function savePickerNoteController(req: Request, res: Response, next: NextFunction) {
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
export async function bulkDeleteQuotes(req: Request, res: Response, next: NextFunction) {
  try {
    const { quoteIds } = req.body;
    const result = await deleteQuotesBulk(quoteIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
}