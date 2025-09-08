import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-blue-500';
      case 'assigned':
        return 'bg-indigo-500';
      case 'checking':
        return 'bg-purple-500';
      case 'finalised':
        return 'bg-green-500';
      case 'backorder':
        return 'bg-yellow-500';
      case 'unavailable':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

/**
 * Formats a list of items with truncation and "show more" functionality
 * @param items - Array of items to display
 * @param maxItems - Maximum number of items to show before truncating (default: 5)
 * @returns Formatted string with truncated items and count
 */
export const formatItemDescription = (items: string[], maxItems: number = 5): string => {
  if (!items || items.length === 0) {
    return 'No items';
  }
  
  if (items.length <= maxItems) {
    return items.join(', ');
  }
  
  const displayed = items.slice(0, maxItems).join(', ');
  const remaining = items.length - maxItems;
  
  return `${displayed} +${remaining} more items`;
};

/**
 * Formats a list of items with custom separator and truncation
 * @param items - Array of items to display
 * @param maxItems - Maximum number of items to show before truncating (default: 5)
 * @param separator - Separator to use between items (default: ', ')
 * @returns Formatted string with truncated items and count
 */
export const formatItemList = (items: string[], maxItems: number = 5, separator: string = ', '): string => {
  if (!items || items.length === 0) {
    return 'No items';
  }
  
  if (items.length <= maxItems) {
    return items.join(separator);
  }
  
  const displayed = items.slice(0, maxItems).join(separator);
  const remaining = items.length - maxItems;
  
  return `${displayed} +${remaining} more items`;
};