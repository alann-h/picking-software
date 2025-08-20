import React, { Suspense } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Container,
  Stack,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';
import SEO from './SEO';
import { getPageStructuredData } from '../utils/structuredData';
import CookieConsent from './CookieConsent';
import AnimatedSection from './landing/AnimatedSection';
import Hero from './Hero';

// --- LAZY LOAD THE SECTIONS ---
const FeaturesSection = React.lazy(() => import('./landing/FeaturesSection'));
const IntegrationSection = React.lazy(() => import('./landing/IntegrationSection'));
const LearnMoreSection = React.lazy(() => import('./landing/LearnMoreSection'));

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Smart Picker - Efficient Order Preparation | Barcode Scanning App"
        description="Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately. Perfect for warehouses and distribution centers."
        keywords="order picking, barcode scanning, warehouse management, inventory management, QuickBooks integration, mobile app, efficiency, digital lists"
        structuredData={getPageStructuredData('webPage')}
      />
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