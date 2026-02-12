import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import LeadSearchApp from './LeadSearchApp';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import ResetPasswordForm from './components/ResetPasswordForm';
import { initTracking, updateTrackingUserId } from './services/trackingService';

const App: React.FC = () => {
  const { user, isAdmin, loading, isRecovery } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showApp, setShowApp] = useState(false);

  // Initialize visitor tracking
  useEffect(() => {
    initTracking(user?.id);
  }, []);

  // Update tracking when user logs in
  useEffect(() => {
    if (user?.id) {
      updateTrackingUserId(user.id);
    }
  }, [user?.id]);

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

  // Show password reset form when user clicks recovery link from email
  if (isRecovery && user) {
    return <ResetPasswordForm />;
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
    console.log('App routing - isAdmin:', isAdmin, 'email:', user.email);
    // Admin gets admin dashboard
    if (isAdmin) {
      return (
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/search" element={<LeadSearchApp />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      );
    }

    // Regular users get normal dashboard
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/search" element={<LeadSearchApp />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
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