import React, { useState } from 'react';
import {
  TableRow, TableCell, Chip, useTheme, Tooltip,
  Box, Menu, MenuItem, IconButton, CircularProgress
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ProductDetail } from '../utils/types';
import { getStatusColor } from '../utils/other';
import { useQuoteManager } from './useQuote';

type QuoteManagerActions = ReturnType<typeof useQuoteManager>['actions'];
type QuoteManagerPendingStates = ReturnType<typeof useQuoteManager>['pendingStates'];

interface ProductRowProps {
  product: ProductDetail;
  actions: QuoteManagerActions;
  pendingStates: QuoteManagerPendingStates;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  actions,
  pendingStates,
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

  const isAnyActionLoading = Object.values(pendingStates).some(status => status);

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  return (
    <TableRow hover>
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
              textTransform: 'capitalize'
            }}
          />
        </Tooltip>
      </TableCell>
      <TableCell>
        <Box>
          <IconButton
            aria-label="more options"
            onClick={handleClick}
            disabled={isAnyActionLoading}
          >
            {isAnyActionLoading ? <CircularProgress size={24} /> : <MoreVertIcon />}
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            <MenuItem onClick={() => handleAction(() => actions.openProductDetailsModal(product.productId, product))}>
              Details
            </MenuItem>
            <MenuItem 
              onClick={() => handleAction(() => actions.openAdjustQuantityModal(product.productId, product.pickingQty, product.productName))}
              disabled={product.pickingStatus === 'completed'}
            >
              Adjust Quantity
            </MenuItem>
            <MenuItem 
              onClick={() => handleAction(() => actions.saveForLater(product.productId))} 
              disabled={product.pickingStatus === 'completed'}
            >
              {product.pickingStatus === 'backorder' ? 'Set to Pending' : 'Save for Later'}
            </MenuItem>
            <MenuItem 
              onClick={() => handleAction(() => actions.setUnavailable(product.productId))}
              disabled={product.pickingStatus === 'completed'}
            >
              {product.pickingStatus === 'unavailable' ? 'Set as Available' : 'Set Unavailable'}
            </MenuItem>
             <MenuItem 
              onClick={() => handleAction(() => actions.setFinished(product.productId))}
              disabled={product.pickingStatus === 'completed'}
            >
              Set as Finished
            </MenuItem>
          </Menu>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;