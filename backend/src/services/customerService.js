import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { AccessError } from '../middlewares/errorHandler.js';
import { transaction } from '../helpers.js';

export async function fetchCustomers(companyId, connectionType = 'qbo') {
  try {
    if (connectionType === 'qbo') {
      const qboClient = await tokenService.getQBODataClient(companyId);
      return await fetchQBOCustomers(qboClient);
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

async function fetchQBOCustomers(qboClient) {
  try {
    const response = await new Promise((resolve, reject) => {
      qboClient.findCustomers((err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    const customers = response.QueryResponse.Customer;
    const allCustomers = customers.map(customer => ({
      customerId: customer.Id,
      customerName: customer.DisplayName
    }));
    return allCustomers;
  } catch (error) {
    console.error('Error fetching QBO customers:', error);
    throw new Error(`Failed to fetch QBO customers: ${error.message}`);
  }
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