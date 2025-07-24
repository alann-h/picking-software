import React, { useEffect, useState } from 'react';
import { 
  TableRow, 
  TableCell, 
  Chip, 
  useTheme, 
  Tooltip, 
  Box,
  Menu,
  MenuItem,
  IconButton,
  CircularProgress
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ProductDetail } from '../utils/types';
import { getStatusColor } from '../utils/other';
import { getUserStatus } from '../api/user';

interface ProductRowProps {
  product: ProductDetail;
  onProductDetails: (productId: number, product: ProductDetail) => Promise<void>;
  onAdjustQuantityModal: (productId: number, pickingQty: number, productName: string) => Promise<void>;
  onSaveForLater: (productId: number) => Promise<{ newStatus: string }>;
  onSetUnavailable: (productId: number) => Promise<{ newStatus: string }>;
  onSetFinished: (productId: number) => Promise<{ newPickingQty: number }>;
  isMobile: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onProductDetails,
  onAdjustQuantityModal,
  onSaveForLater,
  onSetUnavailable,
  onSetFinished,
  isMobile,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = async (action: string) => {
    setLoadingAction(action);
    try {
      switch (action) {
        case 'details':
          await onProductDetails(product.productId, product);
          break;
        case 'adjust':
          await onAdjustQuantityModal(product.productId, product.pickingQty, product.productName);
          break;
        case 'saveForLater':
          await onSaveForLater(product.productId);
          break;
        case 'setUnavailable':
          await onSetUnavailable(product.productId);
          break;
        case 'setFinished':
          await onSetFinished(product.productId);
          break;
      }
    } catch (error) {
        console.error(`Failed to perform action: ${action}`, error);
    } finally {
      setLoadingAction(null);
      handleClose();
    }
  };

  useEffect(() => {
    const fetchUserStatus = async () => {
      const userStatus = await getUserStatus();
      setIsAdmin(userStatus.isAdmin);
    };

    fetchUserStatus();
  }, []);

  const getActionContent = (action: string, defaultLabel: string) => {
    return loadingAction === action ? <CircularProgress size={20} color="inherit" /> : defaultLabel;
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
              disabled={!!loadingAction} 
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id={`actions-menu-${product.productId}`}
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
            >
              <MenuItem onClick={() => handleAction('details')} disabled={!!loadingAction}>{getActionContent('details', 'Details')}</MenuItem>
              <MenuItem onClick={() => handleAction('adjust')} disabled={!!loadingAction}>{getActionContent('adjust', 'Adjust Quantity')}</MenuItem>
              <MenuItem onClick={() => handleAction('saveForLater')} disabled={!!loadingAction}>
                {getActionContent('saveForLater', product.pickingStatus === 'backorder' ? 'Set to pending' : 'Save for Later')}
              </MenuItem>
              <MenuItem onClick={() => handleAction('setUnavailable')} disabled={!!loadingAction}>
                {getActionContent('setUnavailable', product.pickingStatus === 'unavailable' ? 'Set to available' : 'Set Unavailable')}
              </MenuItem>
              {isAdmin && 
                <MenuItem onClick={() => handleAction('setFinished')} disabled={!!loadingAction}>
                  {getActionContent('setFinished', 'Set as completed')}
                </MenuItem>
              }
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              <Chip 
                label={getActionContent('details', 'Details')}
                onClick={() => handleAction('details')} 
                variant='outlined'
                disabled={!!loadingAction}
              />
              <Chip 
                label={getActionContent('adjust', 'Adjust Quantity')}
                onClick={() => handleAction('adjust')} 
                disabled={product.pickingStatus === 'completed' || !!loadingAction}
                variant='outlined'
              />
              <Chip 
                label={getActionContent('saveForLater', product.pickingStatus === 'backorder' ? 'Set to pending' : 'Save for Later')}
                onClick={() => handleAction('saveForLater')}
                disabled={product.pickingStatus === 'completed' || !!loadingAction} 
                variant='outlined'
              />
              <Chip 
                label={getActionContent('setUnavailable', product.pickingStatus === 'unavailable' ? 'Set to available' : 'Set Unavailable')}
                onClick={() => handleAction('setUnavailable')}
                color={product.pickingStatus === 'unavailable' ? 'primary' : 'error'}
                disabled={product.pickingStatus === 'completed' || !!loadingAction}
                variant='outlined'
              />
              {isAdmin && (
                <Chip 
                  label={getActionContent('setFinished', 'Set as Complete')}
                  onClick={() => handleAction('setFinished')}
                  color='success'
                  disabled={product.pickingStatus === 'completed' || !!loadingAction}
                  variant='outlined'
                />
              )}
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
};

export default ProductRow