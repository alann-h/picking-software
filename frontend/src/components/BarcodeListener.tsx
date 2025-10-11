// BarcodeListener.tsx
import React, { useState, useEffect } from 'react';
import { BarcodeListenerProps } from '../utils/types';
import { useSnackbarContext } from './SnackbarContext';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  const [barcode, setBarcode] = useState('');
  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    if (disabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;

      if (key >= '0' && key <= '9') {
        setBarcode(prev => (prev + key).slice(-30));
      } else if (key === 'Enter' && barcode.length > 0) {
        onBarcodeScanned(barcode);
        setBarcode('');
        handleOpenSnackbar('Barcode scanned! Please confirm quantity.', 'info');
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [barcode, onBarcodeScanned, disabled, handleOpenSnackbar]);

  return null;
};

export default BarcodeListener;
