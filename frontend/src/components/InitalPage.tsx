import React, { ReactNode } from 'react';
import { Button, Box, Typography, Container, Grid, useTheme, useMediaQuery } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const AnimatedSection: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8 }}
    >
      {children}
    </motion.div>
  );
};

const InitalPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default}}>
      {/* Fullscreen Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          minWidth: '100vw', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Container maxWidth={false} sx={{ width: '100%', maxWidth: { xs: '100%', sm: 'lg' }, px: { xs: 2, sm: 3 } }}>
          <AnimatedSection>
            <Typography variant="h1" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '2.5rem', sm: '4rem', md: '5rem' }, mb: 4 }}>
              Goodbye spreadsheets,<br />hello Smart Picker
            </Typography>
          </AnimatedSection>
          <AnimatedSection>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Manage your stock and orders from any device
            </Typography>
          </AnimatedSection>
          <AnimatedSection>
            <Button
              variant="contained"
              color="primary"
              fullWidth={isMobile}
              onClick={() => navigate("/login")}
              sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, px: { xs: 3, sm: 4 }, py: { xs: 1.5, sm: 2 }, borderRadius: '30px' }}
            >
              Try SmartPicker here
            </Button>
          </AnimatedSection>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ backgroundColor: theme.palette.background.paper, py: { xs: 10, md: 14 }, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth={false} sx={{ width: '100%', maxWidth: { xs: '100%', sm: 'lg' }, px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Box component="img" src="https://t3.ftcdn.net/jpg/04/18/86/92/360_F_418869208_hK7u41kiZti2GiF9Z9ARujhlhM7pOAiv.jpg" alt="Barcode Scanner"
                  sx={{ width: '100%', maxWidth: 400, height: 'auto', borderRadius: 2, boxShadow: 3, display: 'block', mx: 'auto' }}
                />
              </AnimatedSection>
            </Grid>
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Fulfill from your phone
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Scan to receive or fulfill orders from your iPhone or Android device.
                </Typography>
                <Button variant="outlined" color="primary" size="large" sx={{ mt: 2, borderRadius: '30px' }}>
                  Learn More
                </Button>
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* QuickBooks Section */}
      <Box sx={{ backgroundColor: theme.palette.background.default, py: { xs: 10, md: 14 }, px: { xs: 2, sm: 4 } }}>
        <Container maxWidth={false} sx={{ width: '100%', maxWidth: { xs: '100%', sm: 'lg' }, px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Box component="img" src="https://quickbooks.intuit.com/cas/dam/IMAGE/A732uaqi3/standardlogo.png" alt="QuickBooks Logo"
                  sx={{ width: '100%', maxWidth: 300, height: 'auto', display: 'block', mx: 'auto' }}
                />
              </AnimatedSection>
            </Grid>
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Connects to QuickBooks Online
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  SmartPicker seamlessly integrates with QuickBooks Online accounting software to sync inventory and orders.
                </Typography>
                <Button variant="outlined" color="primary" size="large" sx={{ mt: 2, borderRadius: '30px' }}>
                  Learn More
                </Button>
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default InitalPage;
