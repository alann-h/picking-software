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
        {/* Main Footer Content */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' },
            gap: { xs: 4, sm: 6 },
            mb: 4,
            minHeight: 'fit-content'
          }}
        >
          {/* Company Information */}
          <Box sx={{ minHeight: 'fit-content', overflow: 'visible' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
              Smart Picker
            </Typography>
            <Typography 
              variant="body2" 
              color="grey.300" 
              sx={{ 
                mb: 2, 
                lineHeight: 1.6,
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto'
              }}
            >
              Professional inventory management and order picking software.
              Streamline your warehouse operations with barcode scanning and
              seamless QuickBooks integration.
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

          {/* Product Links */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
              Product
            </Typography>
            <Stack spacing={1}>
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
                  gap: 1,
                  transition: 'color 0.2s ease'
                }}
              >
                <Business sx={{ fontSize: 16 }} />
                Home
              </Link>
              <Link
                component={RouterLink}
                to="/about"
                color="grey.300"
                sx={{
                  '&:hover': {
                    color: theme.palette.primary.main,
                    textDecoration: 'none'
                  },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  transition: 'color 0.2s ease'
                }}
              >
                <Info sx={{ fontSize: 16 }} />
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
                  gap: 1,
                  transition: 'color 0.2s ease'
                }}
              >
                <Support sx={{ fontSize: 16 }} />
                Login
              </Link>
            </Stack>
          </Box>

          {/* Support Links */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
              Support
            </Typography>
            <Stack spacing={1}>
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
                  gap: 1,
                  transition: 'color 0.2s ease'
                }}
              >
                <Email sx={{ fontSize: 16 }} />
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
                  gap: 1,
                  transition: 'color 0.2s ease'
                }}
              >
                <Security sx={{ fontSize: 16 }} />
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
                  gap: 1,
                  transition: 'color 0.2s ease'
                }}
              >
                <Security sx={{ fontSize: 16 }} />
                Terms of Service
              </Link>
            </Stack>
          </Box>

          {/* Company Links */}
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
              Company
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="grey.300">
                New South Wales, Australia
              </Typography>
              <Typography variant="body2" color="grey.300">
                Professional inventory management solutions
              </Typography>
              <Typography variant="body2" color="grey.300">
                QuickBooks integration specialists
              </Typography>
            </Stack>
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
            gap: 2,
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          <Typography variant="body2" color="grey.400">
            © {currentYear} Smart Picker. All rights reserved.
          </Typography>

          <Typography variant="body2" color="grey.400">
            Made with ❤️ in NSW, Australia
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
