import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainApp from './MainApp';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router basename="/LeadScout-Pro-AI">
        <Routes>
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;