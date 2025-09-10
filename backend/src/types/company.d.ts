import { ConnectionType } from './auth';

export interface Company {
    id: string;
    company_name: string;
    connection_type: ConnectionType;
    qbo_realm_id: string | null;
    xero_tenant_id: string | null;
    qbo_token_data: string | null;
    xero_token_data: string | null;
    created_at: Date;
    updated_at: Date;
}
