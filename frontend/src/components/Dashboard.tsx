import React, { Suspense, useMemo, useState, useTransition } from 'react';
import {
  Container, Autocomplete, TextField, Paper, Typography, Box, Grid, Stack, Divider, Chip, IconButton, Collapse
} from '@mui/material';
import {
  PersonOutline, CalendarTodayOutlined, ReceiptLongOutlined, Search, DirectionsRunOutlined, KeyboardArrowDown, KeyboardArrowUp
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
const AnimatedComponent: React.FC<{ children: React.ReactNode; delay?: number; }> = ({ children, delay = 0 }) => ( <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}> {children} </motion.div> );
const DashboardRunItem: React.FC<{ run: Run }> = ({ run }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();
    const { quoteCount } = useMemo(() => ({ quoteCount: (run.quotes || []).length }), [run.quotes]);
    const getStatusChipColor = (status: Run['status']) => {
        switch (status) {
            case 'pending': return 'info';
            case 'checking': return 'primary';
            case 'finalised': return 'success';
            default: return 'default';
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body1" fontWeight={600}>Run #{run.run_number || run.id.substring(0, 8)}</Typography>
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

const QuoteItem: React.FC<{ quote: QuoteSummary; onClick: () => void }> = ({ quote, onClick }) => (
  <Paper
    variant="outlined"
    onClick={onClick}
    sx={{ p: 2, cursor: 'pointer', transition: 'box-shadow 0.3s, border-color 0.3s', '&:hover': { boxShadow: (theme) => theme.shadows[4], borderColor: 'primary.main'}}}
  >
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" color="primary.main" fontWeight="bold">Quote #{quote.id}</Typography>
        <Typography variant="h6" fontWeight="bold">${quote.totalAmount.toFixed(2)}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between" color="text.secondary">
        <Stack direction="row" alignItems="center" spacing={1}><PersonOutline fontSize="small" /><Typography variant="body2">{quote.customerName}</Typography></Stack>
        <Stack direction="row" alignItems="center" spacing={1}><CalendarTodayOutlined fontSize="small" /><Typography variant="body2">{new Date(quote.lastModified).toLocaleDateString()}</Typography></Stack>
      </Stack>
    </Stack>
  </Paper>
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
        <Box textAlign="center" p={3} sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
            <DirectionsRunOutlined sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography color="text.secondary">No active runs found.</Typography>
        </Box>
    );

    return <Stack spacing={2}>{activeRuns.map(run => <DashboardRunItem key={run.id} run={run} />)}</Stack>;
};

const QuoteList: React.FC<{ customer: Customer }> = ({ customer }) => {
    const navigate = useNavigate();
    const { data: quotes } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId],
        queryFn: () => getCustomerQuotes(customer.customerId),
    });

     if (quotes.length === 0) {
        return <Box textAlign="center" p={{ xs: 3, sm: 5 }}><ReceiptLongOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} /><Typography variant="h6" color="text.secondary">No quotes found for this customer.</Typography></Box>
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

    const { data: customers } = useSuspenseQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers,
    });
    // highlight-end

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
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, sm: 4 } }}>
            <title>Smart Picker | Dashboard</title>
            <Container maxWidth="xl">
                <Stack spacing={{ xs: 4, sm: 5 }}>
                    <AnimatedComponent>
                        <Typography variant="h4" component="h1" fontWeight="bold" color='primary'>Dashboard</Typography>
                    </AnimatedComponent>

                    <AnimatedComponent delay={0.1}>
                        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                            <Typography variant="h6" fontWeight={600} gutterBottom>Active Picking Runs</Typography>
                            <Suspense fallback={<RunListSkeleton />}>
                                <ActiveRunsList />
                            </Suspense>
                        </Paper>
                    </AnimatedComponent>

                    <Divider />

                    <AnimatedComponent delay={0.2}>
                        <Typography variant="h5" component="h2" fontWeight={600} sx={{ mb: 3 }}>Quote Finder</Typography>
                        <Grid container spacing={{ xs: 2, md: 4 }}>
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
                                            renderInput={(params) => <TextField {...params} label="Search customers..." />}
                                        />
                                    </Stack>
                                </Paper>
                            </Grid>

                            <Grid size={{ xs: 12, md: 8 }}>
                                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, minHeight: 400 }}>
                                    <Typography variant="h6" fontWeight={600} gutterBottom>
                                        {selectedCustomer ? `Quotes for ${selectedCustomer.customerName}` : 'Select a Customer to View Quotes'}
                                    </Typography>
                                    
                                    {isPending ? (
                                        <AvailableQuotesSkeleton/>
                                    ) : selectedCustomer ? (
                                        <Suspense fallback={<AvailableQuotesSkeleton/>}>
                                            <QuoteList customer={selectedCustomer} />
                                        </Suspense>
                                    ) : (
                                        <Box textAlign="center" p={{ xs: 3, sm: 5 }}><Search sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} /><Typography variant="h6" color="text.secondary">Quotes will appear here.</Typography></Box>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    </AnimatedComponent>
                </Stack>
            </Container>
        </Box>
    );
};

export default Dashboard;