import React from 'react';
import { Edit, Trash2, User, Shield } from 'lucide-react';
import { ExtendedUserData } from './types';
import { canEditUser, canDeleteUser, canChangePermissions } from './utils';
import clsx from 'clsx';

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
                <td colSpan={3} className="text-center py-8">
                    <p className="text-gray-500">Loading users...</p>
                </td>
            </tr>
        );
    }

    if (userList.length === 0) {
        return (
            <tr>
                <td colSpan={3} className="text-center py-8">
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

                        {/* Access Level */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <select
                                value={user.access_level || 'read'}
                                onChange={(e) => onPermissionUpdate(user.id, 'access_level', e.target.value)}
                                className="inline-block pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md disabled:opacity-50 cursor-pointer"
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

// New Mobile Card Component
export const UserCardList: React.FC<UserTableProps> = ({
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
            <div className="text-center py-8">
                <p className="text-gray-500">Loading users...</p>
            </div>
        );
    }

    if (userList.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">No users found</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {userList.map((user: ExtendedUserData) => {
                const canEdit = canEditUser(user, currentUser);
                const canDelete = canDeleteUser(user, currentUser);
                const canChangePerms = canChangePermissions(user, currentUser);
                
                return (
                    <div
                        key={user.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                        {/* Header with user info and badge */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                    user.access_level === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                                )}>
                                    {user.access_level === 'admin' ? (
                                        <Shield className={clsx("h-5 w-5", "text-purple-600")} />
                                    ) : (
                                        <User className={clsx("h-5 w-5", "text-blue-600")} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 truncate">
                                        {user.display_email}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {user.given_name} {user.family_name}
                                    </p>
                                </div>
                            </div>
                            {user.id === currentUser?.id && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 flex-shrink-0">
                                    You
                                </span>
                            )}
                        </div>

                        {/* Access Level Selector */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                                Access Level
                            </label>
                            <select
                                value={user.access_level || 'read'}
                                onChange={(e) => onPermissionUpdate(user.id, 'access_level', e.target.value)}
                                className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md disabled:opacity-50 cursor-pointer"
                                disabled={!canChangePerms || updatePermissionsMutation.isPending}
                            >
                                <option value="read">Read</option>
                                <option value="write">Write</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end items-center gap-2 pt-3 border-t border-gray-100">
                            {canEdit && (
                                <button
                                    onClick={() => onEditUser(user)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
                                    aria-label="Edit user"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={() => onDeleteUser(user)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer transition-colors"
                                    aria-label="Delete user"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            )}
                            {!canEdit && !canDelete && (
                                <p className="text-xs text-gray-500 py-2">No actions available</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default UserTable;