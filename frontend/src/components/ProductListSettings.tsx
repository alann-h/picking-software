import React, { useState } from 'react';
import {
  Typography, Box, Button, CircularProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { Product } from '../utils/types';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => void;
  updateProductDb: (productId: number, fields: Partial<Product>) => Promise<void>;
  deleteProductDb: (productId: number) => Promise<void>;
}

const ProductList: React.FC<ProductListProps> = ({
  products, isLoading, onRefresh, updateProductDb, deleteProductDb
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const handleOpen = (product: Product) => {
    setSelectedProduct(product);
    setOpen(true);
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setOpen(false);
  };

  const handleChange = <K extends keyof Product>(field: K, value: Product[K]) => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, [field]: value });
    }
  };

  const handleSave = async () => {
    if (selectedProduct) {
      await updateProductDb(selectedProduct.productId, {
        productName: selectedProduct.productName,
        price: selectedProduct.price,
        barcode: selectedProduct.barcode,
        quantityOnHand: selectedProduct.quantityOnHand,
        sku: selectedProduct.sku,
      });
      onRefresh();
      handleClose();
    }
  };

  const handleDelete = async () => {
    if (selectedProduct) {
      await deleteProductDb(selectedProduct.productId);
      onRefresh();
      handleClose();
    }
  };

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
                    key={product.productId}
                    hover
                    onClick={() => handleOpen(product)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{product.productName}</TableCell>
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

          <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogContent>
              <TextField
                label="Product Name"
                fullWidth
                margin="dense"
                value={selectedProduct?.productName || ''}
                onChange={(e) => handleChange('productName', e.target.value)}
              />
              <TextField
                label="Price"
                fullWidth
                margin="dense"
                type="number"
                value={selectedProduct?.price || ''}
                onChange={(e) => handleChange('price', parseFloat(e.target.value))}
              />
              <TextField
                label="Barcode"
                fullWidth
                margin="dense"
                value={selectedProduct?.barcode || ''}
                onChange={(e) => handleChange('barcode', e.target.value)}
              />
              <TextField
                label="Quantity On Hand"
                fullWidth
                margin="dense"
                type="number"
                value={selectedProduct?.quantityOnHand || ''}
                onChange={(e) => handleChange('quantityOnHand', parseInt(e.target.value))}
              />
              <TextField
                label="SKU"
                fullWidth
                margin="dense"
                value={selectedProduct?.sku || ''}
                onChange={(e) => handleChange('sku', e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDelete} color="error">Delete</Button>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} variant="contained" color="primary">Save</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  );
};

export default ProductList;
