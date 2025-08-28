import { UserData } from '../../utils/types';

export interface ExtendedUserData extends UserData {
    access_level?: string;
}

export interface PermissionChangeConfirm {
    userId: string;
    field: string;
    value: any;
    user: ExtendedUserData;
}
