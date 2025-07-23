import React from 'react';
import {
  Paper,
  Typography,
  Box,
  useTheme,
  Grid,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Alert,
  AlertTitle,
} from '@mui/material';

// Import desired icons
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const ExcelInfoComponent: React.FC = () => {
  const theme = useTheme();

  const steps = [
    'Go to Reports > List Reports > Item Listing',
    'Customize the report to include the Name and SKU fields.',
    'Export the report as an Excel file.',
    'Add a new "Barcode" column and fill in the unique barcodes.',
  ];

  return (
    <Paper
      elevation={2}
      sx={{
        padding: { xs: 2, sm: 4 },
        backgroundColor: theme.palette.background.default,
        borderRadius: 4,
      }}
    >
      <Stack spacing={5}>
        {/* Section 1: Excel File Structure */}
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <DescriptionOutlinedIcon color="primary" sx={{ fontSize: '2.5rem' }} />
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Excel File Structure
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your uploaded Excel file must follow this structure.
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <LabelOutlinedIcon color="action" />
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                      Product Name
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Must match the product names in QuickBooks exactly.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <PinOutlinedIcon color="action" />
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                      SKU
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Must match the SKU values defined in QuickBooks.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <QrCode2OutlinedIcon color="action" />
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                      Barcode
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Must contain a unique barcode for each product.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>

        {/* Section 2: Exporting from QuickBooks */}
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FileUploadOutlinedIcon color="primary" sx={{ fontSize: '2.5rem' }} />
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Exporting from QuickBooks
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Follow these steps to get your product list.
              </Typography>
            </Box>
          </Stack>

          <List>
            {steps.map((text, index) => (
              <ListItem key={index} disablePadding>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      color: 'primary.main',
                    }}
                  >
                    {index + 1}.
                  </Typography>
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </Stack>

        {/* Final Note */}
        <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mt: 2 }}>
          <AlertTitle sx={{ fontWeight: 'bold' }}>Important</AlertTitle>
          Ensure that the <strong>Product Name</strong> and <strong>SKU</strong> in your Excel file match exactly with those in QuickBooks to avoid data synchronization errors.
        </Alert>

      </Stack>
    </Paper>
  );
};

export default ExcelInfoComponent;