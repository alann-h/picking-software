import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Container, Autocomplete, TextField, Paper, Typography, Box, Grid, Stack, Skeleton, Divider, Chip, IconButton, Collapse 
} from '@mui/material';
import { 
  PersonOutline, CalendarTodayOutlined, ReceiptLongOutlined, Search, DirectionsRunOutlined, KeyboardArrowDown, KeyboardArrowUp
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Customer, QuoteSummary, Run, RunQuote } from '../utils/types';
import { getCustomers, saveCustomers } from '../api/customers';
import { useSnackbarContext } from './SnackbarContext';
import { getCustomerQuotes } from '../api/quote';
import { getRuns } from '../api/runs';
import { useNavigate } from 'react-router-dom';
import { useUserStatus } from '../utils/useUserStatus';
import { useSearchParams } from 'react-router-dom';

// ====================================================================================
// Reusable AnimatedComponent (from your original code)
// ====================================================================================
const AnimatedComponent: React.FC<{ children: React.ReactNode; delay?: number; }> = ({ children, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
    {children}
  </motion.div>
);

// ====================================================================================
// New Components for Displaying Active Runs
// ====================================================================================
const DashboardRunItem: React.FC<{ run: Run }> = ({ run }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();

    const { quoteCount } = useMemo(() => ({ quoteCount: (run.quotes || []).length }), [run.quotes]);
    const getStatusChipColor = (status: Run['status']) => {
        switch (status) {
            case 'pending': return 'info';
            case 'checking': return 'warning';
            case 'finalised': return 'success';
            default: return 'default';
        }
    };
    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body1" fontWeight={600}>Run #{run.run_number}</Typography>
                <Chip label={run.status} color={getStatusChipColor(run.status)} size="small" sx={{ textTransform: 'capitalize' }} />
                <Typography variant="body2" color="text.secondary">{quoteCount} quotes</Typography>
                <IconButton onClick={() => setIsExpanded(!isExpanded)} size="small">
                    {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
            </Stack>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={1}>
                    {run.quotes?.map((quote: RunQuote) => (
                        <Paper 
                            key={quote.quoteId} 
                            variant="outlined" 
                            onClick={() => navigate(`/quote?id=${quote.quoteId}`)}
                            sx={{ p: 1, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                        >
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" fontWeight={500}>Quote #{quote.quoteId}</Typography>
                                <Typography variant="caption" color="text.secondary">{quote.customerName}</Typography>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            </Collapse>
        </Paper>
    );
};

const ActiveRunsList: React.FC = () => {
    const [runs, setRuns] = useState<Run[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { handleOpenSnackbar } = useSnackbarContext();
    const { userCompanyId } = useUserStatus(false);

    useEffect(() => {
        if (!userCompanyId) return;
        getRuns(userCompanyId)
            .then(data => setRuns(data.filter(run => run.status !== 'finalised')))
            .catch(err => {
              console.error(err);
              handleOpenSnackbar('Failed to fetch active runs.', 'error')
            })
            .finally(() => setIsLoading(false));
    }, [userCompanyId, handleOpenSnackbar]);

    if (isLoading) return <Skeleton variant="rounded" height={100} />;
    if (runs.length === 0) return (
        <Box textAlign="center" p={3} sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
            <DirectionsRunOutlined sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography color="text.secondary">No active runs found.</Typography>
        </Box>
    );

    return (
        <Stack spacing={2}>
            {runs.map(run => <DashboardRunItem key={run.id} run={run} />)}
        </Stack>
    );
};

// ====================================================================================
// The Main Dashboard Page
// ====================================================================================

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
          ${quote.totalAmount.toFixed(2)}
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
            {new Date(quote.lastModified).toLocaleDateString()}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  </Paper>
);

const Dashboard: React.FC = () => {
  // --- All of your original state and logic for customers and quotes remains ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [isQuotesLoading, setIsQuotesLoading] = useState<boolean>(false);
  const [isCustomerLoading, setIsCustomerLoading] = useState<boolean>(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();

  const fetchCustomers = useCallback(() => {
    getCustomers()
      .then(data => {
        setCustomers(data);
        saveCustomers(data);
      })
      .catch(err => handleOpenSnackbar(err.message, 'error'))
      .finally(() => setIsCustomerLoading(false));
  }, [handleOpenSnackbar]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  
  useEffect(() => {
    if (customers.length === 0) return;

    const customerIdFromUrl = searchParams.get('customer');
    const customerFromUrl = customerIdFromUrl
      ? customers.find(c => String(c.customerId) === customerIdFromUrl) || null
      : null;
      
    setSelectedCustomer(customerFromUrl);

    if (customerFromUrl) {
      setIsQuotesLoading(true);
      setQuotes([]);
      getCustomerQuotes(customerFromUrl.customerId)
        .then(data => setQuotes(data))
        .catch(err => handleOpenSnackbar(err.message, 'error'))
        .finally(() => setIsQuotesLoading(false));
    } else {
      setQuotes([]);
    }
  }, [customers, searchParams, handleOpenSnackbar]);
  
  const handleCustomerChange = (_: React.SyntheticEvent, customer: Customer | null) => {
    if (customer) {
      setSearchParams({ customer: String(customer.customerId) });
    } else {
      setSearchParams({});
    }
  };
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, sm: 4 } }}>
      <title>Smart Picker | Dashboard</title>
      <Container maxWidth="xl">
        <Stack spacing={{ xs: 4, sm: 5 }}>
          <AnimatedComponent>
            <Typography variant="h4" component="h1" fontWeight="bold" color='primary'>Dashboard</Typography>
          </AnimatedComponent>

          {/* --- NEW: Active Runs Section --- */}
          <AnimatedComponent delay={0.1}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Active Picking Runs</Typography>
              <ActiveRunsList />
            </Paper>
          </AnimatedComponent>
          
          <Divider />

          {/* --- Your Original Quote Finder Section --- */}
          <AnimatedComponent delay={0.2}>
            <Typography variant="h5" component="h2" fontWeight={600} sx={{ mb: 3 }}>Quote Finder</Typography>
            <Grid container spacing={{ xs: 2, md: 4 }}>
              {/* Left Column */}
              <Grid size={{ xs: 12, md: 4 }}>
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
                      renderInput={(params) => <TextField {...params} label="Search customers..." />}
                    />
                  </Stack>
                </Paper>
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
          </AnimatedComponent>
        </Stack>
      </Container>
    </Box>
  );
};

export default Dashboard;