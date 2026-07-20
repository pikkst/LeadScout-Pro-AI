import React from 'react';
import { Search, Sparkles, Database, Layers, Settings as SettingsIcon, LogOut, Globe, CheckSquare, Mail, TrendingUp, DollarSign, Calendar, FileText } from 'lucide-react';

interface Tab {
  id: 'scout' | 'outreach' | 'crm' | 'dashboard' | 'revenue' | 'calendar' | 'documents' | 'settings';
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

interface AppHeaderProps {
  user: { name?: string; role?: string } | null;
  isAdmin: boolean;
  activeTab: 'scout' | 'outreach' | 'crm' | 'dashboard' | 'revenue' | 'calendar' | 'documents' | 'settings';
  stats: {
    totalLeads: number;
    selectedLeadsCount: number;
    totalSent: number;
    replyRate: number;
    totalReplies: number;
    totalValue: number;
  };
  pitchesCount: number;
  overdueLeadsCount: number;
  onTabChange: (tab: 'scout' | 'outreach' | 'crm' | 'dashboard' | 'revenue' | 'calendar' | 'documents' | 'settings') => void;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  isAdmin,
  activeTab,
  stats,
  pitchesCount,
  overdueLeadsCount,
  onTabChange,
  onLogout,
}) => {
  const tabs: Tab[] = [
    { id: 'scout', label: '1. AI Partner Scout', icon: <Search className="w-4 h-4" /> },
    { id: 'outreach', label: '2. AI Campaigns', icon: <Sparkles className="w-4 h-4" />,
      badge: pitchesCount > 0 ? (
        <span className="bg-sky-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1">
          {pitchesCount}
        </span>
      ) : undefined,
    },
    { id: 'crm', label: '3. CRM Client Database', icon: <Database className="w-4 h-4 text-sky-400" />,
      badge: overdueLeadsCount > 0 ? (
        <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1 animate-pulse">
          {overdueLeadsCount} DUE
        </span>
      ) : undefined,
    },
    { id: 'dashboard', label: '4. Executive Analytics', icon: <Layers className="w-4 h-4" /> },
    { id: 'revenue', label: '5. Revenue', icon: <DollarSign className="w-4 h-4 text-emerald-400" /> },
    { id: 'calendar', label: '6. Calendar', icon: <Calendar className="w-4 h-4 text-purple-400" /> },
    { id: 'documents', label: '7. Documents', icon: <FileText className="w-4 h-4 text-amber-400" /> },
    { id: 'analytics', label: '8. Analytics', icon: <Activity className="w-4 h-4 text-rose-400" /> },
  ];

  if (isAdmin) {
    tabs.push({ id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> });
  }

  return (
    <>
      <header className="mb-10 text-center relative">
        <div className="absolute right-0 top-0 flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-200">{user?.name}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 px-4 py-1.5 rounded-full text-sky-400 text-xs font-semibold mb-4 uppercase tracking-widest">
          <Globe className="w-3.5 h-3.5 animate-spin-slow" />
          LeadScout PRO AI Portal
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-3 bg-gradient-to-r from-white via-sky-100 to-slate-400 bg-clip-text text-transparent">
          LeadScout PRO AI
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          Autonomous B2B partner mapping and outreach engine. Real-time city-by-city company search, contact verification, and localized AI email outreach across any industry.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scouted Profiles</span>
          <span className="text-2xl font-black text-white mt-1 flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-500" />
            {stats.totalLeads}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Targets Selected</span>
          <span className="text-2xl font-black text-sky-400 mt-1 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-400" />
            {stats.selectedLeadsCount} / {stats.totalLeads}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outreach Sent</span>
          <span className="text-2xl font-black text-purple-400 mt-1 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            {stats.totalSent}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Value</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            €{stats.totalValue.toLocaleString()}
          </span>
        </div>
      </section>

      <nav className="flex border-b border-slate-800 mb-8 gap-1.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap relative ${
              activeTab === tab.id
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        ))}
      </nav>
    </>
  );
};
