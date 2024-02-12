import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { callback } from '../api/auth'

const OAuthCallbackHandler = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    if (searchParams) {
      handleAuthCodeExchange(location.search)
        .then(() => {
          navigate('/dashboard');
        })
        .catch((error) => {
          console.error(error);
          navigate('/');
        });
    }
  }, [navigate , location.search]);

  async function handleAuthCodeExchange(searchParams: String) {
    const url = 'callback'+ searchParams
    callback(url)
  }

  return <div>Processing login...</div>;
};

export default OAuthCallbackHandler
