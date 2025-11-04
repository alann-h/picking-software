import React from 'react';
import SEO from './SEO';
import { getPageStructuredData } from '../utils/structuredData';
import CookieConsent from './CookieConsent';
import Hero from './Hero';
import FeaturesSection from './landing/FeaturesSection';
import IntegrationSection from './landing/IntegrationSection';
import PricingTeaser from './landing/PricingTeaser';
import LearnMoreSection from './landing/LearnMoreSection';

const LandingPage: React.FC = () => {
  return (
    <>
      <SEO 
        title="Smart Picker"
        description="Smart Picker is a professional warehouse management software with barcode scanning, QuickBooks integration, and Xero integration. Streamline order picking, eliminate errors, and boost warehouse efficiency."
        keywords="warehouse management, order picking software, barcode scanning, QuickBooks integration, Xero integration, inventory management, warehouse efficiency, mobile order picking, digital picking lists"
        canonicalUrl="https://smartpicker.com.au/"
        structuredData={getPageStructuredData('webPage')}
      />
      
      <main className="bg-white font-sans">
      
      {/* --- HERO SECTION --- */}
      <Hero />

      {/* --- FEATURES SECTION --- */}
      <FeaturesSection />

      {/* --- INTEGRATION SECTION --- */}
      <IntegrationSection />

      {/* --- PRICING TEASER --- */}
      <PricingTeaser />

      {/* --- LEARN MORE SECTION --- */}
      <LearnMoreSection />

      {/* --- COOKIE CONSENT --- */}
      <CookieConsent 
        onAccept={() => console.log('Cookies accepted')}
      />
      
      </main>
    </>
  );
};

export default LandingPage;