import theme from "../theme";

export const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return theme.palette.success.main;
      case 'pending':
        return theme.palette.info.main;
      case 'assigned':
        return theme.palette.primary.main;
      case 'checking':
        return theme.palette.secondary.main;
      case 'finalised':
        return theme.palette.success.main;
      case 'backorder':
        return theme.palette.warning.main;
      case 'unavailable':
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
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