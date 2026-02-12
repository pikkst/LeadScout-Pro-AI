
import React, { useState, useCallback } from 'react';
import { CompanyLead, SearchState, AgentTask, LeadFocus } from './types';
import { findLeads } from './services/geminiService';
import { downloadLeadsAsCSV } from './utils/csvExport';
import AgentTerminal from './components/AgentTerminal';
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

const App: React.FC = () => {
  const [location, setLocation] = useState('');
  const [intensity, setIntensity] = useState<'standard' | 'deep'>('standard');
  const [focus, setFocus] = useState<LeadFocus>('events');
  const [leads, setLeads] = useState<CompanyLead[]>([]);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || searchState.isSearching) return;

    setLeads([]);
    setSearchState({
      isSearching: true,
      progress: 0,
      currentAgent: 'Strategic Planning',
      logs: [`[Control] Initiating B2B Reconnaissance Mission: ${location.toUpperCase()}`]
    });

    try {
      // Delegate to service — single source of truth for search logic
      const results = await findLeads(
        location,
        focus,
        intensity,
        (progress, agent) => {
          setSearchState(prev => ({
            ...prev,
            progress: Math.min(progress, 100),
            currentAgent: agent || prev.currentAgent,
          }));
          if (agent) addLog(`[Agent] ${agent}`);
        }
      );

      setLeads(results);
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        progress: 100,
        currentAgent: AgentTask.COMPLETED,
      }));
      addLog(`[Mission] Successfully captured ${results.length} unique B2B leads.`);

    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown orbital failure';
      addLog(`[Critical] Mission compromised: ${errorMsg}`);
      setSearchState(prev => ({ 
        ...prev, 
        isSearching: false, 
        currentAgent: 'Failure',
      }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <header className="mb-12 text-center">
        <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-4 py-1 rounded-full text-emerald-400 text-sm font-medium mb-4 uppercase tracking-widest">
          Autonomous B2B Intelligence
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-emerald-200 to-slate-400 bg-clip-text text-transparent">
          LeadScout Pro
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Resilient agent network with self-healing B2B lead generation. Automatically manages API load to ensure reliable, verified contact delivery.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-500 rounded-full" />
              Strategic Directive
            </h2>
            <form onSubmit={handleSearch} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Industry Focus</label>
                <div className="relative">
                  <select 
                    value={focus}
                    onChange={(e) => setFocus(e.target.value as LeadFocus)}
                    disabled={searchState.isSearching}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-medium"
                  >
                    {FOCUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Target Territory</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Country or Region (e.g. United Kingdom)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white placeholder:text-slate-600 font-mono"
                  disabled={searchState.isSearching}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Scanning Depth</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIntensity('standard')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${intensity === 'standard' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    disabled={searchState.isSearching}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntensity('deep')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${intensity === 'deep' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    disabled={searchState.isSearching}
                  >
                    Deep Scan
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={searchState.isSearching || !location}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                  searchState.isSearching || !location
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-emerald-900/20'
                }`}
              >
                {searchState.isSearching ? "Agents Working..." : "Start Orchestration"}
              </button>
            </form>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full" />
              Agent Hub
            </h2>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${searchState.isSearching ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-sm font-mono text-slate-300">{searchState.currentAgent}</span>
              </div>
              <span className="text-xs font-mono text-emerald-500">{Math.round(searchState.progress)}%</span>
            </div>
            
            <AgentTerminal logs={searchState.logs} />
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 min-h-[550px] flex flex-col backdrop-blur-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <span className="w-2 h-6 bg-purple-500 rounded-full" />
                Intelligence Stream
                {leads.length > 0 && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono uppercase">
                    {leads.length} UNIQUE LEADS
                  </span>
                )}
              </h2>
              {leads.length > 0 && (
                <button
                  onClick={() => downloadLeadsAsCSV(leads, location)}
                  className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 font-bold uppercase"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Export CSV
                </button>
              )}
            </div>

            {leads.length === 0 && !searchState.isSearching ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                <h3 className="text-slate-300 font-bold text-lg mb-2 italic">Awaiting Flight Plan</h3>
                <p className="max-w-xs text-sm opacity-60">Specify your industry and region. Our network handles API throttling and model overloads automatically to ensure high data quality.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-950/40 shadow-2xl flex-grow">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 bg-slate-900/50">
                      <th className="px-5 py-4">B2B Entity</th>
                      <th className="px-5 py-4">Direct Contact</th>
                      <th className="px-5 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="px-5 py-5">
                          <div className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors text-sm">{lead.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tighter">{lead.category}</div>
                          <div className="text-[11px] text-slate-400 mt-2 max-w-sm line-clamp-2 leading-relaxed">{lead.description}</div>
                        </td>
                        <td className="px-5 py-5">
                          <div className="text-blue-400 text-xs font-mono select-all">{lead.email || 'N/A'}</div>
                          <div className="text-[9px] text-slate-600 mt-1 truncate max-w-[180px] hover:text-slate-400 transition-colors cursor-help" title={lead.website}>{lead.website}</div>
                        </td>
                        <td className="px-5 py-5 text-center">
                          <div className={`inline-flex items-center gap-1.5 ${lead.isVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'} text-[9px] font-black px-2.5 py-1 rounded-md border ${lead.isVerified ? 'border-emerald-500/20' : 'border-amber-500/20'}`}>
                            {lead.isVerified ? 'AUTHENTIC' : 'UNCONFIRMED'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default App;
