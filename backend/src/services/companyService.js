import { AccessError } from '../middlewares/errorHandler.js';
import { encryptToken, query, transaction } from '../helpers.js';
import { initializeOAuthClient, getBaseURL } from './authService.js';

export async function getCompanyInfo(oauthClient, realmId) {
    try {
        const baseURL = getBaseURL(oauthClient);
        const queryStr = `SELECT * FROM CompanyInfo`;
    
        const response = await oauthClient.makeApiCall({
            url: `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
          });
        const responseJSON = response.json;
        // filter out if Email.Address is donotreply@intuit.com meaning it's a test company .filter(company => company.Email.Address !== 'donotreply@intuit.com');
        const companyInfoFull = responseJSON.QueryResponse.CompanyInfo[0];
        const companyInfo =  {
            companyName: companyInfoFull.CompanyName,
            realmId: realmId
        };
        return companyInfo;
    } catch(e) {
        console.error(e);
        throw new AccessError('Could not get company information');
    }

}

export async function saveCompanyInfo(token) {
    try {
        const tempOAuthClient = initializeOAuthClient();
        tempOAuthClient.setToken(token);

        const companyInfo = await getCompanyInfo(tempOAuthClient, token.realmId);
        const encryptedToken = await encryptToken(token);
        
        // First check if company with this QBO realm already exists
        const existingCompany = await query(
            'SELECT id FROM companies WHERE qb_realm_id = $1',
            [companyInfo.realmId]
        );

        if (existingCompany.length > 0) {
            // Update existing company
            const result = await query(`
                UPDATE companies 
                SET 
                    company_name = $1,
                    qb_token = $2,
                    connection_type = 'qbo',
                    updated_at = NOW()
                WHERE qb_realm_id = $3
                RETURNING *`,
                [companyInfo.companyName, encryptedToken, companyInfo.realmId]
            );
            return result[0];
        } else {
            // Insert new company
            const result = await query(`
                INSERT INTO companies (company_name, qb_realm_id, qb_token, connection_type) 
                VALUES ($1, $2, $3, 'qbo')
                RETURNING *`,
                [companyInfo.companyName, companyInfo.realmId, encryptedToken]
            );
            return result[0];
        }
    } catch (error) {
        throw new Error(`Failed to save company info: ${error.message}`);
    }
}

export async function removeQuickBooksData(companyId) {
    return transaction(async (client) => {
        // Delete in correct order to respect foreign key constraints
        await Promise.all([
            client.query('DELETE FROM run_items WHERE run_id IN (SELECT id FROM runs WHERE company_id = $1)', [companyId]),
            client.query('DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = $1)', [companyId]),
            client.query('DELETE FROM security_events WHERE company_id = $1', [companyId]),
        ]);

        await Promise.all([
            client.query('DELETE FROM runs WHERE company_id = $1', [companyId]),
            client.query('DELETE FROM quotes WHERE company_id = $1', [companyId]),
            client.query('DELETE FROM customers WHERE company_id = $1', [companyId]),
            client.query('DELETE FROM products WHERE company_id = $1', [companyId]),
            client.query('DELETE FROM jobs WHERE company_id = $1', [companyId]),
        ]);

        // Update users to remove company association (don't delete users)
        await client.query('UPDATE users SET company_id = NULL WHERE company_id = $1', [companyId]);

        // Finally delete the company
        await client.query('DELETE FROM companies WHERE id = $1', [companyId]);

        return { success: true, message: 'Company and related data deleted successfully' };
    }).catch((e) => {
        throw new AccessError('Company ID does not exist: ' + e.message);
    });
}
