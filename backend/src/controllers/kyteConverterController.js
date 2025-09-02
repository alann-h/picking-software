import { parseKyteCSV, matchProductsToDatabase, getAvailableCustomers, processKyteToQuickBooks, getConversionHistory } from '../services/kyteConverterService.js';

/**
 * Upload and process Kyte CSV file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function uploadKyteCSV(req, res) {
  try {
    const { csvContent } = req.body;
    const companyId = req.session.companyId;

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content is required' });
    }

    // Parse CSV and extract pending orders
    const pendingOrders = await parseKyteCSV(csvContent);
    
    if (pendingOrders.length === 0) {
      return res.status(200).json({
        message: 'No pending orders found in CSV',
        orders: []
      });
    }

    // Match products for each order
    const processedOrders = [];
    for (const order of pendingOrders) {
      const matchedLineItems = await matchProductsToDatabase(order.lineItems, companyId);
      processedOrders.push({
        ...order,
        lineItems: matchedLineItems
      });
    }

    res.status(200).json({
      message: `Found ${pendingOrders.length} pending orders`,
      orders: processedOrders
    });

  } catch (error) {
    console.error('Error processing Kyte CSV:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Get available customers for mapping
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getCustomersForMapping(req, res) {
  try {
    const companyId = req.session.companyId;
    const customers = await getAvailableCustomers(companyId);
    
    res.status(200).json({
      customers
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Process orders and create QuickBooks estimates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function createQuickBooksEstimates(req, res) {
  try {
    const { orders } = req.body;
    const companyId = req.session.companyId;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Orders array is required' });
    }

    // Validate that all orders have customer mappings
    const unmappedOrders = orders.filter(order => !order.customerId);
    if (unmappedOrders.length > 0) {
      return res.status(400).json({ 
        error: `Orders ${unmappedOrders.map(o => o.number).join(', ')} do not have customer mappings` 
      });
    }

    // Process orders and create estimates
    const results = await processKyteToQuickBooks(orders, companyId);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.status(200).json({
      message: `Processed ${results.length} orders: ${successful.length} successful, ${failed.length} failed`,
      results,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length
      }
    });

  } catch (error) {
    console.error('Error creating QuickBooks estimates:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Get conversion history for the company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getConversionHistoryController(req, res) {
  try {
    const companyId = req.session.companyId;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await getConversionHistory(companyId, limit);
    
    res.status(200).json({
      history,
      summary: {
        total: history.length,
        successful: history.filter(h => h.status === 'success').length,
        failed: history.filter(h => h.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Error fetching conversion history:', error);
    res.status(400).json({ error: error.message });
  }
}
