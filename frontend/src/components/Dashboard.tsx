import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { extractQuote } from '../api/quote';

const Dashboard = () => {
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteData, setQuoteData] = useState(null);

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
        <SearchIcon/>
      </Button>
      <Paper elevation={8} style={{ padding: 3, marginTop: 3 }}>
        {quoteData ? (
          // Set Typography component as "pre" to directly use preformatted text
          <Typography component="pre" variant="body1" style={{ margin: 0 }}>
            {JSON.stringify(quoteData, null, 2)}
          </Typography>
        ) : (
          <Typography variant="body2">No data to display</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;
