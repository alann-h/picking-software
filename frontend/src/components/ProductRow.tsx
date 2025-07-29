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
  onProductDetails: (_productId: number, _product: ProductDetail) => Promise<void>;
  onAdjustQuantityModal: (_productId: number, _pickingQty: number, _productName: string) => Promise<void>;
  onSaveForLater: (_productId: number) => Promise<{ newStatus: string }>;
  onSetUnavailable: (_productId: number) => Promise<{ newStatus: string }>;
  onSetFinished: (_productId: number) => Promise<{ newPickingQty: number }>;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onProductDetails,
  onAdjustQuantityModal,
  onSaveForLater,
  onSetUnavailable,
  onSetFinished,
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
            <MenuItem onClick={() => handleAction('adjust')} disabled={product.pickingStatus === 'completed' || !!loadingAction}>{getActionContent('adjust', 'Adjust Quantity')}</MenuItem>
            <MenuItem onClick={() => handleAction('saveForLater')} disabled={product.pickingStatus === 'completed' || !!loadingAction}>
              {getActionContent('saveForLater', product.pickingStatus === 'backorder' ? 'Set to pending' : 'Save for Later')}
            </MenuItem>
            <MenuItem onClick={() => handleAction('setUnavailable')} disabled={product.pickingStatus === 'completed' || !!loadingAction}>
              {getActionContent('setUnavailable', product.pickingStatus === 'unavailable' ? 'Set to available' : 'Set Unavailable')}
            </MenuItem>
            {isAdmin &&
              <MenuItem onClick={() => handleAction('setFinished')} disabled={product.pickingStatus === 'completed' || !!loadingAction}>
                {getActionContent('setFinished', 'Set as completed')}
              </MenuItem>
            }
          </Menu>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default ProductRow;