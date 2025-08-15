import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff9800',
    },
    background: {
      default: '#f4f6f8',
      paper: '#fff',
    },
    text: {
      primary: '#333',
      secondary: '#555',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          width: '100%',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          '-webkit-tap-highlight-color': 'transparent',
          lineHeight: 1.6,
        },
        html: {
          overflowX: 'hidden',
          WebkitTextSizeAdjust: '100%',
          msTextSizeAdjust: '100%',
        },
        '*': {
          boxSizing: 'border-box',
        },
        '#root': {
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
        },
        /* Tablet and Mobile Optimizations - Only apply to specific components */
        '@media (max-width: 1024px)': {
          '.dashboard-container .MuiContainer-root, .products-container .MuiContainer-root, .runs-container .MuiContainer-root, .users-container .MuiContainer-root': {
            maxWidth: '100% !important',
            paddingLeft: '16px !important',
            paddingRight: '16px !important',
          },
          '.dashboard-container .MuiTable-root, .products-container .MuiTable-root, .runs-container .MuiTable-root, .users-container .MuiTable-root': {
            minWidth: 'auto !important',
            width: '100% !important',
          },
          '.dashboard-container .MuiTableCell-root, .products-container .MuiTableCell-root, .runs-container .MuiTableCell-root, .users-container .MuiTableCell-root': {
            padding: '12px 8px !important',
            wordBreak: 'break-word !important',
            verticalAlign: 'top !important',
          },
          '.dashboard-container .MuiTableHead-root .MuiTableCell-root, .products-container .MuiTableHead-root .MuiTableCell-root, .runs-container .MuiTableHead-root .MuiTableCell-root, .users-container .MuiTableHead-root .MuiTableCell-root': {
            padding: '16px 8px !important',
            fontWeight: '600 !important',
            backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
          },
        },
        /* Mobile optimizations (xs - 600px) - Only apply to specific components */
        '@media (max-width: 600px)': {
          '.dashboard-container .MuiTableCell-root, .products-container .MuiTableCell-root, .runs-container .MuiTableCell-root, .users-container .MuiTableCell-root': {
            padding: '8px 4px !important',
            fontSize: '12px !important',
          },
          '.dashboard-container .MuiTableHead-root .MuiTableCell-root, .products-container .MuiTableHead-root .MuiTableCell-root, .runs-container .MuiTableHead-root .MuiTableCell-root, .users-container .MuiTableHead-root .MuiTableCell-root': {
            padding: '12px 4px !important',
            fontSize: '11px !important',
            fontWeight: '600 !important',
          },
          '.dashboard-container .MuiTable-root, .products-container .MuiTable-root, .runs-container .MuiTable-root, .users-container .MuiTable-root': {
            minWidth: 'auto !important',
            width: '100% !important',
          },
          /* Mobile table layout - Only apply to specific components */
          '.dashboard-container .MuiTableCell-root:first-child, .products-container .MuiTableCell-root:first-child, .runs-container .MuiTableCell-root:first-child, .users-container .MuiTableCell-root:first-child': {
            width: '80px !important',
            minWidth: '80px !important',
            maxWidth: '80px !important',
          },
          '.dashboard-container .MuiTableCell-root:nth-child(2), .products-container .MuiTableCell-root:nth-child(2), .runs-container .MuiTableCell-root:nth-child(2), .users-container .MuiTableCell-root:nth-child(2)': {
            width: 'auto !important',
            minWidth: '120px !important',
          },
          '.dashboard-container .MuiTableCell-root:nth-child(3), .products-container .MuiTableCell-root:nth-child(3), .runs-container .MuiTableCell-root:nth-child(3), .users-container .MuiTableCell-root:nth-child(3)': {
            width: '70px !important',
            minWidth: '70px !important',
            maxWidth: '70px !important',
            textAlign: 'center !important',
          },
          '.dashboard-container .MuiTableCell-root:nth-child(4), .products-container .MuiTableCell-root:nth-child(4), .runs-container .MuiTableCell-root:nth-child(4), .users-container .MuiTableCell-root:nth-child(4)': {
            width: '80px !important',
            minWidth: '80px !important',
            maxWidth: '80px !important',
            textAlign: 'center !important',
          },
          '.dashboard-container .MuiTableCell-root:last-child, .products-container .MuiTableCell-root:last-child, .runs-container .MuiTableCell-root:last-child, .users-container .MuiTableCell-root:last-child': {
            width: '50px !important',
            minWidth: '50px !important',
            maxWidth: '50px !important',
            textAlign: 'center !important',
          },
          /* Mobile ProductRow optimizations - Only apply to specific components */
          '.dashboard-container .product-sku, .products-container .product-sku, .runs-container .product-sku, .users-container .product-sku': {
            fontSize: '11px !important',
            fontWeight: '600 !important',
            fontFamily: 'monospace !important',
          },
          '.dashboard-container .product-name, .products-container .product-name, .runs-container .product-name, .users-container .product-name': {
            fontSize: '11px !important',
            lineHeight: '1.2 !important',
            maxWidth: '100% !important',
          },
          '.dashboard-container .MuiChip-root, .products-container .MuiChip-root, .runs-container .MuiChip-root, .users-container .MuiChip-root': {
            minHeight: '24px !important',
            fontSize: '10px !important',
          },
          '.dashboard-container .MuiIconButton-root, .products-container .MuiIconButton-root, .runs-container .MuiIconButton-root, .users-container .MuiIconButton-root': {
            minHeight: '36px !important',
            minWidth: '36px !important',
          },
        },
        
        /* Quote page specific tablet optimizations - Only apply to quote components */
        '@media (min-width: 600px) and (max-width: 960px)': {
          '.quote-container .MuiTable-root': {
            tableLayout: 'fixed !important',
          },
          '.quote-container .MuiTableCell-root:first-child': {
            width: '120px !important',
            minWidth: '120px !important',
            maxWidth: '120px !important',
            padding: '12px 8px !important',
          },
          '.quote-container .MuiTableCell-root:nth-child(2)': {
            width: 'auto !important',
            minWidth: '200px !important',
            padding: '12px 8px !important',
          },
          '.quote-container .MuiTableCell-root:nth-child(3)': {
            width: '100px !important',
            minWidth: '100px !important',
            maxWidth: '100px !important',
            padding: '12px 8px !important',
            textAlign: 'center !important',
          },
          '.quote-container .MuiTableCell-root:nth-child(4)': {
            width: '120px !important',
            minWidth: '120px !important',
            maxWidth: '120px !important',
            padding: '12px 8px !important',
            textAlign: 'center !important',
          },
          '.quote-container .MuiTableCell-root:last-child': {
            width: '80px !important',
            minWidth: '80px !important',
            maxWidth: '80px !important',
            padding: '12px 8px !important',
            textAlign: 'center !important',
          },
        },
        
        /* Footer fixes */
        'footer': {
          overflow: 'visible !important',
          minHeight: 'fit-content !important',
        },
        'footer .MuiTypography-root': {
          overflow: 'visible !important',
          textOverflow: 'unset !important',
          whiteSpace: 'normal !important',
          wordBreak: 'break-word !important',
          overflowWrap: 'break-word !important',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          // Remove the aggressive overrides that were causing Login page stretching
          // Only apply specific overrides where needed
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          '@media (min-width: 768px) and (max-width: 1024px)': {
            padding: '16px 12px',
            fontSize: '14px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '@media (min-width: 768px) and (max-width: 1024px)': {
            minHeight: '32px',
            fontSize: '13px',
          },
        },
      },
    },
  },
});

export default theme;