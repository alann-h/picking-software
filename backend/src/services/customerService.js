import { AccessError } from '../middlewares/errorHandler.js';
import { transaction } from '../helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './authService.js';

export async function fetchCustomers(token) {
  try {
    const oauthClient = await getOAuthClient(token);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
    }
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    
    let allCustomers = [];
    let startPosition = 1;
    let pageSize = 100; // API limit
    let moreRecords = true;

    while (moreRecords) {
      const response = await oauthClient.makeApiCall({
        url: `${baseURL}v3/company/${companyID}/query?query=select * from Customer startPosition ${startPosition} maxResults ${pageSize}&minorversion=75`
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
  } catch (e) {
    throw new AccessError('UserId is invalid: ' + e.message);
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
          'INSERT INTO customers (customerid, customername, companyid) VALUES ($1, $2, $3) ON CONFLICT (customerid) DO UPDATE SET customername = $2',
          [customer.customerId, customer.customerName, companyId]
        );
      }
    });
  } catch (error) {
    throw new AccessError(error.message);
  }
}