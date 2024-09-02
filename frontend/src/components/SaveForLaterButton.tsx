import React from 'react';
import { Button } from '@mui/material';

interface SaveForLaterButtonProps {
  productId: number;
  currentStatus: string;
  saveForLaterButton: (productId: number) => Promise<{ newStatus: string }>;
}

const SaveForLaterButton: React.FC<SaveForLaterButtonProps> = ({
  productId,
  currentStatus,
  saveForLaterButton,
}) => {
  const handleClick = async () => {
    try {
      await saveForLaterButton(productId);
      
    } catch (error) {
      console.error('Error toggling save for later status:', error);
    }
  };

  const buttonText = currentStatus === 'backorder' ? 'Set to Picking' : 'Save for Later';

  return (
    <Button
      onClick={handleClick}
      variant="outlined"
      size="small"
    >
      {buttonText}
    </Button>
  );
};

export default SaveForLaterButton;