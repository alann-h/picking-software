import React, { useState } from 'react';
import { Container, Paper, TextField, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const Dashboard = () => {
  const [quoteNumber, setQuoteNumber] = useState('');

  const handleSearch = () => {
    console.log(quoteNumber);

  }
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
      <Paper elevation={8}>
          test
      </Paper>
      
    </Container>
  );
};

export default Dashboard;
