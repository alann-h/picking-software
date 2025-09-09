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
        title="Smart Picker - Efficient Order Preparation | Barcode Scanning App"
        description="Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately. Perfect for warehouses and distribution centers."
        keywords="order picking, barcode scanning, warehouse management, inventory management, QuickBooks integration, Xero integration, mobile app, efficiency, digital lists"
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