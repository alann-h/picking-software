import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { SnackbarContextType } from '../utils/types';

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'success'>('error');

  const handleOpenSnackbar = useCallback((message: string, severity: 'error' | 'success') => {
    setSnackbarMessage(message);
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