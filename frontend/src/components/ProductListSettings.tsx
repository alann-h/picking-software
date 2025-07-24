import React, { useState } from 'react';
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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Product } from '../utils/types';
import { useSnackbarContext } from './SnackbarContext';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => void;
  updateProductDb: (productId: number, fields: Partial<Product>) => Promise<void>;
  deleteProductDb: (productId: number) => Promise<void>;
  addProductDb: (productName: string, sku: string, barcode: string) => Promise<string>;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  isLoading,
  onRefresh,
  updateProductDb,
  deleteProductDb,
  addProductDb,
}) => {
  const { handleOpenSnackbar } = useSnackbarContext();

  // “Edit Product” dialog
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [openEdit, setOpenEdit] = useState(false);

  // “Add Product” dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // ---------- Existing “Edit” handlers ----------
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setSelectedProduct(null);
    setOpenEdit(false);
  };

  const handleChangeEdit = <K extends keyof Product>(field: K, value: Product[K]) => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, [field]: value });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    try {
      await updateProductDb(selectedProduct.productId, {
        productName: selectedProduct.productName,
        price: selectedProduct.price,
        barcode: selectedProduct.barcode,
        quantityOnHand: selectedProduct.quantityOnHand,
        sku: selectedProduct.sku,
      });
      handleOpenSnackbar('Product updated successfully', 'success');
      onRefresh();
      handleCloseEdit();
    } catch (err) {
      handleOpenSnackbar((err as Error).message || 'Failed to update product', 'error');
    }
  };

  const handleDeleteEdit = async () => {
    if (!selectedProduct) return;
    try {
      await deleteProductDb(selectedProduct.productId);
      handleOpenSnackbar('Product deleted successfully', 'success');
      onRefresh();
      handleCloseEdit();
    } catch (err) {
      handleOpenSnackbar((err as Error).message || 'Failed to delete product', 'error');
    }
  };

  // ---------- NEW: “Add Product” handlers ----------
  const handleOpenAdd = () => {
    setNewProductName('');
    setNewSku('');
    setNewBarcode('');
    setOpenAdd(true);
  };

  const handleCloseAdd = () => {
    setOpenAdd(false);
  };

  const handleAdd = async () => {
    // Basic validation: ensure no field is blank
    if (!newProductName.trim() || !newSku.trim() || !newBarcode.trim()) {
      handleOpenSnackbar('All fields are required to add a new product.', 'error');
      return;
    }

    setIsAdding(true);
    try {
      await addProductDb(newProductName.trim(), newSku.trim(), newBarcode.trim());
      handleOpenSnackbar('Product added successfully', 'success');
      onRefresh();
      handleCloseAdd();
    } catch (err) {
      handleOpenSnackbar((err as Error).message || 'Failed to add product', 'error');
    } finally {
      setIsAdding(false);
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
          <Button variant="outlined" color="primary" onClick={handleOpenAdd}>
            Add Product
          </Button>
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
                    onClick={() => handleOpenEdit(product)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{product.productName}</TableCell>
                    <TableCell>{product.barcode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Refresh + Add buttons */}
          <Box mt={3} display="flex" justifyContent="center" gap={2}>
            <Button variant="contained" color="primary" onClick={onRefresh}>
              Refresh Products
            </Button>
          </Box>

          {/* -------- Edit Product Dialog -------- */}
          <Dialog open={openEdit} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogContent>
              <TextField
                label="Product Name"
                fullWidth
                margin="dense"
                value={selectedProduct?.productName || ''}
                onChange={(e) => handleChangeEdit('productName', e.target.value)}
              />
              <TextField
                label="Price"
                fullWidth
                margin="dense"
                type="number"
                value={selectedProduct?.price ?? ''}
                onChange={(e) => handleChangeEdit('price', parseFloat(e.target.value))}
              />
              <TextField
                label="Barcode"
                fullWidth
                margin="dense"
                value={selectedProduct?.barcode || ''}
                onChange={(e) => handleChangeEdit('barcode', e.target.value)}
              />
              <TextField
                label="Quantity On Hand"
                fullWidth
                margin="dense"
                type="number"
                value={selectedProduct?.quantityOnHand ?? ''}
                onChange={(e) => handleChangeEdit('quantityOnHand', parseInt(e.target.value))}
              />
              <TextField
                label="SKU"
                fullWidth
                margin="dense"
                value={selectedProduct?.sku || ''}
                onChange={(e) => handleChangeEdit('sku', e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteEdit} color="error">
                Delete
              </Button>
              <Button onClick={handleCloseEdit}>Cancel</Button>
              <Button onClick={handleSaveEdit} variant="contained" color="primary">
                Save
              </Button>
            </DialogActions>
          </Dialog>

          {/* -------- Add Product Dialog -------- */}
          <Dialog open={openAdd} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogContent>
              {/* Warning Note */}
              <Box mb={2}>
                <Typography color="warning.main" variant="body2">
                  ⚠️ <strong>Warning:</strong> This product must already exist in QuickBooks with the exact same
                  name and SKU, otherwise enrichment will fail.
                </Typography>
              </Box>

              <TextField
                label="Product Name"
                fullWidth
                margin="dense"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
              <TextField
                label="SKU"
                fullWidth
                margin="dense"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
              />
              <TextField
                label="Barcode"
                fullWidth
                margin="dense"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseAdd}>Cancel</Button>
              <Button
                onClick={handleAdd}
                variant="contained"
                color="primary"
                disabled={isAdding}
                startIcon={isAdding ? <CircularProgress size={16} /> : undefined}
              >
                {isAdding ? 'Adding…' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </>
  );
};

export default ProductList;
