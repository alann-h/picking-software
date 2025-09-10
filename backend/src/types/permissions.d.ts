export type AccessLevel = 'read' | 'write' | 'admin';

export interface UserPermission {
    id: string; 
    user_id: string;
    company_id: string;
    access_level: AccessLevel;
    created_at: Date;
    updated_at: Date;
}

export interface UserPermissionWithAdmin extends UserPermission {
    is_admin: boolean;
}

export interface CheckPermissionResult {
    hasAccess: boolean;
    level: AccessLevel | 'none';
    isAdmin: boolean;
}

export interface GrantPermissionArgs {
    accessLevel?: AccessLevel;
}

export interface CompanyUserPermission {
    id: string; 
    display_email: string;
    given_name: string | null;
    family_name: string | null;
    is_admin: boolean;
    access_level: AccessLevel | null;
    permission_created_at: Date | null;
}
