import React, { forwardRef } from 'react';
import { Button, ButtonProps } from '@mui/material';

interface AddProductButtonProps extends ButtonProps {
  onClick: () => void;
}

const AddProductButton = forwardRef<HTMLButtonElement, AddProductButtonProps>(
  ({ onClick, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="contained"
        color="primary"
        onClick={onClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

AddProductButton.displayName = 'AddProductButton';

export default AddProductButton;