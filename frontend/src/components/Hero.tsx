import React from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Container,
  Chip,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';
import AnimatedSection from './landing/AnimatedSection';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center', color: 'white', width: '100%' }}>
          <AnimatedSection>
            <Chip
              label="✨ Professional Inventory Management"
              sx={{
                mb: 3,
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            />
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                mb: 3,
                lineHeight: 1.1,
                textShadow: '0 4px 20px rgba(0,0,0,0.1)',
                fontWeight: 'bold'
              }}
            >
              Goodbye spreadsheets,<br />
              <Box component="span" sx={{ background: 'linear-gradient(45deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                hello Smart Picker
              </Box>
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <Typography
              variant="h5"
              sx={{
                mb: 4,
                opacity: 0.95,
                fontWeight: 400,
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.4
              }}
            >
              Streamline your inventory management with our intelligent picking system.
              Manage stock and orders from any device, anywhere.
            </Typography>
          </AnimatedSection>

          <AnimatedSection delay={0.6}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/login")}
                endIcon={<ArrowForward />}
                sx={{
                  background: 'rgba(255,255,255,0.9)',
                  color: '#1E40AF',
                  px: 4,
                  py: 1.5,
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  boxShadow: '0 8px 25px rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  '&:hover': {
                    background: 'rgba(255,255,255,1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 35px rgba(255,255,255,0.3)',
                  }
                }}
              >
                Get Started Free
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: 'white',
                    background: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                Watch Demo
              </Button>
            </Stack>
          </AnimatedSection>
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;
