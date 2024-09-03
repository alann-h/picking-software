import React from 'react';
import { Typography, Grid, Card, CardContent, Box, Button, CircularProgress } from '@mui/material';
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
          <Grid container spacing={3}>
            {products.map((product) => (
              <Grid item xs={12} sm={6} md={4} key={product.barcode}>
                <Card sx={{ 
                  height: 200, 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: (theme) => theme.shadows[8],
                  },
                }}>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      {product.productName}
                    </Typography>
                    <Box>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Barcode: {product.barcode}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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