import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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

const App: React.FC = () => {
  const location = useLocation();
  const disableTopBar = (location.pathname === '/' || location.pathname === '/login');

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
            <TopBar isInitalPage={disableTopBar} />
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Routes>
                <Route path="/" element={<InitalPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/settings" element={<Settings />} />
                <Route path="/quote" element={<Quote />} />
                <Route path="/dashboard/orders-to-check" element={<OrdersToCheckPage />} />
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