import React, { useState } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <header className="relative z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-white text-xl font-bold">LeadScout Pro AI</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-white hover:text-blue-200 transition">Features</a>
              <a href="#pricing" className="text-white hover:text-blue-200 transition">Pricing</a>
              <a href="#how-it-works" className="text-white hover:text-blue-200 transition">How it Works</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Find Quality Leads
            <span className="text-blue-300 block">with AI Precision</span>
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            Discover targeted business leads across Estonia and beyond using our advanced AI technology. 
            From event organizers to tech startups, we find the contacts that matter for your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105"
            >
              Start Finding Leads
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-900 transition">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform provides everything you need to find and connect with quality leads
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Targeted Search</h3>
              <p className="text-gray-600">
                Search for specific business types in any Estonian city. From events to manufacturing, 
                find exactly what you're looking for.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">AI-Powered Research</h3>
              <p className="text-gray-600">
                Our advanced AI agents research and verify contact information, 
                ensuring you get accurate and up-to-date leads.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Export & Organize</h3>
              <p className="text-gray-600">
                Download your leads as CSV files and keep track of all your searches 
                in your personal dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple 3-step process to find your perfect leads</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Choose Your Target</h3>
              <p className="text-gray-600">
                Select the type of business you're looking for and specify your target location.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">AI Does the Work</h3>
              <p className="text-gray-600">
                Our AI agents search and verify leads, finding contact information and business details.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Download & Connect</h3>
              <p className="text-gray-600">
                Get your leads as a CSV file and start reaching out to grow your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
            <p className="text-xl text-gray-600">
              Pay only for what you download. No monthly fees, no hidden costs.
            </p>
          </div>
          
          <div className="max-w-md mx-auto bg-blue-50 rounded-2xl p-8 border-2 border-blue-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Per Download</h3>
              <div className="text-5xl font-bold text-blue-600 mb-2">€5</div>
              <p className="text-gray-600 mb-6">One-time payment per CSV export</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited searches before download
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  AI-verified contact information
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  CSV export format
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Search history saved
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  No expiration date
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
      <section className="py-20 bg-blue-900">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Find Quality Leads?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join businesses across Estonia who are already using LeadScout Pro AI 
            to grow their customer base.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105"
          >
            Start Your First Search
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">L</span>
                </div>
                <span className="text-white text-xl font-bold">LeadScout Pro AI</span>
              </div>
              <p className="text-gray-400">
                AI-powered lead generation for Estonian businesses.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">How it Works</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">API Docs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">GDPR Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 LeadScout Pro AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;