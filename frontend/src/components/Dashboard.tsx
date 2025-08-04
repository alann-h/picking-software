import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Autocomplete, TextField, Paper, Typography, Box, Grid, useTheme, Stack, Skeleton
} from '@mui/material';
import { 
  PersonOutline, CalendarTodayOutlined, ReceiptLongOutlined, Search, DirectionsRunOutlined 
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Customer, QuoteSummary } from '../utils/types';
import { getCustomers, saveCustomers } from '../api/customers';
import { useSnackbarContext } from './SnackbarContext';
import { getCustomerQuotes } from '../api/quote';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// Reusable AnimatedComponent
const AnimatedComponent: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

// A cleaner, more focused Quote Item component
const QuoteItem: React.FC<{ quote: QuoteSummary; onClick: () => void }> = ({ quote, onClick }) => (
  <Paper
    variant="outlined"
    onClick={onClick}
    sx={{
      p: 2,
      cursor: 'pointer',
      transition: 'box-shadow 0.3s, border-color 0.3s',
      '&:hover': {
        boxShadow: (theme) => theme.shadows[4],
        borderColor: 'primary.main',
      }
    }}
  >
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" color="primary.main" fontWeight="bold">
          Quote #{quote.id}
        </Typography>
        <Typography variant="h6" fontWeight="bold">
          ${quote.totalAmt.toFixed(2)}
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between" color="text.secondary">
        <Stack direction="row" alignItems="center" spacing={1}>
          <PersonOutline fontSize="small" />
          <Typography variant="body2">{quote.customerName}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarTodayOutlined fontSize="small" />
          <Typography variant="body2">
            {new Date(quote.lastUpdatedTime).toLocaleDateString()}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  </Paper>
);


const Dashboard: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [isQuotesLoading, setIsQuotesLoading] = useState<boolean>(false);
  const [isCustomerLoading, setIsCustomerLoading] = useState<boolean>(true);
  
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const listAvailableQuotes = useCallback((customerId: number) => {
    setIsQuotesLoading(true);
    setQuotes([]);
    getCustomerQuotes(customerId)
      .then(data => {setQuotes(data)
        console.log(data)
      })
      .catch(err => handleOpenSnackbar(err.message, 'error'))
      .finally(() => setIsQuotesLoading(false));
  }, [handleOpenSnackbar]);

  const fetchCustomers = useCallback(() => {
    getCustomers()
      .then(data => {
        setCustomers(data);
        saveCustomers(data);
      })
      .catch(err => handleOpenSnackbar(err.message, 'error'))
      .finally(() => setIsCustomerLoading(false));
  }, [handleOpenSnackbar]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (customers.length === 0) return;

    const params = new URLSearchParams(location.search);
    const customerIdFromUrl = params.get('customer');
    if (customerIdFromUrl) {
      const customerFromUrl = customers.find(c => String(c.customerId) === customerIdFromUrl);
      if (customerFromUrl && customerFromUrl.customerId !== selectedCustomer?.customerId) {
        setSelectedCustomer(customerFromUrl);
        listAvailableQuotes(customerFromUrl.customerId);
      }
    }
  }, [customers, location.search, listAvailableQuotes, selectedCustomer]);
  
  const handleCustomerChange = (_: React.SyntheticEvent, customer: Customer | null) => {
    setSelectedCustomer(customer);
    const searchParams = new URLSearchParams(location.search);

    if (customer) {
      listAvailableQuotes(customer.customerId);
      searchParams.set('customer', String(customer.customerId));
    } else {
      setQuotes([]);
      searchParams.delete('customer');
    }
    navigate({ pathname: location.pathname, search: searchParams.toString() }, { replace: true });
  };
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default, py: { xs: 2, sm: 4 } }}>
      <Helmet>
        <title>Smart Picker | Dashboard</title>
      </Helmet>
      <Container maxWidth="xl">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <AnimatedComponent>
            <Typography variant="h4" component="h1" fontWeight="bold" color='primary'
              sx={{
                [theme.breakpoints.down('sm')]: {
                  fontSize: theme.typography.h5.fontSize,
                },
              }}
            >
              Dashboard
            </Typography>
          </AnimatedComponent>

          <Grid container spacing={{ xs: 2, md: 4 }}>
            {/* Left Column */}
            <Grid size={{ xs: 12, md: 4 }}>
              <AnimatedComponent delay={0.1}>
                <Stack spacing={{ xs: 2, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Typography variant="h6" fontWeight={600}>Select Customer</Typography>
                      <Autocomplete
                        options={customers}
                        getOptionLabel={(option) => option.customerName}
                        value={selectedCustomer}
                        onChange={handleCustomerChange}
                        isOptionEqualToValue={(option, value) => option.customerId === value.customerId}
                        loading={isCustomerLoading}
                        disablePortal
                        renderInput={(params) => <TextField {...params} label="Search customers..." />}
                      />
                    </Stack>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Typography variant="h6" fontWeight={600}>Active Picking Runs</Typography>
                      <Box textAlign="center" p={{ xs: 2, sm: 3 }} sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
                        <DirectionsRunOutlined sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No active runs.</Typography>
                        <Typography variant="caption" color="text.secondary">This feature is coming soon.</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              </AnimatedComponent>
            </Grid>

            {/* Right Column */}
            <Grid size={{ xs: 12, md: 8 }}>
              <AnimatedComponent delay={0.2}>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, minHeight: 400 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {selectedCustomer ? `Quotes for ${selectedCustomer.customerName}` : 'Select a Customer to View Quotes'}
                  </Typography>

                  {isQuotesLoading && (
                    <Stack spacing={2}>
                      {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={95} />)}
                    </Stack>
                  )}

                  {!isQuotesLoading && quotes.length > 0 && (
                    <Stack spacing={2}>
                      {quotes.map((quote, index) => (
                        <AnimatedComponent key={quote.id} delay={index * 0.05}>
                          <QuoteItem 
                            quote={quote} 
                            onClick={() => navigate(`/quote?id=${quote.id}`)} 
                          />
                        </AnimatedComponent>
                      ))}
                    </Stack>
                  )}
                  
                  {!isQuotesLoading && quotes.length === 0 && selectedCustomer && (
                    <Box textAlign="center" p={{ xs: 3, sm: 5 }}>
                       <ReceiptLongOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                       <Typography variant="h6" color="text.secondary">No quotes found for this customer.</Typography>
                    </Box>
                  )}

                  {!selectedCustomer && !isQuotesLoading && (
                     <Box textAlign="center" p={{ xs: 3, sm: 5 }}>
                       <Search sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                       <Typography variant="h6" color="text.secondary">Quotes will appear here.</Typography>
                    </Box>
                  )}
                </Paper>
              </AnimatedComponent>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
};

export default Dashboard;