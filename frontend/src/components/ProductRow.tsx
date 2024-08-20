import React from 'react';
import { TableRow, TableCell, Checkbox, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { ProductDetail } from '../utils/types';
import AdjustQuantityButton from './AdjustQuantityButton';

interface ProductRowProps {
  product: ProductDetail;
  onProductClick: (productId: number, product: ProductDetail) => void;
  onAdjustQuantity: (productId: number, newQty: number) => Promise<void>;
  onSaveForLater: (productId: number) => Promise<{ message: string }>;
  getStatusColor: (status: string) => "success" | "warning" | "error" | "default";
}

const ProductRow: React.FC<ProductRowProps> = ({ 
  product, 
  onProductClick, 
  onAdjustQuantity, 
  onSaveForLater,
  getStatusColor 
}) => {
  console.log(product)
  const isDeferred = product.pickingStatus.toLowerCase() === 'deferred';

  return (
    <TableRow hover>
      <TableCell padding="checkbox">
        <Checkbox color="primary" />
      </TableCell>
      <TableCell>{product.sku}</TableCell>
      <TableCell>
        <Typography
          variant="body2"
          sx={{
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
          onClick={() => onProductClick(product.productId, product)}
        >
          {product.productName}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip 
          label={product.pickingStatus} 
          color={getStatusColor(product.pickingStatus)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Chip 
          label={`${product.pickingQty}/${product.originalQty}`}
          color="primary"
          size="small"
        />
      </TableCell>
      <TableCell>
        <AdjustQuantityButton
          productName={product.productName}
          currentQty={product.pickingQty}
          productId={product.productId}
          adjustProductQtyButton={onAdjustQuantity}
        />
        <Tooltip title="View Details">
          <IconButton size="small" onClick={() => onProductClick(product.productId, product)}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={isDeferred ? "Pick this Product" : "Save for Later"}>
          <IconButton 
            size="small" 
            onClick={() => onSaveForLater(product.productId)}
            color={isDeferred ? "primary" : "default"}
          >
            {isDeferred ? <PlayArrowIcon fontSize="small" /> : <SaveIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;