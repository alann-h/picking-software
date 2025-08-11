import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import AuthLayout from './components/AuthLayout';

import PrivacyPolicy from './components/PrivacyPolicy';
import EULA from './components/Eula';

import { fetchAndCacheCsrfToken } from './utils/apiHelpers';
import { AuthProvider } from './components/AuthProvider';


const App: React.FC = () => {
  const location = useLocation();
  const disableTopBarLocations = ['/', '/login', '/oauth/callback', '/privacy-policy', '/eula'];
  const disableTopBar = disableTopBarLocations.includes(location.pathname);

  useEffect(() => {
    fetchAndCacheCsrfToken().catch(error => {
        console.error("Initial background CSRF fetch failed:", error);
    });
  }, []);
    
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <AuthProvider>
            <title>Smart Picker</title>
            <link rel="icon" type="image/png" href="/SP.png" />          
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
                <Route element={<AuthLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings/*" element={<Settings />} />
                  <Route path="/quote" element={<Quote />} />
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
          </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;