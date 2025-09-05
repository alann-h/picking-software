import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
  IconButton
} from '@mui/material';
import {
  Link as RouterLink
} from 'react-router-dom';
import {
  Email,
  GitHub,
  Business,
  Support,
  Info,
  Security
} from '@mui/icons-material';

const Footer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.grey[900],
        color: theme.palette.common.white,
        py: { xs: 4, sm: 6 },
        px: 2,
        mt: 'auto',
        width: '100%',
        overflowX: 'hidden'
      }}
    >
      <Container maxWidth="lg">
        {/* Main Footer Content - Cleaner 2-column layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 6, md: 8 },
            mb: 6,
            minHeight: 'fit-content'
          }}
        >
          {/* Left Column - Company Information */}
          <Box sx={{ minHeight: 'fit-content', overflow: 'visible' }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: 'white', mb: 3 }}>
              Smart Picker
            </Typography>
            <Typography 
              variant="body1" 
              color="grey.300" 
              sx={{ 
                mb: 3, 
                lineHeight: 1.7,
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto',
                fontSize: '1rem'
              }}
            >
              Professional inventory management and order picking software.
              Streamline your warehouse operations with barcode scanning and
              seamless QuickBooks integration.
            </Typography>
            
            {/* Contact & Social */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="grey.400" gutterBottom sx={{ mb: 2 }}>
                Get in Touch
              </Typography>
              <Stack direction="row" spacing={2}>
                <IconButton
                  href="https://github.com/alann-h/picking-software"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'grey.400',
                    '&:hover': {
                      color: theme.palette.primary.main,
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <GitHub />
                </IconButton>
                <IconButton
                  href="mailto:support@smartpicker.au"
                  sx={{
                    color: 'grey.400',
                    '&:hover': {
                      color: theme.palette.primary.main,
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Email />
                </IconButton>
              </Stack>
            </Box>
            
            {/* Company Details */}
            <Box>
              <Typography variant="subtitle2" color="grey.400" gutterBottom sx={{ mb: 2 }}>
                Company
              </Typography>
              <Typography variant="body2" color="grey.300" sx={{ mb: 1 }}>
                New South Wales, Australia
              </Typography>
              <Typography variant="body2" color="grey.300" sx={{ mb: 1 }}>
                Professional inventory management solutions
              </Typography>
              <Typography variant="body2" color="grey.300">
                QuickBooks integration specialists
              </Typography>
            </Box>
          </Box>

          {/* Right Column - Quick Links */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'white', mb: 3 }}>
              Quick Links
            </Typography>
            
            {/* Navigation Links */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" color="grey.400" gutterBottom sx={{ mb: 2 }}>
                Navigation
              </Typography>
              <Stack spacing={2}>
                <Link
                  component={RouterLink}
                  to="/"
                  color="grey.300"
                  sx={{
                    '&:hover': {
                      color: theme.palette.primary.main,
                      textDecoration: 'none'
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'color 0.2s ease',
                    fontSize: '0.95rem'
                  }}
                >
                  <Business sx={{ fontSize: 18 }} />
                  Home
                </Link>
                <Link
                  component={RouterLink}
                  to="/about-us"
                  color="grey.300"
                  sx={{
                    '&:hover': {
                      color: theme.palette.primary.main,
                      textDecoration: 'none'
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'color 0.2s ease',
                    fontSize: '0.95rem'
                  }}
                >
                  <Info sx={{ fontSize: 18 }} />
                  About Us
                </Link>
                <Link
                  component={RouterLink}
                  to="/login"
                  color="grey.300"
                  sx={{
                    '&:hover': {
                      color: theme.palette.primary.main,
                      textDecoration: 'none'
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'color 0.2s ease',
                    fontSize: '0.95rem'
                  }}
                >
                  <Support sx={{ fontSize: 18 }} />
                  Login
                </Link>
              </Stack>
            </Box>
            
            {/* Support & Legal */}
            <Box>
              <Typography variant="subtitle2" color="grey.400" gutterBottom sx={{ mb: 2 }}>
                Support & Legal
              </Typography>
              <Stack spacing={2}>
                <Link
                  href="mailto:support@smartpicker.au"
                  color="grey.300"
                  sx={{
                    '&:hover': {
                      color: theme.palette.primary.main,
                      textDecoration: 'none'
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'color 0.2s ease',
                    fontSize: '0.95rem'
                  }}
                >
                  <Email sx={{ fontSize: 18 }} />
                  support@smartpicker.au
                </Link>
                <Link
                  component={RouterLink}
                  to="/privacy-policy"
                  color="grey.300"
                  sx={{
                    '&:hover': {
                      color: theme.palette.primary.main,
                      textDecoration: 'none'
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'color 0.2s ease',
                    fontSize: '0.95rem'
                  }}
                >
                  <Security sx={{ fontSize: 18 }} />
                  Privacy Policy
                </Link>
                <Link
                  component={RouterLink}
                  to="/terms-of-service"
                  color="grey.300"
                  sx={{
                    '&:hover': {
                      color: theme.palette.primary.main,
                      textDecoration: 'none'
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'color 0.2s ease',
                    fontSize: '0.95rem'
                  }}
                >
                  <Security sx={{ fontSize: 18 }} />
                  Terms of Service
                </Link>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'grey.700', mb: 4 }} />

        {/* Bottom Footer */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', sm: 'center' },
            gap: 3,
            textAlign: { xs: 'center', sm: 'left' },
            py: 2
          }}
        >
          <Typography variant="body2" color="grey.400" sx={{ fontWeight: 500 }}>
            © {currentYear} Smart Picker. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
