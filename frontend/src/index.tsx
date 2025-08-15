import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import reportWebVitals from "./reportWebVitals";
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';


const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  // <React.StrictMode>
    <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <App />
      {import.meta.env.VITE_APP_ENV === 'sandbox' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
    </BrowserRouter>
  // </React.StrictMode>
);

reportWebVitals();