import { TokenSet } from 'xero-node';
import { QboTokenData, XeroTokenData, OAuthUserInfo, QboUserInfo } from './auth';
import { QboToken } from './token';

export interface IntuitOAuthClientConfig {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
}

export interface AuthorizeUriConfig {
    scope: string[];
    state: string;
}

export interface IntuitAuthResponse {
    getToken: () => QboToken;
}

export interface IntuitUserInfoResponse {
    json: QboUserInfo;
}

export interface IntuitMakeApiCallConfig {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: QboMakeApiCallConfig;
}

export interface IntuitOAuthClient {
    new(config: IntuitOAuthClientConfig): IntuitOAuthClient;
    authorizeUri(config: AuthorizeUriConfig): string;
    createToken(url: string): Promise<IntuitAuthResponse>;
    refreshUsingToken(refreshToken: string): Promise<IntuitAuthResponse>;
    setToken(token: QboToken): void;
    token: {
        isRefreshTokenValid: () => boolean;
    };
    getToken: () => QboToken;
    revoke(): Promise<void>;
    getUserInfo(): Promise<IntuitUserInfoResponse>;
    makeApiCall(config: IntuitMakeApiCallConfig): Promise<{ json: any }>;
    environment: 'sandbox' | 'production';
    static environment: {
        production: 'production';
        sandbox: 'sandbox';
    };
    
}

export interface XeroTokenSet extends TokenSet {
    tenant_id?: string;
}

export interface QBOCompanyInfo {
    companyName: string;
    realmId: string;
}

export interface XeroCompanyInfo {
    companyName: string;
    tenantId: string;
}
