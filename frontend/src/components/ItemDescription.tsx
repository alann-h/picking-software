import React, { useState } from 'react';
import { Typography, Button, Box } from '@mui/material';
import { formatItemDescription } from '../utils/other';

interface ItemDescriptionProps {
  items: string[];
  maxItems?: number;
  variant?: 'body1' | 'body2' | 'caption';
  color?: 'text.primary' | 'text.secondary';
  showExpandButton?: boolean;
}

const ItemDescription: React.FC<ItemDescriptionProps> = ({
  items,
  maxItems = 5,
  variant = 'body2',
  color = 'text.secondary',
  showExpandButton = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) {
    return (
      <Typography variant={variant} color={color}>
        No items
      </Typography>
    );
  }

  if (items.length <= maxItems) {
    return (
      <Typography variant={variant} color={color}>
        {items.join(', ')}
      </Typography>
    );
  }

  if (!showExpandButton) {
    return (
      <Typography variant={variant} color={color}>
        {formatItemDescription(items, maxItems)}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant={variant} color={color}>
        {isExpanded 
          ? items.join(', ')
          : formatItemDescription(items, maxItems)
        }
      </Typography>
      <Button 
        size="small" 
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{ 
          mt: 0.5, 
          p: 0, 
          minWidth: 'auto',
          fontSize: '0.75rem',
          textTransform: 'none',
          color: 'primary.main'
        }}
      >
        {isExpanded ? 'Show Less' : 'Show More'}
      </Button>
    </Box>
  );
};

export default ItemDescription;
