import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'large' 
}) => {
  const sizeMap = {
    small: 40,
    medium: 60,
    large: 80
  };

  return (
    <Fade in={true} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          gap: 3
        }}
      >
        <CircularProgress 
          size={sizeMap[size]} 
          thickness={6}
          sx={{
            color: 'primary.main',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }}
        />
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            fontWeight: 500,
            letterSpacing: 0.5
          }}
        >
          {message}
        </Typography>
      </Box>
    </Fade>
  );
};

export default LoadingSpinner;
