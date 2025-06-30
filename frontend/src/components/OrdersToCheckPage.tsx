import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox'; // NEW: Icon for empty state
import { useNavigate } from 'react-router-dom';
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus } from '../api/quote';
import { getUserStatus } from '../api/user';
import { Helmet } from 'react-helmet-async';

interface Quote {
  id: string;
  customerName: string;
  totalAmount: number;
  lastModified: string;
}

const OrdersToCheckPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const userStatus = await getUserStatus();
        if (!userStatus.isAdmin) {
          navigate('/dashboard');
          return;
        }

        const fetchedQuotes = await getQuotesWithStatus('checking');
        setQuotes(fetchedQuotes);
      } catch (error) {
        handleOpenSnackbar('Failed to fetch quotes', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, [handleOpenSnackbar, navigate]);

  const handleQuoteClick = (quoteId: string) => {
    navigate(`/quote?id=${quoteId}`);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} thickness={5} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Helmet>
        <title>Smart Picker | Orders To Check</title>
      </Helmet>
      <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
        Orders to Check
      </Typography>

      {quotes.length === 0 ? (
        <Paper
          elevation={3}
          sx={{
            mt: 6,
            py: 6,
            px: 4,
            textAlign: 'center',
            backgroundColor: theme => theme.palette.background.default,
          }}
        >
          <InboxIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            You&apos;re all caught up!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no orders pending review at the moment.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {quotes.map((quote) => (
            <Grid size={{ xs: 12, md: 4, sm: 6 }} key={quote.id}>
              <Card
                sx={{
                  transition: '0.3s',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'scale(1.02)',
                  },
                }}
              >
                <CardActionArea onClick={() => handleQuoteClick(quote.id)}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">
                      Quote #{quote.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customer: {quote.customerName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total: ${quote.totalAmount.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated: {quote.lastModified}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default OrdersToCheckPage;
