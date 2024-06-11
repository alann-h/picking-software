import React, { useState, useEffect } from 'react';
import { Container, Autocomplete, TextField, List, ListItemText, Card, CardContent, Paper, ListItemButton } from '@mui/material';
import { Customer } from '../utils/types';
import { getCustomers, saveCustomers, getCustomerId } from '../api/others';
import { useSnackbarContext } from './SnackbarContext';
import { getCustomerQuotes } from '../api/quote';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setInputValue] = useState<string>('');
  const [quotes, setQuotes] = useState<any[]>([]); // I have many as the type for now as quotes when intially recieved are extremely long so unless i filter that on the backend any will have to stay
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();

  useEffect(() => {
    getCustomers()
      .then((data) => {
        setCustomers(data);
        saveCustomers(data);
      })
      .catch((err: Error) => {
        handleOpenSnackbar(err.message, 'error');
      });
  }, [setCustomers, handleOpenSnackbar]);

  const handleChange = (_: React.SyntheticEvent, newValue: string | null) => {
    if (newValue) {
      setInputValue(newValue);
      getCustomerId(newValue)
        .then((data) => {
          listAvailableQuotes(data.customerId);
        })
        .catch((err: Error) => {
          handleOpenSnackbar(err.message, 'error');
        });
    }
  };

  const listAvailableQuotes = (selectedCustomerId: string) => {
    if (selectedCustomerId === null) {
      handleOpenSnackbar('Could not get Customer Id', 'error');
      return;
    }

    getCustomerQuotes(selectedCustomerId)
      .then((data) => {
        setQuotes(data);
      })
      .catch((err: Error) => {
        handleOpenSnackbar(err.message, 'error');
      });
  };

  const handleQuoteClick = (quoteId: string) => {
    if (!quoteId) {
      return handleOpenSnackbar('Quote Id is undefined', 'error');
    }
    navigate(`/quote/${quoteId}`);
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
      <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
        <List>
          {quotes.map((quote) => (
            <ListItemButton key={quote.Id} onClick={() => handleQuoteClick(quote.Id)}>
              <Card sx={{ width: '100%' }}>
                <CardContent>
                  <ListItemText
                    primary={`Quote Id: ${quote.Id}`}
                    secondary={`Customer: ${quote.CustomerRef.name}, Last Updated: ${new Date(quote.MetaData.LastUpdatedTime).toLocaleString()}, Total: $${quote.TotalAmt}`}
                  />
                </CardContent>
              </Card>
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default Dashboard;
