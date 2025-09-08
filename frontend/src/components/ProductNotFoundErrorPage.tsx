import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { ApiErrorWrapper } from '../utils/types';

interface Props {
  errorData: ApiErrorWrapper;
}

const ProductNotFoundErrorPage: React.FC<Props> = ({ errorData }) => {
  const { message, productName } = errorData.data;

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="p-6">
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md shadow-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-red-800">
              Failed to Load Quote Content
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{message}</p>
              {productName && (
                <p className="mt-2">
                  <strong>Problematic Product:</strong> {productName}
                </p>
              )}
            </div>
            <p className="mt-4 text-xs text-red-800">
              Please ensure this product exists in the database and then refresh the page.
            </p>
            <div className="mt-5">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductNotFoundErrorPage;