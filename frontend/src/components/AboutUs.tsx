import React from 'react';
import { motion } from 'framer-motion';
import SEO from './SEO';
import { getPageStructuredData } from '../utils/structuredData';
import {
  Search,
  ClipboardList,
  QrCode,
  Gauge,
  Users,
  Blocks,
  CheckCircle,
  CloudUpload,
  BarChart3,
  Link,
  XCircle,
} from 'lucide-react';


const features = [
  {
    icon: <Search size={32} className="text-blue-600" />,
    title: 'Advanced Customer Search',
    description: 'Powerful search capabilities to quickly find customers and their quotes. Streamlined workflow from customer identification to order processing.',
    benefits: ['Quick customer lookup', 'Quote history access', 'Real-time customer data']
  },
  {
    icon: <ClipboardList size={32} className="text-blue-600" />,
    title: 'Smart Run System',
    description: 'Organize and prioritize warehouse operations with intelligent run management. Create work queues that optimize picker efficiency and order fulfillment.',
    benefits: ['Priority-based workflows', 'Batch processing', 'Progress tracking']
  },
  {
    icon: <QrCode size={32} className="text-blue-600" />,
    title: 'Barcode Scanner Integration',
    description: 'Mobile-first barcode scanning ensures 100% accuracy in order fulfillment. Every item is validated in real-time, eliminating picking errors.',
    benefits: ['Zero picking errors', 'Real-time validation', 'Mobile optimized']
  },
  {
    icon: <Gauge size={32} className="text-blue-600" />,
    title: 'Digitalized Order Preparation',
    description: 'Replace paper-based processes with a modern, digital workflow. Real-time updates, instant feedback, and seamless order progression.',
    benefits: ['Paperless operations', 'Real-time updates', 'Digital audit trail']
  },
  {
    icon: <Users size={32} className="text-blue-600" />,
    title: 'Comprehensive User Management',
    description: 'Role-based access control with Admin and Picker roles. Secure, scalable user management that grows with your business.',
    benefits: ['Role-based permissions', 'Secure access control', 'Scalable user system']
  },
  {
    icon: <Blocks size={32} className="text-blue-600" />,
    title: 'Seamless Accounting Integration',
    description: 'Direct OAuth 2.0 connection to QuickBooks and Xero. Pull quotes, push estimates, and maintain perfect sync between systems.',
    benefits: ['OAuth 2.0 security', 'Real-time sync', 'Automated workflows', 'Dual platform support']
  }
];

const howItWorksSteps = [
  {
    step: '1',
    title: 'Setup & Integration',
    description: 'Connect QuickBooks or Xero and upload your product catalog. Our system automatically enriches product data with live information.',
    icon: <CloudUpload size={24} className="text-blue-600" />
  },
  {
    step: '2',
    title: 'Quote Selection',
    description: 'Pickers select open quotes from the dashboard and begin the fulfillment process with guided workflows.',
    icon: <ClipboardList size={24} className="text-blue-600" />
  },
  {
    step: '3',
    title: 'Barcode Validation',
    description: "Scan each item's barcode for instant validation. Real-time feedback ensures accuracy at every step.",
    icon: <QrCode size={24} className="text-blue-600" />
  },
  {
    step: '4',
    title: 'Admin Review',
    description: 'Completed orders are submitted for admin review with full audit trails and adjustment capabilities.',
    icon: <BarChart3 size={24} className="text-blue-600" />
  },
  {
    step: '5',
    title: 'Accounting Sync',
    description: 'Upon approval, updated estimates are automatically created in QuickBooks or Xero, ready for invoicing.',
    icon: <Link size={24} className="text-blue-600" />
  }
];

const problemList = [
  'Manual paper-based processes',
  'Costly picking errors & inconsistencies',
  'No real-time inventory validation',
  'Giving warehouse staff full accounting access'
];

const solutionList = [
  '100% accurate, barcode-verified picking',
  'Digital audit trails for every order',
  'Instant validation against the live quote',
  'Secure, role-based "Picker" access'
];


// --- Reusable Animated Component ---

const AnimatedComponent: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

// --- Main Page Component ---

