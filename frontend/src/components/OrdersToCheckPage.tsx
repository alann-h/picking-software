import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
} from '@mui/material';
import {
  MonetizationOnOutlined as MoneyIcon,
  UpdateOutlined as TimeIcon,
  AssignmentIndOutlined as PreparerIcon,
  CheckCircleOutline as CheckIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';

// Context and API Imports
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus } from '../api/quote';
import { getUserStatus } from '../api/user';
import { QuoteSummary } from '../utils/types';

// =================================================================
// 1. INTERFACE
// =================================================================
interface EnhancedQuoteSummary extends Omit<QuoteSummary, 'preparerNames'> {
  preparerNames?: string | string[];
  priority?: 'high' | 'medium' | 'low';
}

// =================================================================
// 2. LOGIC HOOK
// =================================================================
const useOrdersToCheck = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();

  // Check admin status
  const { data: userStatus, error: userError } = useQuery({
    queryKey: ['userStatus'],
    queryFn: getUserStatus,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch quotes with status 'checking'
  const { 
    data: quotes = [], 
    isLoading: quotesLoading, 
    error: quotesError,
    refetch: refetchQuotes 
  } = useQuery({
    queryKey: ['quotes', 'checking'],
    queryFn: () => getQuotesWithStatus('checking'),
    enabled: !!userStatus?.isAdmin,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Handle errors
  React.useEffect(() => {
    if (userError) {
      handleOpenSnackbar('Failed to verify admin status.', 'error');
      navigate('/dashboard');
    }
    
    if (quotesError) {
      handleOpenSnackbar('Failed to fetch orders to check.', 'error');
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
    quotes: quotes as EnhancedQuoteSummary[], 
    isLoading: quotesLoading || !userStatus,
    error: userError || quotesError,
    refetchQuotes 
  };
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
          <CheckIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            All caught up! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No orders are currently pending review. Great job keeping up with the workflow!
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

const LoadingSkeleton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {Array.from({ length: isMobile ? 1 : 6 }).map((_, index) => (
        <Grid component="div" size={{ xs: 12, sm: 6, md: 4 }} key={index}>
          <Card elevation={0} sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={24} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
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

const QuoteCard: React.FC<{ quote: EnhancedQuoteSummary }> = ({ quote }) => {
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

  // Use the formatted date from backend directly
  const timeAgo = quote.lastModified;

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
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              #{quote.id}
            </Typography>
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

            {/* Last Modified */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TimeIcon color="action" sx={{ fontSize: 24 }} />
              <Typography variant="body1" color="text.secondary">
                {timeAgo}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// =================================================================
// 4. MAIN EXPORTED COMPONENT
// =================================================================
const OrdersToCheckPage: React.FC = () => {
  const { quotes, isLoading, error, refetchQuotes } = useOrdersToCheck();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
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
          Failed to load orders. Please try again.
        </Alert>
      );
    }

    if (quotes.length === 0) {
      return <EmptyState />;
    }

    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {quotes.map((quote) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={quote.id}>
            <QuoteCard quote={quote} />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <title>Smart Picker | Orders To Check</title>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: theme.palette.warning.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingIcon sx={{ fontSize: 24, color: theme.palette.warning.contrastText }} />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Orders Pending Review
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {quotes.length > 0 ? `${quotes.length} order${quotes.length === 1 ? '' : 's'} require${quotes.length === 1 ? 's' : ''} your attention` : 'No pending reviews'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      {renderContent()}
    </Container>
  );
};

export default OrdersToCheckPage;