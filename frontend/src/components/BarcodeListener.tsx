import React, { useEffect, useRef } from 'react';
import { BarcodeListenerProps } from '../utils/types';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferVals = useRef<string>("");
  const submitTimer = useRef<NodeJS.Timeout | null>(null);

  // Focus management
  useEffect(() => {
    if (disabled) return;

    const focusInput = () => {
      const activeElement = document.activeElement;
      const isInputActive = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      
      if (!isInputActive && inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    };

    focusInput();
    const interval = setInterval(focusInput, 500); // Aggressively check focus
    const handleClick = () => setTimeout(focusInput, 50);

    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [disabled]);

  const handleSubmit = (text: string) => {
    const cleanText = text.trim();
    if (cleanText.length > 1) { // Ignore single characters (stray keypresses)
      onBarcodeScanned(cleanText);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
      bufferVals.current = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    bufferVals.current = val;

    // Clear existing timer
    if (submitTimer.current) clearTimeout(submitTimer.current);

    // Set new timer: if no more input for 100ms, assume scan finished
    submitTimer.current = setTimeout(() => {
      handleSubmit(bufferVals.current);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (submitTimer.current) clearTimeout(submitTimer.current);
      handleSubmit(bufferVals.current || inputRef.current?.value || "");
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      // inputMode="none" prevents the virtual keyboard from appearing on mobile devices
      // while still allowing the input to receive focus and key events from hardware scanners.
      inputMode="none" 
      autoComplete="off"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        top: '-2000px',
        left: '-2000px',
        opacity: 0, 
        fontSize: '16px', // Prevents iOS zoom
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    />
  );
};

export default BarcodeListener;
