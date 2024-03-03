import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Grid, Card } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { extractQuote } from '../api/quote';

interface ProductDetails {
  SKU: string;
  Qty: number;
}

interface ProductInfo {
  [productName: string]: ProductDetails;
}

interface QuoteData {
  customer: string;
  productInfo: ProductInfo;
  totalAmount: string;
}

const Dashboard: React.FC = () => {
  const [quoteNumber, setQuoteNumber] = useState<string>('');
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);

  const handleSearch = async () => {
    const searchField = 'DocNumber';
    try {
      const data = await extractQuote(searchField, quoteNumber);
      setQuoteData(data);
    } catch (error) {
      console.error(error);
      setQuoteData(null);
    }
  };

  return (
    <Container>
      <TextField 
        required 
        id="quote-number" 
        label="Quote Number"
        value={quoteNumber} 
        onChange={(e) => setQuoteNumber(e.target.value)}
      />
      <Button 
        color='success' 
        variant="contained"
        onClick={handleSearch}
      >
        <SearchIcon />
      </Button>
      <Paper elevation={8} sx={{ padding: 3, marginTop: 3 }}>
        {quoteData ? (
          <>
            <Paper variant="outlined" sx={{ padding: 2, marginBottom: 2 }}>
              <Typography variant="body1" sx={{ margin: 0 }}>
                Customer: {quoteData.customer}
              </Typography>
            </Paper>
            <Grid container spacing={2}>
              {Object.entries(quoteData.productInfo || {}).slice(0, 20).map(([name, details], index) => (
                <Grid item xs={12} key={index}>
                  <Card sx={{ display: 'flex', justifyContent: 'space-between', padding: 2 }}>
                    <Typography variant="body2">{details.SKU}</Typography>
                    <Typography variant="body2">{name}</Typography>
                    <Typography variant="body2">{details.Qty}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Typography variant="body2">No data to display</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;
