import React, { lazy } from 'react';
import { Users, ShieldCheck } from 'lucide-react';

const UserManagement = lazy(() => import('../UsersManagment'));

const UsersTab: React.FC = () => {

  return (
    <div>
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            User Management
          </h2>
          <p className="text-gray-500">
            Manage user accounts, permissions, and access control for your organization.
          </p>
        </div>

        {/* Info Card */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  User Access Control
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Manage who has access to your Smart Picker system and what they can do.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Add new users
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Set admin privileges
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management Component */}
        <div>
          <div className="max-w-full">
            <UserManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersTab;