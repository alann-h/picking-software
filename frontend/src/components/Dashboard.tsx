import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Autocomplete, TextField, List, ListItemText, Card, CardContent, 
  Paper, ListItemButton, Typography, Box, Grid, useTheme, Chip,
} from '@mui/material';
import {QrCodeScanner, Inventory } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Customer } from '../utils/types';
import { getCustomers, saveCustomers } from '../api/customers';
import { useSnackbarContext } from './SnackbarContext';
import { getCustomerQuotes } from '../api/quote';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingWrapper from './LoadingWrapper';
import { Helmet } from 'react-helmet-async';

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

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setInputValue] = useState<string>('');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isQuotesLoading, setIsQuotesLoading] = useState<boolean>(false);
  const [isCustomerLoading, setIsCustomerLoading] = useState<boolean>(false);
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const listAvailableQuotes = useCallback((selectedCustomerId: number) => {
    if (selectedCustomerId === null) {
      handleOpenSnackbar('Could not get Customer Id', 'error');
      return;
    }
    setIsQuotesLoading(true);
    getCustomerQuotes(selectedCustomerId)
      .then((data) => {
        setQuotes(data);
        setIsQuotesLoading(false);
      })
      .catch((err: Error) => {
        handleOpenSnackbar(err.message, 'error');
        setIsQuotesLoading(false);
      });
  }, [setIsQuotesLoading, setQuotes, handleOpenSnackbar]);

  const fetchAndSetCustomers = useCallback(() => {
    if (customers.length > 0) return;

    setIsCustomerLoading(true);
    getCustomers()
      .then(data => {
        setCustomers(data);
        saveCustomers(data);
      })
      .catch(err => handleOpenSnackbar(err.message, 'error'))
      .finally(() => setIsCustomerLoading(false));
  }, [customers, handleOpenSnackbar]);

  useEffect(() => {
    fetchAndSetCustomers();
  }, [fetchAndSetCustomers]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerIdURL = params.get('customer');

    if (!customerIdURL) return;

    const match = customers.find(c => String(c.customerId) === customerIdURL);
    if (!match) return;

    setInputValue(match.customerName);
    listAvailableQuotes(match.customerId);
  }, [location.search, customers, listAvailableQuotes]);
  
  const handleChange = (_: React.SyntheticEvent, newValue: string | null) => {
    if (newValue) {
      const customer = customers.find(c => c.customerName === newValue);
      if (customer) {
        setInputValue(newValue);
  
        // 🔁 Update URL with customerId instead of name
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('customer', String(customer.customerId));
        navigate({
          pathname: location.pathname,
          search: searchParams.toString(),
        });
  
        listAvailableQuotes(customer.customerId);
      } else {
        handleOpenSnackbar('Customer not found', 'error');
      }
    }
  };
  

  const handleQuoteClick = (quoteId: string) => {
    if (!quoteId) {
      return handleOpenSnackbar('Quote Id is undefined', 'error');
    }
    navigate(`/quote?id=${quoteId}`);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
>
      <Helmet>
        <title>Smart Picker | Dashboard</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 } }}>
        <AnimatedComponent yOffset={20}>
          <Typography variant="h4" gutterBottom component="h1" color="primary">
            Dashboard
          </Typography>
        </AnimatedComponent>

        <Grid container spacing={3}>

          <Grid size={{ xs: 12, md: 4 }}>
            <AnimatedComponent xOffset={-20} delay={0.2}>
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Select Customer
                </Typography>
                <LoadingWrapper isLoading={isCustomerLoading} height="100px">
                <Autocomplete
                  id="customer-box"
                  options={customers.map((option) => option.customerName)}
                  value={selectedCustomer || null}
                  inputValue={selectedCustomer}
                  onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
                  onChange={handleChange}
                  renderInput={(params) => <TextField {...params} label="Customer" />}
                />
                </LoadingWrapper>
              </Paper>
            </AnimatedComponent>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <AnimatedComponent xOffset={20} delay={0.4}>
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Customer Quotes
                </Typography>
                <LoadingWrapper isLoading={isQuotesLoading}>
                <List>
                  {quotes.map((quote, index) => (
                    <AnimatedComponent key={quote.Id} yOffset={20} delay={index * 0.1}>
                      <ListItemButton onClick={() => handleQuoteClick(quote.Id)}>
                        <Card sx={{ width: '100%', mb: 1, backgroundColor: theme.palette.background.default }}>
                          <CardContent>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" color="primary" sx={{fontWeight: 'bold'}}>
                                  Quote ID: {quote.Id}
                                </Typography>
                              }
                              secondary={
                                <Box component="span">
                                <Typography variant="body2" component="span" sx={{fontWeight: 'bold', display: 'block'}}>
                                  Customer: {quote.CustomerRef.name}
                                </Typography>
                                <Typography variant="body2" component="span" sx={{fontWeight: 'bold', display: 'block'}}>
                                  Last Updated: {new Date(quote.MetaData.LastUpdatedTime).toLocaleString()}
                                </Typography>
                                <Typography variant="body2" component="span" color="secondary" sx={{fontWeight: 'bold', display: 'block'}}>
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
                </LoadingWrapper>
              </Paper>
            </AnimatedComponent>
          </Grid>
        </Grid>
        
        {/* Rest of the component remains the same */}
        <AnimatedComponent yOffset={20} delay={0.8}>
          <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
            <Typography variant="h5" gutterBottom color="primary">
              QuickBooks Integration
            </Typography>
            <Typography variant="body1" paragraph>
              This application is integrated with QuickBooks, allowing you to:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 2 }}>
              <li>Access and manage customer quotes directly from QuickBooks</li>
              <li>Synchronize order data with your QuickBooks account</li>
              <li>Maintain consistent financial records across systems</li>
            </Typography>
          </Paper>
        </AnimatedComponent>

        <AnimatedComponent yOffset={20} delay={1}>
          <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
            <Typography variant="h5" gutterBottom color="primary">
              Features
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 4, sm: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <QrCodeScanner sx={{ mr: 1 }} />
                      Barcode Scanner
                    </Typography>
                    <Typography variant="body2">
                      Quickly process orders and manage inventory with our integrated barcode scanning feature.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4, sm: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <Inventory sx={{ mr: 1 }} />
                      Inventory Management
                    </Typography>
                    <Typography variant="body2">
                      Efficiently track and manage your stock levels.
                    </Typography>
                    <Chip label="Coming Soon" color="secondary" sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
              {/* Add more feature cards here */}
            </Grid>
          </Paper>
        </AnimatedComponent>
      </Container>
    </Box>
  );
};

export default Dashboard;