import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import AllInboxOutlinedIcon from '@mui/icons-material/AllInboxOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined'; // Import new icon

import { Helmet } from 'react-helmet-async';

// Context and API Imports
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus } from '../api/quote';
import { getUserStatus } from '../api/user';
import { QuoteSummary } from '../utils/types';

// =================================================================
// 1. INTERFACE
// =================================================================
// =================================================================
// 2. LOGIC HOOK
// =================================================================
const useOrdersToCheck = () => {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuotes = async () => {
      setIsLoading(true);
      try {
        const userStatus = await getUserStatus();
        if (!userStatus.isAdmin) {
          handleOpenSnackbar('Access denied. Admin privileges required.', 'warning');
          navigate('/dashboard');
          return;
        }

        const fetchedQuotes = await getQuotesWithStatus('checking');
        setQuotes(fetchedQuotes);
      } catch (error) {
        console.error("Failed to fetch quotes:", error);
        handleOpenSnackbar('Failed to fetch orders to check.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, [handleOpenSnackbar, navigate]);

  return { quotes, isLoading };
};

// =================================================================
// 3. CHILD UI COMPONENTS
// =================================================================
const EmptyState: React.FC = () => (
  <Paper
    variant="outlined"
    sx={{
      mt: 4,
      p: { xs: 3, sm: 6 },
      textAlign: 'center',
      backgroundColor: (theme) => theme.palette.grey[50],
    }}
  >
    <Stack spacing={2} alignItems="center">
      <AllInboxOutlinedIcon sx={{ fontSize: 60, color: 'grey.400' }} />
      <Typography variant="h6" sx={{ fontWeight: 500 }}>
        You&apos;re all caught up!
      </Typography>
      <Typography variant="body1" color="text.secondary">
        There are no orders pending review at the moment.
      </Typography>
    </Stack>
  </Paper>
);

const QuoteCard: React.FC<{ quote: QuoteSummary }> = ({ quote }) => {
  const navigate = useNavigate();
  const handleQuoteClick = () => navigate(`/quote?id=${quote.id}`);

    const preparers = quote.preparerNames && quote.preparerNames.length > 0
    ? quote.preparerNames
    : 'Not started';
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => `0 4px 20px ${theme.palette.action.hover}`,
        },
      }}
    >
      <CardActionArea onClick={handleQuoteClick} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: '600' }}>
            Quote #{quote.id}
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonOutlineOutlinedIcon color="action" />
              <Typography variant="body2">{quote.customerName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MonetizationOnOutlinedIcon color="action" />
              <Typography variant="body2">${quote.totalAmount.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIndOutlinedIcon color="action" />
              <Typography variant="body2">
                Prepared by: <span style={{ fontWeight: 600 }}>{quote.preparerNames}</span>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UpdateOutlinedIcon color="action" />
              <Typography variant="body2" color="text.secondary">
                {quote.lastModified}
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
  const { quotes, isLoading } = useOrdersToCheck();

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
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
      <Helmet>
        <title>Smart Picker | Orders To Check</title>
      </Helmet>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Orders Pending Review
      </Typography>
      {renderContent()}
    </Container>
  );
};

export default OrdersToCheckPage;