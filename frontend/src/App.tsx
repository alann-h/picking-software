import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { CssBaseline, Box } from '@mui/material';

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
              <Route path="/" element={<SamplePage />} />
            </Routes>
        </Box>
      </Box>
    </HelmetProvider>
  );
}

const SamplePage = () => {
  return <Box>This is a sample page.</Box>;
}

export default App;
