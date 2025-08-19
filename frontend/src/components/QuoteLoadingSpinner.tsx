import React from 'react';
import { Box, CircularProgress, Typography, Fade, Paper } from '@mui/material';
import { Description } from '@mui/icons-material';

const QuoteLoadingSpinner: React.FC = () => {
  return (
    <Fade in={true} timeout={400}>
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
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          gap: 4
        }}
      >
        <Paper
          elevation={4}
          sx={{
            p: 6,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            minWidth: '400px',
            maxWidth: '500px'
          }}
        >
          <Description 
            sx={{ 
              fontSize: 72, 
              color: 'primary.main',
              opacity: 0.8
            }} 
          />
          <CircularProgress 
            size={80} 
            thickness={6}
            sx={{
              color: 'primary.main',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }}
          />
          <Typography
            variant="h5"
            color="text.primary"
            sx={{
              fontWeight: 600,
              textAlign: 'center'
            }}
          >
            Preparing Quote
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              textAlign: 'center',
              maxWidth: '350px',
              lineHeight: 1.5
            }}
          >
            Loading product catalog and pricing information...
          </Typography>
        </Paper>
      </Box>
    </Fade>
  );
};

export default QuoteLoadingSpinner;
