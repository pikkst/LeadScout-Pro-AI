import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { CompanyLead, SearchState, LeadFocus } from './types';
import { findLeads } from './services/geminiService';
import { downloadLeadsAsCSV } from './utils/csvExport';
import { saveQueryToHistory } from './services/queryHistoryService';
import AgentTerminal from './components/AgentTerminal';
import CreditPurchaseModal from './components/CreditPurchaseModal';
import Footer from './components/Footer';

const FOCUS_OPTIONS: { value: LeadFocus; label: string; icon: string }[] = [
  { value: 'events', label: 'Events & Entertainment', icon: '🎫' },
  { value: 'investors', label: 'VCs & Investors', icon: '💰' },
  { value: 'manufacturing', label: 'Manufacturing & Factories', icon: '🏭' },
  { value: 'marketing', label: 'Marketing Agencies', icon: '🚀' },
  { value: 'tech', label: 'Software & Tech Hubs', icon: '💻' },
  { value: 'real_estate', label: 'Real Estate & Property', icon: '🏢' },
  { value: 'healthcare', label: 'Healthcare & Pharma', icon: '🏥' },
  { value: 'legal', label: 'Legal & Compliance', icon: '⚖️' },
];

const LeadSearchApp: React.FC = () => {
  const { user, profile, signOut, updateCredits } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [intensity, setIntensity] = useState<'standard' | 'deep'>('standard');
  const [focus, setFocus] = useState<LeadFocus>('events');
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const [downloadedQueries, setDownloadedQueries] = useState<Set<string>>(() => {
    // Load downloaded queries from localStorage on component mount
    try {
      const stored = localStorage.getItem('downloadedQueries');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Save downloaded queries to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('downloadedQueries', JSON.stringify([...downloadedQueries]));
  }, [downloadedQueries]);
  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    progress: 0,
    currentAgent: 'Idle',
    logs: []
  });
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [searchState.logs]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setSearchState(prev => ({
      ...prev,
      logs: [...(prev.logs || []), `[${timestamp}] ${message}`]
    }));
  }, []);

  const updateProgress = (progress: number, task?: string) => {
    setSearchState(prev => ({
      ...prev,
      progress: Math.min(progress, 100),
      currentAgent: task || prev.currentAgent
    }));
  };

  const handleSearch = async () => {
    if (!location.trim()) {
      alert('Please enter a city or country name');
      return;
    }

    if (!user) {
      alert('Please sign in to perform searches');
      return;
    }

    setSearchState({
      isSearching: true,
      progress: 0,
      currentAgent: 'Initializing search...',
      logs: []
    });

    try {
      addLog(`Starting ${intensity} search for ${focus} leads in ${location}`);
      
      const results = await findLeads(
        location,
        focus,
        intensity,
        (progress, agent) => {
          updateProgress(progress, agent);
          if (agent) addLog(agent);
        }
      );

      setLeads(results);
      addLog(`Search completed! Found ${results.length} leads.`);
      
      // Save to history
      const queryId = await saveQueryToHistory(
        user.id,
        `${focus} leads in ${location}`,
        location,
        focus,
        intensity,
        results
      );
      
      setCurrentQueryId(queryId);

      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        progress: 100,
        currentAgent: 'Search completed!'
      }));

    } catch (error) {
      console.error('Search failed:', error);
      addLog(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        currentAgent: 'Search failed'
      }));
    }
  };

  const handleDownload = () => {
    if (leads.length === 0) {
      alert('No leads to download');
      return;
    }

    // Check if this query has already been downloaded
    const isAlreadyDownloaded = currentQueryId && downloadedQueries.has(currentQueryId);
    
    // Only check credits if this is a new download
    if (!isAlreadyDownloaded && (!profile || profile.credits < 1)) {
      setShowCreditModal(true);
      return;
    }

    downloadLeadsAsCSV(leads, location, async () => {
      // Only deduct credit for new downloads
      if (!isAlreadyDownloaded && currentQueryId) {
        await updateCredits(-1);
        setDownloadedQueries(prev => new Set([...prev, currentQueryId]));
        addLog('CSV downloaded successfully! Credit deducted.');
      } else {
        addLog('CSV downloaded successfully! (No credit deducted - already downloaded)');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-blue-200 hover:text-white px-3 py-1 rounded-xl hover:bg-white/10 transition-all duration-200 font-medium"
              >
                ← Dashboard
              </button>
              <div className="text-right">
                <p className="text-blue-200 text-sm">Credits</p>
                <p className="text-white text-lg font-bold">{profile?.credits || 0}</p>
              </div>
              <button
                onClick={() => setShowCreditModal(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
              >
                Buy Credits
              </button>
              <button
                onClick={signOut}
                className="text-blue-200 hover:text-white transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Search Form */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-8 mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Find Quality Leads</h1>
            <p className="text-blue-200 mb-8">
              Use AI agents to discover and verify business contacts in any city or country worldwide.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Location (City or Country)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Tallinn, Estonia, Berlin, Germany, New York"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                />
                <p className="text-sm text-blue-300/70 mt-1">
                  Enter a city name or country — our AI agents will find leads across the region
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Business Focus
                </label>
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as LeadFocus)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  {FOCUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-blue-200 mb-3">
                Search Intensity
              </label>
              <div className="flex flex-col space-y-3">
                <label className="flex items-center text-white cursor-pointer group">
                  <input
                    type="radio"
                    value="standard"
                    checked={intensity === 'standard'}
                    onChange={(e) => setIntensity(e.target.value as 'standard' | 'deep')}
                    className="mr-2 accent-blue-500"
                  />
                  <div>
                    <span className="group-hover:text-blue-200 transition-colors font-medium">Standard <span className="text-blue-300/70 text-sm">(Faster)</span></span>
                    <p className="text-blue-300/60 text-xs mt-0.5">Country → Top 10 cities, 1 biggest company each. City → 10 largest registered companies.</p>
                  </div>
                </label>
                <label className="flex items-center text-white cursor-pointer group">
                  <input
                    type="radio"
                    value="deep"
                    checked={intensity === 'deep'}
                    onChange={(e) => setIntensity(e.target.value as 'standard' | 'deep')}
                    className="mr-2 accent-blue-500"
                  />
                  <div>
                    <span className="group-hover:text-blue-200 transition-colors font-medium">Deep <span className="text-blue-300/70 text-sm">(More Thorough)</span></span>
                    <p className="text-blue-300/60 text-xs mt-0.5">Searches up to 15 cities with 10+ leads each. Takes longer but finds more results.</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={searchState.isSearching || !location.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {searchState.isSearching ? 'Searching...' : 'Find Leads'}
            </button>
          </div>

          {/* How It Works */}
          {!searchState.isSearching && leads.length === 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
              <h2 className="text-xl font-semibold text-white mb-6 text-center">How It Works</h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white text-xl">1</span>
                  </div>
                  <h3 className="text-white font-medium mb-1">Choose Location</h3>
                  <p className="text-blue-300/70 text-sm">Enter any city or country where you want to find business leads.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white text-xl">2</span>
                  </div>
                  <h3 className="text-white font-medium mb-1">Select Category</h3>
                  <p className="text-blue-300/70 text-sm">Pick a business focus — events, investors, tech, marketing, and more.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white text-xl">3</span>
                  </div>
                  <h3 className="text-white font-medium mb-1">AI Discovery</h3>
                  <p className="text-blue-300/70 text-sm">Our AI agents search the web, find real companies, and verify their email addresses.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white text-xl">4</span>
                  </div>
                  <h3 className="text-white font-medium mb-1">Download CSV</h3>
                  <p className="text-blue-300/70 text-sm">Get a ready-to-use CSV file with names, emails, websites, and confidence scores.</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-blue-200/80 text-sm">
                  Each search is <span className="text-white font-medium">free</span>. You only pay <span className="text-white font-medium">1 credit</span> when you download the CSV. 
                  Re-downloads of the same search are free (up to 10 times).
                </p>
              </div>
            </div>
          )}

          {/* Progress and Agent Terminal */}
          {(searchState.isSearching || (searchState.logs?.length || 0) > 0) && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AI Agents Working</h3>
                <div className="text-blue-200 text-sm">
                  {searchState.isSearching ? `${Math.round(searchState.progress)}% Complete` : 'Finished'}
                </div>
              </div>
              
              {/* Progress Bar */}
              {searchState.isSearching && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-blue-200 mb-2">
                    <span>{searchState.currentAgent}</span>
                    <span>{Math.round(searchState.progress)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(searchState.progress)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Agent Terminal */}
              <div 
                ref={terminalRef}
                className="bg-black/50 rounded-xl p-4 max-h-80 overflow-y-auto select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
              >
                <div className="flex items-center gap-2 border-b border-gray-700 pb-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-400 text-sm ml-2">Agent Terminal v3.0</span>
                  <span className="text-gray-600 text-xs ml-auto">Emails masked for security</span>
                </div>
                <div className="space-y-0.5 font-mono text-xs leading-relaxed">
                  {(searchState.logs?.length || 0) === 0 && (
                    <div className="text-gray-500 italic">▶ Agents ready. Start a search to see live progress...</div>
                  )}
                  {(searchState.logs || []).map((log, i) => {
                    // Color-code lines based on content
                    let textColor = 'text-gray-300';
                    if (log.includes('✅')) textColor = 'text-green-400';
                    else if (log.includes('❌') || log.includes('⚠️')) textColor = 'text-yellow-400';
                    else if (log.includes('🏙️') || log.includes('━━━')) textColor = 'text-cyan-400';
                    else if (log.includes('🤖') || log.includes('🔍') || log.includes('🛰️')) textColor = 'text-blue-400';
                    else if (log.includes('→')) textColor = 'text-white';
                    else if (log.includes('   ')) textColor = 'text-gray-400';
                    
                    return (
                      <div key={i} className={`${textColor} whitespace-pre-wrap`}>
                        {log}
                      </div>
                    );
                  })}
                  {searchState.isSearching && (
                    <div className="flex gap-2 animate-pulse text-blue-300">
                      [{new Date().toLocaleTimeString('en-US', { hour12: false })}] {searchState.currentAgent}...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {leads.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Found {leads.length} Leads
                </h2>
                {(() => {
                  const isAlreadyDownloaded = currentQueryId && downloadedQueries.has(currentQueryId);
                  return (
                    <button
                      onClick={handleDownload}
                      className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                        isAlreadyDownloaded 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {isAlreadyDownloaded ? 'Download CSV (Free)' : 'Download CSV (1 Credit)'}
                    </button>
                  );
                })()}
              </div>

              <div className="space-y-4">
                {leads.slice(0, 5).map((lead, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                        <p className="text-blue-600 mb-2">{lead.category}</p>
                        <p className="text-gray-600 text-sm mb-2">{lead.description}</p>
                        <p className="text-gray-800 font-medium">{lead.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {leads.length > 5 && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      + {leads.length - 5} more leads available in CSV download
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />
    </div>
  );
};

export default LeadSearchApp;