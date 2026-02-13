
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

// Handle GitHub Pages SPA redirect
const redirect = sessionStorage.redirect;
delete sessionStorage.redirect;
if (redirect && redirect !== location.href) {
  history.replaceState(null, null, redirect);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
      <AuthProvider>
        <Router basename="/">
          <App />
        </Router>
      </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
