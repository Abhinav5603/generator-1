import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Authenticated Components
import Navbar from './components/Navbar';
import QuestionGenerator from './components/QuestionGenerator';
import BackgroundVideo from './components/BackgroundVideo';
import GradientOverlay from './components/GradientOverlay';
import FeaturesSection from './components/FeaturesSection';
import AboutSection from './components/AboutSection';
import HeroHeader from './components/HeroHeader';
import InputMethodTabs from './components/InputMethodTabs';

// Auth Pages
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

// Main App Components
const MainContent = () => {
  const [activeTab, setActiveTab] = useState('resume');

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 to-black">
      <BackgroundVideo />
      <GradientOverlay />

      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 pt-24">
          <HeroHeader />
          <InputMethodTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <QuestionGenerator mode={activeTab} />
        </main>

        <FeaturesSection />
        <AboutSection />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainContent />} />
          </Route>
          
          {/* Redirect all other routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;