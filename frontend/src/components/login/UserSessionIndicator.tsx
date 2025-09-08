import React from 'react';
import { User } from 'lucide-react';

interface UserSessionIndicatorProps {
  currentUser: { email: string; name?: string };
  onSwitchAccount: () => void;
}

/**
 * A banner component that displays the currently logged-in user
 * and provides a button to switch accounts.
 */
const UserSessionIndicator: React.FC<UserSessionIndicatorProps> = ({
  currentUser,
  onSwitchAccount,
}) => {
  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4"
      role="alert"
    >
      {/* Left side: Icon and Welcome Text */}
      <div className="flex items-center gap-2">
        <User
          className="h-5 w-5 flex-shrink-0 text-blue-600"
          aria-hidden="true"
        />
        {/* Replaced Typography with a p tag, and improved logic to show name or email */}
        <p className="text-sm text-gray-700">
          Welcome back,{' '}
          <strong className="font-medium">
            {currentUser.name || currentUser.email}
          </strong>
        </p>
      </div>

      {/* Right side: Switch Account Button */}
      <button
        type="button"
        onClick={onSwitchAccount}
        className="flex-shrink-0 rounded text-sm font-medium text-blue-600 normal-case transition-colors hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
      >
        Switch Account
      </button>
    </div>
  );
};

export default UserSessionIndicator;