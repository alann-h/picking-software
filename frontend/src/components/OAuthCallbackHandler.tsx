import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyUser } from '../api/auth';
import { clearCachedCsrfToken } from '../utils/apiHelpers';

const OAuthCallbackHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    clearCachedCsrfToken();
    
    verifyUser()
      .then((response: unknown) => {
        console.log('OAuthCallbackHandler response:', response);
        const verifyResponse = response as { isValid: boolean };
        if (verifyResponse.isValid) { 
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

  return null;
};

export default OAuthCallbackHandler;