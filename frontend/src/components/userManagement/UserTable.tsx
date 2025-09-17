import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { ExtendedUserData } from './types';
import { canEditUser, canDeleteUser, canChangePermissions } from './utils';

interface UserTableProps {
    userList: ExtendedUserData[];
    currentUser: ExtendedUserData | null;
    isLoading: boolean;
    updatePermissionsMutation: any;
    onEditUser: (user: ExtendedUserData) => void;
    onDeleteUser: (user: ExtendedUserData) => void;
    onPermissionUpdate: (userId: string, field: string, value: any) => void;
}

const UserTable: React.FC<UserTableProps> = ({
    userList,
    currentUser,
    isLoading,
    updatePermissionsMutation,
    onEditUser,
    onDeleteUser,
    onPermissionUpdate,
}) => {
    if (isLoading) {
        return (
            <tr>
                <td colSpan={7} className="text-center py-8">
                    <p className="text-gray-500">Loading users...</p>
                </td>
            </tr>
        );
    }

    if (userList.length === 0) {
        return (
            <tr>
                <td colSpan={7} className="text-center py-8">
                    <p className="text-gray-500">No users found</p>
                </td>
            </tr>
        );
    }

    return (
        <>
            {userList.map((user: ExtendedUserData) => {
                const canEdit = canEditUser(user, currentUser);
                const canDelete = canDeleteUser(user, currentUser);
                const canChangePerms = canChangePermissions(user, currentUser);
                
                return (
                    <tr key={user.id} className="hover:bg-gray-50">
                        {/* User Information */}
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                                <p className="text-sm font-medium text-gray-900">{user.display_email}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-500">{user.given_name} {user.family_name}</p>
                                    {user.id === currentUser?.id && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            You
                                        </span>
                                    )}
                                </div>
                            </div>
                        </td>

                        {/* Admin Status */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                                type="checkbox"
                                checked={user.is_admin || false}
                                onChange={(e) => onPermissionUpdate(user.id, 'is_admin', e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                disabled={!canChangePerms || updatePermissionsMutation.isPending}
                            />
                        </td>

                        {/* Access Level */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <select
                                value={user.access_level || 'read'}
                                onChange={(e) => onPermissionUpdate(user.id, 'access_level', e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:opacity-50 cursor-pointer"
                                disabled={!canChangePerms || updatePermissionsMutation.isPending}
                            >
                                <option value="read">Read</option>
                                <option value="write">Write</option>
                                <option value="admin">Admin</option>
                            </select>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center items-center gap-2">
                                {canEdit && (
                                    <button
                                        onClick={() => onEditUser(user)}
                                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        aria-label="Edit user"
                                    >
                                        <Edit className="h-5 w-5" />
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        onClick={() => onDeleteUser(user)}
                                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        aria-label="Delete user"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                                {!canEdit && !canDelete && (
                                    <p className="text-xs text-gray-500">No actions</p>
                                )}
                            </div>
                        </td>
                    </tr>
                );
            })}
        </>
    );
};

export default UserTable;