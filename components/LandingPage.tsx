import React, { useState } from 'react';
import AuthModal from './AuthModal';

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
      {/* Modern Header with Auth Buttons */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold tracking-tight">LeadScout Pro AI</h1>
                <p className="text-blue-200 text-xs">AI-Powered Lead Generation</p>
              </div>
            </div>
            
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-white/80 hover:text-white transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-white/80 hover:text-white transition-colors font-medium">Pricing</a>
              <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-medium">How it Works</a>
            </nav>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSignIn}
                className="px-4 py-2 text-white/90 hover:text-white transition-colors font-medium"
              >
                Sisene
              </button>
              <button
                onClick={handleSignUp}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Registreeru
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-6 text-center">
          {/* Floating particles background effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-green-400 mr-2">●</span>
              <span className="text-white/90 text-sm font-medium">AI Agendid töötavad 24/7</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Leia Kvaliteetseid
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent block">Kliente AI Abil</span>
            </h1>
            
            <p className="text-xl text-white/80 mb-10 max-w-4xl mx-auto leading-relaxed">
              Avasta sihtmärk-kliente üle Eesti ja välismaal kasutades meie arenenud AI tehnoloogiat. 
              Sündmuste korraldajatest kuni tehnoloogiaettevõteteni - leiame kontaktid, mis sinu ettevõtte jaoks oluline on.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                Alusta Kliendikokkuvõtet
              </button>
              <button className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all duration-300">
                Vaata Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">10K+</div>
                <div className="text-white/60 text-sm">Analüüsitud ettevõtet</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">95%</div>
                <div className="text-white/60 text-sm">Andmete täpsus</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-white/60 text-sm">AI töötab</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/5 backdrop-blur-sm border-y border-white/10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Võimsad Funktsioonid</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Meie AI-põhine platvorm pakub kõike, mida vajad kvaliteetsete klientide leidmiseks ja nendega ühenduse loomiseks
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Sihtmärk Otsing</h3>
              <p className="text-white/70 leading-relaxed">
                Otsi spetsiifilisi ettevõtte tüüpe mis tahes Eesti linnas. Sündmustest kuni tootmiseni, 
                leia täpselt seda, mida otsid.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">AI-Põhine Uurimine</h3>
              <p className="text-white/70 leading-relaxed">
                Meie arenenud AI agendid uurivad ja kontrollivad kontaktandmeid, 
                tagades täpsed ja ajakohased kontaktid.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Eksport ja Organiseerimine</h3>
              <p className="text-white/70 leading-relaxed">
                Laadi oma kontaktid alla CSV failidena ja hoia kõigi otsingute 
                ülevaade oma isiklikus dashboardis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Kuidas See Töötab</h2>
            <p className="text-xl text-white/70">Lihtne 3-sammuline protsess ideaalsete klientide leidmiseks</p>
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
              <h3 className="text-xl font-semibold mb-4 text-white">Vali Oma Sihtmärk</h3>
              <p className="text-white/70 leading-relaxed">
                Vali ettevõtte tüüp, mida otsid ja määra sihtkoht või valdkond.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-2xl">2</span>
                </div>
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-500 to-transparent"></div>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">AI Teeb Töö Ära</h3>
              <p className="text-white/70 leading-relaxed">
                Meie AI agendid otsivad ja kontrollivad kliente, leiavad kontaktandmed ja äridetailid.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Laadi Alla & Võta Ühendust</h3>
              <p className="text-white/70 leading-relaxed">
                Saa oma kontaktid CSV failina ja hakka suhtlema, et oma äri kasvatada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Lihtne Hinnastamine</h2>
            <p className="text-xl text-white/70">
              Maksa ainult selle eest, mida alla laadid. Pole kuutasusid, pole varjatud kulusid.
            </p>
          </div>
          
          <div className="max-w-md mx-auto bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl p-8 border border-blue-400/30 backdrop-blur-sm">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Allalaadimise Hind</h3>
              <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">€5</div>
              <p className="text-white/70 mb-8">Ühekordselt CSV ekspordi eest</p>
              
              <ul className="text-left space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">Piiramatult otsinguid enne allalaadimist</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">AI poolt kontrollitud kontaktandmed</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">CSV ekspordi formaat</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">Otsingute ajalugu salvestatud</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-3 text-xl">✓</span>
                  <span className="text-white">Pole aegumistähtaega</span>
                </li>
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
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Valmis Leidma Kvaliteetseid Kliente?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Liitu ettevõtetega üle Eesti, kes juba kasutavad LeadScout Pro AI 
            oma kliendibaasi kasvatamiseks.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            Alusta Esimest Otsingut
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