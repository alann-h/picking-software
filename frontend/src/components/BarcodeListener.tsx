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
      } else if (key === 'Enter' && (barcode.length === 13 || barcode.length === 14)) {
        const normalized = barcode.length === 13 ? '0' + barcode : barcode;
        onBarcodeScanned(normalized);
        setBarcode('');
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [barcode, onBarcodeScanned, disabled]);

  return null;
};

export default BarcodeListener;
