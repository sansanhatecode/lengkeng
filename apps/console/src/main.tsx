import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import './index.css';
import { App } from './App';
import { AuthProvider } from './lib/auth';
import { PlatformProvider } from './lib/platform';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 5_000, refetchOnWindowFocus: true } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <PlatformProvider>
            <App />
          </PlatformProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
