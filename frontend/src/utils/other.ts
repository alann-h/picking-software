import theme from "../theme";

export const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'pending':
        return theme.palette.info.main;
      case 'backorder':
        return theme.palette.warning.main;
      case 'unavailable':
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };