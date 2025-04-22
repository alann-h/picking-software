import React, { ReactNode } from 'react';
import { Button, Box, Typography, Container, Grid, useTheme } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface AnimatedSectionProps {
  children: ReactNode;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({ children }) => {
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

  const handleTrySmartPickerClick = () => {
    navigate("/login");
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <AnimatedSection>
            <Typography 
              variant="h1" 
              component="h1" 
              gutterBottom 
              fontWeight="bold" 
              color="primary"
              sx={{
                fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                marginBottom: 4,
              }}
            >
              Goodbye spreadsheets,<br />hello Smart Picker
            </Typography>
          </AnimatedSection>
          <AnimatedSection>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              gutterBottom
              sx={{
                marginBottom: 4,
              }}
            >
              Manage your stock and orders from any device
            </Typography>
          </AnimatedSection>
          <AnimatedSection>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleTrySmartPickerClick}
              sx={{
                mt: 4,
                fontSize: '1.2rem',
                padding: '12px 24px',
                borderRadius: '30px',
              }}
            >
              Try SmartPicker here
            </Button>
          </AnimatedSection>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ backgroundColor: theme.palette.background.paper, py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Box
                  component="img"
                  src="https://t3.ftcdn.net/jpg/04/18/86/92/360_F_418869208_hK7u41kiZti2GiF9Z9ARujhlhM7pOAiv.jpg"
                  alt="Barcode Scanner"
                  sx={{
                    width: '100%',
                    maxWidth: '400px',
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                />
              </AnimatedSection>
            </Grid>
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Typography variant="h3" component="h2" gutterBottom fontWeight="bold">
                  Fulfill from your phone
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Scan to receive or fulfill orders from your iPhone or Android device.
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  sx={{
                    mt: 2,
                    borderRadius: '30px',
                  }}
                >
                  Learn More
                </Button>
              </AnimatedSection>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* QuickBooks Section */}
      <Box sx={{ backgroundColor: theme.palette.background.default, py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Box
                  component="img"
                  src="https://quickbooks.intuit.com/cas/dam/IMAGE/A732uaqi3/standardlogo.png"
                  alt="QuickBooks Logo"
                  sx={{
                    width: '100%',
                    maxWidth: '300px',
                    height: 'auto',
                    mx: 'auto',
                    display: 'block',
                  }}
                />
              </AnimatedSection>
            </Grid>
            <Grid item xs={12} md={6}>
              <AnimatedSection>
                <Typography variant="h3" component="h2" gutterBottom fontWeight="bold">
                  Connects to QuickBooks Online
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  SmartPicker seamlessly integrates with QuickBooks Online accounting software, 
                  allowing you to sync your inventory and orders effortlessly. 
                  Streamline your operations with our barcode scanning feature.
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  sx={{
                    mt: 2,
                    borderRadius: '30px',
                  }}
                >
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