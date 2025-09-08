import React, { Suspense } from 'react';
import { 
  Box, 
} from '@mui/material';
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
        <Box sx={{ 
          position: 'fixed', 
          top: 10, 
          right: 10, 
          zIndex: 9999,
          background: isCached ? '#4CAF50' : '#FF9800',
          color: 'white',
          px: 2,
          py: 1,
          borderRadius: 1,
          fontSize: '0.8rem',
          opacity: isLoading ? 0.7 : 1
        }}>
          {isLoading ? 'Caching...' : isCached ? 'Cached' : 'Not Cached'}
        </Box>
      )}
      
      <Box sx={{ backgroundColor: '#FFFFFF' }}>
      
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
        onDecline={() => console.log('Cookies declined')}
      />
      </Box>
    </>
  );
};

export default LandingPage;