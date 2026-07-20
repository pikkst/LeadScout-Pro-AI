import React, { useState, useMemo } from 'react';
import { CompanyLead } from '../types';
import { FOCUS_OPTIONS, LANGUAGE_OPTIONS } from '../constants';
import * as crm from '../services/crmService';
import AgentTerminal from './AgentTerminal';
import {
  Globe,
  Plus,
  Download,
  Briefcase,
  Upload,
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';

export interface ScoutTabProps {
  location: string;
  setLocation: (v: string) => void;
  intensity: 'standard' | 'deep';
  setIntensity: (v: 'standard' | 'deep') => void;
  focus: string;
  setFocus: (v: string) => void;
  searchState: any;
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
  mineFilter?: boolean;
  onToggleMineFilter?: () => void;
  totalLeadsCount?: number;
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
  mineFilter,
  onToggleMineFilter,
  totalLeadsCount,
}) => {
  const selectedFocusLabel = FOCUS_OPTIONS.find(o => o.value === focus)?.label || focus;
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedLeads = useMemo(() => {
    if (!sortField) return leads;
    const sorted = [...leads].sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [leads, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getLeadScore = (lead: CompanyLead) => {
    let score = 0;
    if (lead.isVerified) score += 30;
    score += Math.min(50, Math.round((lead.estimatedValue || 0) / 1000) * 10);
    const stageScore: Record<string, number> = { 'Discovered': 0, 'Contacted': 20, 'Negotiation': 40, 'Signed': 60, 'Active': 80, 'Archived': 0 };
    score += stageScore[lead.stage || 'Discovered'] || 0;
    if (lead.followUpTask) score += 10;
    if (lead.scheduledMeetings && lead.scheduledMeetings.length > 0) score += 10;
    return Math.min(100, score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-sky-400';
    if (score >= 30) return 'text-amber-400';
    return 'text-slate-500';
  };

  // CSV import handler
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          alert('CSV file appears empty or has no data rows.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const leadsToImport: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });

          if (!row.name || !row.email) continue;

          leadsToImport.push({
            name: row.name,
            website: row.website || row.site || '',
            email: row.email,
            category: row.category || row.focus || 'voip_carriers',
            description: row.description || row.desc || '',
            phone: row.phone || row.tel || '',
            estimatedValue: parseInt(row.estimatedvalue || row.value || '0', 10) || 0,
            focus: row.focus || focus,
            isVerified: false,
            stage: 'Discovered',
            notes: `Imported via CSV on ${new Date().toLocaleDateString()}.`,
            source: 'CSV_IMPORT',
          });
        }

        if (leadsToImport.length === 0) {
          alert('No valid leads found in CSV. Ensure columns: name, email, website.');
          return;
        }

        const result = await crm.importLeads(leadsToImport);
        alert(`Import complete: ${result.imported} leads added, ${result.skippedCount} skipped (duplicates).`);
        if (onImportBackup) {
          onImportBackup(e);
        }
      } catch (err) {
        console.error('CSV import error:', err);
        alert('Failed to import CSV. Check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export.');
      return;
    }

    const headers = ['name', 'email', 'website', 'category', 'phone', 'estimatedValue', 'stage', 'source', 'isVerified'];
    const rows = leads.map(lead => [
      lead.name,
      lead.email,
      lead.website,
      lead.category,
      lead.phone || '',
      lead.estimatedValue || 0,
      lead.stage || 'Discovered',
      lead.source || 'UNKNOWN',
      lead.isVerified ? 'true' : 'false',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leadscout_leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="bg-slate-950/30 border border-slate-850 rounded-2xl p-6 min-h-[550px] flex flex-col relative shadow-xl">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-850">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
              Scouted Partners
              {leads.length > 0 && (
                <span className="bg-sky-500/10 text-sky-400 text-[10px] px-2.5 py-1 rounded-full border border-sky-500/20 font-mono font-bold">
                  {mineFilter && totalLeadsCount ? `${leads.length}/${totalLeadsCount}` : leads.length} {mineFilter ? 'Mine' : 'Targets'}
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

            {onToggleMineFilter && (
              <button
                onClick={onToggleMineFilter}
                className={`text-[10px] border px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
                  mineFilter
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {mineFilter ? 'Only My Leads' : 'All Leads'}
              </button>
            )}

            {leads.length > 0 && (
              <>
                <button
                  onClick={onSelectAll}
                  className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                >
                  {selectedLeadIds.size === leads.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedLeadIds.size > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete ${selectedLeadIds.size} selected leads?`)) return;
                      for (const id of selectedLeadIds) {
                        await onDeleteLead(id);
                      }
                    }}
                    className="text-[10px] bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800/50 text-rose-400 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                  >
                    Delete Selected ({selectedLeadIds.size})
                  </button>
                )}
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

            <label
              className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase cursor-pointer transition-colors"
              title="Import leads from CSV (name, email, website, category, phone, estimatedValue)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              Import CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>

            <button
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase cursor-pointer transition-colors disabled:opacity-50"
              title="Export leads as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Empty State */}
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
                  <th className="px-4 py-4 cursor-pointer hover:text-slate-300 transition-colors" onClick={() => handleSort('name')}>
                    B2B Carrier/Platform Name {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-slate-300 transition-colors" onClick={() => handleSort('email')}>
                    Direct Communication Channel {sortField === 'email' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-4 text-center w-36 cursor-pointer hover:text-slate-300 transition-colors" onClick={() => handleSort('estimatedValue')}>
                    Est. Value (€/mo) {sortField === 'estimatedValue' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-4 text-center w-36 cursor-pointer hover:text-slate-300 transition-colors" onClick={() => handleSort('isVerified')}>
                    Audit Result {sortField === 'isVerified' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-4 text-center w-12">Edit</th>
                  <th className="px-4 py-4 text-center w-12">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {sortedLeads.map((lead) => {
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
                          <span className={`text-[9px] font-mono font-bold ${getScoreColor(getLeadScore(lead))}`}>
                            {getLeadScore(lead)}pts
                          </span>
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
  );
};
