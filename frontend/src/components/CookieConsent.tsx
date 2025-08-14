import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Link,
  Stack,
  useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Close } from '@mui/icons-material';

interface CookieConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
  const [isVisible, setIsVisible] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    onAccept();
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setIsVisible(false);
    onDecline();
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: '16px'
        }}
      >
        <Paper
          elevation={8}
          sx={{
            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
            color: 'white',
            borderRadius: 2,
            p: 3,
            maxWidth: '1200px',
            mx: 'auto',
            position: 'relative'
          }}
        >
          <Button
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              minWidth: 'auto',
              p: 0.5
            }}
          >
            <Close />
          </Button>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info sx={{ fontSize: 28 }} />
              <Typography variant="h6" fontWeight="bold">
                We use cookies
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.5 }}>
                  We use cookies to enhance your experience, provide personalized content, and analyze our traffic. 
                  By clicking "Accept All", you consent to our use of cookies. 
                  <Link 
                    href="/terms-of-service" 
                    sx={{ 
                      color: 'white', 
                      textDecoration: 'underline',
                      '&:hover': { opacity: 0.8 }
                    }}
                  >
                    Learn more
                  </Link>
                </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 'fit-content' }}>
              <Button
                variant="outlined"
                onClick={handleDecline}
                sx={{
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    background: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                Decline
              </Button>
              <Button
                variant="contained"
                onClick={handleAccept}
                sx={{
                  background: 'white',
                  color: '#1E40AF',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'rgba(255,255,255,0.9)',
                  }
                }}
              >
                Accept All
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsent;
