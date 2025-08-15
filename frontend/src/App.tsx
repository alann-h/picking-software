import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box, ThemeProvider } from '@mui/material';
import InitalPage from './components/InitalPage';
import Login from './components/Login';
import OAuthCallbackHandler from './components/OAuthCallbackHandler';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { SnackbarProvider } from './components/SnackbarContext';

import SnackbarComponent from './components/SnackbarComponent';
import Quote from './components/Quote';
import theme from './theme';
import Footer from './components/Footer';
import OrdersToCheckPage from './components/OrdersToCheckPage';
import Runs from './components/Runs';
import AuthLayout from './components/AuthLayout';
import { QuoteSkeleton } from './components/Skeletons';

import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import AboutUs from './components/AboutUs';

import { fetchAndCacheCsrfToken } from './utils/apiHelpers';
import PublicLayout from './components/PublicLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { getPageStructuredData } from './utils/structuredData';


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
              <Routes>
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<InitalPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/about" element={<AboutUs />} />
                </Route>
                {/* Protected Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings/*" element={<Settings />} />
                  <Route path="/quote" element={
                    <ErrorBoundary>
                      <Suspense fallback={<QuoteSkeleton />}> 
                        <Quote /> 
                      </Suspense>
                    </ErrorBoundary>
                    } />
                  <Route path="/orders-to-check" element={<OrdersToCheckPage />} />
                  <Route path="/run" element={<Runs />} />
                </Route>
                {/* Catch-all route - redirects any unknown path to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </Box>
          <SnackbarComponent />
          <Footer />
        </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;