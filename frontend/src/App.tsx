import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box, ThemeProvider } from '@mui/material';
import { SnackbarProvider } from './components/SnackbarContext';
import SnackbarComponent from './components/SnackbarComponent';
import LoadingSpinner from './components/LoadingSpinner';
import QuoteLoadingSpinner from './components/QuoteLoadingSpinner';
import ScrollToTop from './components/ScrollToTop';
import theme from './theme';
import Footer from './components/Footer';
import { fetchAndCacheCsrfToken } from './utils/apiHelpers';
import { getPageStructuredData } from './utils/structuredData';

// Lazy load components
const LandingPage = React.lazy(() => import('./components/LandingPage'));
const Login = React.lazy(() => import('./components/Login'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword'));
const OAuthCallbackHandler = React.lazy(() => import('./components/OAuthCallbackHandler'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Settings = React.lazy(() => import('./components/Settings'));
const Quote = React.lazy(() => import('./components/Quote'));
const OrdersToCheckPage = React.lazy(() => import('./components/OrdersToCheckPage'));
const Runs = React.lazy(() => import('./components/Runs'));
const AuthLayout = React.lazy(() => import('./components/AuthLayout'));
const PrivacyPolicy = React.lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./components/TermsOfService'));
const AboutUs = React.lazy(() => import('./components/AboutUs'));
const FAQ = React.lazy(() => import('./components/FAQ'));
const Blog = React.lazy(() => import('./components/Blog'));
const WarehouseEfficiencyGuide = React.lazy(() => import('./components/blog/WarehouseEfficiencyGuide'));
const GoldenShoreCaseStudy = React.lazy(() => import('./components/blog/GoldenShoreCaseStudy'));
const SystemSetupGuide = React.lazy(() => import('./components/blog/SystemSetupGuide'));
const TechnologyStack = React.lazy(() => import('./components/TechnologyStack'));
const Pricing = React.lazy(() => import('./components/Pricing'));
const Demo = React.lazy(() => import('./components/Demo'));
const PublicLayout = React.lazy(() => import('./components/PublicLayout'));
const ErrorBoundary = React.lazy(() => import('./components/ErrorBoundary'));
const OrderHistory = React.lazy(() => import('./components/OrderHistory'));
const KyteToQuickBooksConverter = React.lazy(() => import('./components/KyteToQuickBooksConverter'));


const App: React.FC = () => {
  useEffect(() => {
    fetchAndCacheCsrfToken().catch(error => {
        console.error("Initial background CSRF fetch failed:", error);
    });
  }, []);

  // Add organization structured data
  useEffect(() => {
    const script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(getPageStructuredData('organization'));
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
    
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <title>Smart Picker</title>
        <link rel="icon" type="image/png" href="/SP.png" />          
        <CssBaseline />
        <ErrorBoundary>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: '100vh', 
            width: '100%',
            maxWidth: '100vw',
            overflowX: 'hidden'
          }}>
            <Box sx={{ 
              flexGrow: 1, 
              width: '100%',
              maxWidth: '100vw',
              overflowX: 'hidden'
            }}>
              <ScrollToTop />
              <Routes>
                {/* Public Routes */}
                <Route element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <PublicLayout />
                  </Suspense>
                }>
                  <Route path="/" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LandingPage />
                    </Suspense>
                  } />
                  <Route path="/login" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Login />
                    </Suspense>
                  } />
                  <Route path="/reset-password" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <ResetPassword />
                    </Suspense>
                  } />
                  <Route path="/oauth/callback" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <OAuthCallbackHandler />
                    </Suspense>
                  } />
                  <Route path="/privacy-policy" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <PrivacyPolicy />
                    </Suspense>
                  } />
                  <Route path="/terms-of-service" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <TermsOfService />
                    </Suspense>
                  } />
                  <Route path="/about-us" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <AboutUs />
                    </Suspense>
                  } />
                  <Route path="/faq" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <FAQ />
                    </Suspense>
                  } />
                  <Route path="/technology" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <TechnologyStack />
                    </Suspense>
                  } />
                  <Route path="/pricing" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Pricing />
                    </Suspense>
                  } />
                  <Route path="/demo" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Demo />
                    </Suspense>
                  } />
                  <Route path="/blog" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Blog />
                    </Suspense>
                  } />
                  <Route path="/blog/warehouse-efficiency-guide" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <WarehouseEfficiencyGuide />
                    </Suspense>
                  } />
                  <Route path="/blog/golden-shore-case-study" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <GoldenShoreCaseStudy />
                    </Suspense>
                  } />
                  <Route path="/blog/system-setup-guide" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <SystemSetupGuide />
                    </Suspense>
                  } />
                  <Route path="/about" element={<Navigate to="/about-us" replace />} />
                </Route>
                {/* Protected Routes */}
                <Route element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AuthLayout />
                  </Suspense>
                }>
                  <Route path="/dashboard" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="/settings/*" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Settings />
                    </Suspense>
                  } />
                  <Route path="/quote" element={
                    <Suspense fallback={<QuoteLoadingSpinner />}> 
                      <Quote /> 
                    </Suspense>
                  } />
                  <Route path="/orders-to-check" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <OrdersToCheckPage />
                    </Suspense>
                  } />
                  <Route path="/order-history" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <OrderHistory />
                    </Suspense>
                  } />
                  <Route path="/run" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Runs />
                    </Suspense>
                  } />
                  <Route path="/kyte-converter" element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <KyteToQuickBooksConverter />
                    </Suspense>
                  } />
                </Route>
                {/* Catch-all route - redirects any unknown path to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </Box>
          <SnackbarComponent />
          <Footer />
        </ErrorBoundary>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;