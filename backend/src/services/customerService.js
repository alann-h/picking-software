import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { AccessError } from '../middlewares/errorHandler.js';
import { transaction, query } from '../helpers.js';
import { getBaseURL, getRealmId } from './authService.js';

export async function fetchCustomersLocal(companyId) {
  try {
    // Fetch from your database instead of API
    const result = await query(
      'SELECT id, customer_name FROM customers WHERE company_id = $1 ORDER BY customer_name',
      [companyId]
    );
    return result.map(customer => ({
      customerId: customer.id,
      customerName: customer.customer_name
    }));
  } catch (error) {
    console.error('Error fetching customers from database:', error);
    throw new AccessError('Failed to fetch customers: ' + error.message);
  }
}

export async function fetchCustomers(companyId, connectionType = 'qbo') {
  try {
    if (connectionType === 'qbo') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'qbo');
      return await fetchQBOCustomers(oauthClient);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero');
      return await fetchXeroCustomers(oauthClient);
    } else {
      throw new AccessError(`Unsupported connection type: ${connectionType}`);
    }
  } catch (e) {
    throw new AccessError('Failed to fetch customers: ' + e.message);
  }
}

async function fetchQBOCustomers(oauthClient) {
  const baseURL = getBaseURL(oauthClient, 'qbo');
  const realmId = await getRealmId(oauthClient);

  let allCustomers = [];
  let startPosition = 1;
  let pageSize = 100; // API limit
  let moreRecords = true;

  while (moreRecords) {
    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${realmId}/query?query=select * from Customer startPosition ${startPosition} maxResults ${pageSize}&minorversion=75`
    });
    const responseData = response.json;
    const customers = responseData.QueryResponse.Customer || [];

    allCustomers.push(...customers.map(customer => ({
      customerId: customer.Id,
      customerName: customer.DisplayName
    })));

    if (customers.length < pageSize) {
      moreRecords = false;
    } else {
      startPosition += pageSize;
    }
  }
  return allCustomers;
}

async function fetchXeroCustomers(oauthClient) {
  try {
    const tenantId = await authSystem.getXeroTenantId(oauthClient);

    let allCustomers = [];
    let page = 1;
    let hasMorePages = true;

    const whereFilter = 'IsCustomer==true';

    while (hasMorePages) {
      const response = await oauthClient.accountingApi.getContacts(
        tenantId,
        undefined,  // ifModifiedSince
        whereFilter, // where
        undefined,  // order
        undefined,  // iDs
        page,       // page
        true,       // includeArchived
        true,       // summaryOnly
        undefined,  // searchTerm
        100         // pageSize
      );

      const customers = response.body.contacts || [];
      
      allCustomers.push(...customers.map(customer => ({
        customerId: customer.contactID,
        customerName: customer.name
      })));

      // Check if there are more pages
      if (customers.length < 100) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    return allCustomers;
  } catch (error) {
    console.error('Error fetching Xero customers:', error);
    throw new Error(`Failed to fetch Xero customers: ${error.message}`);
  }
}


export async function saveCustomers(customers, companyId) {
  try {
    await transaction(async (client) => {
      for (const customer of customers) {
        if (customer.customerId == null) {
          console.error('❌ Null or undefined customerId found:', customer);
          continue;
        }
        await client.query(
          'INSERT INTO customers (id, customer_name, company_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET customer_name = $2',
          [customer.customerId, customer.customerName, companyId]
        );
      }
    });
  } catch (error) {
    throw new AccessError(error.message);
  }
}
