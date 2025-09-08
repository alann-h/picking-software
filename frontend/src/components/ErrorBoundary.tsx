'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

import ProductNotFoundErrorPage from './ProductNotFoundErrorPage';
import { HttpError } from '../utils/apiHelpers';
import { ApiErrorWrapper } from '../utils/types';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | HttpError | null; 
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error | HttpError): State {
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  private handleGoBack = () => {
    window.history.back();
  };

  private getErrorMessage = (error: Error | HttpError): string => {
    if (error instanceof HttpError && error.response?.data) {
      const errorData = error.response.data;
      
      if (errorData.error && typeof errorData.error === 'object') {
        return errorData.error.message || errorData.error.toString();
      }
      
      if (errorData.message) {
        return errorData.message;
      }
      
      if (errorData.error && typeof errorData.error === 'string') {
        return errorData.error;
      }
      
      return error.message || 'An unexpected error occurred';
    }
    
    return error.message || 'An unexpected error occurred';
  };

  public render() {
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (error instanceof HttpError && error.response) {
        const status = error.response.status;
        const errorData = error.response.data as ApiErrorWrapper;

        if (status === 404 || status === 409) {
          return <ProductNotFoundErrorPage errorData={errorData} />;
        }
      }

      const errorMessage = this.getErrorMessage(error);

      return (
        <div className="text-center p-6 border-2 border-dashed border-red-400 rounded-lg bg-red-50">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-2" />
            <h2 className="text-xl font-semibold text-red-700">Something Went Wrong</h2>
            <p className="text-gray-600 mt-2 mb-4">
              {errorMessage}
            </p>
            {error instanceof HttpError && error.response && (
              <p className="text-xs text-gray-500 mb-4">
                Status: {error.response.status} | Code: {error.response.data?.error?.code || 'Unknown'}
              </p>
            )}
            <div className="mt-4 flex gap-4 justify-center">
              <button
                onClick={this.handleGoBack}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go Back
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reload Page
              </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;