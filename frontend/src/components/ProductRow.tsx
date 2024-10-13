import React, { useState } from 'react';
import { 
  TableRow, 
  TableCell, 
  Chip, 
  useTheme, 
  Tooltip, 
  Box,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ProductDetail } from '../utils/types';
import { getStatusColor } from '../utils/other';

interface ProductRowProps {
  product: ProductDetail;
  onProductDetails: (productId: number, product: ProductDetail) => void;
  onAdjustQuantityModal: (productId: number, newQty: number, productName: string) => void;
  onSaveForLater: (productId: number) => Promise<{ newStatus: string }>;
  onSetUnavailable: (productId: number) => Promise<{ newStatus: string }>;
  isMobile: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onProductDetails,
  onAdjustQuantityModal,
  onSaveForLater,
  onSetUnavailable,
  isMobile,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action: string) => {
    handleClose();
    switch (action) {
      case 'details':
        onProductDetails(product.productId, product);
        break;
      case 'adjust':
        onAdjustQuantityModal(product.productId, product.pickingQty, product.productName);
        break;
      case 'saveForLater':
        onSaveForLater(product.productId);
        break;
      case 'setUnavailable':
        onSetUnavailable(product.productId);
        break;
    }
  };

  return (
    <TableRow>
      <TableCell>{product.sku}</TableCell>
      <TableCell sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
        {product.productName}
      </TableCell>
      <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 'bold' }}>
        {product.pickingQty}/{product.originalQty}
      </TableCell>
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
        {isMobile ? (
          <Box>
            <IconButton
              aria-label="more options"
              id={`more-button-${product.productId}`}
              aria-controls={open ? `actions-menu-${product.productId}` : undefined}
              aria-expanded={open ? 'true' : undefined}
              aria-haspopup="true"
              onClick={handleClick}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id={`actions-menu-${product.productId}`}
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': `more-button-${product.productId}`,
              }}
            >
              <MenuItem onClick={() => handleAction('details')}>Details</MenuItem>
              <MenuItem onClick={() => handleAction('adjust')}>Adjust Quantity</MenuItem>
              <MenuItem onClick={() => handleAction('saveForLater')}>
                {product.pickingStatus === 'backorder' ? 'Set to pending' : 'Save for Later'}
              </MenuItem>
              <MenuItem onClick={() => handleAction('setUnavailable')}>
                {product.pickingStatus === 'unavailable' ? 'Set to available' : 'Set Unavailable'}
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              <Chip label="Details" onClick={() => onProductDetails(product.productId, product)} />
              <Chip label="Adjust Quantity" onClick={() => onAdjustQuantityModal(product.productId, product.pickingQty, product.productName)} />
              <Chip 
                label={product.pickingStatus === 'backorder' ? 'Set to pending' : 'Save for Later'}
                onClick={() => onSaveForLater(product.productId)}
                disabled={product.pickingStatus === 'completed'} 
              />
              <Chip 
                label={product.pickingStatus === 'unavailable' ? 'Set to available' : 'Set Unavailable'}
                onClick={() => onSetUnavailable(product.productId)}
                color={product.pickingStatus === 'unavailable' ? 'primary' : 'error'}
                disabled={product.pickingStatus === 'completed'}
              />
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
};

export default ProductRow