import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { transaction, query, encryptToken, decryptToken } from '../helpers.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { ConnectionType, CompanyFromDB } from '../types/auth.js';
import { QboToken, XeroToken } from '../types/token.js';
import { PoolClient } from 'pg';
import { AUTH_ERROR_CODES } from '../constants/errorCodes.js';

export class CompanyService {
    async getCompanies(): Promise<CompanyFromDB[]> {
        try {
            const companies: CompanyFromDB[] = await query('SELECT * FROM companies', []);
            return companies;
        } catch (error: any) {
            throw new Error(`Failed to get companies: ${error.message}`);
        }
    }

    async getCompanyById(companyId: string): Promise<CompanyFromDB> {
        try {
            const company: CompanyFromDB[] = await query('SELECT * FROM companies WHERE id = $1', [companyId]);
            if (company.length === 0) {
                throw new Error('Company not found');
            }
            return company[0];
        } catch (error: any) {
            throw new Error(`Failed to get company by ID: ${error.message}`);
        }
    }

    async saveCompanyInfo(token: QboToken | XeroToken, connectionType: ConnectionType = 'qbo'): Promise<CompanyFromDB> {
        try {
            if (connectionType === 'qbo') {            
                const companyDetails = await authSystem.getQBOCompanyInfo(token as QboToken);

                if (!companyDetails) {
                    throw new Error('Could not retrieve company details from QBO.');
                }

                const existingCompany: CompanyFromDB[] = await query(
                    'SELECT id FROM companies WHERE qbo_realm_id = $1',
                    [companyDetails.realmId]
                );

                if (existingCompany.length > 0) {
                    // Update existing company
                    await tokenService.storeTokenData(existingCompany[0].id, 'qbo', token);
                    
                    const result: CompanyFromDB[] = await query(`
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
                    const result: CompanyFromDB[] = await query(`
                        INSERT INTO companies (company_name, connection_type, qbo_token_data, xero_token_data, qbo_realm_id, xero_tenant_id) 
                        VALUES ($1, 'qbo', NULL, NULL, $2, NULL)
                        RETURNING *`,
                        [companyDetails.companyName, companyDetails.realmId]
                    );
                    
                    // Store token data and realm ID
                    await tokenService.storeTokenData(result[0].id, 'qbo', token);
                    
                    return result[0];
                }
            } else if (connectionType === 'xero') {
                const companyDetails = await authSystem.getXeroCompanyInfo(token as XeroToken);

                const existingCompany: CompanyFromDB[] = await query(
                    'SELECT id FROM companies WHERE xero_tenant_id = $1',
                    [companyDetails.tenantId]
                );

                if (existingCompany.length > 0) {
                    // Update existing company
                    await tokenService.storeTokenData(existingCompany[0].id, 'xero', token);
                    
                    const result: CompanyFromDB[] = await query(`
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
                    const result: CompanyFromDB[] = await query(`
                        INSERT INTO companies (company_name, connection_type, qbo_token_data, xero_token_data, qbo_realm_id, xero_tenant_id) 
                        VALUES ($1, 'xero', NULL, NULL, NULL, $2)
                        RETURNING *`,
                        [companyDetails.companyName, companyDetails.tenantId]
                    );
                    
                    // Store token data and tenant ID
                    await tokenService.storeTokenData(result[0].id, 'xero', token);
                    
                    return result[0];
                }
            } else {
                throw new Error(`Unsupported connection type: ${connectionType}`);
            }
        } catch (error: any) {
            throw new Error(`Failed to save company info: ${error.message}`);
        }
    }

    async removeCompanyData(companyId: string): Promise<{ success: boolean, message: string }> {
        return transaction(async (client: PoolClient) => {
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
        }).catch((e: any) => {
            throw new AccessError('Company ID does not exist: ' + e.message);
        });
    }

    async setCompanyTokens(companyId: string, connectionType: ConnectionType, tokenData: QboToken | XeroToken): Promise<void> {
        try {
            await tokenService.storeTokenData(companyId, connectionType, tokenData);
        } catch (e: any) {
            throw new Error(`Failed to set company tokens: ${e.message}`);
        }
    }

    async createCompany(companyName: string, connectionType: ConnectionType, tokenData: QboToken | XeroToken): Promise<CompanyFromDB> {
        return await transaction(async (client: PoolClient) => {
            let realmId: string | null = null;
            let tenantId: string | null = null;
            if (connectionType === 'qbo') {
                const qboToken = tokenData as QboToken;
                realmId = qboToken.realmId;
            } else if (connectionType === 'xero') {
                const xeroToken = tokenData as XeroToken;
                tenantId = xeroToken.tenant_id;
            }

            const result: CompanyFromDB[] = await query(`
                INSERT INTO companies (company_name, connection_type, qbo_token_data, xero_token_data, qbo_realm_id, xero_tenant_id) 
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [companyName, connectionType, realmId, tenantId, realmId, tenantId]
            );
            return result[0];
        }).catch((e: any) => {
            if (e.code === AUTH_ERROR_CODES.TOKEN_INVALID) {
                throw new AuthenticationError('Invalid token provided for company creation.');
            }
            throw new Error(`Failed to create company: ${e.message}`);
        });
    }
}
