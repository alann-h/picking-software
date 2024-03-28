import React from 'react';
import { Card, CardContent, Grid, Paper, Typography } from '@mui/material';
import { QuoteData } from '../utils/types';

interface QuoteProps {
  quoteData: QuoteData | null;
  quoteNumber: string;
  currentPage: number;
  itemsPerPage: number;
}

const Quote: React.FC<QuoteProps> = ({ quoteData, quoteNumber, currentPage, itemsPerPage }) => {
  const highlightStyle = {
    backgroundColor: 'yellow',
    padding: 2,
    borderRadius: 3,
  };

  return (
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
            <span style={{ ...highlightStyle, fontWeight: 'bold' }}>Total Amount: {quoteData.totalAmount}</span>
          </Typography>
        </>
      ) : (
        <Typography variant="body2">No data to display</Typography>
      )}
    </Paper>
  );
};

export default Quote;
