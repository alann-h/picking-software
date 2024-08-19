import React, { useState, useEffect } from 'react';
import { 
  Container, Autocomplete, TextField, List, ListItemText, Card, CardContent, 
  Paper, ListItemButton, Typography, Box, Grid, useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import { Customer } from '../utils/types';
import { getCustomers, saveCustomers, getCustomerId } from '../api/others';
import { useSnackbarContext } from './SnackbarContext';
import { getCustomerQuotes } from '../api/quote';
import { useNavigate } from 'react-router-dom';

// Reusable AnimatedComponent
const AnimatedComponent: React.FC<{
  children: React.ReactNode;
  delay?: number;
  xOffset?: number;
  yOffset?: number;
}> = ({ children, delay = 0, xOffset = 0, yOffset = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: xOffset, y: yOffset }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

const Dashboard: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setInputValue] = useState<string>('');
  const [quotes, setQuotes] = useState<any[]>([]);
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  const theme = useTheme();

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
    navigate(`/quote?Id=${quoteId}`);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <AnimatedComponent yOffset={20}>
          <Typography variant="h4" gutterBottom component="h1" color="primary">
            Dashboard
          </Typography>
        </AnimatedComponent>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <AnimatedComponent xOffset={-20} delay={0.2}>
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Select Customer
                </Typography>
                <Autocomplete
                  id="customer-box"
                  options={customers.map((option) => option.name)}
                  inputValue={selectedCustomer}
                  onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
                  onChange={handleChange}
                  renderInput={(params) => <TextField {...params} label="Customer" />}
                />
              </Paper>
            </AnimatedComponent>
          </Grid>
          <Grid item xs={12} md={8}>
            <AnimatedComponent xOffset={20} delay={0.4}>
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Customer Quotes
                </Typography>
                <List>
                  {quotes.map((quote, index) => (
                    <AnimatedComponent key={quote.Id} yOffset={20} delay={index * 0.1}>
                      <ListItemButton onClick={() => handleQuoteClick(quote.Id)}>
                        <Card sx={{ width: '100%', mb: 1, backgroundColor: theme.palette.background.default }}>
                          <CardContent>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" color="primary">
                                  Quote ID: {quote.Id}
                                </Typography>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2">Customer: {quote.CustomerRef.name}</Typography>
                                  <Typography variant="body2">
                                    Last Updated: {new Date(quote.MetaData.LastUpdatedTime).toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2" color="secondary">
                                    Total: ${quote.TotalAmt}
                                  </Typography>
                                </Box>
                              }
                            />
                          </CardContent>
                        </Card>
                      </ListItemButton>
                    </AnimatedComponent>
                  ))}
                </List>
              </Paper>
            </AnimatedComponent>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;