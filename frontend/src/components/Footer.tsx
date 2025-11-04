import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Mail,
  Github,
  LogIn,
  Info,
  Shield,
  HelpCircle,
  Newspaper,
  Home,
  Cpu,
  DollarSign,
} from 'lucide-react';

/**
 * Helper component to standardize the appearance of footer links.
 * It renders a react-router Link for internal navigation.
 */
const FooterLink: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode }> = ({ to, icon, children }) => {
  return (
    <RouterLink
      to={to}
      className="group inline-flex items-center gap-3 text-sm text-slate-300 transition-colors duration-200 ease-in-out hover:text-blue-500"
    >
      <span className="transition-transform duration-200 ease-in-out group-hover:-translate-x-1">
        {icon}
      </span>
      <span>{children}</span>
    </RouterLink>
  );
};

/**
 * Helper component for external links (like mailto or target="_blank")
 */
const ExternalFooterLink: React.FC<{ href: string; icon: React.ReactNode; children: React.ReactNode }> = ({ href, icon, children }) => {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="group inline-flex items-center gap-3 text-sm text-slate-300 transition-colors duration-200 ease-in-out hover:text-blue-500"
    >
      <span className="transition-transform duration-200 ease-in-out group-hover:-translate-x-1">
        {icon}
      </span>
      <span>{children}</span>
    </a>
  );
};


const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full overflow-x-hidden bg-slate-900 px-4 py-8 text-white sm:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Main Footer Content - 2-column layout */}
        <div className="mb-12 grid min-h-fit grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          
          {/* Left Column - Company Information */}
          <section className="min-h-fit overflow-visible">
            <h3 className="mb-6 text-2xl font-bold text-white">
              Smart Picker
            </h3>
            <p className="mb-6 break-words text-base leading-relaxed text-slate-300">
              Professional inventory management and order picking software.
              Streamline your warehouse operations with barcode scanning and
              seamless QuickBooks & Xero integration.
            </p>
            
            {/* Contact & Social */}
            <div className="mb-6">
              <h4 className="mb-4 text-sm font-semibold text-slate-400">
                Get in Touch
              </h4>
              <div className="flex flex-row space-x-4">
                <a
                  href="https://github.com/alann-h/picking-software"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View our GitHub repository"
                  className="text-slate-400 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:text-blue-500"
                >
                  <Github />
                </a>
                <a
                  href="mailto:support@smartpicker.com.au"
                  aria-label="Email support"
                  className="text-slate-400 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:text-blue-500"
                >
                  <Mail />
                </a>
              </div>
            </div>
            
            {/* Company Details */}
            <section>
              <h4 className="mb-4 text-sm font-semibold text-slate-400">
                Company
              </h4>
              <p className="mb-1 text-sm text-slate-300">
                New South Wales, Australia
              </p>
              <p className="mb-1 text-sm text-slate-300">
                Professional inventory management solutions
              </p>
              <p className="text-sm text-slate-300">
                QuickBooks & Xero integration specialists
              </p>
            </section>
          </section>

          {/* Right Column - Quick Links */}
          <section>
            <h3 className="mb-6 text-xl font-bold text-white">
              Quick Links
            </h3>
            
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {/* Navigation Links */}
              <section>
                <h4 className="mb-4 text-sm font-semibold text-slate-400">
                  Navigation
                </h4>
                <div className="flex flex-col space-y-4">
                  <FooterLink to="/" icon={<Home size={18} />}>Home</FooterLink>
                  <FooterLink to="/about-us" icon={<Info size={18} />}>About Us</FooterLink>
                  <FooterLink to="/login" icon={<LogIn size={18} />}>Login</FooterLink>
                  <FooterLink to="/faq" icon={<HelpCircle size={18} />}>FAQ</FooterLink>
                  <FooterLink to="/blog" icon={<Newspaper size={18} />}>Blog & Resources</FooterLink>
                  <FooterLink to="/technology" icon={<Cpu size={18} />}>Technology Stack</FooterLink>
                  <FooterLink to="/pricing" icon={<DollarSign size={18} />}>Pricing</FooterLink>
                </div>
              </section>
              
              {/* Support & Legal */}
              <section>
                <h4 className="mb-4 text-sm font-semibold text-slate-400">
                  Support & Legal
                </h4>
                <div className="flex flex-col space-y-4">
                  <ExternalFooterLink href="mailto:support@smartpicker.com.au" icon={<Mail size={18} />}>
                    support@smartpicker.com.au
                  </ExternalFooterLink>
                  <FooterLink to="/privacy-policy" icon={<Shield size={18} />}>
                    Privacy Policy
                  </FooterLink>
                  <FooterLink to="/terms-of-service" icon={<Shield size={18} />}>
                    Terms of Service
                  </FooterLink>
                </div>
              </section>
            </div>
          </section>
        </div>

        <hr className="mb-8 border-slate-700" />

        {/* Bottom Footer */}
        <div className="flex flex-col items-center justify-between gap-6 py-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-medium text-slate-400">
            © {currentYear} Smart Picker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;