import React from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Container, 
  Grid,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowForward, CheckCircle } from '@mui/icons-material';
import AnimatedSection from './AnimatedSection';

const LearnMoreSection = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 4 }, backgroundColor: '#FFFFFF' }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <AnimatedSection>
              <Typography variant="h3" fontWeight="bold" sx={{ color: '#1F2937', mb: 1 }}>
                Discover Smart Picker's Full Potential
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6, color: '#6B7280' }}>
                Learn how our comprehensive warehouse management platform combines advanced customer search, 
                intelligent run systems, barcode validation, and seamless QuickBooks integration to 
                revolutionize your order fulfillment process.
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                  <Typography variant="body1" sx={{ color: '#374151' }}>Advanced customer search and quote management</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                  <Typography variant="body1" sx={{ color: '#374151' }}>Smart run system for optimized warehouse operations</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                  <Typography variant="body1" sx={{ color: '#374151' }}>Barcode scanning with 100% accuracy guarantee</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                  <Typography variant="body1" sx={{ color: '#374151' }}>Comprehensive user management and security</Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/about-us")}
                endIcon={<ArrowForward />}
                sx={{
                  mt: 3,
                  background: 'linear-gradient(45deg, #1E40AF, #3B82F6)',
                  px: 6,
                  py: 2,
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  boxShadow: '0 10px 30px rgba(30,64,175,0.3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #3B82F6, #1E40AF)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 15px 40px rgba(30,64,175,0.4)',
                  }
                }}
              >
                Learn More About Smart Picker
              </Button>
            </AnimatedSection>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AnimatedSection delay={0.2}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                  borderRadius: 4,
                  p: 4,
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
                  Why Choose Smart Picker?
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                    <CheckCircle sx={{ color: 'white', fontSize: 24 }} />
                    <Typography variant="body1">Eliminate picking errors completely</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                    <CheckCircle sx={{ color: 'white', fontSize: 24 }} />
                    <Typography variant="body1">Streamline warehouse operations</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                    <CheckCircle sx={{ color: 'white', fontSize: 24 }} />
                    <Typography variant="body1">Seamless QuickBooks integration</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                    <CheckCircle sx={{ color: 'white', fontSize: 24 }} />
                    <Typography variant="body1">Mobile-first design for warehouse staff</Typography>
                  </Box>
                </Stack>
              </Box>
            </AnimatedSection>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LearnMoreSection;