import React from 'react';
import { Box, Container, Typography, Link, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Footer: React.FC = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.grey[900],
        color: theme.palette.common.white,
        py: 3,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2">
            © {currentYear} Smart Picker. All rights reserved.
          </Typography>
          <Box>
            <Link
              href="https://github.com/alann-h/picking-software"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              sx={{ '&:hover': { color: theme.palette.primary.main } }}
            >
              GitHub
            </Link>
          </Box>
        </Box>

        {/* Add space between the footer items */}
        <Box mt={2}>
          <Link
            component={RouterLink}
            to="/privacy-policy"
            color="inherit"
            sx={{ '&:hover': { color: theme.palette.primary.main } }}
          >
            Privacy Policy
          </Link>
        </Box>
        <Box mt={2}>
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
