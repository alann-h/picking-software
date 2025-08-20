import React, { Suspense, useMemo, useState, useTransition } from 'react';
import {
  Container, 
  Autocomplete, 
  TextField, 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  Stack, 
  Divider, 
  Chip, 
  IconButton, 
  Collapse,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Button,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  PersonOutline, 
  CalendarTodayOutlined, 
  ReceiptLongOutlined, 
  Search, 
  DirectionsRunOutlined, 
  KeyboardArrowDown, 
  KeyboardArrowUp,
  Business,
  AttachMoney
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Customer, QuoteSummary, Run, RunQuote } from '../utils/types';
import { getCustomers } from '../api/customers';
import { getCustomerQuotes } from '../api/quote';
import { getRuns } from '../api/runs';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { AvailableQuotesSkeleton, RunListSkeleton } from './Skeletons'
import { useAuth } from './hooks/useAuth';

// ====================================================================================
// Reusable & Child Components (No changes needed in these)
// ====================================================================================
const AnimatedComponent: React.FC<{ children: React.ReactNode; delay?: number; }> = ({ children, delay = 0 }) => ( 
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: 0.5, delay }}> 
    {children} 
  </motion.div> 
);

const DashboardRunItem: React.FC<{ run: Run }> = ({ run }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={3}>
                    <Typography variant="h6" fontWeight={600}>
                      Run #{run.run_number || run.id.substring(0, 8)}
                    </Typography>
                    <Chip 
                      label={run.status} 
                      color={getStatusChipColor(run.status)} 
                      size="small" 
                      sx={{ textTransform: 'capitalize' }} 
                    />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Stack alignItems="flex-end">
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>{quoteCount} quotes</Typography>
                    </Stack>
                    <IconButton 
                      onClick={() => setIsExpanded(!isExpanded)} 
                      size="small" 
                      aria-label="expand run"
                    >
                      {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </Stack>
            </Stack>

            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Typography variant="subtitle1" fontWeight={500}>Quotes in this Run</Typography>
                    </Stack>
                    
                    <Table size="small" sx={{ mb: 2 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Priority</TableCell>
                                <TableCell>Quote ID</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Customer Name</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {run.quotes
                              ?.sort((a, b) => a.priority - b.priority) // Sort by priority (0 = highest)
                              .map((quote: RunQuote) => (
                                <TableRow 
                                  key={quote.quoteId}
                                  onClick={() => navigate(`/quote?id=${quote.quoteId}`)}
                                  sx={{ 
                                    cursor: 'pointer',
                                    '&:hover': { 
                                      backgroundColor: 'rgba(59,130,246,0.02)',
                                      '& .MuiTableCell-root': {
                                        borderColor: 'primary.main'
                                      }
                                    },
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                    <TableCell>
                                        <Chip 
                                          label={`${quote.priority + 1}`}
                                          size="small" 
                                          color="primary"
                                          variant="outlined"
                                          sx={{ 
                                            fontSize: '0.7rem',
                                            height: 20,
                                            fontWeight: 500
                                          }} 
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                                      #{quote.quoteId}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                          label={quote.orderStatus} 
                                          size="small" 
                                          color={quote.orderStatus === 'assigned' ? 'info' : 
                                                 quote.orderStatus === 'checking' ? 'warning' : 
                                                 quote.orderStatus === 'finalised' ? 'success' : 'default'}
                                          sx={{ 
                                            textTransform: 'capitalize',
                                            fontSize: '0.7rem',
                                            height: 20
                                          }} 
                                        />
                                    </TableCell>
                                    <TableCell>{quote.customerName}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Collapse>
        </Paper>
    );
};

const QuoteItem: React.FC<{ quote: QuoteSummary; onClick: () => void }> = ({ quote, onClick }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{ 
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      cursor: 'pointer', 
      transition: 'all 0.3s ease', 
      '&:hover': { 
        borderColor: 'primary.main',
        boxShadow: '0 8px 25px rgba(59,130,246,0.15)',
        transform: 'translateY(-3px)'
      }
    }}
  >
    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" color="primary.main" fontWeight="bold">
              Quote #{quote.id}
            </Typography>
          </Stack>
        </Stack>
        
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonOutline fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {quote.customerName}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarTodayOutlined fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {new Date(quote.lastModified).toLocaleDateString()}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

// ====================================================================================
// 1. ISOLATED DATA-FETCHING COMPONENTS
// These components now fetch their own data and handle their own loading via Suspense.
// ====================================================================================

const ActiveRunsList: React.FC = () => {
    const { userCompanyId } = useAuth();
    const { data: allRuns } = useSuspenseQuery<Run[]>({
        queryKey: ['runs', userCompanyId],
        queryFn: () => getRuns(userCompanyId!),
    });

    const activeRuns = useMemo(() => {
        return (allRuns || []).filter(run => run.status !== 'finalised');
    }, [allRuns]);

    if (activeRuns.length === 0) return (
        <Box 
          textAlign="center" 
          p={{ xs: 3, sm: 4 }} 
          sx={{ 
            border: '2px dashed', 
            borderColor: 'divider', 
            borderRadius: 3,
            backgroundColor: 'grey.50'
          }}
        >
            <DirectionsRunOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No active runs found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create a new run to get started with order picking
            </Typography>
        </Box>
    );

    return (
      <Stack spacing={2}>
        {activeRuns.map((run, index) => (
          <AnimatedComponent key={run.id} delay={index * 0.1}>
            <DashboardRunItem run={run} />
          </AnimatedComponent>
        ))}
      </Stack>
    );
};

const QuoteList: React.FC<{ customer: Customer }> = ({ customer }) => {
    const navigate = useNavigate();
    const { data: quotes } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId],
        queryFn: () => getCustomerQuotes(customer.customerId),
    });

     if (quotes.length === 0) {
        return (
          <Box 
            textAlign="center" 
            p={{ xs: 3, sm: 5 }}
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 3,
              backgroundColor: 'grey.50'
            }}
          >
            <ReceiptLongOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No quotes found for this customer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create a new quote to get started
            </Typography>
          </Box>
        );
    }

    return (
        <Stack spacing={2}>
            {quotes.map((quote, index) => (
                <AnimatedComponent key={quote.id} delay={index * 0.05}>
                    <QuoteItem quote={quote} onClick={() => navigate(`/quote?id=${quote.id}`)} />
                </AnimatedComponent>
            ))}
        </Stack>
    );
};

// ====================================================================================
// 2. REFACTORED Main Dashboard Component
// This component now orchestrates the UI, but doesn't manage loading states.
// ====================================================================================
const Dashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const { data: customers } = useSuspenseQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers,
    });

    const selectedCustomer = useMemo(() => {
        const customerId = searchParams.get('customer');
        if (!customerId) return null;
        return customers.find(c => String(c.customerId) === customerId) || null;
    }, [customers, searchParams]);

    const handleCustomerChange = (_: React.SyntheticEvent, customer: Customer | null) => {
        startTransition(() => {
            setSearchParams(customer ? { customer: String(customer.customerId) } : {});
        });
    };

    return (
        <Box sx={{ 
          minHeight: '100vh', 
          bgcolor: 'background.default', 
          py: { xs: 2, sm: 4 },
          px: { xs: 1, sm: 2 }
        }}>
            <title>Smart Picker | Dashboard</title>
            <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
                <Stack spacing={{ xs: 3, sm: 4, md: 5 }}>
                    {/* Header Section */}
                    <AnimatedComponent>
                        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                            <Typography 
                              variant="h3" 
                              component="h1" 
                              fontWeight="bold" 
                              sx={{
                                background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 1
                              }}
                            >
                              Dashboard
                            </Typography>
                            <Typography variant="h6" color="text.secondary">
                              Manage your picking runs and customer quotes
                            </Typography>
                        </Box>
                    </AnimatedComponent>

                    {/* Active Runs Section */}
                    <AnimatedComponent delay={0.1}>
                        <Card 
                          elevation={0}
                          sx={{ 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}
                        >
                            <Box
                              sx={{
                                background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                                color: 'white',
                                p: { xs: 2, sm: 3 }
                              }}
                            >
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <DirectionsRunOutlined sx={{ fontSize: 28 }} />
                                    <Typography variant="h5" fontWeight="bold">
                                        Active Picking Runs
                                    </Typography>
                                </Stack>
                            </Box>
                            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                                <Suspense fallback={<RunListSkeleton />}>
                                    <ActiveRunsList />
                                </Suspense>
                            </Box>
                        </Card>
                    </AnimatedComponent>

                    <Divider sx={{ borderColor: 'divider' }} />

                    {/* Quote Finder Section */}
                    <AnimatedComponent delay={0.2}>
                        <Box>
                            <Typography 
                              variant="h4" 
                              component="h2" 
                              fontWeight="bold" 
                              sx={{ 
                                mb: 3,
                                textAlign: { xs: 'center', sm: 'left' }
                              }}
                            >
                                Quote Finder
                            </Typography>
                            
                            <Grid container spacing={{ xs: 2, md: 4 }}>
                                {/* Customer Selection */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Card 
                                      elevation={0}
                                      sx={{ 
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 3,
                                        height: 'fit-content'
                                      }}
                                    >
                                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                            <Stack spacing={2}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Business sx={{ color: 'primary.main' }} />
                                                    <Typography variant="h6" fontWeight="600">
                                                        Select Customer
                                                    </Typography>
                                                </Stack>
                                                <Autocomplete
                                                    options={customers}
                                                    getOptionLabel={(option) => option.customerName}
                                                    value={selectedCustomer}
                                                    onChange={handleCustomerChange}
                                                    isOptionEqualToValue={(option, value) => option.customerId === value.customerId}
                                                    renderInput={(params) => (
                                                        <TextField 
                                                            {...params} 
                                                            label="Search customers..." 
                                                            size="small"
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    borderRadius: 2
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                    sx={{
                                                        '& .MuiAutocomplete-paper': {
                                                            borderRadius: 2,
                                                            boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                                                        }
                                                    }}
                                                />
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Quotes Display */}
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Card 
                                      elevation={0}
                                      sx={{ 
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 3,
                                        minHeight: { xs: 'auto', md: 400 }
                                      }}
                                    >
                                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                            <Stack spacing={2}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <AttachMoney sx={{ color: 'success.main' }} />
                                                    <Typography variant="h6" fontWeight="600">
                                                        {selectedCustomer ? `Quotes for ${selectedCustomer.customerName}` : 'Select a Customer to View Quotes'}
                                                    </Typography>
                                                </Stack>
                                                
                                                {isPending && (
                                                    <Box sx={{ width: '100%' }}>
                                                        <LinearProgress sx={{ borderRadius: 2 }} />
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                                                            Loading quotes...
                                                        </Typography>
                                                    </Box>
                                                )}
                                                
                                                {!isPending && selectedCustomer ? (
                                                    <Suspense fallback={<AvailableQuotesSkeleton/>}>
                                                        <QuoteList customer={selectedCustomer} />
                                                    </Suspense>
                                                ) : !isPending && !selectedCustomer ? (
                                                    <Box 
                                                      textAlign="center" 
                                                      p={{ xs: 3, sm: 5 }}
                                                      sx={{
                                                        border: '2px dashed',
                                                        borderColor: 'divider',
                                                        borderRadius: 3,
                                                        backgroundColor: 'grey.50'
                                                      }}
                                                    >
                                                        <Search sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                                            No customer selected
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Choose a customer from the dropdown to view their quotes
                                                        </Typography>
                                                    </Box>
                                                ) : null}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>
                    </AnimatedComponent>
                </Stack>
            </Container>
        </Box>
    );
};

export default Dashboard;