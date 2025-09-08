import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  // Icons for the 10 methods
  ScanLine,
  Filter,
  ClipboardList,
  User,
  Plus,
  LineChart,
  Edit,
  StickyNote,
  RefreshCw,
  Gauge,
  // Icons for layout and metadata
  CheckCircle,
  CheckCircle2,
  ArrowLeft,
  CalendarDays,
  Clock,
  User as UserIcon,
  Info,
} from 'lucide-react';
import SEO from '../SEO';
import BreadcrumbNavigation from '../BreadcrumbNavigation';

const WarehouseEfficiencyGuide: React.FC = () => {
  const navigate = useNavigate();

  // Define icon style to be reused in the methods array
  const iconClass = "h-10 w-10 text-blue-600"; // Removed dark:text-blue-500

  // Data from the ORIGINAL file (WarehouseEfficiencyGuide.tsx)
  const efficiencyMethods = [
    {
      icon: <ScanLine className={iconClass} aria-hidden="true" />,
      title: 'Barcode Scanning for 100% Accuracy',
      description: 'Eliminate picking errors with real-time barcode validation. Every item is scanned and verified against the quote, ensuring zero mistakes.',
      benefits: [
        'Real-time product validation',
        'Automatic error detection',
        'Reduced picking mistakes to zero',
        'Instant feedback to pickers',
      ],
    },
    {
      icon: <Filter className={iconClass} aria-hidden="true" />,
      title: 'Automatic Product Filtering',
      description: 'Smart Picker automatically filters and displays only the products needed for each order, eliminating confusion and reducing search time.',
      benefits: [
        'Shows only required products',
        'Eliminates unnecessary searching',
        'Reduces cognitive load on pickers',
        'Faster order preparation',
      ],
    },
    {
      icon: <ClipboardList className={iconClass} aria-hidden="true" />,
      title: 'Intelligent Run System',
      description: 'Organize orders into efficient picking runs with priority-based workflows and batch processing capabilities.',
      benefits: [
        'Priority-based order processing',
        'Batch picking optimization',
        'Progress tracking and monitoring',
        'Workflow automation',
      ],
    },
    {
      icon: <User className={iconClass} aria-hidden="true" />,
      title: 'Comprehensive User Tracking',
      description: 'Track picker performance, time spent on each order, and identify areas for improvement with detailed analytics.',
      benefits: [
        'Performance metrics and KPIs',
        'Time tracking per order',
        'Productivity analysis',
        'Training opportunity identification',
      ],
    },
    {
      icon: <Plus className={iconClass} aria-hidden="true" />,
      title: 'Dynamic Product Management',
      description: 'Add products on-the-fly, adjust quantities, and handle backorders seamlessly during the picking process.',
      benefits: [
        'Add products instantly',
        'Real-time quantity adjustments',
        'Backorder management',
        'Unavailable product handling',
      ],
    },
    {
      icon: <LineChart className={iconClass} aria-hidden="true" />,
      title: 'Real-Time Progress Tracking',
      description: 'Visual progress bars and detailed product information keep pickers informed and motivated throughout the process.',
      benefits: [
        'Visual progress indicators',
        'Detailed product information',
        'Time tracking per item',
        'Completion status updates',
      ],
    },
    {
      icon: <Edit className={iconClass} aria-hidden="true" />,
      title: 'Flexible Quantity Adjustments',
      description: 'Easily adjust quantities, mark items as unavailable, or set backorders with simple touch interactions.',
      benefits: [
        'One-tap quantity changes',
        'Unavailable item marking',
        'Backorder status setting',
        'Instant quote updates',
      ],
    },
    {
      icon: <StickyNote className={iconClass} aria-hidden="true" />,
      title: 'Digital Note-Taking System',
      description: 'Pickers can add notes for each order, which are immediately visible to administrators for better communication.',
      benefits: [
        'Real-time note sharing',
        'Admin-picker communication',
        'Issue documentation',
        'Process improvement insights',
      ],
    },
    {
      icon: <RefreshCw className={iconClass} aria-hidden="true" />,
      title: 'Automatic Quote Updates',
      description: 'Changes are automatically synced to QuickBooks Online or Xero, eliminating manual data entry and reducing errors.',
      benefits: [
        'Real-time quote synchronization',
        'Automatic invoice preparation',
        'Eliminates manual data entry',
        'Reduces accounting errors',
      ],
    },
    {
      icon: <Gauge className={iconClass} aria-hidden="true" />,
      title: 'Kyte Integration for Instant Quotes',
      description: 'Create quotes instantly with Kyte integration, streamlining the entire order-to-fulfillment process.',
      benefits: [
        'Instant quote creation',
        'Seamless workflow integration',
        'Reduced order processing time',
        'Improved customer experience',
      ],
    },
  ];

  // Framer Motion variants from the target design
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <>
      <SEO
        title="10 Ways to Improve Warehouse Efficiency with Smart Picker | Complete Guide"
        description="Discover proven strategies to boost warehouse productivity using Smart Picker's advanced features including barcode scanning, automatic filtering, run management, and real-time synchronization."
        keywords="warehouse efficiency, order picking optimization, barcode scanning, inventory management, warehouse productivity, Smart Picker features, picking accuracy"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "10 Ways to Improve Warehouse Efficiency with Smart Picker",
          "description": "Complete guide to improving warehouse efficiency using Smart Picker's advanced order picking features",
          "datePublished": "2025-09-05", // From original file
          "step": efficiencyMethods.map((method, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": method.title,
            "text": method.description,
          })),
        }}
      />

      <BreadcrumbNavigation />

      {/* Main container layout from target design */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Back button layout from target design */}
          <motion.div variants={itemVariants}>
            <button
              onClick={() => navigate('/blog')}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 cursor-pointer"
            >
              <ArrowLeft size={18} />
              Back to Blog
            </button>
          </motion.div>

          {/* Header layout from target design, content from original file */}
          <motion.section variants={itemVariants} className="mb-12 text-center">
            <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-800">
              Efficiency Tips
            </span>
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">
              10 Ways to Improve Warehouse Efficiency with Smart Picker
            </h1>
            <p className="mx-auto mb-6 max-w-3xl text-lg text-slate-600 lg:text-xl">
              Discover proven strategies to boost your warehouse productivity using Smart Picker's advanced features and best practices.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} /> Published: September 05, 2025
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> 5 min read
              </span>
              <span className="flex items-center gap-1.5">
                <UserIcon size={14} /> By Smart Picker Team
              </span>
            </div>
          </motion.section>

          {/* Introduction section from original file, using target design's intro card layout */}
          <motion.section variants={itemVariants} className="mb-12 rounded-lg bg-white p-6 shadow-lg lg:p-8 border">
            <div className="flex flex-col items-start sm:flex-row sm:items-center">
              <div className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 sm:mb-0 sm:mr-6">
                <Info size={32} />
              </div>
              <div>
                <h2 className="mb-1 text-2xl font-semibold text-slate-900">
                  Why Warehouse Efficiency Matters
                </h2>
              </div>
            </div>
            <p className="mt-4 text-slate-700 leading-relaxed">
              In today's competitive market, warehouse efficiency directly impacts your bottom line. Manual processes, 
              picking errors, and inefficient workflows can cost businesses thousands of dollars annually. Smart Picker 
              transforms these challenges into opportunities for growth and profitability.
            </p>
            <p className="mt-4 text-slate-700 leading-relaxed">
              This comprehensive guide explores 10 proven methods to dramatically improve your warehouse operations 
              using Smart Picker's advanced features, from barcode scanning to real-time synchronization with your 
              accounting system.
            </p>
          </motion.section>

          {/* Methods Grid: Using target design's Challenge/Solution layout for the source data */}
          <motion.section variants={itemVariants} className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-blue-700 lg:text-4xl">
              10 Key Efficiency Methods
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {efficiencyMethods.map((method) => (
                <div key={method.title} className="flex h-full flex-col rounded-lg border-t-4 border-blue-500 bg-white p-6 shadow-lg border border-gray-200">
                  <div className="mb-3 flex items-center gap-4">
                    {method.icon}
                    <h3 className="text-xl font-semibold text-slate-900">{method.title}</h3>
                  </div>
                  <p className="mb-4 flex-grow text-slate-600 leading-relaxed">
                    {method.description}
                  </p>
                  
                  {/* Replaced the target's bottom tag with the source's benefit list */}
                  <div className="mt-auto">
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">
                      Key Benefits:
                    </h4>
                    <ul className="space-y-2">
                      {method.benefits.map((benefit, i) => (
                         <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" aria-hidden="true" />
                            <span className="text-sm text-slate-600">
                              {benefit}
                            </span>
                         </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Implementation Tips: Using target's "Timeline" layout for the source's "Tips" data */}
          <motion.section variants={itemVariants} className="mb-12 rounded-lg bg-white p-6 shadow-lg lg:p-8 border">
            <h3 className="mb-6 text-2xl font-semibold text-slate-900 lg:text-3xl">
              Implementation Tips for Maximum Efficiency
            </h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <h4 className="mb-4 text-xl font-semibold text-blue-700">
                  Getting Started
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Train your team on barcode scanning best practices</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Set up proper run categories and priorities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Configure QuickBooks or Xero integration</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-4 text-xl font-semibold text-blue-700">
                  Best Practices
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Use notes for communication between pickers and admins</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Regularly review performance metrics and adjust workflows</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Keep product data synchronized with your accounting system</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Call to Action: Using the target design's gradient CTA */}
          <motion.section variants={itemVariants} className="rounded-lg bg-gradient-to-r from-blue-700 to-blue-900 p-8 text-center text-white lg:p-12">
            <h3 className="text-2xl font-semibold lg:text-3xl">Ready to Get Started?</h3>
            <p className="my-4 mx-auto max-w-2xl opacity-90">
              Set up your Smart Picker system today and start improving your warehouse efficiency.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-2 transform rounded-lg bg-white px-6 py-3 text-base font-medium text-blue-800 shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              Start Setup Now
            </button>
          </motion.section>
          
        </motion.div>
      </main>
    </>
  );
};

export default WarehouseEfficiencyGuide;