import React from 'react';
import { motion } from 'framer-motion';
import SEO from './SEO';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import { getPageStructuredData } from '../utils/structuredData';
import {
  HelpCircle,
  QrCode,
  Blocks,
  LifeBuoy,
  Gauge,
  Shield,
  MessageCircle,
  ChevronDown
} from 'lucide-react';

// --- FAQ Data (with Lucide icons) ---

const faqCategories = [
  {
    title: 'Getting Started',
    icon: <HelpCircle size={24} className="text-blue-600" />,
    questions: [
      {
        question: 'What is Smart Picker and how does it work?',
        answer: 'Smart Picker is a comprehensive order picking software designed for warehouses and distribution centers. It uses barcode scanning technology to streamline the order fulfillment process, reduce errors, and improve efficiency. The system works by creating digital picking lists, validating items through barcode scanning, and providing real-time updates to your inventory management system.'
      },
      {
        question: 'How quickly can I get started with Smart Picker?',
        answer: 'You can get started with Smart Picker in just a few minutes. Simply sign up for an account, complete the QuickBooks integration setup, and begin creating your first picking runs. Our intuitive interface requires minimal training, and most users are productive within their first hour of use.'
      },
      {
        question: 'Do I need any special hardware to use Smart Picker?',
        answer: "Smart Picker works on any device with a web browser and camera. For optimal performance, we recommend using a smartphone or tablet with a good camera for barcode scanning. No additional hardware purchases are required - the system uses your existing device's camera for barcode scanning functionality."
      }
    ]
  },
  {
    title: 'Features & Functionality',
    icon: <QrCode size={24} className="text-blue-600" />,
    questions: [
      {
        question: 'How accurate is the barcode scanning feature?',
        answer: 'Our barcode scanning technology achieves 99.9% accuracy when used properly. The system supports only standard barcode formats like Code 128 or any other 1D barcode format. The scanning feature includes error detection and validation to ensure items are correctly identified before being added to orders.'
      },
      {
        question: 'Can I customize picking workflows for my business?',
        answer: 'Yes, Smart Picker offers flexible workflow customization. You can create custom runs, set priority levels, and configure notification settings. The system adapts to your business processes rather than forcing you to change your operations.'
      },
      {
        question: 'Does Smart Picker work offline?',
        answer: 'Smart Picker includes offline capabilities for areas with poor connectivity. You can continue picking orders offline, and the system will automatically sync all data when connectivity is restored. This ensures uninterrupted operations even in challenging warehouse environments.'
      }
    ]
  },
  {
    title: 'Integration & Compatibility',
    icon: <Blocks size={24} className="text-blue-600" />,
    questions: [
      {
        question: 'How does QuickBooks and Xero integration work?',
        answer: 'Smart Picker seamlessly integrates with both QuickBooks Online and Desktop versions, as well as Xero. The integration automatically syncs customer data, product information, and order details. When orders are completed, inventory levels are updated in real-time, and sales data is automatically recorded in your accounting system.'
      },
      {
        question: 'Can I integrate Smart Picker with other systems?',
        answer: 'Currently, Smart Picker does not support other systems. It is only compatible with QuickBooks and Xero. There are plans to support other systems in the future like MYOB'
      },
      {
        question: 'Is my data secure when using Smart Picker?',
        answer: 'Security is our top priority. Smart Picker uses enterprise-grade encryption for all data transmission and storage. We comply with industry-standard security protocols and offer features like user authentication, role-based access control, and audit trails for complete data protection.'
      }
    ]
  },
  {
    title: 'Pricing & Support',
    icon: <LifeBuoy size={24} className="text-blue-600" />,
    questions: [
      {
        question: 'What pricing plans are available?',
        answer: 'Smart Picker currently does not have a pricing plan. It is a free to use software for small businesses.'
      },
      {
        question: 'What kind of support do you provide?',
        answer: 'We provide comprehensive support including email support, live chat during business hours, detailed documentation, video tutorials, and webinars. Enterprise customers receive dedicated account management and priority support. Our support team is trained to help with both technical issues and workflow optimization.'
      },
      {
        question: 'Can I try Smart Picker before purchasing?',
        answer: 'No, Smart Picker is a free to use software for small businesses.'
      }
    ]
  }
];

// --- Animation Variants (Unchanged) ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

// --- Helper Badge Component ---

const KeywordBadge: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">
    {icon}
    {label}
  </span>
);

// --- Main FAQ Component ---

const FAQ: React.FC = () => {
  return (
    <>
      <SEO 
        title="FAQ - Smart Picker"
        description="Find answers to frequently asked questions about Smart Picker, including features, integration, pricing, and support."
        canonicalUrl="https://smartpicker.au/faq"
        structuredData={getPageStructuredData('faq')}
      />
      
      <BreadcrumbNavigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.section variants={itemVariants} className="mb-12 text-center lg:mb-16">
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-600">
              Everything you need to know about Smart Picker order picking software
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              <KeywordBadge icon={<QrCode size={16} />} label="Barcode Scanning" />
              <KeywordBadge icon={<Blocks size={16} />} label="QuickBooks Integration" />
              <KeywordBadge icon={<Gauge size={16} />} label="Fast Setup" />
              <KeywordBadge icon={<Shield size={16} />} label="Secure & Reliable" />
            </div>
          </motion.section>

          {/* Single-Column FAQ List */}
          <motion.div variants={itemVariants} className="mx-auto max-w-4xl">
            {faqCategories.map((category) => (
              <section key={category.title} className="mb-12">
                
                {/* Category Header */}
                <div className="mb-6 flex items-center gap-3 border-b border-slate-200 pb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    {category.icon}
                  </span>
                  <h2 className="text-2xl font-semibold text-slate-900">{category.title}</h2>
                </div>
                
                {/* Questions List for this category */}
                <div className="flex flex-col space-y-4">
                  {category.questions.map((faq) => (
                    <details 
                      key={faq.question} 
                      className="group rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-slate-300"
                    >
                      <summary className="flex list-none cursor-pointer items-center justify-between p-4 sm:p-5">
                        <span className="text-base font-medium text-slate-800">
                          {faq.question}
                        </span>
                        <ChevronDown 
                          size={20} 
                          className="shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180" 
                        />
                      </summary>
                      <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                        <p className="text-slate-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </motion.div>

          {/* CTA Box */}
          <motion.section variants={itemVariants} className="mx-auto mt-12 max-w-4xl text-center lg:mt-16">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-slate-900">
                Still have questions?
              </h3>
              <p className="mt-2 mb-6 text-slate-600">
                Our support team is here to help you get the most out of Smart Picker.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:support@smartpicker.au" // Assuming this is the contact link
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <LifeBuoy size={18} />
                  Contact Support
                </a>
                <button
                  type="button" // Assuming this triggers a chat widget
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-white px-5 py-2.5 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                >
                  <MessageCircle size={18} />
                  Live Chat
                </button>
              </div>
            </div>
          </motion.section>

        </motion.div>
      </main>
    </>
  );
};

export default FAQ;