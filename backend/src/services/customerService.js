import { getOAuthClient, getBaseURL, getTenantId } from '../services/authService.js';
import { AccessError } from '../middlewares/errorHandler.js';
import { query, transaction } from '../helpers.js';

export async function fetchCustomers(companyId, connectionType = 'qbo') {
  try {
    const oauthClient = await getOAuthClient(companyId, connectionType);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
    }

    if (connectionType === 'qbo') {
      return await fetchQBOCustomers(oauthClient, companyId);
    } else if (connectionType === 'xero') {
      return await fetchXeroCustomers(oauthClient, companyId);
    } else {
      throw new AccessError(`Unsupported connection type: ${connectionType}`);
    }
  } catch (e) {
    throw new AccessError('Failed to fetch customers: ' + e.message);
  }
}

async function fetchQBOCustomers(oauthClient) {
  const baseURL = getBaseURL(oauthClient, 'qbo');
  const realmId = getTenantId(oauthClient);
  
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

async function fetchXeroCustomers(oauthClient, companyId) {
  try {
    const tenantId = await getTenantId(oauthClient);

    let allCustomers = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await oauthClient.accountingApi.getContacts(
        tenantId,
        undefined,
        undefined,
        page,
        200
      );

      const customers = response.body.contacts || [];
      
      const customerContacts = customers.filter(contact => 
        contact.isCustomer === true || contact.isCustomer === undefined
      );

      allCustomers.push(...customerContacts.map(customer => ({
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