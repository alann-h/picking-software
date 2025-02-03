import React from 'react';
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
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  const location = useLocation();
  const disableTopBarLocations = ['/', '/login', '/oauth/callback'];
  const disableTopBar = disableTopBarLocations.includes(location.pathname);

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
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/quote" element={
                  <ProtectedRoute>
                    <Quote />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/orders-to-check" element={
                  <ProtectedRoute>
                    <OrdersToCheckPage />
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