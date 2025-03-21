import { AccessError, InputError } from './error.js';
import { query, transaction } from './helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './auth.js';

export async function getCustomerId(customerName) {
  try {
    const result = await query('SELECT customerId FROM customers WHERE customerName = $1', [customerName]);
    if (result.length === 0) {
      throw new InputError('This customer does not exist within the database');
    }
    return result[0].customerid;
  } catch (error) {
    throw new InputError(error.message);
  }
}

export async function fetchCustomers(token) {
  try {
    const oauthClient = await getOAuthClient(token);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialized');
    }
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    
    let allCustomers = [];
    let startPosition = 1;
    let pageSize = 100; // API limit
    let moreRecords = true;

    while (moreRecords) {
      const response = await oauthClient.makeApiCall({
        url: `${baseURL}v3/company/${companyID}/query?query=select * from Customer startPosition ${startPosition} maxResults ${pageSize}&minorversion=69`
      });

      const responseData = JSON.parse(response.text());
      const customers = responseData.QueryResponse.Customer || [];

      allCustomers.push(...customers.map(customer => ({
        id: customer.Id,
        name: customer.DisplayName
      })));

      if (customers.length < pageSize) {
        moreRecords = false;
      } else {
        startPosition += pageSize;
      }
    }
    return allCustomers;
  } catch (e) {
    throw new AccessError('UserId is invalid: ' + e.message);
  }
}


export async function saveCustomers(customers, companyId) {
  try {
    await transaction(async (client) => {
      for (const customer of customers) {
        await client.query(
          'INSERT INTO customers (customerid, customername, companyid) VALUES ($1, $2, $3) ON CONFLICT (customerid) DO UPDATE SET customername = $2',
          [customer.id, customer.name, companyId]
        );
      }
    });
  } catch (error) {
    throw new AccessError(error.message);
  }
}