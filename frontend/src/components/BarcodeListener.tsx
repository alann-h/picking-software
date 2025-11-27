import React, { useEffect, useRef } from 'react';
import { BarcodeListenerProps } from '../utils/types';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  // Use a ref to maintain state without triggering re-renders or effect cleanup
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {     
      const { key } = event;
      const currentTime = Date.now();

      // Optional: Reset buffer if too much time passed (e.g. > 100ms between keys implies manual typing vs scanner)
      // Scanners usually send keys with < 20-50ms interval.
      // We'll just keep it simple for now but track time if we need to filter later.
      
      if (key === 'Enter') {
        if (barcodeBuffer.current.length > 0) {
          onBarcodeScanned(barcodeBuffer.current);
          barcodeBuffer.current = '';
        }
      } else if (key.length === 1 && key >= '0' && key <= '9') {
        // Accumulate numbers 0-9
        barcodeBuffer.current = (barcodeBuffer.current + key).slice(-30);
      }
      
      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBarcodeScanned, disabled]);

  return null;
};

export default BarcodeListener;
