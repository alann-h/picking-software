import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Typography, Container, Paper, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

const Demo: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get state passed from Hero component
  const heroState = location.state as { source?: string; section?: string } | null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate(-1)}
                sx={{ mb: 2 }}
              >
                Back
              </Button>
              
              <Typography variant="h4" component="h1" gutterBottom>
                Smart Picker Demo
              </Typography>
              
              {heroState?.source === 'hero' && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Welcome from the Hero section! You're viewing the {heroState.section} demo.
                </Typography>
              )}
            </Box>

            <Box sx={{ 
              aspectRatio: '16/9', 
              bgcolor: 'grey.100', 
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3
            }}>
              <Typography variant="h6" color="text.secondary">
                Demo Video Placeholder
              </Typography>
            </Box>

            <Typography variant="body1" paragraph>
              This is where you would embed your demo video or interactive demo.
              You could use:
            </Typography>

            <Box component="ul" sx={{ pl: 2 }}>
              <li>YouTube embed</li>
              <li>Vimeo embed</li>
              <li>Custom video player</li>
              <li>Interactive product tour</li>
              <li>Screen recording walkthrough</li>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                size="large"
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/pricing')}
                size="large"
              >
                View Pricing
              </Button>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Demo;
