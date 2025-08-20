// BarcodeListener.tsx
import React, { useState, useEffect } from 'react';
import { BarcodeListenerProps } from '../utils/types';
import { useSnackbarContext } from './SnackbarContext';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  const [barcode, setBarcode] = useState('');
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    if (disabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Only listen for barcode input when in barcode mode
      if (!isBarcodeMode) return;

      const { key } = event;

      if (key >= '0' && key <= '9') {
        setBarcode(prev => (prev + key).slice(-14));
      } else if (key === 'Enter' && barcode.length > 0) {
        onBarcodeScanned(barcode);
        setBarcode('');
        handleOpenSnackbar('Barcode scanned! Please confirm quantity.', 'info');
        // Auto-disable barcode mode after successful scan
        setIsBarcodeMode(false);
      }
    };

    // Toggle barcode mode with Ctrl+B (or Cmd+B on Mac)
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setIsBarcodeMode(prev => !prev);
        handleOpenSnackbar(
          isBarcodeMode ? 'Barcode mode disabled - Normal keyboard input restored' : 'Barcode mode enabled - Ready to scan',
          'info'
        );
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [barcode, onBarcodeScanned, disabled, isBarcodeMode, handleOpenSnackbar]);

  return null;
};

export default BarcodeListener;
