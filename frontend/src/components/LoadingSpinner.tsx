import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'large',
}) => {
  const sizeMap = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/50 bg-black/30 transition-opacity" />
      <div className="relative z-[1001] flex flex-col items-center justify-center gap-4">
        <Loader2 className={`animate-spin text-white ${sizeMap[size]}`} />
        <p className="text-lg font-medium tracking-wide text-slate-100">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;