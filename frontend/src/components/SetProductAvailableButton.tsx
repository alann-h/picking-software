import React from 'react';
import { Button } from '@mui/material';

interface SetProductUnavailableButtonProps {
  productId: number;
  currentStatus: string;
  setProductUnavailableButton: (productId: number) => Promise<{ newStatus: string }>;
}

const SetProductUnavailableButton: React.FC<SetProductUnavailableButtonProps> = ({
  productId,
  currentStatus,
  setProductUnavailableButton,
}) => {
  const handleClick = async () => {
    try {
      await setProductUnavailableButton(productId);
    } catch (error) {
      console.error('Error toggling unavailable status:', error);
    }
  };

  const isUnavailable = currentStatus === 'unavailable';
  const buttonText = isUnavailable ? 'Set to available' : 'Set Unavailable';

  return (
    <Button
      onClick={handleClick}
      variant="outlined"
      size="small"
      color="error"
    >
      {buttonText}
    </Button>
  );
};

export default SetProductUnavailableButton;