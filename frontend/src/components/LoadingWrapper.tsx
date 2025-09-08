import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  height?: string | number;
  fallback?: React.ReactNode;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  children,
  height = '100vh',
  fallback,
}) => {
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }
  return <>{children}</>;
};

export default LoadingWrapper;
