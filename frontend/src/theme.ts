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
        /* Tablet and Mobile Optimizations */
        '@media (max-width: 1024px)': {
          '.MuiContainer-root': {
            maxWidth: '100% !important',
            paddingLeft: '16px !important',
            paddingRight: '16px !important',
          },
          '.MuiTable-root': {
            minWidth: 'auto !important',
            width: '100% !important',
          },
          '.MuiTableCell-root': {
            padding: '12px 8px !important',
            wordBreak: 'break-word !important',
            verticalAlign: 'top !important',
          },
          '.MuiTableHead-root .MuiTableCell-root': {
            padding: '16px 8px !important',
            fontWeight: '600 !important',
            backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
          },
        },
        /* Quote page specific tablet optimizations */
        '@media (min-width: 600px) and (max-width: 960px)': {
          '.MuiTable-root': {
            tableLayout: 'fixed !important',
          },
          '.MuiTableCell-root:first-child': {
            width: '120px !important',
            minWidth: '120px !important',
            maxWidth: '120px !important',
            padding: '12px 8px !important',
          },
          '.MuiTableCell-root:nth-child(2)': {
            width: 'auto !important',
            minWidth: '200px !important',
            padding: '12px 8px !important',
          },
          '.MuiTableCell-root:nth-child(3)': {
            width: '100px !important',
            minWidth: '100px !important',
            maxWidth: '100px !important',
            padding: '12px 8px !important',
            textAlign: 'center !important',
          },
          '.MuiTableCell-root:nth-child(4)': {
            width: '120px !important',
            minWidth: '120px !important',
            maxWidth: '120px !important',
            padding: '12px 8px !important',
            textAlign: 'center !important',
          },
          '.MuiTableCell-root:last-child': {
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
          paddingLeft: 0,
          paddingRight: 0,
          maxWidth: '100% !important',
          '@media (min-width: 600px)': {
            paddingLeft: '16px',
            paddingRight: '16px',
          },
          '@media (min-width: 900px)': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
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