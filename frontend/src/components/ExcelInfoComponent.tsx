import React from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';

const ExcelInfoComponent: React.FC = () => {
  const theme = useTheme();

  return (
    <Paper elevation={3} sx={{ padding: 3, backgroundColor: theme.palette.background.paper }}>
      <Typography variant="h6" gutterBottom sx={{fontWeight: 'bold'}}>
        Excel File Structure
      </Typography>
      <Typography variant="body1" paragraph>
        Your Excel file should have the following structure:
      </Typography>
      <Box component="img" src="/excel-example.png" alt="Excel structure example" sx={{ width: '100%', height: 'auto', mb: 2 }} />
      <Typography variant="body2" paragraph>
        - The <strong>Product Name</strong> column should be on the left and match exactly with the names in <strong>QuickBooks</strong>.
      </Typography>
      <Typography variant="body2" paragraph>
        - The <strong>Barcode</strong> column should be on the right, containing unique barcodes for each product.
      </Typography>
      <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
        Exporting from QuickBooks
      </Typography>
      <Typography variant="body1" paragraph>
        To export your product list from QuickBooks:
      </Typography>
      <ol>
        <Typography component="li" variant="body2">Go to <strong>Reports</strong> &gt; <strong>List Reports</strong> &gt; <strong>Item Listing</strong></Typography>
        <Typography component="li" variant="body2">Customize the report to include the <strong>Name</strong> field</Typography>
        <Typography component="li" variant="body2">Export the report as an <strong>Excel file</strong></Typography>
        <Typography component="li" variant="body2">Add a <strong>Barcode</strong> column to the exported file and fill in the unique barcodes</Typography>
      </ol>
      <Typography variant="body2" color="text.secondary">
        Note: Ensure that the product names in your Excel file match exactly with those in QuickBooks to avoid any discrepancies.
      </Typography>
    </Paper>
  );
};

export default ExcelInfoComponent;