const AboutUs: React.FC = () => {
  return (
    <>
      <SEO
        title="About Us - Smart Picker"
        description="Learn about the mission and team behind Smart Picker, dedicated to revolutionizing warehouse management for small and medium businesses."
        canonicalUrl="https://smartpicker.au/about-us"
      />
      
      <main className="min-h-screen overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          
          {/* Hero Section */}
          <AnimatedComponent>
            <section className="mb-16 text-center lg:mb-24">
              <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-blue-900 sm:text-5xl lg:text-6xl">
                Smart Picker
              </h1>
              <h2 className="mb-6 text-2xl font-semibold text-slate-700 sm:text-3xl lg:text-4xl">
                Warehouse Accuracy for QuickBooks & Xero
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-slate-600 lg:text-xl">
                Bridge the gap between sales quotes and physical order fulfillment with our 
                secure, guided, and barcode-validated digital workflow.
              </p>
            </section>
          </AnimatedComponent>

          {/* Problem & Solution Section */}
          <AnimatedComponent delay={0.2}>
            <section className="mb-16 rounded-xl bg-slate-50 p-6 py-16 lg:mb-24 lg:p-12">
              <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 md:grid-cols-2 lg:gap-16">
                
                {/* The Problem */}
                <div>
                  <h3 className="mb-4 text-center text-2xl font-bold text-red-700 md:text-left lg:text-3xl">
                    The Manual Workflow Gap
                  </h3>
                  <p className="mb-6 text-center text-base text-slate-700 md:text-left lg:text-lg">
                    For businesses using QuickBooks or Xero, the process of fulfilling an order is often manual, inefficient, and prone to costly errors.
                  </p>
                  <div className="flex flex-col items-center space-y-3 md:items-start">
                    {problemList.map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <XCircle size={20} className="shrink-0 text-red-500" />
                        <span className="text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Our Solution */}
                <div>
                  <h3 className="mb-4 text-center text-2xl font-bold text-green-700 md:text-left lg:text-3xl">
                    The Smart Picker Solution
                  </h3>
                  <p className="mb-6 text-center text-base text-slate-700 md:text-left lg:text-lg">
                    We replace paper and guesswork with a digital, barcode-validated process that connects directly to your accounting software.
                  </p>
                  <div className="flex flex-col items-center space-y-3 md:items-start">
                    {solutionList.map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle size={20} className="shrink-0 text-green-600" />
                        <span className="text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          </AnimatedComponent>

          {/* Core Features Grid */}
          <AnimatedComponent delay={0.4}>
            <section className="mb-16 lg:mb-24">
              <h2 className="mb-12 text-center text-3xl font-bold text-slate-900 lg:mb-16 lg:text-4xl">
                Core Features
              </h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <div 
                    key={feature.title}
                    className="flex h-full flex-col rounded-xl border border-slate-100 bg-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl"
                  >
                    <div className="flex flex-grow flex-col p-6">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100">
                        {feature.icon}
                      </div>
                      <h4 className="mb-2 text-xl font-semibold text-slate-900">
                        {feature.title}
                      </h4>
                      <p className="mb-4 flex-grow text-slate-600">
                        {feature.description}
                      </p>
                      <div className="flex flex-col space-y-2">
                        {feature.benefits.map((benefit) => (
                          <div key={benefit} className="flex items-center gap-2">
                            <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            <span className="text-sm text-slate-500">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </AnimatedComponent>

          {/* How It Works Section (Vertical Stepper) */}
          <AnimatedComponent delay={0.6}>
            <section className="mb-16 rounded-xl bg-slate-50 py-16 lg:mb-24 lg:py-24">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <h2 className="mb-12 text-center text-3xl font-bold text-slate-900 lg:mb-16 lg:text-4xl">
                  How It Works
                </h2>
                <div className="relative flex flex-col gap-12 pl-18">
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200" />
                  {howItWorksSteps.map((step) => (
                    <div key={step.step} className="relative flex items-start">
                      <div className="absolute -left-18 top-0 z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white ring-8 ring-slate-50">
                        {step.step}
                      </div>
                      
                      <div className="flex-1 pt-1">
                        <div className="mb-1 flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                            {step.icon}
                          </span>
                          <h4 className="text-xl font-semibold text-slate-900">{step.title}</h4>
                        </div>
                        <p className="text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </AnimatedComponent>

          {/* Call to Action */}
          <AnimatedComponent delay={1.0}>
            <section className="text-center">
              <div className="rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 p-8 text-white shadow-2xl sm:p-12 lg:p-16">
                <h2 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
                  Ready to Transform Your Warehouse?
                </h2>
                <p className="mx-auto mb-8 max-w-4xl text-lg text-blue-100 opacity-90 sm:text-xl lg:text-2xl">
                  Join businesses that have eliminated picking errors and streamlined their order fulfillment process from quote to completion.
                </p>
                <div className="flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row">
                  <span className="inline-block rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white bg-black/30">
                    ✓ 100% Accuracy Guarantee
                  </span>
                  <span className="inline-block rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white bg-black/30">
                    ✓ QuickBooks & Xero Native
                  </span>
                  <span className="inline-block rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white bg-black/30">
                    ✓ Mobile First & Offline Capable
                  </span>
                </div>
              </div>
            </section>
          </AnimatedComponent>

        </div>
      </main>
    </>
  );
};

export default AboutUs;