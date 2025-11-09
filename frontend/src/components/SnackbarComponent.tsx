import React, { Fragment, useEffect, useState } from 'react';
// Assuming the context provider exists at this path
import { useSnackbarContext } from './SnackbarContext'; 
// Replaced MUI icons with Lucide-React for a modern look
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * A map of severity levels to their corresponding styles and icons.
 */
const severityStyles = {
  success: {
    Icon: CheckCircle,
    containerClasses: 'bg-green-50 border-green-400',
    iconClasses: 'text-green-500',
    textClasses: 'text-green-800',
    buttonClasses: 'text-green-500 hover:bg-green-100 focus:ring-green-600 focus:ring-offset-green-50',
  },
  error: {
    Icon: AlertCircle,
    containerClasses: 'bg-red-50 border-red-400',
    iconClasses: 'text-red-500',
    textClasses: 'text-red-800',
    buttonClasses: 'text-red-500 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50',
  },
  warning: {
    Icon: AlertTriangle,
    containerClasses: 'bg-yellow-50 border-yellow-400',
    iconClasses: 'text-yellow-500',
    textClasses: 'text-yellow-800',
    buttonClasses: 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600 focus:ring-offset-yellow-50',
  },
  info: {
    Icon: Info,
    containerClasses: 'bg-blue-50 border-blue-400',
    iconClasses: 'text-blue-500',
    textClasses: 'text-blue-800',
    buttonClasses: 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600 focus:ring-offset-blue-50',
  },
};

/**
 * A toast/snackbar notification component that displays messages from a context.
 */
const SnackbarComponent: React.FC = () => {
  const { openSnackbar, handleCloseSnackbar, snackbarMessage, snackbarSeverity } = useSnackbarContext();
  const [isVisible, setIsVisible] = useState(false);

  // Fallback to 'info' if an unknown severity is provided
  const currentStyle = severityStyles[snackbarSeverity] || severityStyles.info;

  useEffect(() => {
    if (openSnackbar) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [openSnackbar]);

  useEffect(() => {
    // Only auto-hide for non-critical messages
    if (openSnackbar && (snackbarSeverity === 'success' || snackbarSeverity === 'info')) {
      const timer = setTimeout(() => {
        handleCloseSnackbar();
      }, 6000); // 6-second timer

      // Clear the timer if the component unmounts or the snackbar is closed manually
      return () => {
        clearTimeout(timer);
      };
    }
  }, [openSnackbar, snackbarSeverity, handleCloseSnackbar]);

  return (
    // Positioning container for the snackbar
    <div className="pointer-events-none fixed bottom-0 left-0 z-50 w-full p-4 sm:w-auto sm:p-6">
      {isVisible && (
        <div
          className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border p-4 shadow-lg transform ease-out duration-300 transition translate-y-0 opacity-100 sm:translate-x-0 ${currentStyle.containerClasses}`}
        >
          {/* Icon */}
          <currentStyle.Icon
            className={`h-6 w-6 flex-shrink-0 ${currentStyle.iconClasses}`}
            aria-hidden="true"
          />
          {/* Message */}
          <div className="flex-1">
            <p className={`text-sm font-medium whitespace-pre-line ${currentStyle.textClasses}`}>
              {snackbarMessage}
            </p>
          </div>
          {/* Close Button */}
          <div className="flex flex-shrink-0">
            <button
              type="button"
              onClick={handleCloseSnackbar}
              className={`-m-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentStyle.buttonClasses} cursor-pointer`}
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnackbarComponent;