import React, { useState, useEffect } from 'react';
import { Building2, Users, Target, Plus, RefreshCw } from 'lucide-react';
import { listRelationshipRecordsApi, getRelationshipGraph, createRelationshipAccount, createRelationshipContact, createRelationshipOpportunity } from '../services/crmService';

interface Account {
  id: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  description?: string;
  legacyLeads?: Array<{ id: string; stage: string }>;
}

export const RelationshipsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [graph, setGraph] = useState<any>(null);
  const [newAccount, setNewAccount] = useState({ name: '', domain: '', website: '', industry: '', description: '' });
  const [newContact, setNewContact] = useState({ fullName: '', email: '', phone: '', title: '', consentStatus: 'CONFIRMED' });
  const [newOpportunity, setNewOpportunity] = useState({ name: '', stage: 'Prospecting', value: '', probability: '20' });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await listRelationshipRecordsApi(search);
      setAccounts(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const selectAccount = async (account: Account) => {
    setSelectedAccount(account);
    try {
      const data = await getRelationshipGraph(account.id);
      setGraph(data);
    } catch { setGraph(null); }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name.trim()) return;
    try {
      await createRelationshipAccount(newAccount);
      setNewAccount({ name: '', domain: '', website: '', industry: '', description: '' });
      setShowCreate(false);
      await loadAccounts();
    } catch { /* ignore */ }
  };

  const formatValue = (val: number | string | undefined) => {
    if (val === undefined || val === null) return '-';
    const num = typeof val === 'string' ? Number(val) : val;
    if (Number.isNaN(num)) return val;
    return new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-black text-white uppercase tracking-tight">B2B Accounts & Relationships</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAccounts} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg border border-sky-500/20 flex items-center gap-1 transition-all">
            <Plus className="w-3.5 h-3.5" />
            New Account
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateAccount} className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Create New Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Account Name *</label>
              <input required value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Domain</label>
              <input value={newAccount.domain} onChange={(e) => setNewAccount({ ...newAccount, domain: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Website</label>
              <input value={newAccount.website} onChange={(e) => setNewAccount({ ...newAccount, website: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Industry</label>
              <input value={newAccount.industry} onChange={(e) => setNewAccount({ ...newAccount, industry: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
            <textarea value={newAccount.description} onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-[10px] font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white rounded-lg">Create Account</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">No accounts found. Create your first account to get started.</div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} onClick={() => selectAccount(account)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedAccount?.id === account.id ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{account.name}</h3>
                      <p className="text-[10px] text-slate-500">{account.domain || account.website || 'No website'}</p>
                    </div>
                  </div>
                  {account.legacyLeads?.length > 0 && (
                    <span className="text-[9px] font-bold bg-sky-500/10 text-sky-400 px-2 py-1 rounded-full border border-sky-500/20">
                      {account.legacyLeads.length} lead{account.legacyLeads.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {account.description && <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{account.description}</p>}
              </div>
            ))
          )}
        </div>

        {selectedAccount && graph && (
          <div className="space-y-4">
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Contacts
              </h3>
              {graph.contact ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white">{graph.contact.fullName}</div>
                  <div className="text-[10px] text-slate-400">{graph.contact.email}</div>
                  {graph.contact.phone && <div className="text-[10px] text-slate-500">{graph.contact.phone}</div>}
                  {graph.contact.title && <div className="text-[10px] text-slate-500">{graph.contact.title}</div>}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">No contacts linked.</p>
              )}
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Opportunities
              </h3>
              {graph.opportunity ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white">{graph.opportunity.name}</div>
                  <div className="text-[10px] text-slate-400">Stage: {graph.opportunity.stage} | Status: {graph.opportunity.status}</div>
                  <div className="text-[10px] text-slate-300">{formatValue(graph.opportunity.value)}</div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">No opportunities linked.</p>
              )}
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                Relationship
              </h3>
              {graph.relationship ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-400">Type: {graph.relationship.type} | Status: {graph.relationship.status}</div>
                  <div className="text-[10px] text-slate-400">Strength: {graph.relationship.strength}/10</div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">No relationship record.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
