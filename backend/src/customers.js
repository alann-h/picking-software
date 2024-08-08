import { AccessError, InputError } from './error';
import { query, transaction } from './helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './auth';

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

export async function fetchCustomers(userId) {
  try {
    const oauthClient = await getOAuthClient(userId);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialized');
    }
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=select * from Customer&minorversion=69`
    });
    const responseData = JSON.parse(response.text());
    const customers = responseData.QueryResponse.Customer.map(customer => ({
      id: customer.Id,
      name: customer.DisplayName
    }));
    return customers;
  } catch (e) {
    throw new AccessError('UserId is invalid: ' + e.message);
  }
}

export async function saveCustomers(customers) {
  try {
    await transaction(async (client) => {
      for (const customer of customers) {
        await client.query(
          'INSERT INTO customers (customerid, customername) VALUES ($1, $2) ON CONFLICT (customerid) DO UPDATE SET customername = $2',
          [customer.id, customer.name]
        );
      }
    });
  } catch (error) {
    throw new AccessError(error.message);
  }
}