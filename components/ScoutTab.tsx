// ScoutTab: left control panel (directives, outreach generator, agent terminal)
// + right results table (Scouted Telecom Partners).
import React from 'react';
import { CompanyLead, LeadFocus, SearchState } from '../types';
import { FOCUS_OPTIONS, LANGUAGE_OPTIONS } from '../constants';
import AgentTerminal from './AgentTerminal';
import {
  Globe,
  Search,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  Plus,
  Download,
  Briefcase,
  Upload,
  RefreshCw,
  Cpu,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export interface ScoutTabProps {
  location: string;
  setLocation: (v: string) => void;
  intensity: 'standard' | 'deep';
  setIntensity: (v: 'standard' | 'deep') => void;
  focus: LeadFocus;
  setFocus: (v: LeadFocus) => void;
  searchState: SearchState;
  updateProgress: (p: number, t?: string) => void;
  addLog: (m: string) => void;
  onSearch: (e: React.FormEvent) => void;
  leads: CompanyLead[];
  selectedLeadIds: Set<string>;
  onSelectLead: (id: string) => void;
  onSelectAll: () => void;
  isLoadingData: boolean;
  onAddLead: () => void;
  onEditLead: (lead: CompanyLead) => void;
  onDeleteLead: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGeneratePitches: () => void;
  isGeneratingPitches: boolean;
  pitchProgress: { current: number; total: number; activeName: string };
  preferredLanguage: string;
  setPreferredLanguage: (v: string) => void;
}

export const ScoutTab: React.FC<ScoutTabProps> = ({
  location,
  setLocation,
  intensity,
  setIntensity,
  focus,
  setFocus,
  searchState,
  updateProgress,
  addLog,
  onSearch,
  leads,
  selectedLeadIds,
  onSelectLead,
  onSelectAll,
  isLoadingData,
  onAddLead,
  onEditLead,
  onDeleteLead,
  onExportBackup,
  onImportBackup,
  onGeneratePitches,
  isGeneratingPitches,
  pitchProgress,
  preferredLanguage,
  setPreferredLanguage,
}) => {
  const selectedFocusLabel = FOCUS_OPTIONS.find(o => o.value === focus)?.label || focus;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Control Column */}
      <div className="lg:col-span-4 space-y-6">
        {/* Strategic Parameters */}
        <section className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-5 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            Strategic Directives
          </h2>

          <form onSubmit={onSearch} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Partnership Market Segment
              </label>
              <div className="relative">
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as LeadFocus)}
                  disabled={searchState.isSearching}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-200 text-xs font-semibold"
                >
                  {FOCUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-200">
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Target Territory or Region
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Germany, UK, France, Baltics"
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-xs font-mono text-slate-200"
                  disabled={searchState.isSearching}
                />
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Scanning Grid Depth
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/60 border border-slate-850 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIntensity('standard')}
                  className={`py-2 px-2 text-[10px] font-semibold rounded-lg transition-all ${
                    intensity === 'standard'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  disabled={searchState.isSearching}
                >
                  Standard (5 Zones)
                </button>
                <button
                  type="button"
                  onClick={() => setIntensity('deep')}
                  className={`py-2 px-2 text-[10px] font-semibold rounded-lg transition-all ${
                    intensity === 'deep'
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/20 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  disabled={searchState.isSearching}
                >
                  Deep Scan (15 Zones)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={searchState.isSearching || !location}
              className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg ${
                searchState.isSearching || !location
                  ? 'bg-slate-850 text-slate-500 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-slate-50 shadow-sky-950/40 active:scale-95'
              }`}
            >
              {searchState.isSearching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Searching Networks...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Launch AI Scout
                </>
              )}
            </button>
          </form>
        </section>

        {/* AI Outreach Generator */}
        {leads.length > 0 && (
          <section className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Outreach Generator
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Target Output Language
                </label>
                <div className="relative">
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-200 text-xs font-semibold"
                  >
                    {LANGUAGE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronRight className="w-4 h-4 transform rotate-90" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  "Auto-Detect" translates the communication template dynamically based on the target company's location context.
                </p>
              </div>

              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                <div className="text-[11px] text-slate-400 flex justify-between mb-1.5">
                  <span>Selected Contacts:</span>
                  <span className="font-bold text-sky-400">{selectedLeadIds.size} / {leads.length}</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full transition-all duration-300"
                    style={{ width: `${leads.length ? (selectedLeadIds.size / leads.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={onGeneratePitches}
                disabled={selectedLeadIds.size === 0 || isGeneratingPitches}
                className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg ${
                  selectedLeadIds.size === 0 || isGeneratingPitches
                    ? 'bg-slate-850 text-slate-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/40 active:scale-95'
                }`}
              >
                {isGeneratingPitches ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Drafting {pitchProgress.current} / {pitchProgress.total}...
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    Draft Custom Pitch ({selectedLeadIds.size})
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Agent Activity Live Feed */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Agent Core Status
          </h2>
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-850 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${searchState.isSearching ? 'bg-sky-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-xs font-mono text-slate-300">Phase: {searchState.currentAgent}</span>
            </div>
            <span className="text-xs font-mono font-bold text-sky-400">{Math.round(searchState.progress)}%</span>
          </div>

          <AgentTerminal logs={searchState.logs} />
        </section>
      </div>

      {/* Right Active View Column */}
      <div className={(location === 'crm' || location === 'dashboard') ? 'lg:col-span-12' : 'lg:col-span-8'}>

        {/* Scout Results Table */}
        <div className="space-y-6">
          <section className="bg-slate-950/30 border border-slate-850 rounded-2xl p-6 min-h-[550px] flex flex-col relative shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-850">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  Scouted Partners
                  {leads.length > 0 && (
                    <span className="bg-sky-500/10 text-sky-400 text-[10px] px-2.5 py-1 rounded-full border border-sky-500/20 font-mono font-bold">
                      {leads.length} Verified Targets
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Select targets to initialize personalized outreach campaigns.</p>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={onAddLead}
                  className="flex items-center gap-1.5 text-[10px] bg-sky-500/15 text-sky-400 hover:text-white hover:bg-sky-500 border border-sky-500/30 px-3 py-1.5 rounded-lg font-bold uppercase transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Partner
                </button>

                {leads.length > 0 && (
                  <>
                    <button
                      onClick={onSelectAll}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                    >
                      {selectedLeadIds.size === leads.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(JSON.stringify(leads, null, 2)); }}
                      className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                      title="Copy leads as JSON"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      Copy JSON
                    </button>
                    <button
                      onClick={onExportBackup}
                      className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                      title="Backup to JSON file"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                      Backup
                    </button>
                  </>
                )}

                <label
                  className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase cursor-pointer transition-colors"
                  title="Import previous JSON database backup"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Import JSON
                  <input type="file" accept=".json" onChange={onImportBackup} className="hidden" />
                </label>
              </div>
            </div>

            {leads.length === 0 && !searchState.isSearching ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-12 text-slate-500 border border-dashed border-slate-850 rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-850 shadow-inner">
                  <Globe className="w-8 h-8 text-slate-700 animate-pulse" />
                </div>
                <h3 className="text-slate-300 font-bold text-base mb-1.5">No Active Mission</h3>
                <p className="max-w-md text-xs opacity-60 leading-relaxed mb-6">
                  Define a partnership segment and location on the left panel to trigger the
                  AI-grounded scouting network. Agents will explore the targeted zones and retrieve authenticated B2B
                  profiles.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setLocation('United Kingdom'); setFocus('voip_carriers'); }}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Try "United Kingdom"
                  </button>
                  <button
                    onClick={() => { setLocation('Estonia'); setFocus('fintech'); }}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Try "Estonia" (Fintech)
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/40 shadow-inner flex-grow">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-850 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 bg-slate-900/60">
                      <th className="px-4 py-4 text-center w-12">Select</th>
                      <th className="px-4 py-4">B2B Carrier/Platform Name</th>
                      <th className="px-4 py-4">Direct Communication Channel</th>
                      <th className="px-4 py-4 text-center w-36">Est. Value (€/mo)</th>
                      <th className="px-4 py-4 text-center w-36">Audit Result</th>
                      <th className="px-4 py-4 text-center w-12">Edit</th>
                      <th className="px-4 py-4 text-center w-12">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {leads.map((lead) => {
                      const isSelected = selectedLeadIds.has(lead.id);
                      return (
                        <tr key={lead.id} className={`transition-all group ${isSelected ? 'bg-sky-950/10' : 'hover:bg-slate-900/20'}`}>
                          <td className="px-4 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => onSelectLead(lead.id)}
                              className="text-slate-500 hover:text-sky-400 transition-colors focus:outline-none inline-block mx-auto"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-sky-400" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-700 hover:text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 group-hover:text-sky-400 transition-colors text-sm">{lead.name}</span>
                              <span className="bg-slate-800/80 text-slate-400 text-[9px] px-2 py-0.5 rounded font-mono border border-slate-750 font-bold uppercase">{lead.category}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1.5 max-w-sm line-clamp-2 leading-relaxed">{lead.description}</div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sky-300 text-xs font-mono select-all hover:text-sky-200 transition-colors">{lead.email || 'N/A'}</div>
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-slate-500 mt-1 inline-flex items-center gap-1 hover:text-slate-300 transition-colors"
                              title={lead.website}
                            >
                              {lead.website}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="text-xs font-mono font-bold text-slate-300">
                              €{((lead.estimatedValue as number) || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className={`inline-flex items-center gap-1.5 ${
                              lead.isVerified
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            } text-[9px] font-black px-2.5 py-1 rounded-md border`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${lead.isVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                              {lead.isVerified ? 'AUTHENTIC' : 'UNCONFIRMED'}
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => onEditLead(lead)}
                              className="text-slate-500 hover:text-sky-400 transition-colors focus:outline-none inline-flex mx-auto"
                              title="Edit lead / set value"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteLead(lead.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors focus:outline-none inline-flex mx-auto"
                              title="Delete lead from database"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
