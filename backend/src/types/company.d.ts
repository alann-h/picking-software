import { ConnectionType } from './auth';

export interface Company {
    id: string;
    companyName: string;
    connectionType: ConnectionType;
    qboRealmId: string | null;
    xeroTenantId: string | null;
    qboTokenData: string | null;
    xeroTokenData: string | null;
    createdAt: Date;
    updatedAt: Date;
}
