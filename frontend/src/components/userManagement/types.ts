import { UserData } from '../../utils/types';

export interface ExtendedUserData extends UserData {
    can_access_qbo?: boolean;
    can_access_xero?: boolean;
    can_refresh_tokens?: boolean;
    access_level?: string;
}

export interface PermissionChangeConfirm {
    userId: string;
    field: string;
    value: any;
    user: ExtendedUserData;
}
