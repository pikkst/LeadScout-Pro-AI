
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Globe } from 'lucide-react';
import PublicBookingPage from './components/PublicBookingPage';
import './styles.css';

const Gate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
        <Globe className="w-8 h-8 text-sky-500 animate-spin-slow" />
        <span className="text-xs font-bold uppercase tracking-widest">Loading workspace…</span>
      </div>
    );
  }

  return user ? <App /> : <LoginScreen />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const bookingMatch = window.location.pathname.match(/^\/book\/([A-Za-z0-9_-]+)\/?$/);
root.render(
  <React.StrictMode>
    {bookingMatch ? (
      <PublicBookingPage token={bookingMatch[1]} />
    ) : (
      <AuthProvider>
        <Gate />
      </AuthProvider>
    )}
  </React.StrictMode>
);
