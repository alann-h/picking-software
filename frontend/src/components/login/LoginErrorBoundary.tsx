import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
// Lucide icons replacing MUI icons
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

interface LoginErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface LoginErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LoginErrorBoundary extends Component<
  LoginErrorBoundaryProps,
  LoginErrorBoundaryState
> {
  public state: LoginErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): LoginErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Login ErrorBoundary caught an error:', error, errorInfo);

    if (import.meta.env.PROD) {
      // TODO: Send to error reporting service (e.g., Sentry, LogRocket)
      console.log('Error logged to reporting service:', error.message);
    }
  }

  /**
   * Resets the error state. If an onRetry prop is provided (like resetting a form state),
   * it will be called.
   */
  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  /**
   * Forces a full browser reload, which can solve critical script loading errors.
   */
  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Render the fallback error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-800 via-blue-500 to-blue-400 px-2 py-4 dark:from-blue-900 dark:via-blue-800 dark:to-blue-600">
          <main className="w-full max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-full rounded-2xl border border-white/20 bg-white/95 p-6 text-center shadow-2xl backdrop-blur-lg sm:p-8 dark:border-gray-700/30 dark:bg-gray-900/90">
                <div className="flex flex-col items-center space-y-6">
                  {/* Error Icon */}
                  <AlertTriangle className="h-16 w-16 text-red-600 opacity-80 dark:text-red-500" />

                  {/* Header Text */}
                  <div>
                    <h1 className="mb-2 bg-gradient-to-r from-blue-800 to-blue-500 bg-clip-text text-3xl font-bold text-transparent dark:from-blue-500 dark:to-blue-400">
                      Login Error
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Something went wrong loading the login page.
                    </p>
                  </div>

                  {/* Error Message Box */}
                  <div className="w-full rounded-lg border border-red-600 bg-red-100 p-4 text-left dark:border-red-500 dark:bg-red-950/50">
                    <p className="font-mono text-sm text-red-800 dark:text-red-300">
                      {this.state.error?.message ||
                        'An unexpected error occurred'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex w-full flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
                    <button
                      type="button"
                      onClick={this.handleRetry}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-2.5 font-semibold text-white shadow-sm transition-all hover:from-blue-600 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:ring-offset-gray-900"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={this.handleReload}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-600 px-4 py-2.5 font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:border-blue-500 dark:text-blue-400 dark:ring-offset-gray-900 dark:hover:bg-blue-900/30"
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      Reload Page
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If this problem persists, please contact support.
                  </p>
                </div>
              </div>
            </motion.div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LoginErrorBoundary;