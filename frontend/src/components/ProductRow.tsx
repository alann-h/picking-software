import React, { useState } from 'react';
import {
  TableRow, TableCell, Chip, useTheme, Tooltip,
  Box, Menu, MenuItem, IconButton, CircularProgress,
  Typography, Divider
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

  const handleProductClick = () => {
    actions.openProductDetailsModal(product.productId, product);
  };

  const isAnyActionLoading = Object.values(pendingStates).some(status => status);

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  const getQuantityColor = () => {
    if (product.pickingQty === product.originalQty) {
      return theme.palette.success.main;
    } else if (product.pickingQty > 0) {
      return theme.palette.warning.main;
    }
    return theme.palette.text.secondary;
  };

  return (
    <TableRow 
      hover 
      sx={{
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
          '& .product-name': {
            color: theme.palette.primary.main,
            textDecoration: 'underline',
            cursor: 'pointer'
          }
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <TableCell sx={{ width: '15%', minWidth: '100px' }}>
        <Typography 
          variant="body2" 
          className="product-sku"
          sx={{ 
            fontFamily: 'monospace',
            fontWeight: 500,
            color: theme.palette.text.secondary,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            wordBreak: 'break-all'
          }}
        >
          {product.sku}
        </Typography>
      </TableCell>
      
      <TableCell sx={{ width: '40%', minWidth: '150px' }}>
        <Typography
          className="product-name"
          variant="body2"
          sx={{
            color: theme.palette.text.primary,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
            lineHeight: 1.2,
            '&:hover': {
              color: theme.palette.primary.main,
              textDecoration: 'underline'
            }
          }}
          onClick={handleProductClick}
        >
          {product.productName}
        </Typography>
      </TableCell>
      
      <TableCell  sx={{ width: '20%', minWidth: '110px', textAlign: 'center' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 0.5 
        }}>
          <Typography
            variant="body2"
            sx={{
              color: getQuantityColor(),
              fontWeight: 600,
            }}
          >
            {Number(product.pickingQty || 0).toFixed(1)}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
            }}
          >
            / {Number(product.originalQty || 0).toFixed(1)}
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell sx={{ width: '15%', minWidth: '90px', textAlign: 'center' }}>
        <Tooltip title={`Current picking status: ${product.pickingStatus}`}>
          <Chip
            label={product.pickingStatus}
            size="small"
            sx={{
              backgroundColor: getStatusColor(product.pickingStatus),
              color: theme.palette.common.white,
              textTransform: 'capitalize',
              fontWeight: 600,
              fontSize: '0.65rem',
              height: '24px',
              '& .MuiChip-label': {
                px: 1.5
              }
            }}
          />
        </Tooltip>
      </TableCell>
      
      <TableCell sx={{ width: '10%', padding: '0 8px', textAlign: 'right' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <IconButton
            aria-label="more options"
            onClick={handleClick}
            disabled={isAnyActionLoading}
            size="small"
            sx={{
              color: theme.palette.action.active,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
                color: theme.palette.primary.main
              }
            }}
          >
            {isAnyActionLoading ? (
              <CircularProgress size={20} />
            ) : (
              <MoreVertIcon fontSize="small" />
            )}
          </IconButton>
          
          <Menu 
            anchorEl={anchorEl} 
            open={open} 
            onClose={handleClose}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 180,
                  boxShadow: theme.shadows[8],
                  border: `1px solid ${theme.palette.divider}`
                }
              }
            }}
          >
            <MenuItem 
              onClick={() => handleAction(() => actions.openProductDetailsModal(product.productId, product))}
              sx={{ py: 1.5 }}
            >
              <Typography variant="body2">View Details</Typography>
            </MenuItem>
            
            <Divider />
            
            <MenuItem 
              onClick={() => handleAction(() => actions.openAdjustQuantityModal(product.productId, product.pickingQty, product.productName))}
              disabled={product.pickingStatus === 'completed'}
              sx={{ py: 1.5 }}
            >
              <Typography variant="body2">Adjust Quantity</Typography>
            </MenuItem>
            
            <MenuItem 
              onClick={() => handleAction(() => actions.saveForLater(product.productId))} 
              disabled={product.pickingStatus === 'completed'}
              sx={{ py: 1.5 }}
            >
              <Typography variant="body2">
                {product.pickingStatus === 'backorder' ? 'Set to Pending' : 'Save for Later'}
              </Typography>
            </MenuItem>
            
            <MenuItem 
              onClick={() => handleAction(() => actions.setUnavailable(product.productId))}
              disabled={product.pickingStatus === 'completed'}
              sx={{ py: 1.5 }}
            >
              <Typography variant="body2" sx={{ color: theme.palette.error.main }}>
                {product.pickingStatus === 'unavailable' ? 'Set as Available' : 'Set Unavailable'}
              </Typography>
            </MenuItem>
            
            <Divider />
            
            <MenuItem 
              onClick={() => handleAction(() => actions.setFinished(product.productId))}
              disabled={product.pickingStatus === 'completed'}
              sx={{ py: 1.5 }}
            >
              <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                Mark as Finished
              </Typography>
            </MenuItem>
          </Menu>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(ProductRow);