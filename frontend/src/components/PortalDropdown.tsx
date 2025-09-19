import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface PortalDropdownProps {
  children: React.ReactNode;
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  setIsDropdownOpen: (open: boolean) => void;
  className?: string;
  maxHeight?: string;
}

const PortalDropdown: React.FC<PortalDropdownProps> = ({ 
  children, 
  isOpen, 
  triggerRef, 
  setIsDropdownOpen,
  className = "max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm",
  maxHeight
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [triggerRef]);

  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is within the trigger
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      
      // Check if click is within the dropdown itself
      const dropdownElement = document.querySelector('[data-portal-dropdown]');
      if (dropdownElement && dropdownElement.contains(target)) {
        return;
      }
      
      // If click is outside both trigger and dropdown, close the dropdown
      setIsDropdownOpen(false);
    };

    const handleScroll = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition, setIsDropdownOpen]);

  if (!isOpen) return null;

  const dropdownClassName = maxHeight 
    ? className.replace('max-h-60', maxHeight)
    : className;

  return createPortal(
    <div
      data-portal-dropdown
      className={`absolute z-50 ${dropdownClassName}`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default PortalDropdown;
