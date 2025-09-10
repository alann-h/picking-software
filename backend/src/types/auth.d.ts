import { QboToken, XeroToken } from './token';
import { User } from './user'; 

export type ConnectionType = 'qbo' | 'xero';

export interface UserFromDB extends User {
    id: string;
    company_id: string;
    given_name: string;
    family_name: string | null;
    display_email: string;
    normalised_email: string;
    password_hash: string;
    is_admin: boolean;
    failed_attempts: number;
    last_failed_attempt: Date | null;
    locked_until: Date | null;
    password_reset_token: string | null;
    password_reset_expires: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface CompanyFromDB {
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

export interface LoginUser extends UserFromDB {
    token?: QboToken | XeroToken;
    connectionType: ConnectionType;
    reAuthRequired?: boolean;
}

export interface UpdateUserPayload {
    display_email?: string;
    password?: string;
    given_name?: string;
    family_name?: string;
    is_admin?: boolean;
}

export interface OAuthUserInfo {
    email: string;
    givenName: string;
    familyName: string;
}

export interface UserForFrontend {
    id: string;
    display_email: string;
    normalised_email: string;
    given_name: string;
    family_name: string | null;
    is_admin: boolean;
    company_id: string;
}
