import React, { useState, useEffect } from 'react';

interface BarcodeListenerProps {
  onBarcodeScanned: (barcode: string) => void;
}

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned }) => {
  const [barcode, setBarcode] = useState<string>('');

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;

      if (key >= '0' && key <= '9') {
        setBarcode((prevBarcode) => (prevBarcode + key).slice(-13));
      } else if (key === 'Enter' && barcode.length === 13) {
        onBarcodeScanned(barcode);
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
