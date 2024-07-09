import { AccessError, InputError } from './error';
import { readDatabase, writeDatabase } from './helpers';
import { getOAuthClient, getBaseURL, getCompanyId } from './auth';

export async function getCustomerId(customerName) {
  try {
    const database = readDatabase();
    const customerId = database.customers[customerName].id;
    if (!customerId) {
      throw new InputError('This customer does not exist within the database');
    }
    return customerId;
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
    const database = readDatabase();
    const customerObject = customers.reduce((obj, customer) => {
      obj[customer.name] = { id: customer.id };
      return obj;
    }, {});
    database.customers = customerObject;
    writeDatabase(database);
  } catch (error) {
    throw new AccessError(error.message);
  }
}