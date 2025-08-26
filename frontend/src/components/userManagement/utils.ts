import { ExtendedUserData } from './types';

// Security and permission utilities
export const canEditUser = (targetUser: ExtendedUserData, currentUser: ExtendedUserData | null): boolean => {
    if (!currentUser) return false;
    if (!currentUser.is_admin) return false;
    if (targetUser.id === currentUser.id) return false; // Can't edit yourself
    return true;
};

export const canDeleteUser = (targetUser: ExtendedUserData, currentUser: ExtendedUserData | null): boolean => {
    if (!currentUser) return false;
    if (!currentUser.is_admin) return false;
    if (targetUser.id === currentUser.id) return false; // Can't delete yourself
    return true;
};

export const canChangePermissions = (targetUser: ExtendedUserData, currentUser: ExtendedUserData | null): boolean => {
    if (!currentUser) return false;
    if (!currentUser.is_admin) return false;
    if (targetUser.id === currentUser.id) return false; // Can't change own permissions
    return true;
};
