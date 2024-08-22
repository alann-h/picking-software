import React from 'react';
import { TableRow, TableCell, Button, Chip, useTheme, Tooltip } from '@mui/material';
import { ProductDetail } from '../utils/types';

interface ProductRowProps {
  product: ProductDetail;
  onProductClick: (productId: number, product: ProductDetail) => void;
  onAdjustQuantity: (productId: number, currentQty: number) => void;
  onSaveForLater: (productId: number) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onProductClick,
  onAdjustQuantity,
  onSaveForLater,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'pending':
        return theme.palette.warning.main;
      case 'deferred':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <TableRow>
      <Tooltip title="Stock Keeping Unit - unique identifier for this product">
        <TableCell>{product.sku}</TableCell>
      </Tooltip>
      <Tooltip title="Product name">
        <TableCell sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
          {product.productName}
        </TableCell>
      </Tooltip>
      <Tooltip title="Quantity to be picked">
        <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 'bold' }}>
          {product.pickingQty}/{product.originalQty}
        </TableCell>
      </Tooltip>
      <TableCell>
        <Tooltip title={`Current picking status: ${product.pickingStatus}`}>
          <Chip
            label={product.pickingStatus}
            sx={{
              backgroundColor: getStatusColor(product.pickingStatus),
              color: theme.palette.common.white,
            }}
          />
        </Tooltip>
      </TableCell>
      <TableCell>
        <Tooltip title="View detailed information about this product">
          <Button
            onClick={() => onProductClick(product.productId, product)}
            variant="outlined"
            size="small"
            sx={{ mr: 1 }}
          >
            Details
          </Button>
        </Tooltip>
        <Tooltip title="Adjust the quantity to be picked">
          <Button
            onClick={() => onAdjustQuantity(product.productId, product.pickingQty)}
            variant="outlined"
            size="small"
            sx={{ mr: 1 }}
          >
            Adjust Qty
          </Button>
        </Tooltip>
        <Tooltip title={product.pickingStatus === 'deferred' ? 'Resume picking this product' : 'Save this product for later picking'}>
          <Button
            onClick={() => onSaveForLater(product.productId)}
            variant="outlined"
            size="small"
          >
            {product.pickingStatus === 'deferred' ? 'picking' : 'Save for Later'}
          </Button>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;