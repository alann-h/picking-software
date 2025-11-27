import React, { useEffect, useRef } from 'react';
import { BarcodeListenerProps } from '../utils/types';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  // Use a ref to maintain state without triggering re-renders or effect cleanup
  const barcodeBuffer = useRef<string>('');

  useEffect(() => {
    if (disabled) return;

    // 1. Handle Paste (Scanning often triggers paste on some devices)
    const handlePaste = (event: ClipboardEvent) => {
      const pastedData = event.clipboardData?.getData('text');
      if (pastedData) {
        // Clean and check if valid (allow alphanumeric to be safe, but primarily digits)
        const cleanData = pastedData.trim();
        if (cleanData.length > 0) {
          onBarcodeScanned(cleanData);
          barcodeBuffer.current = ''; // Reset buffer after paste
        }
      }
    };

    // 2. KeyPress is legacy but handles the Android "229" issue better than keydown
    const handleKeyPress = (event: KeyboardEvent) => {
      // On Android, keydown often gives 229. Keypress usually gives the real char code.
      // We will prefer keypress for characters, and keydown for special keys (Enter).
      
      const charCode = event.which || event.keyCode;
      const charStr = String.fromCharCode(charCode);
      
      // Accept alphanumeric characters (0-9, a-z, A-Z)
      // Using a broader regex to be safe for various barcode types
      if (/[a-zA-Z0-9]/.test(charStr)) {
        barcodeBuffer.current = (barcodeBuffer.current + charStr).slice(-50);
      }
    };

    // 3. KeyDown for Enter and modern browsers
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      
      if (key === 'Enter') {
        if (barcodeBuffer.current.length > 0) {
          onBarcodeScanned(barcodeBuffer.current);
          barcodeBuffer.current = '';
        }
      }
      // Note: We rely on keypress for character accumulation because on Android keydown
      // often returns 'Unidentified' (229) for virtual keyboards/scanners.
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('paste', handlePaste);
    };
  }, [onBarcodeScanned, disabled]);

  return null;
};

export default BarcodeListener;
