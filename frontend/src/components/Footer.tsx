import React from 'react';
import { Box, Container, Typography, Link, useTheme } from '@mui/material';

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
            © {currentYear} SmartPicker. All rights reserved.
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
      </Container>
    </Box>
  );
};

export default Footer;