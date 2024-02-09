import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { CssBaseline, Box } from '@mui/material';
import Login from './components/Login'

const App = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>Sample App</title>
      </Helmet>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Box sx={{ flexGrow: 1, padding: 3 }}>
            <Routes>
              <Route path="/" element={<Login />} />
            </Routes>
        </Box>
      </Box>
    </HelmetProvider>
  );
}

export default App;
