import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Package, ExternalLink } from 'lucide-react';
import { Phase3Pack, Phase3PackItem } from '../types';
import * as api from '../services/phase3Api';

export const MarketplaceTab: React.FC = () => {
  const [packs, setPacks] = useState<Phase3Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "CURATED">("PRIVATE");
  const [vertical, setVertical] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listPacks();
      setPacks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPack({ name, slug, description, visibility, vertical: vertical || undefined });
      setName("");
      setSlug("");
      setDescription("");
      setVertical("");
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (pack: Phase3Pack) => {
    try {
      await api.deletePack(pack.slug);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async (slug: string) => {
    try {
      await api.applyPack(slug);
      alert("Pack applied to workspace.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = async (packSlug: string) => {
    const playbookId = prompt("Enter playbook ID to add:");
    if (!playbookId) return;
    try {
      await api.addPackItem(packSlug, playbookId);
      load();
      if (expandedSlug === packSlug) {
        const updated = await api.getPack(packSlug);
        setPacks((prev) => prev.map((p) => (p.slug === packSlug ? updated : p)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveItem = async (packSlug: string, playbookId: string) => {
    try {
      await api.removePackItem(packSlug, playbookId);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = async (pack: Phase3Pack) => {
    if (expandedSlug === pack.slug) {
      setExpandedSlug(null);
      return;
    }
    setExpandedSlug(pack.slug);
    const detail = await api.getPack(pack.slug);
    setPacks((prev) => prev.map((p) => (p.slug === pack.slug ? detail : p)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white flex items-center gap-2"><Package className="w-6 h-6" /> Playbook Marketplace</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> New Pack
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as "PRIVATE" | "CURATED")} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                <option value="PRIVATE">PRIVATE</option>
                <option value="CURATED">CURATED</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Vertical</label>
              <input value={vertical} onChange={(e) => setVertical(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Create Pack</button>
        </form>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Loading packs...</div>
      ) : (
        <div className="space-y-3">
          {packs.map((pack) => (
            <div key={pack.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{pack.name} <span className="text-slate-500 text-xs font-normal">({pack.visibility})</span></div>
                  <div className="text-xs text-slate-400 mt-1">{pack.description}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Slug: {pack.slug} · Items: {pack.items?.length ?? 0}{pack.vertical ? ` · Vertical: ${pack.vertical}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApply(pack.slug)} title="Apply" className="p-2 rounded-lg hover:bg-green-900/40 text-green-400"><ExternalLink className="w-4 h-4" /></button>
                  <button onClick={() => toggleExpand(pack)} title="Items" className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"><Package className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(pack)} title="Delete" className="p-2 rounded-lg hover:bg-red-900/40 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expandedSlug === pack.slug && (
                <div className="border-t border-slate-800 px-5 py-4 bg-slate-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-slate-300">Playbooks</div>
                    <button onClick={() => handleAddItem(pack.slug)} className="text-xs bg-blue-900/40 text-blue-400 px-3 py-1 rounded-lg">Add Playbook</button>
                  </div>
                  <div className="space-y-2">
                    {(pack.items || []).map((item: Phase3PackItem) => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-2">
                        <div className="text-xs text-white">{item.playbook?.name ?? item.playbookId} <span className="text-slate-500 text-[10px]">{item.playbook?.type}</span></div>
                        <button onClick={() => handleRemoveItem(pack.slug, item.playbookId)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                      </div>
                    ))}
                    {(pack.items || []).length === 0 && (
                      <div className="text-xs text-slate-500">No playbooks in this pack yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {packs.length === 0 && !loading && (
            <div className="text-slate-500 text-sm">No packs yet. Create a pack to group playbooks for your team or vertical.</div>
          )}
        </div>
      )}
    </div>
  );
};
