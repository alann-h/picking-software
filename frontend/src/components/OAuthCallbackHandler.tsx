import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { retrieveToken } from '../api/auth';
import {setToken, setUserId} from '../utils/storage'

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

  return <div>Processing login...</div>;
};

export default OAuthCallbackHandler;
