import React from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  CircularProgress, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper
} from '@mui/material';
import { Product } from '../utils/types';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, isLoading, onRefresh }) => {
  return (
    <>
      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Showing {products.length} products
          </Typography>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="product table">
              <TableHead>
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Barcode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.barcode}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {product.productName}
                    </TableCell>
                    <TableCell>{product.barcode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box mt={3} display="flex" justifyContent="center">
            <Button variant="contained" color="primary" onClick={onRefresh}>
              Refresh Products
            </Button>
          </Box>
        </>
      )}
    </>
  );
};

export default ProductList;