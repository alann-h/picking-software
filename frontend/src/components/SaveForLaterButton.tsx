import React from 'react';
import { Button } from '@mui/material';

interface SaveForLaterButtonProps {
  productId: number;
  currentStatus: string;
  saveForLaterButton: (productId: number) => Promise<{ message: string }>;
  onStatusChange: (newStatus: string) => void;
}

const SaveForLaterButton: React.FC<SaveForLaterButtonProps> = ({
  productId,
  currentStatus,
  saveForLaterButton,
  onStatusChange
}) => {
  const handleClick = async () => {
    try {
      const response = await saveForLaterButton(productId);
      const newStatus = response.message.includes('saved for later') ? 'deferred' : 'pending';
      onStatusChange(newStatus);
    } catch (error) {
      console.error('Error toggling save for later status:', error);
    }
  };

  const buttonText = currentStatus === 'deferred' ? 'Set to Picking' : 'Save for Later';

  return (
    <Button
      onClick={handleClick}
      color="primary"
      variant="contained"
    >
      {buttonText}
    </Button>
  );
};

export default SaveForLaterButton;