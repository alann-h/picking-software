import React from 'react';
import { motion } from 'framer-motion';
import SEO from './SEO';
import {
  Gavel,
  Shield,
  Cookie,
  Building2,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';

const termsSections = [
  {
    icon: <Building2 className="h-7 w-7 text-blue-800" />,
    title: '1. Service Description',
    content: (
      <>
        <p>Smart Picker is a professional inventory management and order picking software that provides:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Barcode scanning and product identification</li>
          <li>Inventory management and tracking</li>
          <li>Order processing and run management</li>
          <li>QuickBooks Online integration</li>
          <li>User management and access control</li>
        </ul>
      </>
    ),
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: '2. Acceptable Use',
    content: (
      <>
        <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Share your account credentials with others</li>
          <li>Use the Service to store or transmit malicious code</li>
        </ul>
      </>
    ),
  },
  {
    icon: <Cookie className="h-7 w-7 text-blue-800" />,
    title: '3. Cookies and Tracking Technologies',
    content: (
      <>
        <p>Our Service uses cookies and similar tracking technologies to enhance your experience and provide essential functionality:</p>
        <ul className="space-y-3 pl-2 text-slate-600">
          <li>
            <strong className="text-slate-700">Session Cookies:</strong>
            <p className="pl-4">Essential for user authentication and security. These cookies are necessary for the Service to function properly and cannot be disabled.</p>
          </li>
          <li>
            <strong className="text-slate-700">CSRF Protection Cookies:</strong>
            <p className="pl-4">Security cookies that protect against cross-site request forgery attacks.</p>
          </li>
          <li>
            <strong className="text-slate-700">Functionality Cookies:</strong>
            <p className="pl-4">Remember your preferences and settings to provide a personalized experience.</p>
          </li>
          <li>
            <strong className="text-slate-700">Consent Management:</strong>
            <p className="pl-4">Track your cookie preferences and consent choices.</p>
          </li>
        </ul>
        <p className="mt-4">
          By using our Service, you consent to the use of these cookies. You can manage your cookie preferences 
          through your browser settings, though disabling certain cookies may affect Service functionality.
        </p>
      </>
    ),
  },
  {
    icon: <CreditCard className="h-7 w-7 text-blue-800" />,
    title: '4. Payment and Subscription',
    content: (
      <>
        <p>Subscription fees are billed in advance on a monthly or annual basis. You agree to:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Pay all fees when due</li>
          <li>Provide accurate billing information</li>
          <li>Notify us of any billing disputes within 30 days</li>
        </ul>
        <p className="mt-4">
          We reserve the right to modify pricing with 30 days' notice. Unpaid accounts may be suspended or terminated.
        </p>
      </>
    ),
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: '5. Data Protection and Privacy',
    content: (
      <>
        <p>
          Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, 
          which is incorporated into these Terms by reference.
        </p>
        <p>
          We implement appropriate technical and organizational measures to protect your data against unauthorized access, 
          alteration, disclosure, or destruction.
        </p>
      </>
    ),
  },
  {
    icon: <Gavel className="h-7 w-7 text-blue-800" />,
    title: '6. Limitation of Liability',
    content: (
      <>
        <p>To the maximum extent permitted by Australian law:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim</li>
          <li>We are not liable for indirect, incidental, or consequential damages</li>
          <li>We are not liable for data loss, business interruption, or lost profits</li>
        </ul>
        <p className="mt-4">
          These limitations do not apply to liability that cannot be excluded under Australian Consumer Law.
        </p>
      </>
    ),
  },
  {
    icon: <Gavel className="h-7 w-7 text-blue-800" />,
    title: '7. Governing Law and Jurisdiction',
    content: (
      <>
        <p>
          These Terms are governed by and construed in accordance with the laws of New South Wales, Australia. 
          Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive 
          jurisdiction of the courts of New South Wales.
        </p>
        <p>
          If any provision of these Terms is found to be unenforceable, the remaining provisions will continue 
          in full force and effect.
        </p>
      </>
    ),
  },
  {
    icon: <Gavel className="h-7 w-7 text-blue-800" />,
    title: '8. Changes to Terms',
    content: (
      <>
        <p>We may update these Terms from time to time. We will notify you of any material changes by:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Posting the new Terms on our website</li>
          <li>Sending you an email</li>
          <li>Displaying a notice in the Service</li>
        </ul>
        <p className="mt-4">
          Your continued use of the Service after such changes constitutes acceptance of the new Terms.
        </p>
      </>
    ),
  },
];

// Animation variants (for consistency with other pages)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const TermsOfService: React.FC = () => {
  return (
    <>
      <SEO
        title="Terms of Service - Smart Picker"
        description="Read the Terms of Service for using Smart Picker warehouse management software."
        canonicalUrl="https://smartpicker.au/terms-of-service"
      />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
           variants={containerVariants}
           initial="hidden"
           animate="visible"
        >
          {/* Main content card, styled like the target design */}
          <motion.section 
            variants={itemVariants} 
            className="rounded-lg bg-white p-6 shadow-lg lg:p-10 border border-slate-200"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <Gavel size={48} className="text-blue-800 mx-auto mb-4" />
              <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">
                Terms of Service
              </h1>
              <p className="mt-2 text-lg text-slate-500">
                Last updated: {new Date().toLocaleDateString('en-AU')}
              </p>
            </div>

            <p className="text-lg text-slate-700 leading-relaxed mb-10 max-w-4xl mx-auto text-center">
              These Terms of Service ("Terms") govern your use of Smart Picker ("Service") operated by Smart Picker 
              ("Company", "we", "us", or "our"). By accessing or using our Service, you agree to be bound by these Terms.
            </p>

            {/* Sections Content */}
            <div className="max-w-4xl mx-auto">
              {termsSections.map((section, index) => (
                <section key={section.title}>
                  {/* Add a divider before every section except the first one */}
                  {index > 0 && (
                    <hr className="my-8 border-slate-200" />
                  )}
                  
                  {/* Section Header (replaces AccordionSummary) */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="shrink-0 pt-1">
                      {section.icon}
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      {section.title}
                    </h2>
                  </div>

                  {/* Section Content (replaces AccordionDetails) */}
                  <div className="pl-11 space-y-4 text-slate-700 leading-relaxed">
                    {section.content}
                  </div>
                </section>
              ))}

              {/* Final Contact Section */}
              <hr className="my-10 border-slate-200" />
              <div className="text-center">
                <LifeBuoy size={40} className="text-blue-800 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Contact Information
                </h2>
                <p className="text-slate-600 mb-4 max-w-xl mx-auto">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="text-slate-800">
                  <p className="font-semibold">Smart Picker</p>
                  <p>New South Wales, Australia</p>
                  <p>Email: <a href="mailto:support@smartpicker.au" className="text-blue-700 hover:underline">support@smartpicker.au</a></p>
                </div>
              </div>
            </div>

          </motion.section>
        </motion.div>
      </main>
    </>
  );
};

export default TermsOfService;