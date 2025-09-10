import { ConnectionType } from './auth.js';
import { IntuitOAuthClient } from './authSystem.js';
import { XeroClient } from 'xero-node';

export interface QboToken {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    realmId: string;
    created_at: number;
}

export interface XeroToken {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    tenant_id: string;
    created_at: number;
}

export type TokenData = QboToken | XeroToken;

export type OauthClient = IntuitOAuthClient | XeroClient;

export interface ConnectionHandler {
    fields: string[];
    tokenField: 'qboTokenData' | 'xeroTokenData';
    validate: (token: any) => boolean;
    refresh: (token: any) => Promise<any>;
    initClient: () => OauthClient;
    setClientToken: (client: any, token: any) => void;
}

export interface CompanyTokenDataFromDB {
    qboTokenData?: string | null;
    xeroTokenData?: string | null;
    connectionType: ConnectionType;
    qboRealmId?: string | null;
    xeroTenantId?: string | null;
}

export type TokenStatus = 'VALID' | 'EXPIRED' | 'NO_TOKEN' | 'ERROR';

export interface TokenStatusResult {
    status: TokenStatus;
    message: string;
    connectionType?: ConnectionType;
    realmId?: string;
}

export interface CompanyConnection {
    type: ConnectionType;
    realmId?: string;
    tenantId?: string;
    status: TokenStatusResult;
}
