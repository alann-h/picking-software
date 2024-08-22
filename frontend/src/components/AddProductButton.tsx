import React, { ReactNode } from 'react';
import { Button, SxProps, Theme } from '@mui/material';

interface AddProductButtonProps {
  onClick: () => void;
  sx?: SxProps<Theme>;
  children?: ReactNode;
}

const AddProductButton: React.FC<AddProductButtonProps> = ({ onClick, sx, children }) => {
  return (
    <Button
      variant="contained"
      color="primary"
      onClick={onClick}
      sx={{
        minWidth: 0,
        width: 40,
        height: 40,
        borderRadius: '50%',
        padding: 0,
        ...sx,
      }}
    >
      {children}
    </Button>
  );
};

export default AddProductButton;