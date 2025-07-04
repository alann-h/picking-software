import { AccessError } from '../middlewares/errorHandler.js';
import { encryptToken, query, transaction } from '../helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './authService.js';

export async function getCompanyInfo(token) {
    try {
        const oauthClient = await getOAuthClient(token);
        const companyId = getCompanyId(oauthClient);
        const baseURL = getBaseURL(oauthClient);
        const queryStr = `SELECT * FROM CompanyInfo`;
    
        const response = await oauthClient.makeApiCall({
            url: `${baseURL}v3/company/${companyId}/query?query=${queryStr}&minorversion=75`
          });
        const responseJSON = JSON.parse(response.text());
        // filter out if Email.Address is donotreply@intuit.com meaning it's a test company .filter(company => company.Email.Address !== 'donotreply@intuit.com');
        const companyInfoFull = responseJSON.QueryResponse.CompanyInfo[0];
        const companyInfo =  {
            companyName: companyInfoFull.CompanyName,
            id: companyId
        };
        return companyInfo;
    } catch(e) {
        console.error(e);
        throw new AccessError('Could not get company information');
    }

}

export async function saveCompanyInfo(token) {
    try {
        const companyInfo = await getCompanyInfo(token);
        const encryptedToken = await encryptToken(token);
        const result = await query(`
            INSERT INTO companies (company_name, companyid, qb_token) 
            VALUES ($1, $2, $3)
            ON CONFLICT (companyid) DO UPDATE 
            SET 
                company_name = EXCLUDED.company_name,
                qb_token = EXCLUDED.qb_token
            RETURNING *`,
            [companyInfo.companyName, companyInfo.id, encryptedToken]
        );
        return result[0];
    } catch (error) {
        throw new Error(`Failed to save company info: ${error.message}`);
    }
}

export async function removeQuickBooksData(companyId) {
    return transaction(async (client) => {
        await Promise.all([
            client.query('DELETE from users where companyid = $1', [companyId]),
            client.query('DELETE FROM customers WHERE companyid = $1', [companyId]),
            client.query('DELETE FROM quoteitems WHERE companyid = $1', [companyId]),
            client.query('DELETE FROM products WHERE companyid = $1', [companyId]),
            client.query('DELETE FROM quotes WHERE companyid = $1', [companyId]),
        ]);

        await client.query('DELETE FROM companies WHERE companyid = $1', [companyId]); // Delete company last

        return { success: true, message: 'Company and related data deleted successfully' };
    }).catch((e) => {
        throw new AccessError('Company ID does not exist: ' + e.message);
    });
}
