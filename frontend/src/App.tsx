import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { CssBaseline, Box, ThemeProvider } from '@mui/material';
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

const App: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <HelmetProvider>
          <Helmet>
            <title>Picking Software</title>
            <link rel="icon" type="image/png" href="/SP.png" />          
          </Helmet>
          <CssBaseline />
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
            <TopBar isLoginPage={isLoginPage} />
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/settings" element={<Settings />} />
                <Route path="/quote" element={<Quote />} />
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