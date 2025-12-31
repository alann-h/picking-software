import { AccessError, AuthenticationError } from '../middlewares/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { ConnectionType, CompanyFromDB } from '../types/auth.js';
import { QboToken, XeroToken } from '../types/token.js';
import { AUTH_ERROR_CODES } from '../constants/errorCodes.js';

export class CompanyService {
    async getCompanies(): Promise<CompanyFromDB[]> {
        try {
            const companies = await prisma.company.findMany();
            return companies.map(company => ({
                id: company.id,
                companyName: company.companyName,
                connectionType: company.connectionType as ConnectionType,
                qboTokenData: company.qboTokenData,
                xeroTokenData: company.xeroTokenData,
                qboRealmId: company.qboRealmId,
                xeroTenantId: company.xeroTenantId,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt,
                subscriptionStatus: company.subscriptionStatus,
                stripeCustomerId: company.stripeCustomerId
            }));
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Failed to get companies: ${error.message}`);
            }
            throw new Error(`Failed to get companies: An unknown error occurred`);
        }
    }

    async getCompanyById(companyId: string): Promise<CompanyFromDB> {
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });
            if (!company) {
                throw new Error('Company not found');
            }
            return {
                id: company.id,
                companyName: company.companyName,
                connectionType: company.connectionType as ConnectionType,
                qboTokenData: company.qboTokenData,
                xeroTokenData: company.xeroTokenData,
                qboRealmId: company.qboRealmId,
                xeroTenantId: company.xeroTenantId,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt,
                subscriptionStatus: company.subscriptionStatus,
                stripeCustomerId: company.stripeCustomerId
            };
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Failed to get company by ID: ${error.message}`);
            }
            throw new Error(`Failed to get company by ID: An unknown error occurred`);
        }
    }

    async saveCompanyInfo(token: QboToken | XeroToken, connectionType: ConnectionType = 'qbo'): Promise<CompanyFromDB> {
        try {
            if (connectionType === 'qbo') {            
                const companyDetails = await authSystem.getQBOCompanyInfo(token as QboToken);

                if (!companyDetails) {
                    throw new Error('Could not retrieve company details from QBO.');
                }

                const existingCompany = await prisma.company.findFirst({
                    where: { qboRealmId: companyDetails.realmId },
                    select: { id: true },
                });

                if (existingCompany) {
                    // Update existing company
                    await tokenService.storeTokenData(existingCompany.id, 'qbo', token);
                    
                    const updatedCompany = await prisma.company.update({
                        where: { id: existingCompany.id },
                        data: {
                            companyName: companyDetails.companyName,
                            connectionType: 'qbo',
                        },
                    });
                    
                    return {
                        id: updatedCompany.id,
                        companyName: updatedCompany.companyName,
                        connectionType: updatedCompany.connectionType as ConnectionType,
                        qboTokenData: updatedCompany.qboTokenData,
                        xeroTokenData: updatedCompany.xeroTokenData,
                        qboRealmId: updatedCompany.qboRealmId,
                        xeroTenantId: updatedCompany.xeroTenantId,
                        createdAt: updatedCompany.createdAt,
                        updatedAt: updatedCompany.updatedAt,
                        subscriptionStatus: updatedCompany.subscriptionStatus,
                        stripeCustomerId: updatedCompany.stripeCustomerId
                    };
                } else {
                    // Insert new company
                    const newCompany = await prisma.company.create({
                        data: {
                            companyName: companyDetails.companyName,
                            connectionType: 'qbo',
                            qboRealmId: companyDetails.realmId,
                        },
                    });
                    
                    // Store token data and realm ID
                    await tokenService.storeTokenData(newCompany.id, 'qbo', token);
                    
                    return {
                        id: newCompany.id,
                        companyName: newCompany.companyName,
                        connectionType: newCompany.connectionType as ConnectionType,
                        qboTokenData: newCompany.qboTokenData,
                        xeroTokenData: newCompany.xeroTokenData,
                        qboRealmId: newCompany.qboRealmId,
                        xeroTenantId: newCompany.xeroTenantId,
                        createdAt: newCompany.createdAt,
                        updatedAt: newCompany.updatedAt,
                        subscriptionStatus: newCompany.subscriptionStatus,
                        stripeCustomerId: newCompany.stripeCustomerId
                    };
                }
            } else if (connectionType === 'xero') {
                const companyDetails = await authSystem.getXeroCompanyInfo(token as XeroToken);

                const existingCompany = await prisma.company.findFirst({
                    where: { xeroTenantId: companyDetails.tenantId },
                    select: { id: true },
                });

                if (existingCompany) {
                    // Update existing company
                    await tokenService.storeTokenData(existingCompany.id, 'xero', token);
                    
                    const updatedCompany = await prisma.company.update({
                        where: { id: existingCompany.id },
                        data: {
                            companyName: companyDetails.companyName,
                            connectionType: 'xero',
                        },
                    });
                    
                    return {
                        id: updatedCompany.id,
                        companyName: updatedCompany.companyName,
                        connectionType: updatedCompany.connectionType as ConnectionType,
                        qboTokenData: updatedCompany.qboTokenData,
                        xeroTokenData: updatedCompany.xeroTokenData,
                        qboRealmId: updatedCompany.qboRealmId,
                        xeroTenantId: updatedCompany.xeroTenantId,
                        createdAt: updatedCompany.createdAt,
                        updatedAt: updatedCompany.updatedAt,
                    };
                } else {
                    // Insert new company
                    const newCompany = await prisma.company.create({
                        data: {
                            companyName: companyDetails.companyName,
                            connectionType: 'xero',
                            xeroTenantId: companyDetails.tenantId,
                        },
                    });
                    
                    // Store token data and tenant ID
                    await tokenService.storeTokenData(newCompany.id, 'xero', token);
                    
                    return {
                        id: newCompany.id,
                        companyName: newCompany.companyName,
                        connectionType: newCompany.connectionType as ConnectionType,
                        qboTokenData: newCompany.qboTokenData,
                        xeroTokenData: newCompany.xeroTokenData,
                        qboRealmId: newCompany.qboRealmId,
                        xeroTenantId: newCompany.xeroTenantId,
                        createdAt: newCompany.createdAt,
                        updatedAt: newCompany.updatedAt,
                        subscriptionStatus: newCompany.subscriptionStatus,
                        stripeCustomerId: newCompany.stripeCustomerId
                    };
                }
            } else {
                throw new Error(`Unsupported connection type: ${connectionType}`);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Failed to save company info: ${error.message}`);
            }
            throw new Error(`Failed to save company info: An unknown error occurred`);
        }
    }

    async removeCompanyData(companyId: string): Promise<{ success: boolean, message: string }> {
        try {
            await prisma.$transaction(async (tx) => {
                // Delete related data first (due to foreign key constraints)
                await Promise.all([
                    tx.runItem.deleteMany({
                        where: {
                            run: { companyId },
                        },
                    }),
                    tx.quoteItem.deleteMany({
                        where: {
                            quote: { companyId },
                        },
                    }),
                    tx.securityEvent.deleteMany({
                        where: { companyId },
                    }),
                ]);

                // Delete main entities
                await Promise.all([
                    tx.run.deleteMany({
                        where: { companyId },
                    }),
                    tx.quote.deleteMany({
                        where: { companyId },
                    }),
                    tx.customer.deleteMany({
                        where: { companyId },
                    }),
                    tx.product.deleteMany({
                        where: { companyId },
                    }),
                    tx.job.deleteMany({
                        where: { companyId },
                    }),
                ]);

                // Update users to remove company association
                await tx.user.updateMany({
                    where: { companyId },
                    data: { companyId: null },
                });

                // Finally delete the company
                await tx.company.delete({
                    where: { id: companyId },
                });
            });

            return { success: true, message: 'Company and related data deleted successfully' };
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'P2025') {
                // Prisma error for record not found
                throw new AccessError('Company ID does not exist');
            }
            throw new Error(`Failed to remove company data: An unknown error occurred`);
        }
    }

    async setCompanyTokens(companyId: string, connectionType: ConnectionType, tokenData: QboToken | XeroToken): Promise<void> {
        try {
            await tokenService.storeTokenData(companyId, connectionType, tokenData);
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new Error(`Failed to set company tokens: ${e.message}`);
            }
            throw new Error(`Failed to set company tokens: An unknown error occurred`);
        }
    }

    async createCompany(companyName: string, connectionType: ConnectionType, tokenData: QboToken | XeroToken): Promise<CompanyFromDB> {
        try {
            let realmId: string | null = null;
            let tenantId: string | null = null;
            if (connectionType === 'qbo') {
                const qboToken = tokenData as QboToken;
                realmId = qboToken.realmId;
            } else if (connectionType === 'xero') {
                const xeroToken = tokenData as XeroToken;
                tenantId = xeroToken.tenant_id;
            }

            const company = await prisma.company.create({
                data: {
                    companyName,
                    connectionType,
                    qboRealmId: realmId,
                    xeroTenantId: tenantId,
                },
            });

            return {
                id: company.id,
                companyName: company.companyName,
                connectionType: company.connectionType as ConnectionType,
                qboTokenData: company.qboTokenData,
                xeroTokenData: company.xeroTokenData,
                qboRealmId: company.qboRealmId,
                xeroTenantId: company.xeroTenantId,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt,
                subscriptionStatus: company.subscriptionStatus,
                stripeCustomerId: company.stripeCustomerId
            };
        } catch (error: unknown) {
            if (error instanceof Error && error.message === AUTH_ERROR_CODES.TOKEN_INVALID) {
                throw new AuthenticationError(AUTH_ERROR_CODES.TOKEN_INVALID, 'Invalid token provided for company creation.');
            }
            throw new Error(`Failed to create company: An unknown error occurred`);
        }
    }
}
