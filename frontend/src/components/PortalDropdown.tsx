import React, { useState, useCallback, useLayoutEffect, useEffect } from 'react';
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
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

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

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    } else {
      setPosition(null);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      
      const dropdownElements = document.querySelectorAll('[data-portal-dropdown]');
      let clickedInside = false;
      dropdownElements.forEach((el) => {
        if (el.contains(target)) clickedInside = true;
      });

      if (!clickedInside) {
        setIsDropdownOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) updatePosition();
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
  }, [isOpen, updatePosition, setIsDropdownOpen, triggerRef]);

  if (!isOpen || !position) return null;

  const dropdownClassName = maxHeight 
    ? className.replace('max-h-60', maxHeight)
    : className;

  return createPortal(
    <div
      data-portal-dropdown
      className={`absolute z-[110] ${dropdownClassName}`}
      style={{
        top: position.top,
        left: position.left,
        width: className.includes('!w-auto') ? 'auto' : position.width,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default PortalDropdown;