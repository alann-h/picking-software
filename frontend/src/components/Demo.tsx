import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, PlayCircle } from 'lucide-react';

const Demo: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const heroState = location.state as { source?: string; section?: string } | null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="mb-6">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200 mb-4 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
                Smart Picker Demo
              </h1>
              
              {heroState?.source === 'hero' && (
                <p className="mt-2 text-gray-600">
                  Welcome from the Hero section! You&apos;re viewing the {heroState.section} demo.
                </p>
              )}
            </div>

            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg flex items-center justify-center mb-6 border border-gray-200">
                <div className="text-center text-gray-500">
                    <PlayCircle className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <h2 className="text-xl font-semibold">Demo Video Placeholder</h2>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto px-8 py-3 text-lg font-semibold text-blue-700 bg-white border-2 border-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              >
                View Pricing
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Demo;
