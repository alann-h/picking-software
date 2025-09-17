import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import { getPageStructuredData } from '../utils/structuredData';

// --- SVG Icons (Self-contained components) ---
const CheckIcon = ({ className }: { className: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const MinusIcon = ({ className }: { className: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

// --- Types ---
interface PlanFeatures {
  barcodeScanning: boolean;
  quickbooksIntegration: boolean;
  xeroIntegration: boolean;
  mobileApp: boolean;
  unlimitedUsers: boolean;
  unlimitedOrders: boolean;
  realTimeSync: boolean;
  adminApproval: boolean;
  customerSearch: boolean;
  runManagement: boolean;
  setupFee: boolean;
  contractRequired: boolean;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  highlight: boolean;
  website: string;
  features: PlanFeatures;
}

// --- Main Pricing Component ---
const Pricing: React.FC = () => {
  const navigate = useNavigate();
  // --- Data for pricing plans ---
  const plans: Plan[] = [
    {
      name: 'Smart Picker',
      price: '$0',
      period: 'Free During Testing',
      description: 'Perfect for small to medium businesses',
      highlight: true,
      website: '/login',
      features: {
        barcodeScanning: true,
        quickbooksIntegration: true,
        xeroIntegration: true,
        mobileApp: true,
        unlimitedUsers: false,
        unlimitedOrders: true,
        realTimeSync: true,
        adminApproval: true,
        customerSearch: true,
        runManagement: true,
        setupFee: false,
        contractRequired: false
      }
    },
    {
      name: 'Fishbowl Inventory',
      price: 'From $299',
      period: 'AUD/month',
      description: 'Cloud-based inventory management with tiered pricing',
      highlight: false,
      website: 'https://www.fishbowlinventory.com/pricing',
      features: {
        barcodeScanning: true,
        quickbooksIntegration: true,
        xeroIntegration: false,
        mobileApp: true,
        unlimitedUsers: false,
        unlimitedOrders: false,
        realTimeSync: true,
        adminApproval: false,
        customerSearch: true,
        runManagement: false,
        setupFee: true,
        contractRequired: false
      }
    },
    {
      name: 'NetSuite WMS',
      price: '$149',
      period: 'AUD per user/month',
      description: 'Enterprise warehouse management',
      highlight: false,
      website: 'https://www.netsuite.com.au/portal/au/products/erp/warehouse-fulfillment/wms.shtml',
      features: {
        barcodeScanning: true,
        quickbooksIntegration: false,
        xeroIntegration: false,
        mobileApp: true,
        unlimitedUsers: false,
        unlimitedOrders: false,
        realTimeSync: true,
        adminApproval: true,
        customerSearch: true,
        runManagement: true,
        setupFee: true,
        contractRequired: true
      }
    },
    {
      name: 'Cin7 Core',
      price: '$489',
      period: 'AUD per month',
      description: 'Inventory and order management',
      highlight: false,
      website: 'https://www.cin7.com/pricing/',
      features: {
        barcodeScanning: true,
        quickbooksIntegration: true,
        xeroIntegration: true,
        mobileApp: true,
        unlimitedUsers: false,
        unlimitedOrders: false,
        realTimeSync: true,
        adminApproval: false,
        customerSearch: true,
        runManagement: false,
        setupFee: true,
        contractRequired: true
      }
    }
  ];

  const featureLabels = {
    barcodeScanning: 'Barcode Scanning',
    quickbooksIntegration: 'QuickBooks Integration',
    xeroIntegration: 'Xero Integration',
    mobileApp: 'Mobile App',
    unlimitedUsers: 'Unlimited Users',
    unlimitedOrders: 'Unlimited Orders',
    realTimeSync: 'Real-time Sync',
    adminApproval: 'Admin Approval Workflow',
    customerSearch: 'Advanced Customer Search',
    runManagement: 'Smart Run Management',
    setupFee: 'Setup Fee',
    contractRequired: 'Contract Required'
  };

  return (
    <>
      <SEO 
        title="Pricing - Smart Picker | Free Warehouse Management Software"
        description="Compare Smart Picker's free warehouse management software with competitors. See how we stack up against Fishbowl, NetSuite, and Cin7 with transparent pricing."
        keywords="Smart Picker pricing, warehouse management software cost, free inventory management, Fishbowl pricing comparison, NetSuite WMS pricing, Cin7 pricing"
        canonicalUrl="https://smartpicker.au/pricing"
        structuredData={getPageStructuredData('webPage')}
      />
      
      <BreadcrumbNavigation />
      
      <div className="bg-slate-50 font-sans antialiased text-slate-800">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          {/* --- Header --- */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Compare Smart Picker with leading warehouse management solutions and see the value we provide.
            </p>
            <div className="mt-6 inline-flex items-center justify-center bg-blue-600 text-white font-semibold rounded-full px-4 py-2 shadow-lg">
              <StarIcon />
              <span>Currently Free During Testing</span>
            </div>
          </div>

          {/* --- Main Comparison Table (Desktop) --- */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-5 gap-px bg-slate-200 rounded-2xl shadow-lg shadow-slate-200/50">
              {/* --- Feature Column Header --- */}
              <div className="bg-white p-6 rounded-tl-2xl">
                <h2 className="text-xl font-bold text-slate-900">Features</h2>
              </div>
              {/* --- Plan Column Headers --- */}
              {plans.map((plan, index) => (
                <div key={index} className={`text-center p-6 relative ${plan.highlight ? 'bg-blue-50' : 'bg-white'} ${index === plans.length - 1 ? 'rounded-tr-2xl' : ''}`}>
                  {plan.highlight && (
                    <span className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Recommended</span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{plan.price}</p>
                  <p className="text-xs text-slate-500">{plan.period}</p>
                </div>
              ))}
              
              {/* --- Feature Rows --- */}
              {Object.entries(featureLabels).map(([key, label]) => (
                <React.Fragment key={key}>
                  <div className="bg-white p-4 flex items-center">
                    <span className="font-medium text-slate-700 text-sm">{label}</span>
                  </div>
                  {plans.map((plan, planIndex) => (
                    <div key={planIndex} className={`flex items-center justify-center p-4 ${plan.highlight ? 'bg-blue-50' : 'bg-white'}`}>
                      {plan.features[key as keyof typeof plan.features] ? (
                        <CheckIcon className="h-6 w-6 text-blue-500" />
                      ) : (
                        <MinusIcon className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                  ))}
                </React.Fragment>
              ))}

               {/* --- Action/Button Row --- */}
               <div className="bg-white p-4 rounded-bl-2xl"></div>
               {plans.map((plan, planIndex) => (
                  <div key={planIndex} className={`p-4 flex items-center justify-center ${plan.highlight ? 'bg-blue-50' : 'bg-white'} ${planIndex === plans.length - 1 ? 'rounded-br-2xl' : ''}`}>
                      {plan.highlight ? (
                           <motion.button 
                             onClick={() => navigate(plan.website)}
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             className="w-full text-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 cursor-pointer"
                           >
                             Get Started Free
                           </motion.button>
                      ) : (
                          <motion.button 
                            onClick={() => window.open(plan.website, '_blank')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full text-center bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors duration-300 cursor-pointer"
                          >
                            Learn More
                          </motion.button>
                      )}
                  </div>
               ))}
            </div>
          </div>
          
          {/* --- Pricing Cards (Mobile) --- */}
          <div className="block lg:hidden space-y-6">
            {plans.map((plan, index) => (
              <div key={index} className={`rounded-2xl p-6 border ${plan.highlight ? 'border-blue-500 bg-blue-50 shadow-xl' : 'border-slate-200 bg-white shadow-lg'}`}>
                <div className="text-center">
                  {plan.highlight && (
                      <span className="inline-block bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">Recommended</span>
                  )}
                  <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{plan.price}</p>
                  <p className="text-sm text-slate-500">{plan.period}</p>
                  <p className="text-sm text-slate-600 mt-2">{plan.description}</p>
                   {plan.highlight ? (
                      <motion.button 
                        onClick={() => navigate(plan.website)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="block w-full mt-6 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 cursor-pointer"
                      >
                          Get Started Free
                      </motion.button>
                  ) : (
                      <motion.button 
                        onClick={() => window.open(plan.website, '_blank')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="block w-full mt-6 bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg hover:bg-slate-300 transition-colors duration-300 cursor-pointer"
                      >
                          Learn More
                      </motion.button>
                  )}
                </div>
                
                <hr className="my-6 border-slate-200" />
                
                <ul className="space-y-3">
                  {Object.entries(featureLabels).map(([key, label]) => (
                    <li key={key} className="flex items-center">
                      {plan.features[key as keyof typeof plan.features] ? (
                        <CheckIcon className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                      ) : (
                        <MinusIcon className="h-5 w-5 text-slate-300 mr-3 flex-shrink-0" />
                      )}
                      <span className="text-slate-700 text-sm">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* --- Bottom Section --- */}
          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Why Choose Smart Picker?
            </h3>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-8">
              While competitors charge hundreds of dollars per month and require complex setups, Smart Picker delivers 
              enterprise-grade warehouse management features. Currently free during our testing phase - 
              no contracts, no setup fees, no hidden costs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button 
                onClick={() => navigate("/faq")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors duration-300 cursor-pointer"
              >
                View FAQ
              </motion.button>
              <motion.button 
                onClick={() => navigate("/about-us")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300 cursor-pointer"
              >
                Learn More
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;
