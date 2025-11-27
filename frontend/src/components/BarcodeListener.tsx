import React, { useEffect, useRef } from 'react';
import { BarcodeListenerProps } from '../utils/types';

const BarcodeListener: React.FC<BarcodeListenerProps> = ({ onBarcodeScanned, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the hidden input whenever possible
  useEffect(() => {
    if (disabled) return;

    const focusInput = () => {
      // Only focus if no other input is active
      const activeElement = document.activeElement;
      const isInputActive = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      
      if (!isInputActive && inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    };

    // Initial focus
    focusInput();

    // Refocus on click/touch if we lost it (and user isn't clicking another input)
    const handleClick = () => setTimeout(focusInput, 100);
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [disabled]);

  const handleChange = (_e: React.ChangeEvent<HTMLInputElement>) => {
    // We just let the value accumulate in the input
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = inputRef.current?.value.trim();
      if (value) {
        onBarcodeScanned(value);
        if (inputRef.current) inputRef.current.value = '';
      }
    }
  };

  // Handle case where scanner sends Enter as a separate event but value is already in
  // or if it doesn't send Enter but fires a specific event.
  // Usually 'Enter' keydown is enough.

  // Force focus style to be invisible but technically "visible" to DOM so it receives events
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="none" // Prevents virtual keyboard from popping up on mobile
      autoComplete="off"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        top: '-1000px',
        left: '-1000px',
        opacity: 0,
        width: '1px',
        height: '1px',
        pointerEvents: 'none',
        zIndex: -1
      }}
      aria-hidden="true"
    />
  );
};

export default BarcodeListener;
