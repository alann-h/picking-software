import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Slider,
  IconButton,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QtyModalProps {
  isModalOpen: boolean;
  inputQty: number;
  onModalClose: () => void;
  onQtyChange: (qty: number) => void;
  availableQty: number;
  onModalConfirm: () => void;
  productName: string;
}

const QtyModal: React.FC<QtyModalProps> = ({
  isModalOpen,
  inputQty,
  onModalClose,
  onQtyChange,
  availableQty,
  onModalConfirm,
  productName,
}) => {
  const theme = useTheme();

  const handleQtyChange = (_: Event, newValue: number | number[]) => {
    onQtyChange(newValue as number);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQty = parseInt(event.target.value) || 0;
    if (newQty >= 0 && newQty <= availableQty) {
      onQtyChange(newQty);
    }
  };

  const incrementQty = () => {
    if (inputQty < availableQty) {
      onQtyChange(inputQty + 1);
    }
  };

  const decrementQty = () => {
    if (inputQty > 0) {
      onQtyChange(inputQty - 1);
    }
  };

  return (
    <Dialog
      open={isModalOpen}
      onClose={onModalClose}
      PaperProps={{
        style: {
          borderRadius: '12px',
          padding: theme.spacing(2),
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div" fontWeight="bold">
            {productName}
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onModalClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Enter the quantity of the scanned product below:
        </Typography>
        <Box sx={{ my: 4 }}>
          <Slider
            value={inputQty}
            onChange={handleQtyChange}
            aria-labelledby="quantity-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={0}
            max={availableQty}
          />
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center">
          <IconButton onClick={decrementQty} disabled={inputQty <= 0}>
            <RemoveIcon />
          </IconButton>
          <TextField
            id="quantity"
            type="number"
            value={inputQty}
            onChange={handleInputChange}
            inputProps={{
              min: 0,
              max: availableQty,
              style: { textAlign: 'center' },
            }}
            sx={{ width: '80px', mx: 2 }}
          />
          <IconButton onClick={incrementQty} disabled={inputQty >= availableQty}>
            <AddIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Available Quantity: {availableQty}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onModalClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={onModalConfirm}
          color="primary"
          variant="contained"
          disabled={inputQty === 0}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QtyModal;