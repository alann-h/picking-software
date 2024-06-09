import React, { useState, useEffect } from 'react';
import { Container, Autocomplete, TextField } from '@mui/material';
import { Customer } from '../utils/types';
import { getCustomers, saveCustomers } from '../api/others';
import { useSnackbarContext } from './SnackbarContext';

const Dashboard: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setInputValue] = useState<string>('');
  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    getCustomers()
      .then((data) => {
        setCustomers(data);
        saveCustomers(data);
      })
      .catch((err: Error) => {
        handleOpenSnackbar(err.message, 'error');
      });
  }, [handleOpenSnackbar]);

  const handleChange = (_: React.SyntheticEvent, newValue: string | null) => {
    if (newValue) {
      setInputValue(newValue);
      console.log('User selected:', newValue);
    }
  };

  return (
    <Container>
      <Autocomplete
        id="customer-box"
        options={customers.map((option) => option.name)}
        inputValue={selectedCustomer}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        onChange={handleChange}
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Customer" />}
      />
    </Container>
  );
};

export default Dashboard;
