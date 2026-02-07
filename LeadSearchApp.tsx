import React, { useState, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { CompanyLead, SearchState, LeadFocus } from './types';
import { findLeads } from './services/geminiService';
import { downloadLeadsAsCSV } from './utils/csvExport';
import { saveQueryToHistory } from './services/queryHistoryService';
import AgentTerminal from './components/AgentTerminal';
import CreditPurchaseModal from './components/CreditPurchaseModal';

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
  const [location, setLocation] = useState('');
  const [intensity, setIntensity] = useState<'standard' | 'deep'>('standard');
  const [focus, setFocus] = useState<LeadFocus>('events');
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    progress: 0,
    currentAgent: 'Idle',
    logs: []
  });

  const addLog = useCallback((message: string) => {
    setSearchState(prev => ({
      ...prev,
      logs: [...prev.logs, message]
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
      alert('Please enter a location');
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
    if (!profile || profile.credits < 1) {
      setShowCreditModal(true);
      return;
    }

    if (leads.length === 0) {
      alert('No leads to download');
      return;
    }

    downloadLeadsAsCSV(leads, location, async () => {
      // Deduct credit
      await updateCredits(-1);
      addLog('CSV downloaded successfully! Credit deducted.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-gray-900 text-xl font-bold">LeadScout Pro AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="text-gray-600 hover:text-gray-800"
              >
                Dashboard
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600">Credits</p>
                <p className="text-lg font-bold text-blue-600">{profile?.credits || 0}</p>
              </div>
              <button
                onClick={() => setShowCreditModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Buy Credits
              </button>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Search Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Quality Leads</h1>
            <p className="text-gray-600 mb-8">
              Use AI to discover and verify business contacts in Estonia and beyond.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Tallinn, Tartu, Pärnu"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Focus
                </label>
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as LeadFocus)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Intensity
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="standard"
                    checked={intensity === 'standard'}
                    onChange={(e) => setIntensity(e.target.value as 'standard' | 'deep')}
                    className="mr-2"
                  />
                  Standard (Faster)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="deep"
                    checked={intensity === 'deep'}
                    onChange={(e) => setIntensity(e.target.value as 'standard' | 'deep')}
                    className="mr-2"
                  />
                  Deep (More Thorough)
                </label>
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={searchState.isSearching || !location.trim()}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {searchState.isSearching ? 'Searching...' : 'Find Leads'}
            </button>
          </div>

          {/* Progress and Terminal */}
          {(searchState.isSearching || searchState.logs.length > 0) && (
            <AgentTerminal searchState={searchState} />
          )}

          {/* Results */}
          {leads.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Found {leads.length} Leads
                </h2>
                <button
                  onClick={handleDownload}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Download CSV (€5)
                </button>
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

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />
    </div>
  );
};

export default LeadSearchApp;