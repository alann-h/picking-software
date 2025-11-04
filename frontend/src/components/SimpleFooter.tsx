import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const SimpleFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-gray-200 bg-white px-4 py-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-600">
            © {currentYear} Smart Picker. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="mailto:support@smartpicker.com.au"
              className="text-gray-600 hover:text-blue-600 transition-colors"
              aria-label="Email support"
              title="Email support"
            >
              <Mail size={18} />
            </a>
            <span className="text-gray-300">•</span>
            <Link 
              to="/terms-of-service" 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-gray-300">•</span>
            <Link 
              to="/privacy-policy" 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SimpleFooter;

