import React from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Container, 
  Grid 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from './AnimatedSection';

const IntegrationSection = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{
      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
      py: { xs: 8, md: 12 },
      px: { xs: 2, sm: 4 },
      color: 'white'
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <AnimatedSection>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box
                  component="img"
                  src="/quickbooks-logo.svg"
                  alt="QuickBooks Integration"
                  sx={{
                    maxWidth: 200,
                    height: 'auto',
                    opacity: 0.9,
                  }}
                />
                <Box
                  component="img"
                  src="/xero-logo.svg"
                  alt="Xero Integration"
                  sx={{
                    maxWidth: 200,
                    height: 'auto',
                    opacity: 0.9,
                  }}
                />
              </Box>
            </AnimatedSection>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AnimatedSection delay={0.2}>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                gutterBottom
                sx={{
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '3rem' },
                  textAlign: { xs: 'center', md: 'left' }
                }}
              >
                Seamless Accounting Integration
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  opacity: 0.95, 
                  lineHeight: 1.6,
                  fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                  textAlign: { xs: 'center', md: 'left' }
                }}
              >
                SmartPicker automatically syncs with both QuickBooks Online and Xero, keeping your inventory,
                orders, and financial data perfectly aligned. No more manual data entry or reconciliation.
              </Typography>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Button 
                  variant="outlined" 
                  size="large" 
                  onClick={() => navigate("/about-us")}
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.4)',
                    color: 'white',
                    borderRadius: '8px',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'white',
                      background: 'rgba(255,255,255,0.1)',
                    }
                  }}
                >
                  Learn More
                </Button>
              </Box>
            </AnimatedSection>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default IntegrationSection;