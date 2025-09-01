import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { uploadKyteCSV, getCustomersForMapping, createQuickBooksEstimates } from '../api/kyteConverter';
import ItemDescription from './ItemDescription';

interface Customer {
  customerId: string;
  customerName: string;
}

interface LineItem {
  quantity: number;
  productName: string;
  originalText: string;
  productId?: string;
  sku?: string;
  barcode?: string;
  price: number;
  externalItemId?: string;
  matched: boolean;
}

interface Order {
  number: string;
  date: string;
  itemsDescription: string;
  total: number;
  customerId: string | null;
  lineItems: LineItem[];
}

interface ProcessingResult {
  orderNumber: string;
  success: boolean;
  message: string;
  estimateId?: string;
  estimateNumber?: string;
}

const KyteToQuickBooksConverter: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await getCustomersForMapping();
      setCustomers(response.customers);
    } catch (err) {
      setError('Failed to load customers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const csvContent = await selectedFile.text();
      const response = await uploadKyteCSV(csvContent);
      
      setOrders(response.orders);
      setSuccess(`Successfully processed ${response.orders.length} pending orders`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleCustomerChange = (orderNumber: string, customerId: string) => {
    setOrders(prev => 
      prev.map(order => 
        order.number === orderNumber 
          ? { ...order, customerId } 
          : order
      )
    );
  };

  const handleCreateEstimates = async () => {
    const unmappedOrders = orders.filter(order => !order.customerId);
    if (unmappedOrders.length > 0) {
      setError(`Please map customers for orders: ${unmappedOrders.map(o => o.number).join(', ')}`);
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      
      const response = await createQuickBooksEstimates(orders);
      setResults(response.results);
      setSuccess(response.message);
    } catch (err: any) {
      setError(err.message || 'Failed to create estimates');
    } finally {
      setProcessing(false);
    }
  };

  const getMatchStatusIcon = (matched: boolean) => {
    if (matched) {
      return <CheckCircleIcon color="success" fontSize="small" />;
    }
    return <WarningIcon color="warning" fontSize="small" />;
  };

  const getMatchStatusText = (matched: boolean) => {
    return matched ? 'Matched' : 'No Match';
  };

  const allCustomersMapped = orders.length > 0 && orders.every(order => order.customerId);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Kyte to QuickBooks Converter
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Step 1: Upload CSV File
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            disabled={uploading}
          >
            Select CSV File
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileSelect}
            />
          </Button>
          
          {selectedFile && (
            <Typography variant="body2" color="text.secondary">
              Selected: {selectedFile.name}
            </Typography>
          )}
          
          <Button
            variant="contained"
            onClick={handleFileUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? <CircularProgress size={20} /> : 'Upload & Process'}
          </Button>
        </Box>
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {orders.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Step 2: Map Customers & Review Orders
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Items Description</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Items</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.number}>
                    <TableCell>{order.number}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <ItemDescription 
                        items={order.itemsDescription.split(',').map(item => item.trim())} 
                        maxItems={3}
                        variant="body2"
                        showExpandButton={true}
                      />
                    </TableCell>
                    <TableCell>${order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={order.customerId || ''}
                          onChange={(e) => handleCustomerChange(order.number, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Select Customer</em>
                          </MenuItem>
                          {customers.map((customer) => (
                            <MenuItem key={customer.customerId} value={customer.customerId}>
                              {customer.customerName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">
                            {order.lineItems.length} items
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box>
                            {order.lineItems.map((item, index) => (
                              <Box key={index} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  {getMatchStatusIcon(item.matched)}
                                  <Typography variant="body2" fontWeight="bold">
                                    {item.quantity}x {item.productName}
                                  </Typography>
                                  <Chip 
                                    label={getMatchStatusText(item.matched)} 
                                    size="small" 
                                    color={item.matched ? "success" : "warning"}
                                  />
                                </Box>
                                {item.matched && (
                                  <Typography variant="caption" color="text.secondary">
                                    SKU: {item.sku} | Price: ${item.price.toFixed(2)}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateEstimates}
              disabled={!allCustomersMapped || processing}
              size="large"
            >
              {processing ? <CircularProgress size={20} /> : 'Create QuickBooks Estimates'}
            </Button>
            
            {!allCustomersMapped && (
              <Alert severity="warning" sx={{ flex: 1 }}>
                Please map customers for all orders before creating estimates
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      {results.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Processing Results
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Estimate #</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.orderNumber}>
                    <TableCell>{result.orderNumber}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <Chip icon={<CheckCircleIcon />} label="Success" color="success" size="small" />
                      ) : (
                        <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell>{result.message}</TableCell>
                    <TableCell>{result.estimateNumber || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default KyteToQuickBooksConverter;
