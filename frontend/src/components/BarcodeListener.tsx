// BarcodeListener.tsx
import React, { useState, useEffect } from 'react';
import { BarcodeListenerProps } from '../utils/types';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  const [barcode, setBarcode] = useState('');

  useEffect(() => {
    if (disabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;

      if (key >= '0' && key <= '9') {
        setBarcode(prev => (prev + key).slice(-14));
      } else if (key === 'Enter' && barcode.length > 0) {
        onBarcodeScanned(barcode);
        setBarcode('');
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [barcode, onBarcodeScanned, disabled]);

  return null;
};

export default BarcodeListener;
