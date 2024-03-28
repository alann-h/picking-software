import React, { useState } from 'react';
import { Container, TextField, Button, Pagination, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { extractQuote, saveQuote } from '../api/quote';
import { QuoteData } from '../utils/types';
import Quote from './Quote';

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
        sx={{ margin: 2 }}
      >
        <SearchIcon />
      </Button>
      <Quote quoteData={quoteData} quoteNumber={quoteNumber} currentPage={currentPage} itemsPerPage={itemsPerPage} />
      <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
        <Pagination
          count={Math.ceil(Object.keys(quoteData?.productInfo || {}).length / itemsPerPage)}
          page={currentPage}
          onChange={(_, page) => setCurrentPage(page)}
        />
      </Box>
    </Container>
  );
};

export default Dashboard;
