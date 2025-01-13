import { AccessError } from './error';
import { query } from './helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './auth';

export async function getCompanyInfo(token) {
    try {
        const oauthClient = await getOAuthClient(token);
        const companyId = getCompanyId(oauthClient);
        const baseURL = getBaseURL(oauthClient);
        const queryStr = `SELECT * FROM CompanyInfo`;
    
        const response = await oauthClient.makeApiCall({
            url: `${baseURL}v3/company/${companyId}/query?query=${queryStr}&minorversion=69`
          });
        const responseJSON = JSON.parse(response.text());
        // filter out if Email.Address is donotreply@intuit.com meaning it's a test company .filter(company => company.Email.Address !== 'donotreply@intuit.com');
        const companyInfoFull = responseJSON.QueryResponse.CompanyInfo[0];
        const companyInfo =  {
            companyName: companyInfoFull.CompanyName,
            id: companyInfoFull.Id
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
        const result = await query(`
            INSERT INTO companies (company_name, id, qb_token) 
            VALUES ($1, $2, $3::jsonb)
            ON CONFLICT (id) DO UPDATE 
            SET 
                company_name = EXCLUDED.company_name,
                qb_token = EXCLUDED.qb_token
            RETURNING *`,
            [companyInfo.companyName, companyInfo.id, token]
        );
        return result[0];
    } catch (error) {
        throw new Error(`Failed to save company info: ${error.message}`);
    }
}
