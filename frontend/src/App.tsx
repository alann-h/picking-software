import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from './components/SnackbarContext';
import SnackbarComponent from './components/SnackbarComponent';
import QuoteLoadingSpinner from './components/QuoteLoadingSpinner';
import ScrollToTop from './components/ScrollToTop';
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
    <SnackbarProvider>
      <link rel="icon" type="image/png" href="/SP.png" />          
      <ErrorBoundary>
        <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden">
          <div className="flex-grow w-full max-w-[100vw] overflow-x-hidden">
            <ScrollToTop />
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/technology" element={<TechnologyStack />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/warehouse-efficiency-guide" element={<WarehouseEfficiencyGuide />} />
                <Route path="/blog/golden-shore-case-study" element={<GoldenShoreCaseStudy />} />
                <Route path="/blog/system-setup-guide" element={<SystemSetupGuide />} />
                <Route path="/about" element={<Navigate to="/about-us" replace />} />
              </Route>
              {/* Protected Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings/*" element={<Settings />} />
                <Route path="/quote" element={
                  <Suspense fallback={<QuoteLoadingSpinner />}> 
                    <Quote /> 
                  </Suspense>
                } />
                <Route path="/orders-to-check" element={<OrdersToCheckPage />} />
                <Route path="/order-history" element={<OrderHistory />} />
                <Route path="/run" element={<Runs />} />
                <Route path="/kyte-converter" element={<KyteToQuickBooksConverter />} />
              </Route>
              {/* Catch-all route - redirects any unknown path to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <SnackbarComponent />
          <Footer />
        </div>
      </ErrorBoundary>
      </SnackbarProvider>
    );
  };

export default App;