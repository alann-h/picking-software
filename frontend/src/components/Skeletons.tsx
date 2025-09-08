import React from 'react';

type SkeletonProps = {
  variant?: 'line' | 'box' | 'circle';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * A simple, reusable skeleton component built with Tailwind CSS.
 */
const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'line',
  className = '',
  ...props
}) => {
  const baseClass = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    line: 'rounded-md', // Good default for text
    box: 'rounded-lg', // Slightly larger rounding for containers
    circle: 'rounded-full',
  };

  const finalClasses = `${baseClass} ${variantClasses[variant]} ${className}`;

  return <div className={finalClasses} {...props} />;
};

// --- Login-Specific Skeletons ---

export const LoginFormSkeleton = () => (
  <div className="space-y-6">
    {/* Header lines */}
    <Skeleton variant="line" className="mx-auto h-10 w-3/5" />
    <Skeleton variant="line" className="mx-auto h-6 w-4/5" />

    {/* Email field */}
    <Skeleton variant="box" className="h-14 w-full" />

    {/* Password field */}
    <Skeleton variant="box" className="h-14 w-full" />

    {/* Forgot password link */}
    <div className="flex justify-end">
      <Skeleton variant="line" className="h-5 w-32" />
    </div>

    {/* Remember me checkbox */}
    <div className="flex items-center">
      <Skeleton variant="box" className="mr-2 h-5 w-5 rounded" />{' '}
      {/* Specific rounded square for checkbox */}
      <Skeleton variant="line" className="h-5 w-36" />
    </div>

    {/* Login button */}
    <Skeleton variant="box" className="h-12 w-full" />
  </div>
);

export const SocialLoginButtonsSkeleton = () => (
  <div className="space-y-4">
    {/* Divider */}
    <div className="my-6 flex items-center">
      <Skeleton variant="line" className="h-px flex-1" />
      <Skeleton variant="line" className="mx-4 h-5 w-32" />
      <Skeleton variant="line" className="h-px flex-1" />
    </div>

    {/* QuickBooks button */}
    <Skeleton variant="box" className="h-12 w-full" />

    {/* Xero button */}
    <Skeleton variant="box" className="h-12 w-full" />
  </div>
);

export const LoginPageSkeleton = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-800 via-blue-500 to-blue-400 px-2 py-4">
    <main className="w-full max-w-sm">
      <div className="w-full rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-lg sm:p-8 dark:bg-gray-900/90 dark:border-gray-700/30">
        {/* Header skeleton */}
        <div className="mb-8 text-center">
          <Skeleton variant="line" className="mx-auto mb-2 h-12 w-3/5" />
          <Skeleton variant="line" className="mx-auto h-6 w-4/5" />
        </div>

        {/* Form skeleton */}
        <LoginFormSkeleton />

        {/* Social buttons skeleton */}
        <SocialLoginButtonsSkeleton />
      </div>
    </main>
  </div>
);

// --- App/Dashboard Skeletons ---

export const UserSessionIndicatorSkeleton = () => (
  <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 dark:border-blue-700/30 dark:bg-blue-900/20">
    <div className="flex items-center gap-2">
      <Skeleton variant="circle" className="h-5 w-5" />
      <Skeleton variant="line" className="h-5 w-48" />
    </div>
    <Skeleton variant="line" className="h-5 w-24" />
  </div>
);

export const RunListSkeleton = () => (
  <div className="mt-4 space-y-4">
    {[...Array(3)].map((_, i) => (
      <Skeleton key={i} variant="box" className="h-32 w-full" />
    ))}
  </div>
);

export const CreateRunSkeleton = () => (
  <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 md:p-6">
    <Skeleton variant="line" className="h-10 w-2/5" />
    <div className="mt-2 grid grid-cols-12 gap-6">
      {/* Column 1 */}
      <div className="col-span-12 space-y-2 md:col-span-5">
        <Skeleton variant="line" className="h-8 w-3/5" />
        <Skeleton variant="box" className="h-14 w-full" />
      </div>
      {/* Column 2 */}
      <div className="col-span-12 space-y-2 md:col-span-7">
        <Skeleton variant="line" className="h-8 w-3/5" />
        <Skeleton variant="box" className="h-64 w-full" />
      </div>
    </div>
  </div>
);

const QuoteItemSkeleton = () => (
  <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
    <div className="flex-grow space-y-2">
      <Skeleton variant="line" className="h-6 w-[45%]" />
      <div className="flex space-x-4">
        <Skeleton variant="line" className="h-[22px] w-[60px] rounded-full" />
        <Skeleton variant="line" className="h-5 w-20" />
      </div>
    </div>
    <Skeleton variant="circle" className="ml-2 h-8 w-8" />
  </div>
);

export const AvailableQuotesSkeleton = () => (
  <div className="flex-grow overflow-y-hidden rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
    {[...Array(3)].map((_, i) => (
      <QuoteItemSkeleton key={i} />
    ))}
  </div>
);

export const UserTableSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {[...Array(6)].map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <Skeleton variant="line" className="h-5 w-4/5" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
        {[...Array(3)].map((_, rowIndex) => (
          <tr key={rowIndex}>
            {[...Array(6)].map((_, cellIndex) => (
              <td key={cellIndex} className="whitespace-nowrap px-4 py-4">
                <Skeleton variant="line" className="h-5 w-full" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const QuoteSkeletonRow = () => (
  <tr>
    <td className="px-4 py-4">
      <Skeleton />
    </td>
    <td className="px-4 py-4">
      <Skeleton />
    </td>
    <td className="px-4 py-4">
      <Skeleton />
    </td>
    <td className="px-4 py-4">
      <Skeleton />
    </td>
    <td className="px-4 py-4">
      <Skeleton variant="circle" className="h-10 w-10" />
    </td>
  </tr>
);

export const QuoteSkeleton = () => {
  return (
    <div className="m-2 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-900 sm:m-4 sm:p-4 md:p-6">
      {/* Header */}
      <Skeleton variant="line" className="mb-4 h-12 w-2/5" />

      {/* Quote Info Bar */}
      <div className="mb-6 flex flex-col justify-between space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
        <Skeleton variant="line" className="h-8 w-full sm:w-1/3" />
        <Skeleton variant="line" className="h-8 w-full sm:w-1/4" />
        <Skeleton variant="line" className="h-8 w-full sm:w-1/5" />
      </div>

      {/* Action Buttons & Filters */}
      <Skeleton variant="box" className="mb-4 h-32 w-full" />

      {/* Product Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3">
                <Skeleton className="h-5 w-3/5" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-5 w-4/5" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-5 w-2/5" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-5 w-1/2" />
              </th>
              <th className="px-4 py-3">
                <Skeleton className="h-5 w-1/3" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            <QuoteSkeletonRow />
            <QuoteSkeletonRow />
            <QuoteSkeletonRow />
            <QuoteSkeletonRow />
          </tbody>
        </table>
      </div>

      {/* Notes & Final Action */}
      <Skeleton variant="box" className="mt-8 h-40 w-full" />
      <div className="mt-4 flex justify-end">
        <Skeleton variant="box" className="h-12 w-44" />
      </div>
    </div>
  );
};

export const OrderHistorySkeleton = () => {
  return (
    <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-full rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="p-6">
            <Skeleton variant="line" className="mb-4 h-8 w-3/5" />
            <div className="space-y-4">
              <Skeleton variant="line" className="h-6 w-4/5" />
              <Skeleton variant="line" className="h-6 w-3/5" />
              <Skeleton variant="line" className="h-6 w-[70%]" />
              <Skeleton variant="line" className="h-6 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};