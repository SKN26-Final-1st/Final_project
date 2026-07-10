import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'antd/dist/reset.css';
import './styles.css';
import App from './App';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { AppQueryProvider } from './providers/AppQueryProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppQueryProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </AppQueryProvider>
  </React.StrictMode>,
);
