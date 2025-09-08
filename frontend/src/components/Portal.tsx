import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const portalRoot = document.querySelector("#portal-root");
    if (!portalRoot) {
      const newPortalRoot = document.createElement('div');
      newPortalRoot.id = 'portal-root';
      document.body.appendChild(newPortalRoot);
    }
    return () => setMounted(false);
  }, []);

  const portalRoot = document.querySelector("#portal-root");
  if (!mounted || !portalRoot) {
    return null;
  }

  return createPortal(children, portalRoot);
};

export default Portal;
