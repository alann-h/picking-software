import React, { ReactNode } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Card,
  CardContent,
  Stack,
  Chip
} from '@mui/material';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowForward, Smartphone, CloudSync, CheckCircle, Assignment } from '@mui/icons-material';
import SEO from './SEO';
import { getPageStructuredData } from '../utils/structuredData';
import CookieConsent from './CookieConsent';

const AnimatedSection: React.FC<{ children: ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay }}
    >
      {children}
    </motion.div>
  );
};

const FeatureCard: React.FC<{
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}> = ({ icon, title, description, delay = 0 }) => (
  <AnimatedSection delay={delay}>
    <Card
      elevation={0}
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(59,130,246,0.1)',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 20px 40px rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.2)',
        }
      }}
    >
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
            color: 'white',
            fontSize: '2rem'
          }}
        >
          {icon}
        </Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#1F2937' }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6, color: '#6B7280' }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  </AnimatedSection>
);

const InitalPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Smart Picker - Efficient Order Preparation | Barcode Scanning App"
        description="Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately. Perfect for warehouses and distribution centers."
        keywords="order picking, barcode scanning, warehouse management, inventory management, QuickBooks integration, mobile app, efficiency, digital lists"
        structuredData={getPageStructuredData('webPage')}
      />
      <Box sx={{ backgroundColor: '#FFFFFF' }}>
      {/* Hero Section */}
      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.3,
          }
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
                fontWeight="bold"
                sx={{
                  fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                  mb: 3,
                  lineHeight: 1.1,
                  textShadow: '0 4px 20px rgba(0,0,0,0.1)'
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
                    background: 'linear-gradient(45deg, #FFFFFF, #F3F4F6)',
                    color: '#1E40AF',
                    px: 4,
                    py: 1.5,
                    borderRadius: '8px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    boxShadow: '0 8px 25px rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #F3F4F6, #FFFFFF)',
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

      {/* Features Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 4 }, backgroundColor: '#F8FAFC' }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ color: '#1F2937' }}>
                Why Choose Smart Picker?
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto', color: '#6B7280' }}>
                Built for modern businesses that need efficiency, accuracy, and simplicity
              </Typography>
            </Box>
          </AnimatedSection>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FeatureCard
                icon={<Smartphone />}
                title="Mobile-First Design"
                description="Scan barcodes and manage inventory directly from your smartphone or tablet. No more paper-based processes."
                delay={0.2}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FeatureCard
                icon={<CloudSync />}
                title="Real-Time Sync"
                description="All your data syncs instantly across devices and integrates seamlessly with QuickBooks Online."
                delay={0.4}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FeatureCard
                icon={<Assignment />}
                title="Run-Based System"
                description="Group orders into efficient 'runs' for pickers to prepare multiple orders simultaneously, maximizing warehouse productivity."
                delay={0.6}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Integration Section */}
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
                <Box
                  component="img"
                  src="https://quickbooks.intuit.com/cas/dam/IMAGE/A732uaqi3/standardlogo.png"
                  alt="QuickBooks Integration"
                  sx={{
                    width: '100%',
                    maxWidth: 300,
                    height: 'auto',
                    filter: 'brightness(0) invert(1)',
                    opacity: 0.9,
                    mx: 'auto',
                    display: 'block'
                  }}
                />
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
                  Seamless QuickBooks Integration
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
                  SmartPicker automatically syncs with QuickBooks Online, keeping your inventory,
                  orders, and financial data perfectly aligned. No more manual data entry or reconciliation.
                </Typography>
                <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                  <Button 
                    variant="outlined" 
                    size="large" 
                    onClick={() => navigate("/about")}
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

      {/* Learn More Section */}
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
                  onClick={() => navigate("/about")}
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

      {/* CTA Section
      <Box sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Container maxWidth="md">
          <AnimatedSection>
            <Typography variant="h2" fontWeight="bold" gutterBottom>
              Ready to Transform Your Business?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              Join thousands of businesses that have already streamlined their inventory management
              with Smart Picker. Start your free trial today.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/login")}
              endIcon={<ArrowForward />}
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                px: 6,
                py: 2,
                borderRadius: '50px',
                fontSize: '1.2rem',
                fontWeight: 600,
                  boxShadow: '0 10px 30px rgba(102,126,234,0.3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #764ba2, #667eea)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 15px 40px rgba(102,126,234,0.4)',
                    }
              }}
            >
              Start Free Trial
            </Button>
          </AnimatedSection>
        </Container>
      </Box> */}
    </Box>
    
    {/* Cookie Consent Banner */}
    <CookieConsent
      onAccept={() => {
        console.log('Cookies accepted');
      }}
      onDecline={() => {
        console.log('Cookies declined');
      }}
    />
    </>
  );
};

export default InitalPage;
