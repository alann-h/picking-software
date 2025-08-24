import { AccessError } from '../middlewares/errorHandler.js';
import { encryptToken, query, transaction } from '../helpers.js';
import { authSystem } from './authSystem.js';

export async function saveCompanyInfo(token, connectionType = 'qbo') {
    try {
        let companyInfo;
        
        if (connectionType === 'qbo') {
            companyInfo = await authSystem.getQBOUserInfo(token);
            
            const realmId = token.realmId;

            let companyName;
            
            try {
                const companyDetails = await authSystem.getQBOCompanyInfo(token);
                if (companyDetails) {
                    companyName = companyDetails.companyName;
                }
            } catch (error) {
                console.warn('Could not get company details, using user info fallback ' + error.message);
            }
            
            if (!companyName) {
                companyName = companyInfo.givenName + ' ' + companyInfo.familyName;
            }

            const encryptedAccessToken = await encryptToken(token.access_token);
            const encryptedRefreshToken = await encryptToken(token.refresh_token);
            const expiresAt = token.access_token_expires_at ? 
                new Date(token.access_token_expires_at * 1000) : null;
            
            const existingCompany = await query(
                'SELECT id FROM companies WHERE qb_realm_id = $1',
                [realmId]
            );

            if (existingCompany.length > 0) {
                // Update existing company - clear other connection fields
                const result = await query(`
                    UPDATE companies 
                    SET 
                        company_name = $1,
                        qb_token = $2,
                        qb_refresh_token = $3,
                        qb_token_expires_at = $4,
                        connection_type = 'qbo',
                        xero_tenant_id = NULL, xero_token = NULL, xero_refresh_token = NULL, xero_token_expires_at = NULL,
                        updated_at = NOW()
                    WHERE qb_realm_id = $5
                    RETURNING *`,
                    [companyName, encryptedAccessToken, encryptedRefreshToken, expiresAt, realmId]
                );
                return result[0];
            } else {
                // Insert new company
                const result = await query(`
                    INSERT INTO companies (company_name, qb_realm_id, qb_token, qb_refresh_token, qb_token_expires_at, connection_type, xero_tenant_id, xero_token, xero_refresh_token, xero_token_expires_at) 
                    VALUES ($1, $2, $3, $4, $5, 'qbo', NULL, NULL, NULL, NULL)
                    RETURNING *`,
                    [companyName, realmId, encryptedAccessToken, encryptedRefreshToken, expiresAt]
                );
                return result[0];
            }
        } else if (connectionType === 'xero') {
            companyInfo = {
                companyName: token.companyName || 'Xero Company',
                tenantId: token.tenant_id
            };
            
            const encryptedAccessToken = await encryptToken(token.access_token);
            const encryptedRefreshToken = await encryptToken(token.refresh_token);
            const expiresAt = token.expires_at ? 
                new Date(token.expires_at * 1000) : null;
            
            const existingCompany = await query(
                'SELECT id FROM companies WHERE xero_tenant_id = $1',
                [companyInfo.tenantId]
            );

            if (existingCompany.length > 0) {
                // Update existing company - clear other connection fields
                const result = await query(`
                    UPDATE companies 
                    SET 
                        company_name = $1,
                        xero_token = $2,
                        xero_refresh_token = $3,
                        xero_token_expires_at = $4,
                        connection_type = 'xero',
                        qb_realm_id = NULL, qb_token = NULL, qb_refresh_token = NULL, qb_token_expires_at = NULL,
                        updated_at = NOW()
                    WHERE xero_tenant_id = $5
                    RETURNING *`,
                    [companyInfo.companyName, encryptedAccessToken, encryptedRefreshToken, expiresAt, companyInfo.tenantId]
                );
                return result[0];
            } else {
                // Insert new company
                const result = await query(`
                    INSERT INTO companies (company_name, xero_tenant_id, xero_token, xero_refresh_token, xero_token_expires_at, connection_type, qb_realm_id, qb_token, qb_refresh_token, qb_token_expires_at) 
                    VALUES ($1, $2, $3, $4, $5, 'xero', NULL, NULL, NULL, NULL)
                    RETURNING *`,
                    [companyInfo.companyName, companyInfo.tenantId, encryptedAccessToken, encryptedRefreshToken, expiresAt]
                );
                return result[0];
            }
        } else {
            throw new Error(`Unsupported connection type: ${connectionType}`);
        }
    } catch (error) {
        throw new Error(`Failed to save company info: ${error.message}`);
    }
}

export async function removeCompanyData(companyId) {
    return transaction(async (client) => {
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

        await client.query('UPDATE users SET company_id = NULL WHERE company_id = $1', [companyId]);

        await client.query('DELETE FROM companies WHERE id = $1', [companyId]);

        return { success: true, message: 'Company and related data deleted successfully' };
    }).catch((e) => {
        throw new AccessError('Company ID does not exist: ' + e.message);
    });
}
