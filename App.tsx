import React, { lazy, Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { CompanyLead, SearchState, AgentTask, LeadFocus, OutreachPitch, DealStage } from './types';
import * as crm from './services/crmService';
import { api, ApiError } from './services/apiClient';
import { useAuth } from './context/AuthContext';
import { downloadLeadsAsCSV } from './utils/csvExport';
import AgentTerminal from './components/AgentTerminal';
import { LeadCRMModal } from './components/LeadCRMModal';
import { PitchPreviewModal } from './components/PitchPreviewModal';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { AppModals } from './components/AppModals';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { SetupWizard } from './components/SetupWizard';
import { CommandCenter } from './components/CommandCenter';
import type { AppTab } from './services/activationService';
import { 
  Globe, 
  Search, 
  Cpu, 
  Mail, 
  CheckSquare, 
  Square, 
  Send, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Database,
  Sliders,
  SendHorizontal,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  TrendingUp,
  Inbox,
  Sparkles,
  Layers,
  Plus,
  Upload,
  Calendar,
  Briefcase,
  LogOut,
  Settings as SettingsIcon,
  Activity,
  DollarSign
} from 'lucide-react';
import { FOCUS_OPTIONS, LANGUAGE_OPTIONS } from './constants';

const RevenueTab = lazy(() => import('./components/RevenueTab'));
const CalendarTab = lazy(() => import('./components/CalendarTab'));
const DocumentsTab = lazy(() => import('./components/DocumentsTab'));
const AnalyticsTab = lazy(() => import('./components/AnalyticsTab'));
const ConversationView = lazy(() => import('./components/ConversationView').then((module) => ({ default: module.ConversationView })));
const RelationshipsTab = lazy(() => import('./components/RelationshipsTab').then((module) => ({ default: module.RelationshipsTab })));
const TeamManagement = lazy(() => import('./components/TeamManagement').then((module) => ({ default: module.TeamManagement })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const ScoutTab = lazy(() => import('./components/ScoutTab').then((module) => ({ default: module.ScoutTab })));
const OutreachTab = lazy(() => import('./components/OutreachTab').then((module) => ({ default: module.OutreachTab })));
const B2BPipelineBoard = lazy(() => import('./components/B2BPipelineBoard').then((module) => ({ default: module.B2BPipelineBoard })));
const CRMStatsDashboard = lazy(() => import('./components/CRMStatsDashboard').then((module) => ({ default: module.CRMStatsDashboard })));
const PlaybooksTab = lazy(() => import('./components/PlaybooksTab').then((module) => ({ default: module.PlaybooksTab })));
const QualificationTab = lazy(() => import('./components/QualificationTab').then((module) => ({ default: module.QualificationTab })));
const QueuesTab = lazy(() => import('./components/QueuesTab').then((module) => ({ default: module.QueuesTab })));
const SignalsTab = lazy(() => import('./components/SignalsTab').then((module) => ({ default: module.SignalsTab })));
const AgentsTab = lazy(() => import('./components/AgentsTab').then((module) => ({ default: module.AgentsTab })));
const MarketplaceTab = lazy(() => import('./components/MarketplaceTab').then((module) => ({ default: module.MarketplaceTab })));
const RankingsTab = lazy(() => import('./components/RankingsTab').then((module) => ({ default: module.RankingsTab })));

const App: React.FC = () => {
  const { user, logout } = useAuth();

  // Navigation: scout, outreach, crm, dashboard, revenue, calendar, documents, analytics
  const [activeTab, setActiveTab] = useState<AppTab>('scout');
  const isAdmin = user?.role === 'ADMIN';

  // Lead Finder States
  const [location, setLocation] = useState('');
  const [intensity, setIntensity] = useState<'standard' | 'deep'>('standard');
  const [focus, setFocus] = useState<LeadFocus>('voip_carriers');

  // Server-backed data
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [pitches, setPitches] = useState<OutreachPitch[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [dealStages, setDealStages] = useState<DealStage[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Team activity feed
  interface ActivityItem {
    id: string;
    action: string;
    detail: string;
    user: string;
    lead: string | null;
    createdAt: string;
  }
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // "My Pipeline" filter: when true, only show leads assigned to current user
  const [mineFilter, setMineFilter] = useState(false);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    progress: 0,
    currentAgent: 'Idle',
    logs: [
      '[System] LeadScout PRO AI Core online.',
      '[System] Ready to dispatch scout agents. Configure parameters and start B2B database orchestration.'
    ]
  });

  // Outreach & B2B Tracker States
  const [preferredLanguage, setPreferredLanguage] = useState('Auto-Detect');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [isGeneratingPitches, setIsGeneratingPitches] = useState(false);
  const [pitchProgress, setPitchProgress] = useState({ current: 0, total: 0, activeName: '' });
  const [sendingPitchIds, setSendingPitchIds] = useState<Set<string>>(new Set());
  const [schedulingPitchIds, setSchedulingPitchIds] = useState<Set<string>>(new Set());

  // Preview / Editor States
  const [activePitch, setActivePitch] = useState<OutreachPitch | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true); // true = HTML Preview, false = Raw Editor
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  // CRM Manager Specific States
  const [isCRMModalOpen, setIsCRMModalOpen] = useState(false);
  const [selectedCRMLead, setSelectedCRMLead] = useState<CompanyLead | null>(null);

  // Logging system
  const addLog = useCallback((message: string) => {
    setSearchState(prev => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} ${message}`]
    }));
  }, []);

  // Load leads + pitches from the server on mount.
  const reloadData = useCallback(async () => {
    try {
      const [serverLeads, serverPitches, serverUsers, serverDealStages] = await Promise.all([
        crm.listLeads(),
        crm.listPitches(),
        api<Array<{ id: string; name: string; email: string }>>('/auth/users').catch(() => []),
        crm.listDealStages().catch(() => []),
      ]);
      setLeads(serverLeads);
      setPitches(serverPitches);
      setUsers(Array.isArray(serverUsers) ? serverUsers : []);
      setDealStages(serverDealStages);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load data from server';
      addLog(`[Critical] ${msg}`);
    } finally {
      setIsLoadingData(false);
    }
  }, [addLog]);

  // Load team activity feed.
  const loadActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    try {
      const result = await crm.fetchActivity();
      setActivities(result);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  useEffect(() => {
    if (activeTab !== 'crm') return;
    crm.listDealStages().then(setDealStages).catch((error) => console.error('Failed to refresh deal stages:', error));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadActivities();
    }
  }, [activeTab, loadActivities]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+k': () => {
      const el = document.getElementById('location-input') as HTMLInputElement | null;
      el?.focus();
      setActiveTab('scout');
    },
    'ctrl+n': () => {
      setSelectedCRMLead(null);
      setIsCRMModalOpen(true);
    },
    'ctrl+1': () => setActiveTab('scout'),
    'ctrl+2': () => setActiveTab('outreach'),
    'ctrl+3': () => setActiveTab('relationships'),
    'ctrl+4': () => setActiveTab('crm'),
    'ctrl+5': () => setActiveTab('conversations'),
    'ctrl+6': () => setActiveTab('dashboard'),
    'ctrl+7': () => setActiveTab('revenue'),
    'ctrl+8': () => setActiveTab('calendar'),
    'ctrl+9': () => setActiveTab('documents'),
    'ctrl+0': () => setActiveTab('analytics'),
    'ctrl+minus': () => setActiveTab('team'),
    'ctrl+shift+s': () => setActiveTab('signals'),
    'ctrl+shift+a': () => setActiveTab('agents'),
    'ctrl+shift+m': () => setActiveTab('marketplace'),
    'ctrl+shift+r': () => setActiveTab('rankings'),
    'escape': () => {
      if (isCRMModalOpen) {
        setIsCRMModalOpen(false);
        setSelectedCRMLead(null);
      } else if (isPreviewMode) {
        setActivePitch(null);
        setIsPreviewMode(false);
      }
    },
  });

  const updateProgress = (progress: number, task?: string) => {
    setSearchState(prev => ({
      ...prev,
      progress: Math.min(progress, 100),
      currentAgent: task || prev.currentAgent
    }));
  };

  const checkDomainPulse = async (url: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3500);
      const urlWithProto = url.startsWith('http') ? url : `https://${url}`;
      await fetch(urlWithProto, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(id);
      return true;
    } catch {
      return false;
    }
  };

  // Lead Finder Execution
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || searchState.isSearching) return;

    setSelectedLeadIds(new Set());
    setSearchState({
      isSearching: true,
      progress: 0,
      currentAgent: 'Strategic Analysis',
      logs: [`[Control] Dispatched B2B scout agents to find "${focus}" leads in "${location.toUpperCase()}"`]
    });

    try {
      const { findLeads, findMajorCities, verifyEmailAuthenticity } = await import('./services/geminiService');
      const selectedFocusLabel = FOCUS_OPTIONS.find(o => o.value === focus)?.label || focus;
      addLog(`[Strategic] Scouting geographic telecommunication hubs in "${location}" for sector: ${selectedFocusLabel}`);
      
      let cities = await findMajorCities(location, focus);
      const cityLimit = intensity === 'standard' ? 5 : 15;
      cities = cities.slice(0, cityLimit);
      
      addLog(`[Strategic] Confirmed coordinates for ${cities.length} target search grids.`);
      
      const uniqueWebsites = new Set<string>();
      const scoutedLeads: CompanyLead[] = [];

      const allSavedLeads: CompanyLead[] = [];

      for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        const cityProgressBase = (i / cities.length) * 90;
        
        updateProgress(cityProgressBase + 2, `Scouting Grid: ${city}`);
        addLog(`[Agent-Scout] Grid-scanning ${city} for active providers and B2B aggregators...`);

        const cityLeads = await findLeads(city, location, focus, (msg) => addLog(`[Scout-Update] ${msg}`));
        
        let cityProcessed = 0;
        const citySaved: CompanyLead[] = [];
        for (const lead of cityLeads) {
          const domain = lead.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
          
          if (!uniqueWebsites.has(domain)) {
            uniqueWebsites.add(domain);
            
            // Slight stagger to protect API limits
            await new Promise(resolve => setTimeout(resolve, 600));

            addLog(`[Verifier-NOC] Live testing domain pulse: ${lead.website}`);
            const isAlive = await checkDomainPulse(lead.website);
            
            addLog(`[Verifier-Security] Evaluating contact authenticity for ${lead.email}...`);
            const isAuthentic = await verifyEmailAuthenticity(
              lead.email, 
              lead.name, 
              lead.website,
              (attempt) => addLog(`[System-Retry] Retrying contact verification (Attempt ${attempt})...`)
            );

            const verifiedLead: CompanyLead = {
              ...lead,
              isVerified: isAlive && isAuthentic,
              focus,
              notes: `Scouted automatically in grid zone: ${city} during LeadScout PRO AI 
reconnaissance.`,
            };
            scoutedLeads.push(verifiedLead);
            citySaved.push(verifiedLead);
            cityProcessed++;
          }
        }
        
        addLog(`[Scout] Grid ${city} scan complete. Identified ${cityProcessed} unique profiles.`);

        // Persist this grid's profiles immediately so results appear live in the
        // "Scouted Telecom Partners" table while the agent continues to the next grid.
        if (citySaved.length > 0) {
          addLog(`[CRM-Database] Saving ${citySaved.length} profiles from ${city} to the shared pipeline...`);
          const saved = await crm.importLeads(
            citySaved.map(l => ({
              name: l.name,
              website: l.website,
              category: l.category,
              email: l.email,
              description: l.description,
              focus,
              isVerified: l.isVerified,
              estimatedValue: l.estimatedValue || 0,
              notes: l.notes,
              source: 'AI_SCOUT',
            }))
          );
          allSavedLeads.push(...saved.created);
          if (saved.skippedCount > 0) {
            addLog(`[CRM-Database] Skipped ${saved.skippedCount} duplicate profile(s) already in pipeline.`);
          }
          await reloadData();
        }
      }

      // Persist all scouted leads to the shared team database (idempotent upsert).
      const savedLeads = allSavedLeads;

      // Auto-select verified, freshly-saved leads for outreach.
      const verifiedIds = savedLeads.filter(l => l.isVerified).map(l => l.id);
      setSelectedLeadIds(new Set(verifiedIds));

      updateProgress(100, AgentTask.COMPLETED);
      addLog(`[Mission] Reconnaissance concluded. Saved ${savedLeads.length} unique B2B telecom targets to the CRM.`);
      setSearchState(prev => ({ ...prev, isSearching: false }));

    } catch (err: any) {
      const errorMsg = err?.message || 'Unexpected telemetry loss';
      const code = err instanceof ApiError ? err.code : undefined;
      const details = err instanceof ApiError ? err.details : undefined;
      // Full diagnostic detail goes to the browser console for debugging.
      console.error('[Scout] Mission failed:', err);
      let detailLine = '';
      if (code) detailLine += ` [${code}]`;
      if (details) {
        try {
          const pretty = typeof details === 'string' ? details : JSON.stringify(details);
          detailLine += ` ${pretty}`;
        } catch {
          /* ignore serialization issues */
        }
      }
      addLog(`[Critical] Mission compromised: ${errorMsg}${detailLine}`);
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        currentAgent: 'Failure Status',
      }));
    }
  };

  // Lead Selection Handlers
  const handleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map(l => l.id)));
    }
  };

  // AI Pitch Generation (persisted server-side)
  const handleGeneratePitches = async () => {
    if (selectedLeadIds.size === 0 || isGeneratingPitches) return;

    setIsGeneratingPitches(true);
    setActiveTab('outreach');
    addLog(`[Outreach-Engine] Initiating bulk partnership pitch formulation for ${selectedLeadIds.size} companies...`);

    const selectedLeads = leads.filter(l => selectedLeadIds.has(l.id));
    setPitchProgress({ current: 0, total: selectedLeads.length, activeName: selectedLeads[0]?.name || '' });

    for (let i = 0; i < selectedLeads.length; i++) {
      const lead = selectedLeads[i];
      setPitchProgress({ current: i + 1, total: selectedLeads.length, activeName: lead.name });
      addLog(`[AI-Copywriter] Drafting personalized wholesale pitch in ${preferredLanguage} for ${lead.name}...`);

      try {
        const pitch = await crm.generateAndSavePitch(lead.id, lead.focus || focus, preferredLanguage, selectedTemplateId);
        setPitches(prev => {
          const withoutOld = prev.filter(p => !(p.leadId === lead.id && p.status === 'Draft'));
          return [pitch, ...withoutOld];
        });
        addLog(`[AI-Copywriter] Draft saved for ${lead.name} [Detected: ${pitch.language}].`);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Generation timeout';
        addLog(`[Warning] Failed formulation for ${lead.name}: ${msg}`);
      }
    }

    setIsGeneratingPitches(false);
    addLog(`[Outreach-Engine] Formulated ${selectedLeads.length} personalized partnership drafts.`);
  };

  // Send Outreach via real SMTP backend
  const handleSendPitch = async (pitchId: string) => {
    const pitch = pitches.find(p => p.id === pitchId);
    if (!pitch || sendingPitchIds.has(pitchId)) return;

    setSendingPitchIds(prev => new Set(prev).add(pitchId));
    addLog(`[Outreach-SMTP] Dispatching interconnect offer to ${pitch.leadEmail}...`);

    try {
      const updated = await crm.sendPitch(pitchId);
      setPitches(prev => prev.map(p => (p.id === pitchId ? updated : p)));
      addLog(`[Outreach-SMTP] Email delivered to ${pitch.leadName} (${pitch.leadEmail}).`);

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('LeadScout PRO AI', { body: `Pitch sent to ${pitch.leadName}`, icon: '/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('LeadScout PRO AI', { body: `Pitch sent to ${pitch.leadName}`, icon: '/favicon.ico' });
        }
      }

      // Auto-schedule a follow-up task for 2 days from now.
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 2);
      const dueDateStr = followUpDate.toISOString().split('T')[0];
      try {
        await crm.setFollowUpTask(pitch.leadId, {
          taskName: `Follow up on pitch sent to ${pitch.leadName}`,
          dueDate: dueDateStr,
          isCompleted: false,
          notes: `Auto-scheduled after sending "${pitch.subject}" on ${new Date().toLocaleDateString()}.`,
        });
        addLog(`[CRM-Scheduler] Auto-scheduled follow-up for ${pitch.leadName} on ${dueDateStr}.`);
      } catch (followUpErr) {
        console.warn('Failed to auto-create follow-up task:', followUpErr);
      }

      await reloadData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'SMTP send failed';
      addLog(`[Error] Failed to send to ${pitch.leadEmail}: ${msg}`);
      setPitches(prev => prev.map(p => (p.id === pitchId ? { ...p, status: 'Failed' } : p)));
    } finally {
      setSendingPitchIds(prev => {
        const next = new Set(prev);
        next.delete(pitchId);
        return next;
      });
    }
  };

  const handleBulkSend = async () => {
    const draftPitches = pitches.filter(p => p.status === 'Draft');
    if (draftPitches.length === 0) return;

    addLog(`[Outreach-SMTP] Initiating bulk SMTP transmission for ${draftPitches.length} contracts...`);
    for (const pitch of draftPitches) {
      await handleSendPitch(pitch.id);
    }
    addLog(`[Outreach-SMTP] Bulk transmission complete.`);
  };

  const handleSchedulePitch = async (pitchId: string) => {
    const pitch = pitches.find(p => p.id === pitchId);
    if (!pitch || schedulingPitchIds.has(pitchId)) return;

    setSchedulingPitchIds(prev => new Set(prev).add(pitchId));
    addLog(`[Outreach-Scheduler] AI optimizing send time for ${pitch.leadName}...`);

    try {
      const updated = await crm.schedulePitch(pitchId);
      setPitches(prev => prev.map(p => (p.id === pitchId ? updated : p)));
      addLog(`[Outreach-Scheduler] Scheduled send for ${pitch.leadName}: ${updated.scheduledSendAt ? new Date(updated.scheduledSendAt).toLocaleString() : 'optimizing...'}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Schedule failed';
      addLog(`[Error] Failed to schedule ${pitch.leadEmail}: ${msg}`);
    } finally {
      setSchedulingPitchIds(prev => {
        const next = new Set(prev);
        next.delete(pitchId);
        return next;
      });
    }
  };

  // CRM Lead Database Management actions (persisted server-side)
  const handleSaveCRMLead = async (savedLead: CompanyLead) => {
    try {
      const payload = {
        name: savedLead.name,
        website: savedLead.website,
        category: savedLead.category,
        email: savedLead.email,
        description: savedLead.description,
        phone: savedLead.phone,
        notes: savedLead.notes,
        estimatedValue: savedLead.estimatedValue,
        stage: savedLead.stage,
        isVerified: savedLead.isVerified,
        focus: savedLead.focus || focus,
      };

      let result: CompanyLead;
      const isExisting = leads.some(l => l.id === savedLead.id);
      if (isExisting) {
        result = await crm.updateLead(savedLead.id, payload);
      } else {
        result = await crm.createLead(payload);
      }

      setLeads(prev => {
        const idx = prev.findIndex(l => l.id === result.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = result;
          return next;
        }
        return [result, ...prev];
      });

      addLog(`[CRM-Database] Saved profile for ${result.name} in client index.`);

      // Save custom field values
      if (savedLead.customFieldValues && savedLead.customFieldValues.length > 0) {
        try {
          await crm.setLeadCustomFields(result.id, savedLead.customFieldValues.map(cfv => ({ fieldId: cfv.fieldId, value: cfv.value })));
        } catch (cfErr) {
          console.warn('Failed to save custom field values:', cfErr);
        }
      }

      setIsCRMModalOpen(false);
      setSelectedCRMLead(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save lead';
      addLog(`[Error] ${msg}`);
      alert(msg);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this partner from your database? This will clear all negotiation states and related drafts.")) return;
    try {
      await crm.deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPitches(prev => prev.filter(p => p.leadId !== id));
      addLog(`[CRM-Database] Removed target carrier and associated communications logs.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete lead';
      addLog(`[Error] ${msg}`);
      alert(msg);
    }
  };

  const handleUpdateStage = async (id: string, nextStage: NonNullable<CompanyLead['stage']>) => {
    // Optimistic UI update.
    const previous = leads;
    const lead = leads.find(l => l.id === id);
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, stage: nextStage } : l)));
    try {
      const updated = await crm.updateLeadStage(id, nextStage);
      setLeads(prev => prev.map(l => (l.id === id ? updated : l)));
      addLog(`[CRM-Database] Upgraded partner stage to: ${nextStage}`);
      
      // Browser notification for stage change
      if (lead && Notification.permission === 'granted') {
        new Notification('LeadScout PRO AI', { body: `${lead.name} moved to ${nextStage}`, icon: '/favicon.ico' });
      }
    } catch (err) {
      setLeads(previous); // rollback
      const msg = err instanceof ApiError ? err.message : 'Failed to update stage';
      addLog(`[Error] ${msg}`);
    }
  };

  const handleBulkUpdateStage = async (nextStage: NonNullable<CompanyLead['stage']>) => {
    if (!selectedLeadIds || selectedLeadIds.size === 0) return;
    const ids = Array.from(selectedLeadIds) as string[];
    const previous = leads;
    setLeads(prev => prev.map(l => selectedLeadIds.has(l.id) ? { ...l, stage: nextStage } : l));
    setSelectedLeadIds(new Set());
    try {
      await Promise.all(ids.map(id => crm.updateLeadStage(id, nextStage)));
      addLog(`[CRM-Database] Bulk upgraded ${ids.length} partners to: ${nextStage}`);
    } catch (err) {
      setLeads(previous);
      const msg = err instanceof ApiError ? err.message : 'Failed to bulk update stage';
      addLog(`[Error] ${msg}`);
    }
  };

  const handleBulkAssign = async (assignedAgentId: string | null) => {
    if (!selectedLeadIds || selectedLeadIds.size === 0) return;
    const ids = Array.from(selectedLeadIds) as string[];
    const previous = leads;
    const agentName = assignedAgentId ? users.find(u => u.id === assignedAgentId)?.name || assignedAgentId : 'Unassigned';
    setLeads(prev => prev.map(l => selectedLeadIds.has(l.id) ? { ...l, assignedAgentId: assignedAgentId || undefined, assignedAgent: agentName } : l));
    setSelectedLeadIds(new Set());
    try {
      await crm.bulkAssignLeads(ids, assignedAgentId);
      addLog(`[CRM-Database] Bulk assigned ${ids.length} partners to: ${agentName}`);
    } catch (err) {
      setLeads(previous);
      const msg = err instanceof ApiError ? err.message : 'Failed to bulk assign';
      addLog(`[Error] ${msg}`);
    }
  };

  const handleUpdateFollowUpTask = async (
    leadId: string, 
    taskName: string, 
    dueDate: string, 
    isCompleted: boolean, 
    notes: string
  ) => {
    try {
      const updated = await crm.setFollowUpTask(leadId, { taskName, dueDate, isCompleted, notes });
      setLeads(prev => prev.map(l => (l.id === leadId ? updated : l)));
      addLog(`[CRM-Scheduler] Updated follow-up task configuration for partner.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update task';
      addLog(`[Error] ${msg}`);
    }
  };

  const handleExportBackup = () => {
    const backupData = { leads, pitches };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `leadscout_pro_crm_backup_${new 
Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog(`[Database-Backup] Successfully exported CRM Client portfolio backup.`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.leads && Array.isArray(parsed.leads)) {
            const payload = parsed.leads.map((l: CompanyLead) => ({
              name: l.name,
              website: l.website,
              category: l.category,
              email: l.email,
              description: l.description,
              phone: l.phone,
              notes: l.notes,
              estimatedValue: l.estimatedValue,
              stage: l.stage,
              isVerified: l.isVerified,
              focus: l.focus,
            }));
            await crm.importLeads(payload);
            await reloadData();
            addLog(`[Database-Backup] Imported ${payload.length} accounts into the shared CRM.`);
          } else {
            alert("Unrecognized JSON format. File must contain a leads list.");
          }
        } catch (err) {
          const msg = err instanceof ApiError ? err.message : 'Failed to import backup';
          alert(msg);
        }
      };
    }
  };

  // Save changes from editor modal (persisted server-side)
  const handleSaveChanges = async () => {
    if (!activePitch) return;
    try {
      const updated = await crm.updatePitch(activePitch.id, {
        subject: editedSubject,
        htmlContent: editedBody,
      });
      setPitches(prev => prev.map(p => (p.id === activePitch.id ? updated : p)));
      addLog(`[Editor] Saved modifications to partner contract for ${activePitch.leadName}.`);
      setActivePitch(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save changes';
      addLog(`[Error] ${msg}`);
      alert(msg);
    }
  };

  const handleDeletePitch = async (pitchId: string) => {
    try {
      await crm.deletePitch(pitchId);
      setPitches(prev => prev.filter(p => p.id !== pitchId));
      addLog(`[Outreach] Discarded partnership communication draft.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete pitch';
      addLog(`[Error] ${msg}`);
    }
  };

  // Mark a sent pitch as replied and advance the lead to Negotiation.
  const handleMarkReplied = async (pitchId: string, leadId: string, leadName: string) => {
    try {
      const updatedPitch = await crm.updatePitch(pitchId, { status: 'Replied' });
      setPitches(prev => prev.map(p => (p.id === pitchId ? updatedPitch : p)));
      const updatedLead = await crm.updateLeadStage(leadId, 'Negotiation');
      setLeads(prev => prev.map(l => (l.id === leadId ? updatedLead : l)));
      addLog(`[Outreach-Incoming] ${leadName} replied. Lead promoted to Negotiation.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to mark replied';
      addLog(`[Error] ${msg}`);
    }
  };

  // Open Preview Modal
  const openPitchPreview = (pitch: OutreachPitch) => {
    setActivePitch(pitch);
    setEditedSubject(pitch.subject);
    setEditedBody(pitch.htmlContent);
    setIsPreviewMode(true);
  };

  const handleTogglePreviewMode = () => setIsPreviewMode(true);
  const handleToggleEditorMode = () => setIsPreviewMode(false);
  const handleSubjectChange = (value: string) => setEditedSubject(value);
  const handleBodyChange = (value: string) => setEditedBody(value);

  // Compute overdue follow-up scheduler alerts (> 3 days in Contacted stage)
  const overdueLeadsCount = useMemo(() => {
    return leads.filter(l => {
      if (l.stage !== 'Contacted' || !l.lastContactedAt) return false;
      if (l.followUpTask?.isCompleted) return false;
      const entryDate = new Date(l.lastContactedAt);
      const now = new Date();
      const diffTime = now.getTime() - entryDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays > 3;
    }).length;
  }, [leads]);

  // Filtered leads for "My Pipeline" view (client-side for instant feedback)
  const displayedLeads = useMemo(() => {
    if (!mineFilter || !user) return leads;
    return leads.filter(l => l.assignedAgentId === user.id || l.createdById === user.id);
  }, [leads, mineFilter, user]);

  const handleToggleMineFilter = useCallback(() => {
    setMineFilter(prev => !prev);
  }, []);

  // Compute stats for Dashboard (all B2B activity tracked)
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const selectedLeadsCount = selectedLeadIds.size;
    const totalDrafts = pitches.filter(p => p.status === 'Draft').length;
    const totalSent = pitches.filter(p => p.status === 'Sent' || p.status === 'Delivered' || p.status === 'Replied').length;
    const totalDelivered = pitches.filter(p => p.status === 'Delivered' || p.status === 'Replied').length;
    const totalReplies = pitches.filter(p => p.status === 'Replied').length;

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const replyRate = totalDelivered > 0 ? Math.round((totalReplies / totalDelivered) * 100) : 0;
    const totalValue = leads.reduce((acc, l) => acc + ((l.estimatedValue as number) || 0), 0);

    return {
      totalLeads,
      selectedLeadsCount,
      totalDrafts,
      totalSent,
      totalDelivered,
      totalReplies,
      deliveryRate,
      replyRate,
      totalValue,
    };
  }, [leads, selectedLeadIds, pitches]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 text-slate-100 font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-white">Skip to main content</a>
      <AppHeader
        user={user}
        isAdmin={isAdmin}
        activeTab={activeTab}
        stats={stats}
        pitchesCount={pitches.length}
        overdueLeadsCount={overdueLeadsCount}
        onTabChange={setActiveTab}
        onLogout={logout}
      />

      <main id="main-content" tabIndex={-1}>
      <SetupWizard isAdmin={isAdmin} activeTab={activeTab} refreshKey={`${leads.length}:${pitches.length}`} onNavigate={setActiveTab} />

      {/* Main Container */}
      {activeTab !== 'settings' && (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Control Column - only visible for Scout / Outreach */}
        {(activeTab === 'scout' || activeTab === 'outreach') ? (
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          
          {/* Section: Strategic Parameters */}
          <section className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-5 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              Strategic Directives
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-4">
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
                    id="location-input"
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

          {/* Section: AI Campaign Settings */}
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

                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pitch Template (optional)</div>
                  <select
                    value={selectedTemplateId || ''}
                    onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="">-- No template (AI generates from scratch) --</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePitches}
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

          {/* Section: Agent Activity Live Feed */}
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
        ) : null}

        {/* Right Active View Column */}
        <div className={(activeTab === 'crm' || activeTab === 'dashboard') ? "md:col-span-12 lg:col-span-12" : "md:col-span-7 lg:col-span-8"}>

          {/* TAB 1: SCOUT & VERIFY LEADS */}
          {activeTab === 'scout' && (
            <Suspense fallback={<RouteLoading />}>
            <ScoutTab
                location={location}
                setLocation={setLocation}
                intensity={intensity}
                setIntensity={setIntensity}
                focus={focus}
                setFocus={setFocus}
                searchState={searchState}
                updateProgress={updateProgress}
                addLog={addLog}
                onSearch={handleSearch}
                leads={displayedLeads}
                selectedLeadIds={selectedLeadIds}
                onSelectLead={handleSelectLead}
                onSelectAll={handleSelectAll}
                isLoadingData={isLoadingData}
                onAddLead={() => { setSelectedCRMLead(null); setIsCRMModalOpen(true); }}
                onEditLead={(lead) => { setSelectedCRMLead(lead); setIsCRMModalOpen(true); }}
                onDeleteLead={handleDeleteLead}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onGeneratePitches={handleGeneratePitches}
                isGeneratingPitches={isGeneratingPitches}
                 pitchProgress={pitchProgress}
                 preferredLanguage={preferredLanguage}
                 setPreferredLanguage={setPreferredLanguage}
                 mineFilter={mineFilter}
                 onToggleMineFilter={handleToggleMineFilter}
                 totalLeadsCount={leads.length}
                 onUpdateLead={(updated) => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))}
               />
            </Suspense>
          )}

          {/* TAB 2: AI CAMPAIGN BUILDER (DRAFTS & EMAIL DRAFT GENERATION) */}
          {activeTab === 'outreach' && (
            <Suspense fallback={<RouteLoading />}>
            <OutreachTab
              pitches={pitches}
              sendingPitchIds={sendingPitchIds}
              schedulingPitchIds={schedulingPitchIds}
              isGeneratingPitches={isGeneratingPitches}
              pitchProgress={pitchProgress}
              onBulkSend={handleBulkSend}
              onOpenPreview={openPitchPreview}
              onDeletePitch={handleDeletePitch}
              onSendPitch={handleSendPitch}
              onSchedulePitch={handleSchedulePitch}
              onMarkReplied={handleMarkReplied}
              onNavigateToScout={() => setActiveTab('scout')}
            />
            </Suspense>
          )}

          {/* TAB 3: CRM CLIENT DATABASE (KANBAN BOARD & MANAGERS) */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              <Suspense fallback={<RouteLoading />}>
              <B2BPipelineBoard 
                leads={displayedLeads}
                mineFilter={mineFilter}
                onToggleMineFilter={handleToggleMineFilter}
                totalLeadsCount={leads.length}
                selectedLeadIds={selectedLeadIds}
                onSelectLead={handleSelectLead}
                onBulkUpdateStage={handleBulkUpdateStage}
                onBulkAssign={handleBulkAssign}
                users={users}
                dealStages={dealStages}
                onUpdateStage={handleUpdateStage}
                onEditLead={(lead) => { setSelectedCRMLead(lead); setIsCRMModalOpen(true); }}
                onDeleteLead={handleDeleteLead}
                onAddLead={() => { setSelectedCRMLead(null); setIsCRMModalOpen(true); }}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onUpdateFollowUpTask={handleUpdateFollowUpTask}
              />
              </Suspense>
            </div>
          )}

          {/* TAB 3b: CONVERSATIONS & GMAIL */}
          {activeTab === 'conversations' && (
            <Suspense fallback={<RouteLoading />}>
              <ConversationView />
            </Suspense>
          )}

          {/* TAB 4: RELATIONSHIPS */}
          {activeTab === 'relationships' && (
            <Suspense fallback={<RouteLoading />}>
              <RelationshipsTab />
            </Suspense>
          )}

          {/* TAB 5: EXECUTIVE ANALYTICS & COMMUNICATIONS TELEMETRY */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <CommandCenter onNavigate={setActiveTab} canManageCompliance={isAdmin} />
              
              {/* Performance Metrics & Visual Analytics Diagrams */}
              <Suspense fallback={<RouteLoading />}><CRMStatsDashboard leads={leads} pitches={pitches} /></Suspense>

              {/* Team Activity Feed */}
              <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-400" />
                      Team Activity Feed
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Recent actions across the shared pipeline — who did what and when.</p>
                  </div>
                  <button
                    onClick={loadActivities}
                    disabled={isLoadingActivities}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                  >
                    {isLoadingActivities ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {activities.length === 0 ? (
                  <div className="text-center p-6 text-slate-500 bg-slate-900/20 border border-slate-850 rounded-xl text-xs">
                    No recent activity recorded. Actions like lead creation, stage changes, and pitch sends will appear here.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/40">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-850 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/40">
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">Lead / Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50 text-xs">
                        {activities.slice(0, 20).map((activity) => (
                          <tr key={activity.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                              {new Date(activity.createdAt).toLocaleString([], { 
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </td>
                            <td className="px-4 py-3 text-slate-300 font-semibold">{activity.user}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                                {activity.action.replace(/_/g, ' ')}
                              </span>
                              {activity.detail && (
                                <span className="text-slate-400 ml-2">{activity.detail}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-400">{activity.lead || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Inbound Telemetry Status Feed */}
              <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Wholesale Campaign Communications Logs
                </h3>
                <p className="text-xs text-slate-500 mb-6">Real-time status updates and delivery logs of automated voice and SMS interconnect offers.</p>

                {pitches.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 bg-slate-900/20 border border-slate-850 rounded-xl text-xs">
                    No active outreach history tracked. Draft and send proposals in "AI Campaigns" to generate telemetry logs.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/40">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-850 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/40">
                          <th className="px-4 py-3">Carrier / Target</th>
                          <th className="px-4 py-3">Email Address</th>
                          <th className="px-4 py-3">Outreach Language</th>
                          <th className="px-4 py-3 text-center">Telemetry Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50 text-xs">
                        {pitches.map((pitch) => (
                          <tr key={pitch.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-200">{pitch.leadName}</td>
                            <td className="px-4 py-4 font-mono text-slate-400">{pitch.leadEmail}</td>
                            <td className="px-4 py-4">{pitch.language}</td>
                            <td className="px-4 py-4 text-center">
                              {pitch.status === 'Draft' ? (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                  Draft
                                </span>
                              ) : pitch.status === 'Sent' ? (
                                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                  Sending...
                                </span>
                              ) : pitch.status === 'Delivered' ? (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                  Delivered (Opened)
                                </span>
                              ) : (
                                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-black px-2.5 py-1 rounded uppercase animate-pulse inline-flex items-center gap-1">
                                  <Inbox className="w-3 h-3" />
                                  Callback Received
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Sent outreach — mark replies as they come in */}
              {pitches.some(p => p.status === 'Sent' || p.status === 'Delivered' || p.status === 'Replied') && (
                <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-purple-400" />
                    Sent Outreach Tracking
                  </h3>
                  <p className="text-xs text-slate-400">
                    Emails sent to carriers via SMTP. When a partner replies, mark it here to advance the lead to Negotiation.
                  </p>

                  <div className="space-y-3">
                    {pitches
                      .filter(p => p.status === 'Sent' || p.status === 'Delivered' || p.status === 'Replied')
                      .map(p => (
                        <div key={p.id} className="bg-slate-900/80 border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between md:items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-sm">{p.leadName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{p.leadEmail}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase ${p.status === 'Replied' ? 'text-purple-400' : 'text-emerald-400'}`}>
                              {p.status}
                            </span>
                          </div>

                          {p.status !== 'Replied' && (
                            <button
                              type="button"
                              onClick={() => handleMarkReplied(p.id, p.leadId, p.leadName)}
                              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] px-4 py-2 rounded-lg uppercase tracking-wider whitespace-nowrap transition-colors"
                            >
                              Mark as Replied
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </section>
              )}

            </div>
          )}

          {/* TAB 5: REVENUE & COMMISSION TRACKING */}
          {activeTab === 'revenue' && (
            <Suspense fallback={<RouteLoading />}><RevenueTab /></Suspense>
          )}

          {/* TAB 6: CALENDAR & SCHEDULING */}
          {activeTab === 'calendar' && (
            <Suspense fallback={<RouteLoading />}><CalendarTab /></Suspense>
          )}

          {/* TAB 7: DOCUMENTS */}
          {activeTab === 'documents' && (
            <Suspense fallback={<RouteLoading />}><DocumentsTab /></Suspense>
          )}

          {/* TAB 8: ADVANCED ANALYTICS */}
          {activeTab === 'analytics' && (
            <Suspense fallback={<RouteLoading />}><AnalyticsTab /></Suspense>
          )}

          {/* TAB 9: TEAM MANAGEMENT */}
          {activeTab === 'team' && (
            <Suspense fallback={<RouteLoading />}><TeamManagement /></Suspense>
          )}

          {/* PHASE 2: PLAYBOOKS THAT LEARN */}
          {activeTab === 'playbooks' && (
            <Suspense fallback={<RouteLoading />}><PlaybooksTab /></Suspense>
          )}
          {activeTab === 'qualification' && (
            <Suspense fallback={<RouteLoading />}><QualificationTab /></Suspense>
          )}
          {activeTab === 'queues' && (
            <Suspense fallback={<RouteLoading />}><QueuesTab /></Suspense>
          )}
          {activeTab === 'signals' && (
            <Suspense fallback={<RouteLoading />}><SignalsTab /></Suspense>
          )}
          {activeTab === 'agents' && (
            <Suspense fallback={<RouteLoading />}><AgentsTab /></Suspense>
          )}
          {activeTab === 'marketplace' && (
            <Suspense fallback={<RouteLoading />}><MarketplaceTab /></Suspense>
          )}
          {activeTab === 'rankings' && (
            <Suspense fallback={<RouteLoading />}><RankingsTab /></Suspense>
          )}

        </div>
      </div>
      )}

      {/* Settings page (admin-only, full width) */}
      {activeTab === 'settings' && isAdmin && (
        <div className="mb-8">
          <Suspense fallback={<RouteLoading />}><SettingsPage /></Suspense>
        </div>
      )}
      </main>

      <AppFooter />

      <AppModals
        activePitch={activePitch}
        isPreviewMode={isPreviewMode}
        editedSubject={editedSubject}
        editedBody={editedBody}
        isCRMModalOpen={isCRMModalOpen}
        selectedCRMLead={selectedCRMLead}
        focusOptions={FOCUS_OPTIONS}
        dealStages={dealStages}
        onClosePitchPreview={() => setActivePitch(null)}
        onCloseCRMModal={() => { setIsCRMModalOpen(false); setSelectedCRMLead(null); }}
        onSavePitchChanges={handleSaveChanges}
        onSaveCRMLead={handleSaveCRMLead}
        onTogglePreviewMode={handleTogglePreviewMode}
        onToggleEditorMode={handleToggleEditorMode}
        onSubjectChange={handleSubjectChange}
        onBodyChange={handleBodyChange}
      />

    </div>
  );
};

export default App;

const RouteLoading: React.FC = () => (
  <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading workspace view…
  </div>
);
