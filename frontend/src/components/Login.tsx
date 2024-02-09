import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { login } from '../api/auth';

const Login = () => {
  const [error, setError] = useState('');

  const handleLoginClick = async () => {
    try {
      // Assuming login() fetches the authUri
      const authUri = await login();

      // Launch Popup using the JS window Object
      const parameters = "location=1,width=800,height=650";
      const left = (window.screen.width - 800) / 2;
      const top = (window.screen.height - 650) / 2;
      const windowFeatures = `${parameters},left=${left},top=${top}`;

      const win = window.open(authUri, 'connectPopup', windowFeatures);

      // Poll for successful login
      const pollOAuth = window.setInterval(() => {
        try {
          // Ensure win and win.document are accessible
          if (win && win.document) {
            // Check if the URL contains 'code', indicating a successful login
            if (win.document.URL.indexOf("code") !== -1) {
              window.clearInterval(pollOAuth);
              win.close();
              // Perform any action after successful login
              // e.g., navigate to a different route or refresh the page
              // navigate('/path-after-success'); or window.location.reload();
            }
          }
        } catch (e) {
          setError("Error during login process.");
          console.log(error)
        }
      }, 100);
    } catch (err) {
      setError('error');
    }
  };

  return (
    <Button variant="contained" color="primary" onClick={handleLoginClick}>
      Login with QuickBooks
    </Button>
  );
};

export default Login;
