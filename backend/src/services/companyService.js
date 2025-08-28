import { AccessError } from '../middlewares/errorHandler.js';
import { query, transaction } from '../helpers.js';
import { authSystem } from './authSystem.js';
import { tokenService } from './tokenService.js';

export async function saveCompanyInfo(token, connectionType = 'qbo') {
    try {
        if (connectionType === 'qbo') {            
            const companyDetails = await authSystem.getQBOCompanyInfo(token);

            const existingCompany = await query(
                'SELECT id FROM companies WHERE qbo_realm_id = $1',
                [companyDetails.realmId]
            );

            if (existingCompany.length > 0) {
                // Update existing company
                await tokenService.storeTokenData(existingCompany[0].id, 'qbo', token);
                
                const result = await query(`
                    UPDATE companies 
                    SET 
                        company_name = $1,
                        connection_type = 'qbo',
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *`,
                    [companyDetails.companyName, existingCompany[0].id]
                );
                return result[0];
            } else {
                // Insert new company
                const result = await query(`
                    INSERT INTO companies (company_name, connection_type, qbo_token_data, xero_token_data, qbo_realm_id, xero_tenant_id) 
                    VALUES ($1, 'qbo', NULL, NULL, $2, NULL)
                    RETURNING *`,
                    [companyDetails.companyName, companyDetails.realmId]
                );
                
                // Store token data and realm ID
                await tokenService.storeTokenData(result[0].id, 'qbo', token);
                await query(
                    'UPDATE companies SET qbo_realm_id = $1 WHERE id = $2',
                    [companyDetails.realmId, result[0].id]
                );
                
                return result[0];
            }
        } else if (connectionType === 'xero') {
            const companyDetails = await authSystem.getXeroCompanyInfo(token);

            const existingCompany = await query(
                'SELECT id FROM companies WHERE xero_tenant_id = $1',
                [companyDetails.tenantId]
            );

            if (existingCompany.length > 0) {
                // Update existing company
                await tokenService.storeTokenData(existingCompany[0].id, 'xero', token);
                
                const result = await query(`
                    UPDATE companies 
                    SET 
                        company_name = $1,
                        connection_type = 'xero',
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *`,
                    [companyDetails.companyName, existingCompany[0].id]
                );
                return result[0];
            } else {
                // Insert new company
                const result = await query(`
                    INSERT INTO companies (company_name, connection_type, qbo_token_data, xero_token_data, qbo_realm_id, xero_tenant_id) 
                    VALUES ($1, 'xero', NULL, NULL, NULL, $2)
                    RETURNING *`,
                    [companyDetails.companyName, companyDetails.tenantId]
                );
                
                // Store token data and tenant ID
                await tokenService.storeTokenData(result[0].id, 'xero', token);
                await query(
                    'UPDATE companies SET xero_tenant_id = $1 WHERE id = $2',
                    [companyDetails.tenantId, result[0].id]
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
