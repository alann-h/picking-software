import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Paper,
  Stack,
  Chip,
  Avatar,
  AvatarGroup,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Collapse,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  MonetizationOnOutlined as MoneyIcon,
  UpdateOutlined as TimeIcon,
  AssignmentIndOutlined as PreparerIcon,
  CheckCircleOutline as CheckIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// Context and API Imports
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus, deleteQuotesBulk } from '../api/quote';
import { getUserStatus } from '../api/user';
import { QuoteSummary } from '../utils/types';
import { OrderHistorySkeleton } from './Skeletons';
import { getStatusColor } from '../utils/other';

// =================================================================
// 1. LOGIC HOOK
// =================================================================
const useOrderHistory = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check admin status
  const { data: userStatus, error: userError } = useQuery({
    queryKey: ['userStatus'],
    queryFn: getUserStatus,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all quotes for history
  const { 
    data: quotes = [], 
    isLoading: quotesLoading, 
    error: quotesError,
    refetch: refetchQuotes 
  } = useQuery({
    queryKey: ['quotes', 'history'],
    queryFn: () => getQuotesWithStatus('all'),
    enabled: !!userStatus?.isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteIds: number[]) => {
      const response = await deleteQuotesBulk(quoteIds);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', 'history'] });
      handleOpenSnackbar('Quotes deleted successfully', 'success');
    },
    onError: (error) => {
      handleOpenSnackbar(`Failed to delete quotes: ${error.message}`, 'error');
    },
  });

  // Handle errors
  React.useEffect(() => {
    if (userError) {
      handleOpenSnackbar('Failed to verify admin status.', 'error');
      navigate('/dashboard');
    }
    
    if (quotesError) {
      handleOpenSnackbar('Failed to fetch order history.', 'error');
    }
  }, [userError, quotesError, handleOpenSnackbar, navigate]);

  // Redirect if not admin
  React.useEffect(() => {
    if (userStatus && !userStatus.isAdmin) {
      handleOpenSnackbar('Access denied. Admin privileges required.', 'warning');
      navigate('/dashboard');
    }
  }, [userStatus, handleOpenSnackbar, navigate]);

  return { 
    quotes: quotes as QuoteSummary[], 
    isLoading: quotesLoading || !userStatus,
    error: userError || quotesError,
    refetchQuotes,
    deleteQuoteMutation,
    isAdmin: userStatus?.isAdmin || false
  };
};

