import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  UserPlus,
  Settings,
  ShieldCheck,
  CalendarDays,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import SEO from '../SEO';
import BreadcrumbNavigation from '../BreadcrumbNavigation';

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

const SystemSetupGuide: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Complete System Setup Guide: QuickBooks, Xero & User Management - Smart Picker"
        description="Step-by-step guide to setting up Smart Picker with your accounting software and managing multiple users. Learn how to integrate with QuickBooks or Xero and configure user access."
        keywords="Smart Picker setup, QuickBooks integration setup, Xero integration setup, user management, warehouse software configuration, accounting software integration"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": "Complete System Setup Guide: QuickBooks, Xero & User Management",
          "description": "Step-by-step guide to setting up Smart Picker with your accounting software and managing multiple users.",
          "datePublished": "2025-09-05",
          "author": {
            "@type": "Organization",
            "name": "Smart Picker Team"
          },
          "url": "https://smartpicker.au/blog/system-setup-guide",
          "image": "https://smartpicker.au/quickbooks-logo.png"
        }}
      />
      
      <BreadcrumbNavigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Back Button */}
          <motion.div variants={itemVariants}>
            <button
              onClick={() => navigate('/blog')}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 cursor-pointer"
            >
              <ArrowLeft size={18} />
              Back to Blog
            </button>
          </motion.div>

          {/* Header Section */}
          <motion.section variants={itemVariants} className="mb-12 text-center">
            <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-800">
              Setup Guide
            </span>
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">
              Complete System Setup Guide: QuickBooks, Xero & User Management
            </h1>
            <p className="mx-auto mb-6 max-w-3xl text-lg text-slate-600 lg:text-xl">
              Step-by-step guide to setting up Smart Picker with your accounting software and managing multiple users.
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

          {/* Introduction Card */}
          <motion.section variants={itemVariants} className="mb-12 rounded-lg bg-white p-6 shadow-lg lg:p-8 border border-slate-200">
            <p className="text-lg text-slate-700 leading-relaxed">
              Setting up Smart Picker is straightforward and can be completed in just a few minutes. 
              The system integrates seamlessly with either QuickBooks Online or Xero, and includes 
              comprehensive user management features that allow you to add multiple team members 
              with individual access controls.
            </p>
            {/* Custom Info Alert */}
            <div className="mt-6 flex items-start gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info size={24} className="h-6 w-6 shrink-0 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-800">Important Note</h4>
                <p className="text-sm text-blue-700">
                  Smart Picker supports integration with either QuickBooks Online OR Xero, but not both simultaneously. 
                  You can only have one active accounting software connection at a time.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Setup Steps Card */}
          <motion.section variants={itemVariants} className="mb-12 rounded-lg bg-white p-6 shadow-lg lg:p-8 border border-slate-200">
            <h2 className="mb-8 text-3xl font-semibold text-slate-900">
              Setup Walkthrough
            </h2>

            {/* Step 1 */}
            <h3 className="mb-4 text-xl font-semibold text-blue-700">
              Step 1: Initial Login & Accounting Software Integration
            </h3>
            <p className="mb-6 text-slate-700 leading-relaxed">
              When you first access Smart Picker, you'll be prompted to connect your accounting software. 
              This is a crucial step as it enables automatic synchronization of your customer data, 
              products, and inventory information.
            </p>
            <h4 className="mb-3 text-lg font-semibold text-slate-800">Choose Your Integration:</h4>
            <ul className="mb-6 space-y-4">
              <li className="flex items-start gap-4">
                <CheckCircle size={24} className="mt-0.5 shrink-0 text-green-500" />
                <div>
                  <span className="font-semibold text-slate-700">QuickBooks Online Integration</span>
                  <p className="text-sm text-slate-600">Connect directly with your QuickBooks Online account for seamless data sync.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle size={24} className="mt-0.5 shrink-0 text-green-500" />
                <div>
                  <span className="font-semibold text-slate-700">Xero Integration</span>
                  <p className="text-sm text-slate-600">Link your Xero account to automatically import customers and products.</p>
                </div>
              </li>
            </ul>

            {/* Custom Warning Alert */}
            <div className="my-6 flex items-start gap-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertTriangle size={24} className="h-6 w-6 shrink-0 text-yellow-600" />
              <div>
                <h4 className="font-semibold text-yellow-800">Single Connection Limit</h4>
                <p className="text-sm text-yellow-700">
                  You can only connect one accounting software at a time. If you need to switch from 
                  QuickBooks to Xero (or vice versa), you'll need to disconnect the current integration 
                  first before connecting the new one.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <h3 className="mb-4 mt-10 text-xl font-semibold text-blue-700">
              Step 2: User Management & Access Control
            </h3>
            <p className="mb-6 text-slate-700 leading-relaxed">
              Once your accounting software is connected, you can add team members and manage their 
              access through the User Management section in Settings. This allows you to control 
              who can access the system and what level of permissions they have.
            </p>
            <h4 className="mb-3 text-lg font-semibold text-slate-800">Adding New Users:</h4>
            <ul className="mb-6 space-y-4">
              <li className="flex items-start gap-4">
                <Settings size={24} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-700">Navigate to Settings</span>
                  <p className="text-sm text-slate-600">Go to the Settings menu and select 'User Management'.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <UserPlus size={24} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-700">Add User Details</span>
                  <p className="text-sm text-slate-600">Enter the user's email address and create a secure password.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <ShieldCheck size={24} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-700">Set Permissions</span>
                  <p className="text-sm text-slate-600">Configure what the user can access and modify within the system.</p>
                </div>
              </li>
            </ul>

             {/* Step 3 */}
             <h3 className="mb-4 mt-10 text-xl font-semibold text-blue-700">
              Step 3: System Configuration & Customization
            </h3>
            <p className="mb-6 text-slate-700 leading-relaxed">
              After setting up your integration and users, you can customize various system settings 
              to match your warehouse operations and preferences.
            </p>
            <h4 className="mb-3 text-lg font-semibold text-slate-800">Key Configuration Options:</h4>
            <ul className="mb-6 space-y-4">
              <li className="flex items-start gap-4">
                <CheckCircle size={24} className="mt-0.5 shrink-0 text-green-500" />
                <div>
                  <span className="font-semibold text-slate-700">Barcode Scanner Settings</span>
                  <p className="text-sm text-slate-600">Configure scanner preferences and validation rules.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle size={24} className="mt-0.5 shrink-0 text-green-500" />
                <div>
                  <span className="font-semibold text-slate-700">Order Processing Rules</span>
                  <p className="text-sm text-slate-600">Set up how orders are processed and prioritized.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle size={24} className="mt-0.5 shrink-0 text-green-500" />
                <div>
                  <span className="font-semibold text-slate-700">Notification Preferences</span>
                  <p className="text-sm text-slate-600">Configure alerts and notifications for order updates.</p>
                </div>
              </li>
            </ul>
          </motion.section>

          {/* Best Practices & Troubleshooting Card */}
          <motion.section variants={itemVariants} className="mb-12 rounded-lg bg-white p-6 shadow-lg lg:p-8 border border-slate-200">
            <h3 className="mb-6 text-2xl font-semibold text-slate-900 lg:text-3xl">
              Best Practices & Troubleshooting
            </h3>

            {/* Best Practices */}
            <h4 className="mb-4 text-xl font-semibold text-blue-700">Best Practices for System Setup</h4>
             <ul className="mb-6 space-y-4">
              <li className="flex items-start gap-4">
                <Info size={24} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-700">Test Your Integration</span>
                  <p className="text-sm text-slate-600">Verify that customer and product data is syncing correctly from your accounting software.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Info size={24} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-700">Start with Admin Access</span>
                  <p className="text-sm text-slate-600">Begin with full administrative access and gradually add users with appropriate permissions.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Info size={24} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-700">Regular Data Sync</span>
                  <p className="text-sm text-slate-600">Ensure your accounting software data is up-to-date before major operations.</p>
                </div>
              </li>
            </ul>

             {/* Custom Success Alert */}
             <div className="my-6 flex items-start gap-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle size={24} className="h-6 w-6 shrink-0 text-green-600" />
              <div>
                <h4 className="font-semibold text-green-800">Setup Complete!</h4>
                <p className="text-sm text-green-700">
                  Once you've completed these steps, your Smart Picker system will be ready for efficient 
                  order picking operations. Your team can start using the mobile app immediately.
                </p>
              </div>
            </div>

            {/* Troubleshooting */}
            <h4 className="mb-4 mt-10 text-xl font-semibold text-red-700">Troubleshooting Common Setup Issues</h4>
            <p className="mb-6 text-slate-700 leading-relaxed">
              If you encounter any issues during setup, here are some common solutions:
            </p>
            <ul className="mb-6 space-y-4">
              <li className="flex items-start gap-4">
                <AlertTriangle size={24} className="mt-0.5 shrink-0 text-yellow-600" />
                <div>
                  <span className="font-semibold text-slate-700">Integration Connection Failed</span>
                  <p className="text-sm text-slate-600">Ensure you have the correct login credentials and that your accounting software subscription is active.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <AlertTriangle size={24} className="mt-0.5 shrink-0 text-yellow-600" />
                <div>
                  <span className="font-semibold text-slate-700">User Cannot Access System</span>
                  <p className="text-sm text-slate-600">Verify the email address is correct and check that the user has been granted appropriate permissions.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <AlertTriangle size={24} className="mt-0.5 shrink-0 text-yellow-600" />
                <div>
                  <span className="font-semibold text-slate-700">Data Not Syncing</span>
                  <p className="text-sm text-slate-600">Check your internet connection and ensure your accounting software is accessible.</p>
                </div>
              </li>
            </ul>

            <p className="mt-6 text-slate-700 leading-relaxed">
              For additional support or questions about the setup process, our support team is available 
              to help you get the most out of your Smart Picker system. Contact us through the support 
              channels available in your account dashboard.
            </p>
          </motion.section>

          {/* Call to Action */}
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

export default SystemSetupGuide;