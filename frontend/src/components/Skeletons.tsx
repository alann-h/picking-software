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
  const baseClass = 'animate-pulse bg-gray-200';

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
  <div className="flex min-h-screen bg-white">
    {/* 1. Brand Panel Skeleton */}
    <div className="relative hidden w-0 flex-1 flex-col justify-end bg-blue-900 p-12 text-white md:flex lg:w-1/2">
      <div className="relative z-10">
        <Skeleton variant="box" className="h-16 w-16 bg-blue-700" />
        <Skeleton variant="line" className="mt-4 h-8 w-full bg-gray-200" />
        <Skeleton variant="line" className="mt-2 h-8 w-full bg-gray-200" />
        <Skeleton variant="line" className="mt-2 h-8 w-3/4 bg-gray-200" />
        <Skeleton variant="line" className="mt-6 h-6 w-1/2 bg-blue-200" />
      </div>
    </div>

    {/* 2. Form Panel Skeleton */}
    <div className="flex w-full flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24">
      <main className="mx-auto w-full max-w-sm lg:w-96">
        {/* Mobile Logo Skeleton */}
        <div className="md:hidden">
          <div className="flex items-center gap-2">
            <Skeleton variant="box" className="h-10 w-10" />
            <Skeleton variant="line" className="h-8 w-40" />
          </div>
        </div>

        <div className="mt-8">
          <UserSessionIndicatorSkeleton />

          {/* Header Text Skeleton */}
          <div className="mb-8">
            <Skeleton variant="line" className="h-10 w-3/4" />
            <Skeleton variant="line" className="mt-2 h-6 w-full" />
          </div>

          <LoginFormSkeleton />
          <SocialLoginButtonsSkeleton />
        </div>
      </main>
    </div>
  </div>
);

// --- App/Dashboard Skeletons ---

export const UserSessionIndicatorSkeleton = () => (
  <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
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
  <div className="rounded-lg border border-gray-200 p-4 md:p-6">
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
  <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 p-3">
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
  <div className="flex-grow overflow-y-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
    {[...Array(3)].map((_, i) => (
      <QuoteItemSkeleton key={i} />
    ))}
  </div>
);

export const UserTableSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {[...Array(6)].map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <Skeleton variant="line" className="h-5 w-4/5" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
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
    <div className="m-2 rounded-lg bg-white p-2 shadow-lg sm:m-4 sm:p-4 md:p-6">
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
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
          <tbody className="divide-y divide-gray-200">
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
          className="h-full rounded-lg border border-gray-200 bg-white"
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