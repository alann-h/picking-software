import React from 'react';
import { Box, Container, Typography, Link, useTheme, useMediaQuery } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

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
        py: { xs: 3, sm: 4 },
        px: 2,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" textAlign={isMobile ? 'center' : 'left'} width="100%">
            © {currentYear} Smart Picker. All rights reserved.
          </Typography>

          <Link
            href="https://github.com/alann-h/picking-software"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            sx={{
              '&:hover': { color: theme.palette.primary.main },
              textAlign: isMobile ? 'center' : 'right',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            GitHub
          </Link>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'center', sm: 'flex-start' },
            alignItems: 'center',
            gap: 2,
            mt: 3,
            textAlign: 'center',
          }}
        >
          <Link
            component={RouterLink}
            to="/privacy-policy"
            color="inherit"
            sx={{ '&:hover': { color: theme.palette.primary.main } }}
          >
            Privacy Policy
          </Link>
          <Link
            component={RouterLink}
            to="/eula"
            color="inherit"
            sx={{ '&:hover': { color: theme.palette.primary.main } }}
          >
            EULA
          </Link>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
