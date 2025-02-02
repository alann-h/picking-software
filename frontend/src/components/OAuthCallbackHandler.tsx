import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyUser } from '../api/auth';
import { Box, CircularProgress } from '@mui/material';

const OAuthCallbackHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    verifyUser()
      .then(response => {
        if (response.isValid) { 
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      })
      .catch(error => {
        console.error(error);
        navigate('/');
      });
  }, [navigate]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <CircularProgress />
    </Box>
  );
};

export default OAuthCallbackHandler;