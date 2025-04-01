import React, { useState, useEffect } from 'react';
import { BarcodeListenerProps } from '../utils/types';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned }) => {
  const [barcode, setBarcode] = useState<string>('');

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;

      if (key >= '0' && key <= '9') {
        setBarcode((prevBarcode) => (prevBarcode + key).slice(-14)); // Allow 14 digits
      } else if (key === 'Enter' && (barcode.length === 13 || barcode.length === 14)) {
        const normalizedBarcode = barcode.length === 13 ? '0' + barcode : barcode;
        onBarcodeScanned(normalizedBarcode);
        setBarcode('');
      }
    };

    document.addEventListener('keypress', handleKeyPress);

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
    };
  }, [barcode, onBarcodeScanned]);

  return null;
};

export default BarcodeListener;
