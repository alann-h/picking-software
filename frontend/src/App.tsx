import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { CssBaseline, Box, ThemeProvider } from '@mui/material';
import InitalPage from './components/InitalPage';
import Login from './components/Login';
import OAuthCallbackHandler from './components/OAuthCallbackHandler';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { SnackbarProvider } from './components/SnackbarContext';
import SnackbarComponent from './components/SnackbarComponent';
import TopBar from './components/TopBar';
import Quote from './components/Quote';
import theme from './theme';
import Footer from './components/Footer';
import OrdersToCheckPage from './components/OrdersToCheckPage';
import Runs from './components/Runs';

import ProtectedRoute from './components/ProtectedRoute';
import PrivacyPolicy from './components/PrivacyPolicy';
import EULA from './components/Eula';

import { fetchAndCacheCsrfToken } from './utils/apiHelpers';
import LogoLoader from './components/LogoLoader';


const App: React.FC = () => {
  const location = useLocation();
  const disableTopBarLocations = ['/', '/login', '/oauth/callback', '/privacy-policy', '/eula'];
  const disableTopBar = disableTopBarLocations.includes(location.pathname);

  const [isCsrfTokenLoading, setIsCsrfTokenLoading] = useState(true);
    
  useEffect(() => {
    const loadCsrfToken = async () => {
        try {
            await fetchAndCacheCsrfToken();
            console.log("CSRF token fetched and cached successfully on app startup.");
        } catch (error) {
            console.error("Failed to fetch initial CSRF token:", error);
        } finally {
            setIsCsrfTokenLoading(false);
        }
    };
    loadCsrfToken();
  }, []);

    if (isCsrfTokenLoading) {
        // Use your new LogoLoader component here
        return <LogoLoader />;
    }
    
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <HelmetProvider>
          <Helmet>
            <title>Smart Picker</title>
            <link rel="icon" type="image/png" href="/SP.png" />          
          </Helmet>
          <CssBaseline />
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
            <TopBar disableTopBar={disableTopBar} />
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<InitalPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/eula" element={<EULA />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/settings/*" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/quote" element={
                  <ProtectedRoute>
                    <Quote />
                  </ProtectedRoute>
                } />
                <Route path="/orders-to-check" element={
                  <ProtectedRoute>
                    <OrdersToCheckPage />
                  </ProtectedRoute>
                } />

                <Route path="/run" element={
                  <ProtectedRoute>
                    <Runs />
                  </ProtectedRoute>
                } />
                {/* Catch-all route - redirects any unknown path to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </Box>
          <SnackbarComponent />
          <Footer />
        </HelmetProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;