// =================================================================
// 2. FILTER COMPONENTS
// =================================================================
interface FilterSectionProps {
  filters: {
    customerName: string;
    orderStatus: string;
    quoteNumber: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  orderStatuses: string[];
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  orderStatuses 
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Filters
        </Typography>
        <Button
          startIcon={showFilters ? <FilterIcon /> : <FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
          variant="outlined"
          size="small"
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </Box>

      <Collapse in={showFilters}>
        <Grid container spacing={3}>
          {/* Customer Name Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="Customer Name"
              value={filters.customerName}
              onChange={(e) => onFilterChange('customerName', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>

          {/* Order Status Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Order Status</InputLabel>
              <Select
                value={filters.orderStatus}
                label="Order Status"
                onChange={(e) => onFilterChange('orderStatus', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {orderStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Quote Number Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="Quote Number"
              value={filters.quoteNumber}
              onChange={(e) => onFilterChange('quoteNumber', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>

          {/* Clear Filters Button */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                startIcon={<ClearIcon />}
                onClick={onClearFilters}
                variant="outlined"
                color="secondary"
                size="small"
              >
                Clear All Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Collapse>
    </Paper>
  );
};

// =================================================================
// 3. CHILD UI COMPONENTS
// =================================================================
const EmptyState: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        mt: 4,
        p: { xs: 4, sm: 8 },
        textAlign: 'center',
        backgroundColor: theme.palette.background.default,
        border: `2px dashed ${theme.palette.divider}`,
        borderRadius: 3,
      }}
    >
      <Stack spacing={3} alignItems="center">
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: theme.palette.grey[100],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HistoryIcon sx={{ fontSize: 40, color: theme.palette.info.main }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            No Orders Found 📋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Try adjusting your filters or check back later for new orders.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

const PreparerAvatars: React.FC<{ preparers: string[] }> = ({ preparers }) => {
  const theme = useTheme();
  
  if (!preparers || preparers.length === 0) {
    return (
      <Chip
        icon={<PreparerIcon />}
        label="Not started"
        size="small"
        variant="outlined"
        sx={{ 
          color: theme.palette.text.secondary,
          borderColor: theme.palette.divider 
        }}
      />
    );
  }

  if (preparers.length === 1) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
          {preparers[0].charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {preparers[0]}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
        {preparers.map((preparer, index) => (
          <Avatar key={index} sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
            {preparer.charAt(0).toUpperCase()}
          </Avatar>
        ))}
      </AvatarGroup>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {preparers.length} preparers
      </Typography>
    </Box>
  );
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const theme = useTheme();
  
  return (
    <Chip
      label={status || 'Unknown'}
      sx={{ 
        fontWeight: 500,
        backgroundColor: getStatusColor(status),
        color: theme.palette.common.white,
        '& .MuiChip-label': {
          color: theme.palette.common.white,
        }
      }}
    />
  );
};

const QuoteCard: React.FC<{ quote: QuoteSummary }> = ({ quote }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const handleQuoteClick = () => navigate(`/quote?id=${quote.id}`);
  
  // Parse preparer names - handle both string and array formats
  const preparerNames = React.useMemo(() => {
    if (typeof quote.preparerNames === 'string') {
      return quote.preparerNames.split(',').map(name => name.trim()).filter(Boolean);
    }
    return quote.preparerNames || [];
  }, [quote.preparerNames]);

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      <CardActionArea onClick={handleQuoteClick} sx={{ height: '100%', p: 0 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header with Quote Number and Status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              #{quote.id}
            </Typography>
            <StatusChip status={quote.orderStatus || 'Unknown'} />
          </Box>

          {/* Customer Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {quote.customerName}
            </Typography>
          </Box>

          {/* Details Grid */}
          <Stack spacing={3}>
            {/* Amount */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MoneyIcon color="success" sx={{ fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                ${quote.totalAmount.toFixed(2)}
              </Typography>
            </Box>

            {/* Preparers */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PreparerIcon color="action" sx={{ fontSize: 24 }} />
              <PreparerAvatars preparers={preparerNames} />
            </Box>

            {/* Time Taken */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TimeIcon color="action" sx={{ fontSize: 24 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Time Taken
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {quote.timeTaken}
                </Typography>
              </Box>
            </Box>

            {/* Last Modified */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TimeIcon color="action" sx={{ fontSize: 24 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Last Modified
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {quote.lastModified}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// New component that wraps QuoteCard with external checkbox
const QuoteCardWithSelection: React.FC<{ 
  quote: QuoteSummary; 
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isAdmin: boolean;
}> = ({ quote, isSelected, onSelect, isAdmin }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ position: 'relative' }}>
      {/* External Checkbox - Positioned above the card */}
      {isAdmin && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            left: -8,
            zIndex: 10,
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: theme.shadows[2],
            border: `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: theme.shadows[4],
            },
          }}
        >
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            sx={{
              p: 0.5,
              '& .MuiSvgIcon-root': {
                fontSize: 20,
              },
              color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
            }}
          />
        </Box>
      )}
      
      {/* Quote Card */}
      <QuoteCard quote={quote} />
    </Box>
  );
};

// =================================================================
// 4. MAIN EXPORTED COMPONENT
// =================================================================
const OrderHistory: React.FC = () => {
  const { quotes, isLoading, error, refetchQuotes, deleteQuoteMutation, isAdmin } = useOrderHistory();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Filter state
  const [filters, setFilters] = useState({
    customerName: '',
    orderStatus: '',
    quoteNumber: '',
  });

  // Bulk selection state
  const [selectedQuotes, setSelectedQuotes] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Get unique order statuses for filter dropdown
  const orderStatuses = useMemo(() => {
    const statuses = quotes
      .map(quote => quote.orderStatus)
      .filter(Boolean)
      .filter((status, index, arr) => arr.indexOf(status) === index);
    return statuses;
  }, [quotes]);

  // Filter quotes based on current filters
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const matchesCustomer = !filters.customerName || 
        quote.customerName.toLowerCase().includes(filters.customerName.toLowerCase());
      
      const matchesStatus = !filters.orderStatus || 
        quote.orderStatus === filters.orderStatus;
      
      const matchesQuoteNumber = !filters.quoteNumber || 
        quote.id.toString().includes(filters.quoteNumber);
      
      return matchesCustomer && matchesStatus && matchesQuoteNumber;
    });
  }, [quotes, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      customerName: '',
      orderStatus: '',
      quoteNumber: '',
    });
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotes(new Set(filteredQuotes.map(quote => quote.id)));
    } else {
      setSelectedQuotes(new Set());
    }
  };

  const handleSelectQuote = (quoteId: number, checked: boolean) => {
    const newSelected = new Set(selectedQuotes);
    if (checked) {
      newSelected.add(quoteId);
    } else {
      newSelected.delete(quoteId);
    }
    setSelectedQuotes(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      const quoteIds = Array.from(selectedQuotes);
      await deleteQuoteMutation.mutateAsync(quoteIds);
      setSelectedQuotes(new Set());
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <OrderHistorySkeleton />;
    }

    if (error) {
      return (
        <Alert 
          severity="error" 
          sx={{ mt: 3 }}
          action={
            <Chip 
              label="Retry" 
              onClick={() => refetchQuotes()} 
              color="error" 
              variant="outlined"
              size="small"
            />
          }
        >
          Failed to load order history. Please try again.
        </Alert>
      );
    }

    if (filteredQuotes.length === 0) {
      return <EmptyState />;
    }

    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {filteredQuotes.map((quote) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={quote.id}>
            <QuoteCardWithSelection 
              quote={quote} 
              isSelected={selectedQuotes.has(quote.id)}
              onSelect={(checked) => handleSelectQuote(quote.id, checked)}
              isAdmin={isAdmin}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <title>Smart Picker | Order History</title>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: theme.palette.info.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HistoryIcon sx={{ fontSize: 24, color: theme.palette.info.contrastText }} />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Order History
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {filteredQuotes.length > 0 ? `${filteredQuotes.length} order${filteredQuotes.length === 1 ? '' : 's'} found` : 'No orders found'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Filters */}
      <FilterSection
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        orderStatuses={orderStatuses}
      />

      {/* Bulk Actions Bar */}
      {isAdmin && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedQuotes.size === filteredQuotes.length && filteredQuotes.length > 0}
                    indeterminate={selectedQuotes.size > 0 && selectedQuotes.size < filteredQuotes.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                }
                label={`Select All (${selectedQuotes.size}/${filteredQuotes.length})`}
              />
            </Box>
            
            {selectedQuotes.size > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedQuotes.size} quote{selectedQuotes.size === 1 ? '' : 's'} selected
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteQuoteMutation.isPending}
                >
                  Delete Selected
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Content */}
      {renderContent()}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {selectedQuotes.size} order{selectedQuotes.size === 1 ? '' : 's'}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrderHistory;
