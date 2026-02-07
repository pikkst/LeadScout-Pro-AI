import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import UserDashboard from './components/UserDashboard';
import AuthModal from './components/AuthModal';
import LeadSearchApp from './LeadSearchApp';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showApp, setShowApp] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGetStarted = () => {
    if (user) {
      setShowApp(true);
    } else {
      setAuthMode('signup');
      setShowAuthModal(true);
    }
  };

  if (user && showApp) {
    return <LeadSearchApp />;
  }

  if (user) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/search" element={<LeadSearchApp />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route 
          path="/*" 
          element={<LandingPage onGetStarted={handleGetStarted} />} 
        />
      </Routes>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </>
  );
};

export default App;