import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { login } from '../api/auth';

const Login = () => {
  const [error, setError] = useState('');

  const handleLoginClick = () => {
    login()
      .then((authUri) => window.location.href = authUri)
      .catch((err) => setError(err.message))
    console.log(error)
  };

  return (
    <Button variant="contained" color="primary" onClick={handleLoginClick}>
      Login with QuickBooks
    </Button>
  );
};

export default Login;
