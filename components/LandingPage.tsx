import React, { useState } from 'react';
import AuthModal from './AuthModal';
import Footer from './Footer';
import SEOHead from './SEOHead';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <SEOHead
        title="AI-Powered B2B Lead Generation Platform"
        description="Find quality business leads worldwide using advanced AI. Search, verify and download B2B contacts. No subscriptions — pay only per download. Trusted by 50K+ companies."
      />
      {/* Modern Header with Auth Buttons */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm" role="banner">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg" aria-hidden="true">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold tracking-tight">LeadScout Pro AI</h1>
                <p className="text-blue-200 text-xs">AI-Powered Lead Generation</p>
              </div>
            </div>
            
            <nav className="hidden lg:flex items-center space-x-8" aria-label="Main navigation">
              <a href="#features" className="text-white/80 hover:text-white transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-white/80 hover:text-white transition-colors font-medium">Pricing</a>
              <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-medium">How it Works</a>
            </nav>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSignIn}
                className="px-4 py-2 text-white/90 hover:text-white transition-colors font-medium"
              >
                Sign In
              </button>
              <button
                onClick={handleSignUp}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24" aria-label="Hero">
        <div className="container mx-auto px-6 text-center">
          {/* Floating particles background effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-green-400 mr-2">●</span>
              <span className="text-white/90 text-sm font-medium">AI Agents working 24/7</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Find Quality Leads
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent block">with AI Precision</span>
            </h2>
            
            <p className="text-xl text-white/80 mb-10 max-w-4xl mx-auto leading-relaxed">
              Discover targeted business leads worldwide using our advanced AI technology. 
              From event organizers to tech companies - we find the contacts that matter for your business.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                Start Finding Leads
              </button>
              <a href="#how-it-works" className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all duration-300 text-center">
                How It Works ↓
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">50K+</div>
                <div className="text-white/60 text-sm">Companies analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">95%</div>
                <div className="text-white/60 text-sm">Data accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-white/60 text-sm">AI working</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/5 backdrop-blur-sm border-y border-white/10" aria-label="Features">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Our AI-powered platform provides everything you need to find and connect with quality leads worldwide
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Targeted Search</h3>
              <p className="text-white/70 leading-relaxed">
                Search for specific business types in any city worldwide. From events to manufacturing, 
                find exactly what you're looking for.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">AI-Powered Research</h3>
              <p className="text-white/70 leading-relaxed">
                Our advanced AI agents research and verify contact information, 
                ensuring you get accurate and up-to-date leads.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Export & Organize</h3>
              <p className="text-white/70 leading-relaxed">
                Download your leads as CSV files and keep track of all your searches 
                in your personal dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-white/70">Simple 3-step process to find your perfect leads</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-2xl">1</span>
                </div>
                {/* Connecting line */}
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 to-transparent"></div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Choose Your Target</h3>
              <p className="text-white/70 leading-relaxed">
                Select the type of business you're looking for and specify your target location or industry.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-2xl">2</span>
                </div>
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-500 to-transparent"></div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">AI Does the Work</h3>
              <p className="text-white/70 leading-relaxed">
                Our AI agents search and verify leads, finding contact information and business details.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Download & Connect</h3>
              <p className="text-white/70 leading-relaxed">
                Get your leads as a CSV file and start reaching out to grow your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple Pricing</h2>
            <p className="text-xl text-white/70">
              Pay only for what you download. No monthly fees, no hidden costs.
            </p>
          </div>
          
          <div className="max-w-md mx-auto bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl p-8 border border-blue-400/30 backdrop-blur-sm">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Per Download</h3>
              <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">€5</div>
              <p className="text-white/70 mb-8">One-time payment per CSV export</p>
              
              <ul className="text-left space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">Unlimited searches before download</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">AI-verified contact information</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">CSV export format</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">Search history saved</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">No expiration date</span>
                </li>
              </ul>
              
              <button
                onClick={onGetStarted}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600" aria-label="Call to action">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Find Quality Leads?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join businesses worldwide who are already using LeadScout Pro AI 
            to grow their customer base.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            Start Your First Search
          </button>
        </div>
      </section>
      </main>

      {/* Footer */}
      <Footer />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </div>
  );
};

export default LandingPage;