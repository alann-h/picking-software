import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Card, CardContent, 
  CardActionArea, Grid, CircularProgress 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus } from '../api/quote';
import { getUserStatus } from '../api/user';
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
          return
        };

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
    navigate(`/quote?Id=${quoteId}`);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Orders to Check
      </Typography>
      <Grid container spacing={3}>
        {quotes.map((quote) => (
          <Grid item xs={12} sm={6} md={4} key={quote.id}>
            <Card>
              <CardActionArea onClick={() => handleQuoteClick(quote.id)}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    Quote #{quote.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Customer: {quote.customerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount: ${quote.totalAmount}
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
    </Container>
  );
};

export default OrdersToCheckPage;