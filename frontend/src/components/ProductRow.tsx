import React from 'react';
import { TableRow, TableCell, Button, Chip, useTheme, Tooltip } from '@mui/material';
import { ProductDetail } from '../utils/types';
import AdjustQuantityButton from './AdjustQuantityButton';
import SaveForLaterButton from './SaveForLaterButton';

interface ProductRowProps {
  product: ProductDetail;
  onProductClick: (productId: number, product: ProductDetail) => void;
  onAdjustQuantity: (productId: number, newQty: number) => Promise<void>;
  onSaveForLater: (productId: number) => Promise<{ newStatus: string }>;
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
        return theme.palette.error.main;
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
        <AdjustQuantityButton
          productName={product.productName}
          currentQty={product.pickingQty}
          productId={product.productId}
          adjustProductQtyButton={onAdjustQuantity}
        />
        <SaveForLaterButton
          productId={product.productId}
          currentStatus={product.pickingStatus}
          saveForLaterButton={onSaveForLater}
        />
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;