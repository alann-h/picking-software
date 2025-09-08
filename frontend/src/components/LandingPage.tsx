import React, { Suspense } from 'react';
import SEO from './SEO';
import { getPageStructuredData } from '../utils/structuredData';
import CookieConsent from './CookieConsent';
import Hero from './Hero';
import { useLandingPageCache } from '../hooks/useLandingPageCache';

// --- LAZY LOAD THE SECTIONS ---
const FeaturesSection = React.lazy(() => import('./landing/FeaturesSection'));
const IntegrationSection = React.lazy(() => import('./landing/IntegrationSection'));
const PricingTeaser = React.lazy(() => import('./landing/PricingTeaser'));
const LearnMoreSection = React.lazy(() => import('./landing/LearnMoreSection'));

const LandingPage: React.FC = () => {
  const { isCached, isLoading } = useLandingPageCache();

  return (
    <>
      <SEO 
        title="Smart Picker - Efficient Order Preparation | Barcode Scanning App"
        description="Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately. Perfect for warehouses and distribution centers."
        keywords="order picking, barcode scanning, warehouse management, inventory management, QuickBooks integration, Xero integration, mobile app, efficiency, digital lists"
        structuredData={getPageStructuredData('webPage')}
      />
      
      {/* Cache Status Indicator (Development Only) */}
      {import.meta.env.VITE_APP_ENV === 'development' && (
        <div className={`fixed top-2.5 right-2.5 z-[9999] text-white px-4 py-2 rounded-md text-xs font-semibold shadow-lg transition-opacity ${
          isCached ? 'bg-green-500' : 'bg-orange-400'
        } ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
        {isLoading ? 'Caching...' : isCached ? 'Cached' : 'Not Cached'}
      </div>
      )}
      
      <main className="bg-white font-sans">
      
      {/* --- HERO SECTION --- */}
      <Hero />

      {/* --- FEATURES SECTION --- */}
      <Suspense fallback={<div>Loading features...</div>}>
        <FeaturesSection />
      </Suspense>

      {/* --- INTEGRATION SECTION --- */}
      <Suspense fallback={<div>Loading integrations...</div>}>
        <IntegrationSection />
      </Suspense>

      {/* --- PRICING TEASER --- */}
      <Suspense fallback={<div>Loading pricing...</div>}>
        <PricingTeaser />
      </Suspense>

      {/* --- LEARN MORE SECTION --- */}
      <Suspense fallback={<div>Loading more info...</div>}>
        <LearnMoreSection />
      </Suspense>

      {/* --- COOKIE CONSENT --- */}
      <CookieConsent 
        onAccept={() => console.log('Cookies accepted')}
      />
      </main>
    </>
  );
};

export default LandingPage;