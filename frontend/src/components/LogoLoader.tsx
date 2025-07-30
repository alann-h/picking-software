import React from 'react';
import { Box, Typography, ThemeProvider, CssBaseline } from '@mui/material';
import { keyframes } from '@mui/system';
import theme from '../theme';

const colorFill = keyframes`
  0% {
    filter: grayscale(100%) brightness(150%); /* Start lighter and desaturated */
    transform: scale(0.95); /* Optional: slight scale effect */
  }
  50% {
    filter: grayscale(50%) brightness(120%); /* Mid-point */
    transform: scale(1.02);
  }
  100% {
    filter: grayscale(0%) brightness(100%); /* Full color, normal brightness */
    transform: scale(1); /* Return to normal size */
  }
`;

interface LogoLoaderProps {
  message?: string;
  subMessage?: string;
}

const LogoLoader: React.FC<LogoLoaderProps> = ({ 
  message = "Loading Smart Picker...", 
  subMessage = "Please wait a moment while we prepare your application." 
}) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default',
          color: 'text.primary',
          textAlign: 'center',
          p: 2,
        }}
      >
        <Box
          component="img"
          src="/SP.png"
          alt="Smart Picker Logo"
          sx={{
            width: 100,
            height: 100,
            marginBottom: 3,
            animation: `${colorFill} 2s ease-in-out infinite alternate`,
          }}
        />
        <Typography variant="h5" component="p" sx={{ mb: 1, fontWeight: 500 }}>
          {message}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {subMessage}
        </Typography>
      </Box>
    </ThemeProvider>
  );
};

export default LogoLoader;