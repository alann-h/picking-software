import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { retrieveToken } from '../api/auth';
import {setToken, setUserId} from '../utils/storage';
import { Box, CircularProgress } from '@mui/material';

const OAuthCallbackHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) {
      retrieveToken(userId)
      .then(oauthToken => {
        if (oauthToken != null) {
          setToken(oauthToken.access_token);
          setUserId(userId);
          navigate('/dashboard');
        } else {
          console.log(userId, oauthToken);
          navigate('/');
        }
      })
      .catch(error => {
        console.log(error);
        navigate('/');
      });
    } else {
      navigate('/');
    }
  }, [navigate, searchParams]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <CircularProgress />
    </Box>
  );
};

export default OAuthCallbackHandler;
