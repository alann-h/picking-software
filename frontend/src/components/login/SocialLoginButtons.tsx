import React from 'react';
// Replaced MUI ArrowForward with ArrowRight from Lucide
import { ArrowRight } from 'lucide-react';

interface SocialLoginButtonsProps {
  onQuickBooksLogin: () => void;
  onXeroLogin: () => void;
  isSubmitting: boolean;
}

/**
 * A component that provides branded login buttons for third-party services
 * like QuickBooks and Xero.
 */
const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onQuickBooksLogin,
  onXeroLogin,
  isSubmitting,
}) => {
  // Base classes for the social login buttons to reduce repetition
  const baseButtonClasses =
    'group inline-flex w-full items-center justify-between rounded-lg border px-4 py-3 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none';

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 flex-shrink text-xs font-medium text-gray-500">
          OR CONTINUE WITH
        </span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* QuickBooks Login Button */}
      <button
        type="button"
        onClick={onQuickBooksLogin}
        disabled={isSubmitting}
        className={`${baseButtonClasses} border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:-translate-y-px focus-visible:ring-emerald-500 cursor-pointer`}
      >
        <div className="flex items-center">
          <img
            src="/quickbooks-logo.svg"
            alt="QuickBooks"
            className="mr-3 h-6 w-6 object-contain"
          />
          Sign in with QuickBooks
        </div>
        <ArrowRight
          className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>

      {/* Xero Login Button */}
      <button
        type="button"
        onClick={onXeroLogin}
        disabled={isSubmitting}
        className={`${baseButtonClasses} border-sky-500 text-sky-600 hover:bg-sky-50 hover:-translate-y-px focus-visible:ring-sky-500 cursor-pointer`}
      >
        <div className="flex items-center">
          <img
            src="/xero-logo.svg"
            alt="Xero"
            className="mr-3 h-6 w-6 object-contain"
          />
          Sign in with Xero
        </div>
        <ArrowRight
          className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

export default SocialLoginButtons;
