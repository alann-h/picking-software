import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { CssBaseline, Box } from '@mui/material';
import Login from './components/Login'
import OAuthCallbackHandler from './components/OAuthCallbackHandler'

const App = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>Picking Software</title>
      </Helmet>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Box sx={{ flexGrow: 1, padding: 3 }}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/oauth/callback" Component={OAuthCallbackHandler} />
            </Routes>
        </Box>
      </Box>
    </HelmetProvider>
  );
}

export default App;
