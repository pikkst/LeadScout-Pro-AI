import React, { useState } from 'react';
import AuthModal from './AuthModal';
import Footer from './Footer';
import SEOHead from './SEOHead';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../i18n/I18nContext';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { t } = useI18n();

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
        title={t.seo.title}
        description={t.seo.description}
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
                <p className="text-blue-200 text-xs">{t.header.subtitle}</p>
              </div>
            </div>
            
            <nav className="hidden lg:flex items-center space-x-8" aria-label="Main navigation">
              <a href="#features" className="text-white/80 hover:text-white transition-colors font-medium">{t.header.features}</a>
              <a href="#pricing" className="text-white/80 hover:text-white transition-colors font-medium">{t.header.pricing}</a>
              <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-medium">{t.header.howItWorks}</a>
            </nav>

            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <button
                onClick={handleSignIn}
                className="px-4 py-2 text-white/90 hover:text-white transition-colors font-medium"
              >
                {t.header.signIn}
              </button>
              <button
                onClick={handleSignUp}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {t.header.signUp}
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
              <span className="text-white/90 text-sm font-medium">{t.hero.badge}</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              {t.hero.titleLine1}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent block">{t.hero.titleLine2}</span>
            </h2>
            
            <p className="text-xl text-white/80 mb-10 max-w-4xl mx-auto leading-relaxed">
              {t.hero.description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                {t.hero.ctaButton}
              </button>
              <a href="#how-it-works" className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all duration-300 text-center">
                {t.hero.ctaSecondary}
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{t.hero.stat1Value}</div>
                <div className="text-white/60 text-sm">{t.hero.stat1Label}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{t.hero.stat2Value}</div>
                <div className="text-white/60 text-sm">{t.hero.stat2Label}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{t.hero.stat3Value}</div>
                <div className="text-white/60 text-sm">{t.hero.stat3Label}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/5 backdrop-blur-sm border-y border-white/10" aria-label="Features">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{t.features.title}</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.features.feature1Title}</h3>
              <p className="text-white/70 leading-relaxed">
                {t.features.feature1Desc}
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.features.feature2Title}</h3>
              <p className="text-white/70 leading-relaxed">
                {t.features.feature2Desc}
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.features.feature3Title}</h3>
              <p className="text-white/70 leading-relaxed">
                {t.features.feature3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{t.howItWorks.title}</h2>
            <p className="text-xl text-white/70">{t.howItWorks.subtitle}</p>
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
              <h3 className="text-xl font-semibold mb-4 text-white">{t.howItWorks.step1Title}</h3>
              <p className="text-white/70 leading-relaxed">
                {t.howItWorks.step1Desc}
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-2xl">2</span>
                </div>
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-500 to-transparent"></div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.howItWorks.step2Title}</h3>
              <p className="text-white/70 leading-relaxed">
                {t.howItWorks.step2Desc}
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">{t.howItWorks.step3Title}</h3>
              <p className="text-white/70 leading-relaxed">
                {t.howItWorks.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{t.pricing.title}</h2>
            <p className="text-xl text-white/70">
              {t.pricing.subtitle}
            </p>
          </div>
          
          <div className="max-w-md mx-auto bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl p-8 border border-blue-400/30 backdrop-blur-sm">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">{t.pricing.perDownload}</h3>
              <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">{t.pricing.price}</div>
              <p className="text-white/70 mb-8">{t.pricing.priceDesc}</p>
              
              <ul className="text-left space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">{t.pricing.feature1}</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">{t.pricing.feature2}</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">{t.pricing.feature3}</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">{t.pricing.feature4}</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">{t.pricing.feature5}</span>
                </li>
              </ul>
              
              <button
                onClick={onGetStarted}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {t.pricing.getStarted}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600" aria-label="Call to action">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">{t.cta.title}</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t.cta.description}
          </p>
          <button
            onClick={onGetStarted}
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            {t.cta.button}
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