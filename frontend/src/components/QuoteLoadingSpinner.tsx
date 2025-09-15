import React from 'react';
import { FileText, Loader2 } from 'lucide-react';

const QuoteLoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 sm:p-12 shadow-2xl ring-1 ring-black ring-opacity-5">
        <FileText className="h-16 w-16 text-blue-500 opacity-80" />
        <Loader2 className="h-20 w-20 animate-spin text-blue-600" />
        <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">
                Preparing Quote
            </h2>
            <p className="mt-2 max-w-xs text-gray-600">
                Loading product catalog and pricing information...
            </p>
        </div>
      </div>
    </div>
  );
};

export default QuoteLoadingSpinner;
