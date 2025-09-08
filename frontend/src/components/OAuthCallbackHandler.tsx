import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyUser } from '../api/auth';

const OAuthCallbackHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    verifyUser()
      .then(response => {
        console.log('OAuthCallbackHandler response:', response);
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

  return null;
};

export default OAuthCallbackHandler;