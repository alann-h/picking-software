import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SnackbarContextType {
  openSnackbar: boolean;
  snackbarMessage: string;
  snackbarSeverity: 'error' | 'success';
  handleOpenSnackbar: (message: string, severity: 'error' | 'success') => void;
  handleCloseSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'success'>('error');

  const handleOpenSnackbar = (message: string, severity: 'error' | 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <SnackbarContext.Provider value={{ openSnackbar, snackbarMessage, snackbarSeverity, handleOpenSnackbar, handleCloseSnackbar }}>
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
