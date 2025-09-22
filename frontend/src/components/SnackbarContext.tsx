import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { SnackbarContextType, SnackbarSeverity } from '../utils/types';
import { extractErrorMessage } from '../utils/apiHelpers';

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<SnackbarSeverity>('info');

  const handleOpenSnackbar = useCallback((message: string | object, severity: SnackbarSeverity) => {
    // Use extractErrorMessage to properly handle error objects
    const messageString = typeof message === 'string' 
      ? message 
      : extractErrorMessage(message, 'An error occurred');
    
    setSnackbarMessage(messageString);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setOpenSnackbar(false);
  }, []);

  const value = useMemo(() => ({
    openSnackbar,
    snackbarMessage,
    snackbarSeverity,
    handleOpenSnackbar,
    handleCloseSnackbar
  }), [openSnackbar, snackbarMessage, snackbarSeverity, handleOpenSnackbar, handleCloseSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbarContext = () => {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error('useSnackbarContext must be used within a SnackbarProvider');
  }
  return context;
};