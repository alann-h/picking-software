import theme from "../theme";

export const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'pending':
        return theme.palette.grey[500];
      case 'backorder':
        return theme.palette.warning.main;
      case 'unavailable':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };