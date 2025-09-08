import React, { useState } from 'react';
import { formatItemDescription } from '../utils/other';
import clsx from 'clsx';

interface ItemDescriptionProps {
  items: string[];
  maxItems?: number;
  variant?: 'body1' | 'body2' | 'caption';
  color?: 'text-primary' | 'text-secondary';
  showExpandButton?: boolean;
}

const ItemDescription: React.FC<ItemDescriptionProps> = ({
  items,
  maxItems = 5,
  variant = 'body2',
  color = 'text-secondary',
  showExpandButton = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const textClasses = clsx({
    'text-base': variant === 'body1',
    'text-sm': variant === 'body2',
    'text-xs': variant === 'caption',
    'text-gray-800': color === 'text-primary',
    'text-gray-600': color === 'text-secondary',
  });

  if (!items || items.length === 0) {
    return (
      <p className={textClasses}>
        No items
      </p>
    );
  }

  if (items.length <= maxItems) {
    return (
      <p className={textClasses}>
        {items.join(', ')}
      </p>
    );
  }

  if (!showExpandButton) {
    return (
      <p className={textClasses}>
        {formatItemDescription(items, maxItems)}
      </p>
    );
  }

  return (
    <div>
      <p className={textClasses}>
        {isExpanded 
          ? items.join(', ')
          : formatItemDescription(items, maxItems)
        }
      </p>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-1 p-0 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200 focus:outline-none"
      >
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>
    </div>
  );
};

export default ItemDescription;
