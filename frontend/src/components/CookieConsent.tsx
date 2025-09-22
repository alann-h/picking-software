import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

interface CookieConsentProps {
  onAccept: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem('cookieConsent', 'acknowledged');
    setIsVisible(false);
    onAccept();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
        <div
          className="relative mx-auto max-w-6xl rounded-lg bg-gradient-to-br from-blue-800 to-blue-500 p-6 text-white shadow-2xl"
        >

          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
            <div className="flex shrink-0 items-center gap-3">
              <Info size={28} />
              <h6 className="text-lg font-bold md:text-xl">
                We use cookies
              </h6>
            </div>

            <div className="flex-1">
              <p className="text-sm leading-normal opacity-90">
                We use essential cookies to enhance your experience, provide personalized content, and analyze our traffic.
                By continuing to use our site, you acknowledge our use of cookies. {' '}
                <a 
                  href="/terms-of-service" 
                  className="text-white underline hover:opacity-80 cursor-pointer"
                >
                  Learn more about our cookie policy
                </a>
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-row sm:w-auto">
              <button
                type="button"
                onClick={handleAcknowledge}
                className="w-full rounded-md bg-white px-5 py-2 font-semibold text-blue-900 hover:bg-gray-100 sm:w-auto cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};

export default CookieConsent;