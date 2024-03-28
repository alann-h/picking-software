import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Grid, Card, CardContent, Pagination, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { extractQuote, saveQuote } from '../api/quote';
import { QuoteData } from '../utils/types';

const Dashboard: React.FC = () => {
  const [quoteNumber, setQuoteNumber] = useState<string>('');
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;


  const handleSearch = async () => {
    const searchField = 'DocNumber';
    try {
      const response = await extractQuote(searchField, quoteNumber);
      const { source, data } = response;
      setQuoteData(data);
      if (source === 'api') {
        await saveQuote(data);
      }
    } catch (error) {
      console.error(error);
      setQuoteData(null);
    }
  };
  
  const highlightStyle = {
    backgroundColor: 'yellow',
    padding: 2,
    borderRadius: 3,
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
        sx={{margin: 2}}
      >
        <SearchIcon />
      </Button>
      <Paper elevation={8} sx={{ padding: 3, marginTop: 3 }}>
        {quoteData ? (
          <>
            <Paper variant="outlined" sx={{ padding: 2, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1" sx={{ margin: 0, fontWeight: 'bold' }}>
                Customer: {quoteData.customer}
              </Typography>
              <Typography variant="body1" sx={{ margin: 0, fontWeight: 'bold' }}>
                Quote Number: {quoteNumber}
              </Typography>
            </Paper>
            <Grid container spacing={1}>
              {Object.entries(quoteData.productInfo || {})
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map(([name, details], index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined">
                      <CardContent sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        '&.MuiCardContent-root': { padding: 2 },
                        ...(details.SKU.toLowerCase().includes('but') ? highlightStyle : {})
                      }}>
                        <Typography variant="body2">{details.SKU}</Typography>
                        <Typography variant="body2">{name}</Typography>
                        <Typography variant="body2">{details.Qty}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
            <Typography sx={{ textAlign: 'center', margin: 2 }}>
             <span  style={{ ...highlightStyle, fontWeight: 'bold' }}> Total Amount: {quoteData.totalAmount}</span>
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2}}>
              <Pagination
                count={Math.ceil(Object.keys(quoteData.productInfo || {}).length / itemsPerPage)}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
              />
            </Box>
          </>
        ) : (
          <Typography variant="body2">No data to display</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;
