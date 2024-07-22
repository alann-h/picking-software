import React from 'react';
import { Button } from '@mui/material';

interface SaveForLaterButtonProps {
  productName: string;
  currentStatus: string;
  saveForLaterButton: (productName: string) => Promise<{ message: string }>;
  onStatusChange: (newStatus: string) => void;
}

const SaveForLaterButton: React.FC<SaveForLaterButtonProps> = ({
  productName,
  currentStatus,
  saveForLaterButton,
  onStatusChange
}) => {
  const handleClick = async () => {
    try {
      const response = await saveForLaterButton(productName);
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