import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { retrieveToken } from '../api/auth';
import {setToken} from '../utils/storage'

const OAuthCallbackHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    retrieveToken()
      .then(oauthToken => {
        if (oauthToken != null) {
          setToken('accessToken', oauthToken.access_token);
          setToken('refreshToken', oauthToken.refresh_token);
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      })
      .catch(error => {
        console.log(error);
        navigate('/');
      });
  }, [navigate]);

  return <div>Processing login...</div>;
};

export default OAuthCallbackHandler;
