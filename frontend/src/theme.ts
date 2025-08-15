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
  },
});

export default theme;