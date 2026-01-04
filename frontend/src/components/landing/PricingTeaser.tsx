import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const PricingTeaser: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Transparent Pricing That Works for You
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              See how Smart Picker compares to leading warehouse management solutions. 
              No hidden fees, no surprises - just honest pricing.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Smart Picker
                </h3>
                <p className="text-4xl font-bold text-blue-600 mb-2">
                  $30
                </p>
                <p className="text-slate-600 mb-4">
                  AUD/month
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Unlimited users & orders
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    QuickBooks & Xero integration
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    No setup fees or contracts
                  </li>
                </ul>
              </div>
              
              <div className="text-center md:text-right">
                <p className="text-sm text-slate-500 mb-4">
                  Competitors charge $299-$1,049+ AUD/month
                </p>
                <motion.button
                  onClick={() => navigate('/pricing')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-300 cursor-pointer"
                >
                  View Full Comparison
                </motion.button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-300 cursor-pointer"
            >
              Get Started Free
            </motion.button>
            <motion.button
              onClick={() => navigate('/pricing')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border border-blue-600 text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors duration-300 cursor-pointer"
            >
              See Pricing Details
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PricingTeaser;
