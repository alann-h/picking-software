import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { AccessError } from '../middlewares/errorHandler.js';
import { getBaseURL, getRealmId } from './authService.js';
import { Customer, LocalCustomer } from '../types/customer.js';
import { ConnectionType } from '../types/auth.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient, Contact } from 'xero-node';
import { AUTH_ERROR_CODES } from '../constants/errorCodes.js';
import { prisma } from '../lib/prisma.js';

export async function fetchCustomersLocal(companyId: string): Promise<LocalCustomer[]> {
  try {
    // Fetch from your database using Prisma
    const customers = await prisma.customer.findMany({
      where: { companyId },
      select: {
        id: true,
        customerName: true
      },
      orderBy: { customerName: 'asc' }
    });
    return customers.map(customer => ({
      id: customer.id,
      customer_name: customer.customerName
    }));
  } catch (error: unknown) {
    console.error('Error fetching customers from database:', error);
    if (error instanceof Error) {
      throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch customers: ' + error.message);
    }
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'An unknown error occurred while fetching customers.');
  }
}

export async function fetchCustomers(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<Omit<Customer, 'company_id'>[]> {
  try {
    if (connectionType === 'qbo') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
      return await fetchQBOCustomers(oauthClient);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero') as XeroClient;
      return await fetchXeroCustomers(oauthClient);
    } else {
      throw new AccessError(AUTH_ERROR_CODES.VALIDATION_ERROR, `Unsupported connection type: ${connectionType}`);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch customers: ' + e.message);
    }
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'An unknown error occurred while fetching customers.');
  }
}

interface QBOCustomer {
    Id: string;
    DisplayName: string;
}

async function fetchQBOCustomers(oauthClient: IntuitOAuthClient): Promise<Omit<Customer, 'company_id'>[]> {
  const baseURL = await getBaseURL(oauthClient, 'qbo');
  const realmId = getRealmId(oauthClient);

  let allCustomers: Omit<Customer, 'company_id'>[] = [];
  let startPosition = 1;
  let pageSize = 100; // API limit
  let moreRecords = true;

  while (moreRecords) {
    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${realmId}/query?query=select * from Customer startPosition ${startPosition} maxResults ${pageSize}&minorversion=75`
    });
    const responseData = response.json;
    const customers: QBOCustomer[] = responseData.QueryResponse.Customer || [];

    allCustomers.push(...customers.map((customer: QBOCustomer) => ({
      id: customer.Id,
      customer_name: customer.DisplayName
    })));

    if (customers.length < pageSize) {
      moreRecords = false;
    } else {
      startPosition += pageSize;
    }
  }
  return allCustomers;
}

async function fetchXeroCustomers(oauthClient: XeroClient): Promise<Omit<Customer, 'company_id'>[]> {
  try {
    const tenantId = await authSystem.getXeroTenantId(oauthClient);

    if (!tenantId) {
        throw new Error('Xero tenant ID not found.');
    }

    let allCustomers: Omit<Customer, 'company_id'>[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await oauthClient.accountingApi.getContacts(
        tenantId,
        undefined,  // ifModifiedSince
        undefined,  // where - removed filter due to high contact count
        undefined,  // order
        undefined,  // iDs
        page,       // page
        true,       // includeArchived
        true,       // summaryOnly
        undefined  // searchTerm
      );
      const customers: Contact[] = response.body.contacts || [];
      
      // Filter to only include active customers
      const activeCustomers = customers.filter((customer: Contact) => 
        String(customer.contactStatus) === 'ACTIVE'
      );
      
      allCustomers.push(...activeCustomers.map((customer: Contact) => ({
        id: customer.contactID!,
        customer_name: customer.name!
      })));

      // Check if there are more pages
      if (customers.length < 100) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    return allCustomers;
  } catch (error: unknown) {
    console.error('Error fetching Xero customers:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Xero customers: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching Xero customers.');
  }
}


export async function saveCustomers(customers: Omit<Customer, 'company_id'>[], companyId: string): Promise<void> {
  try {
    // Use Prisma transaction for better type safety
    await prisma.$transaction(async (tx) => {
      for (const customer of customers) {
        if (customer.id == null) {
          console.error('❌ Null or undefined customerId found:', customer);
          continue;
        }
        
        await tx.customer.upsert({
          where: { id: customer.id },
          update: { 
            customerName: customer.customer_name 
          },
          create: {
            id: customer.id,
            customerName: customer.customer_name,
            companyId: companyId
          }
        });
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, error.message);
    }
    throw new AccessError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'An unknown error occurred while saving customers.');
  }
}
