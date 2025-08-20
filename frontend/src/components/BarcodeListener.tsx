// BarcodeListener.tsx
import React, { useState, useEffect } from 'react';
import { BarcodeListenerProps } from '../utils/types';
import { useSnackbarContext } from './SnackbarContext';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  const [barcode, setBarcode] = useState('');
  const [isBarcodeMode, setIsBarcodeMode] = useState(true);
  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    // Automatically disable barcode mode when component is disabled (modals open, etc.)
    if (disabled) {
      setIsBarcodeMode(false);
      return;
    }

    // Re-enable barcode mode when component is enabled
    setIsBarcodeMode(true);

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

    // Toggle barcode mode with Ctrl+B (or Cmd+B on Mac) - for manual override
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setIsBarcodeMode(prev => !prev);
        const message = isBarcodeMode ? 'Barcode mode disabled - Normal keyboard input restored' : 'Barcode mode enabled - Ready to scan';
        handleOpenSnackbar(message, 'info');
        console.log(`Barcode mode: ${isBarcodeMode ? 'DISABLED' : 'ENABLED'}`);
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('keydown', handleKeyDown);
    
    // Log initial state
    console.log('Barcode mode: ENABLED (Press Ctrl+B to toggle)');
    
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [barcode, onBarcodeScanned, disabled, isBarcodeMode, handleOpenSnackbar]);

  return null;
};

export default BarcodeListener;
