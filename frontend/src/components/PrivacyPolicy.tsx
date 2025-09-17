import React from 'react';
import { motion } from 'framer-motion';
import SEO from './SEO';
import {
  Shield,
  Cookie,
  Building2,
  Database,
  LifeBuoy,
} from 'lucide-react';

const policySections = [
  {
    icon: <Building2 className="h-7 w-7 text-blue-800" />,
    title: '1. Information We Collect',
    content: (
      <>
        <h3 className="text-lg font-semibold text-slate-800">Personal Information</h3>
        <p>We collect the following types of personal information:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Email address and contact information</li>
          <li>First and last name</li>
          <li>Company information and business details</li>
          <li>Account credentials and authentication data</li>
          <li>Payment and billing information</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-slate-800">Usage Data</h3>
        <p>We automatically collect usage information including:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>IP address and device information</li>
          <li>Browser type and version</li>
          <li>Pages visited and time spent</li>
          <li>Feature usage and interaction data</li>
          <li>Error logs and performance metrics</li>
        </ul>
      </>
    ),
  },
  {
    icon: <Cookie className="h-7 w-7 text-blue-800" />,
    title: '2. Cookies and Tracking Technologies',
    content: (
      <>
        <p>We use cookies and similar technologies to provide essential functionality and enhance your experience:</p>
        
        <h3 className="mt-6 text-lg font-semibold text-slate-800">Essential Cookies</h3>
        <ul className="space-y-3 pl-2 text-slate-600">
          <li>
            <strong className="text-slate-700">Session Cookies:</strong>
            <p className="pl-4">Required for user authentication and security. These cannot be disabled as they are essential for the service to function.</p>
          </li>
          <li>
            <strong className="text-slate-700">CSRF Protection Cookies:</strong>
            <p className="pl-4">Security cookies that protect against cross-site request forgery attacks.</p>
          </li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-slate-800">Functional Cookies</h3>
         <ul className="space-y-3 pl-2 text-slate-600">
          <li>
            <strong className="text-slate-700">Preference Cookies:</strong>
            <p className="pl-4">Remember your settings and preferences for a personalized experience.</p>
          </li>
          <li>
            <strong className="text-slate-700">Consent Management:</strong>
            <p className="pl-4">Track your cookie preferences and consent choices.</p>
          </li>
        </ul>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <strong>Cookie Management:</strong> You can control cookies through your browser settings. 
          However, disabling essential cookies may prevent the service from functioning properly.
        </div>
      </>
    ),
  },
  {
    icon: <Database className="h-7 w-7 text-blue-800" />,
    title: '3. How We Use Your Information',
    content: (
      <>
        <p>We use your personal information for the following purposes:</p>
        <ul className="space-y-3 text-slate-600">
          <li>
            <strong className="text-slate-700">Service Provision:</strong> To provide, maintain, and improve our inventory management service.
          </li>
          <li>
            <strong className="text-slate-700">Account Management:</strong> To manage your account, process payments, and provide customer support.
          </li>
           <li>
            <strong className="text-slate-700">Security:</strong> To protect against fraud, unauthorized access, and ensure system security.
          </li>
          <li>
            <strong className="text-slate-700">Communication:</strong> To send important service updates, security notices, and support communications.
          </li>
          <li>
            <strong className="text-slate-700">Analytics:</strong> To analyze usage patterns and improve our service (using anonymized data).
          </li>
          <li>
            <strong className="text-slate-700">Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: '4. Data Sharing and Disclosure',
    content: (
       <>
        <p>We may share your information in the following circumstances:</p>
        <ul className="space-y-3 text-slate-600">
          <li>
            <strong className="text-slate-700">Service Providers:</strong> With trusted third-party providers who assist in operating our service (e.g., hosting, payment processing).
          </li>
          <li>
            <strong className="text-slate-700">QuickBooks Integration:</strong> With QuickBooks Online as required for the integration features you've authorized.
          </li>
           <li>
            <strong className="text-slate-700">Legal Requirements:</strong> When required by law, court order, or government request.
          </li>
          <li>
            <strong className="text-slate-700">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice to you).
          </li>
          <li>
            <strong className="text-slate-700">With Your Consent:</strong> For any other purpose with your explicit consent.
          </li>
        </ul>
         <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <strong>Data Protection:</strong> All third-party providers are contractually bound to protect 
          your data and use it only for specified purposes.
        </div>
       </>
    ),
  },
   {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: '5. Data Security and Retention',
    content: (
      <>
        <h3 className="text-lg font-semibold text-slate-800">Security Measures</h3>
        <p>We implement comprehensive security measures to protect your data:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
          <li>Encryption of data in transit and at rest</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Access controls and authentication systems</li>
          <li>Secure data centers with physical security</li>
          <li>Regular security training for staff</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-slate-800">Data Retention</h3>
        <p>We retain your data only as long as necessary:</p>
        <ul className="space-y-3 pl-2 text-slate-600">
          <li>
            <strong className="text-slate-700">Account Data:</strong> Retained while your account is active and for 7 years after closure for legal compliance.
          </li>
           <li>
            <strong className="text-slate-700">Usage Data:</strong> Retained for 2 years for service improvement and security purposes.
          </li>
          <li>
            <strong className="text-slate-700">Payment Data:</strong> Retained for 7 years as required by Australian tax law.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: '6. Your Rights and Choices',
    content: (
      <>
        <p>Under Australian privacy law, you have the following rights:</p>
        <ul className="space-y-3 text-slate-600">
          <li><strong className="text-slate-700">Access:</strong> Request a copy of the personal information we hold about you.</li>
          <li><strong className="text-slate-700">Correction:</strong> Request correction of inaccurate or incomplete information.</li>
          <li><strong className="text-slate-700">Deletion:</strong> Request deletion of your personal information (subject to legal requirements).</li>
          <li><strong className="text-slate-700">Portability:</strong> Request transfer of your data to another service provider.</li>
          <li><strong className="text-slate-700">Objection:</strong> Object to certain types of processing.</li>
          <li><strong className="text-slate-700">Withdraw Consent:</strong> Withdraw consent for processing where consent is the legal basis.</li>
        </ul>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <strong>Exercise Your Rights:</strong> Contact us at privacy@smartpicker.au to exercise any of these rights. 
          We will respond within 30 days and may request verification of your identity.
        </div>
      </>
    ),
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: '7. International Data Transfers',
    content: (
       <>
        <p>Your data may be processed in countries outside Australia, including:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
            <li><strong className="text-slate-700">United States:</strong> For cloud hosting and payment processing services.</li>
            <li><strong className="text-slate-700">European Union:</strong> For certain analytics and support services.</li>
        </ul>
        <p className="mt-4">We ensure adequate protection through:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
            <li>Data processing agreements with service providers</li>
            <li>Standard contractual clauses for EU transfers</li>
            <li>Adequacy decisions where applicable</li>
        </ul>
       </>
    ),
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: "8. Children's Privacy",
    content: (
      <p>
        Our service is designed for business use and is not intended for individuals under 18 years of age. 
        We do not knowingly collect personal information from children. If you believe we have collected 
        information from a child, please contact us immediately.
      </p>
    ),
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-800" />,
    title: '9. Changes to This Policy',
    content: (
       <>
        <p>We may update this Privacy Policy periodically. We will notify you of material changes by:</p>
        <ul className="list-disc space-y-2 pl-6 text-slate-600">
            <li>Posting the updated policy on our website</li>
            <li>Sending emails to registered users</li>
            <li>Displaying updates in the application</li>
        </ul>
        <p className="mt-4">
            Continued use of our service after changes constitutes acceptance of the updated policy.
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


const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <SEO
        title="Privacy Policy - Smart Picker"
        description="Read the Privacy Policy for Smart Picker warehouse management software."
        canonicalUrl="https://smartpicker.au/privacy-policy"
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
              <Shield size={48} className="text-blue-800 mx-auto mb-4" />
              <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-2 text-lg text-slate-500">
                Last updated: {new Date().toLocaleDateString('en-AU')}
              </p>
            </div>

            <p className="text-lg text-slate-700 leading-relaxed mb-10 max-w-4xl mx-auto text-center">
              This Privacy Policy describes how Smart Picker ("Company", "we", "us", or "our") collects, uses, 
              and protects your personal information when you use our inventory management service. This policy 
              complies with the Privacy Act 1988 (Cth) and other applicable Australian privacy laws.
            </p>

            {/* Sections Content */}
            <div className="max-w-4xl mx-auto">
              {policySections.map((section, index) => (
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
                  If you have questions about this Privacy Policy or wish to exercise your rights, contact us:
                </p>
                <div className="text-slate-800">
                  <p className="font-semibold">Smart Picker</p>
                  <p>New South Wales, Australia</p>
                  <p>Support: <a href="mailto:support@smartpicker.au" className="text-blue-700 hover:underline">support@smartpicker.au</a></p>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  For complaints about privacy, you may also contact the Office of the Australian Information Commissioner (OAIC).
                </p>
              </div>
            </div>

          </motion.section>
        </motion.div>
      </main>
    </>
  );
};

export default PrivacyPolicy;