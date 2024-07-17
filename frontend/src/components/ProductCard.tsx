import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { ProductDetail } from '../utils/types';

interface ProductCardProps {
  name: string;
  details: ProductDetail;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ name, details, onClick }) => {
  return (
    <Card 
      variant="outlined"
      onClick={onClick}
      sx={{ cursor: 'pointer', marginBottom: 1 }}
    >
      <CardContent sx={{
        display: 'flex',
        justifyContent: 'space-between',
        '&.MuiCardContent-root': { padding: 2 },
      }}>
        <Typography variant="body2">{details.sku}</Typography>
        <Typography variant="body2">{name}</Typography>
        <Typography variant="body2">{details.pickingQty}</Typography>
      </CardContent>
    </Card>
  );
};

export default ProductCard;