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
import { motion } from 'framer-motion';
import AnimatedSection from './landing/AnimatedSection';
import InteractiveButton from './landing/InteractiveButton';

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
      {/* Floating Background Elements */}
      <motion.div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '100px',
          height: '100px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          zIndex: 1
        }}
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        style={{
          position: 'absolute',
          top: '20%',
          right: '15%',
          width: '60px',
          height: '60px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          zIndex: 1
        }}
        animate={{
          y: [0, 15, 0],
          x: [0, -8, 0],
          scale: [1, 0.9, 1]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      <motion.div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '20%',
          width: '80px',
          height: '80px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '50%',
          zIndex: 1
        }}
        animate={{
          y: [0, -25, 0],
          x: [0, 12, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
      <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
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
              <motion.span
                style={{
                  background: "linear-gradient(45deg, #FFD700, #FFA500, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFD700)",
                  backgroundSize: "400% 400%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  color: "transparent",
                  display: "inline-block"
                }}
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              >
                hello Smart Picker
              </motion.span>
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
              <InteractiveButton
                variant="contained"
                size="large"
                onClick={() => navigate("/login")}
                endIcon={<ArrowForward />}
                animationType="bounce"
                intensity="medium"
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
                    boxShadow: '0 12px 35px rgba(255,255,255,0.3)',
                  }
                }}
              >
                Get Started Free
              </InteractiveButton>
              <InteractiveButton
                variant="outlined"
                size="large"
                animationType="glow"
                intensity="subtle"
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
              </InteractiveButton>
            </Stack>
          </AnimatedSection>
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;
