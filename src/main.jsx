import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Intercept relative fetch requests if running under file:// protocol fallback
if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
  const originalFetch = window.fetch;
  const serverPort = window.__SERVER_PORT__ || import.meta.env?.VITE_API_PORT || 5000;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' && (resource.startsWith('/api') || resource.startsWith('/uploads'))) {
      resource = `http://localhost:${serverPort}${resource}`;
    }
    return originalFetch.call(this, resource, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
