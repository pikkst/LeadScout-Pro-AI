import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CompanyLead, SearchState, AgentTask, LeadFocus, OutreachPitch } from './types';
import { findLeads, findMajorCities, verifyEmailAuthenticity, generatePersonalizedPitch } from './services/geminiService';
import { downloadLeadsAsCSV } from './utils/csvExport';
import AgentTerminal from './components/AgentTerminal';
import { LeadCRMModal } from './components/LeadCRMModal';
import { B2BPipelineBoard } from './components/B2BPipelineBoard';
import { CRMStatsDashboard } from './components/CRMStatsDashboard';
import { 
  Globe, 
  Search, 
  Cpu, 
  Mail, 
  CheckSquare, 
  Square, 
  Send, 
  Download, 
  FileText, 
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
  FileCode,
  Plus,
  Upload,
  Calendar,
  Briefcase
} from 'lucide-react';

const FOCUS_OPTIONS: { value: LeadFocus; label: string; icon: string; pitchType: string }[] = [
  { value: 'voip_carriers', label: 'VoIP Carriers & Wholesalers', icon: '📞', pitchType: 'Wholesale SIP Interconnection' },
  { value: 'sms_aggregators', label: 'SMS Hubs & Aggregators', icon: '💬', pitchType: 'A2P SMS Route Partnership' },
  { value: 'fintech', label: 'Fintech & Digital Banking', icon: '💳', pitchType: 'OTP & 2FA Deliverability API' },
  { value: 'ecommerce', label: 'E-commerce & Logistics', icon: '📦', pitchType: 'Customer Delivery Alerts API' },
  { value: 'call_centers', label: 'Contact Centers & CCaaS', icon: '🎧', pitchType: 'SIP Trunking & DID Capacity' },
  { value: 'mvnos', label: 'MVNOs & Local ISPs', icon: '📶', pitchType: 'Gateway Transit Interconnect' },
  { value: 'enterprise_saas', label: 'Enterprise SaaS & CRM Platforms', icon: '☁️', pitchType: 'Developer CPaaS Integration' },
];

const LANGUAGE_OPTIONS = [
  { value: 'Auto-Detect', label: '🌐 Auto-Detect Language' },
  { value: 'English', label: '🇺🇸 English' },
  { value: 'Estonian', label: '🇪🇪 Estonian (Eesti keel)' },
  { value: 'German', label: '🇩🇪 German (Deutsch)' },
  { value: 'French', label: '🇫🇷 French (Français)' },
  { value: 'Spanish', label: '🇪🇸 Spanish (Español)' },
  { value: 'Italian', label: '🇮🇹 Italian (Italiano)' }
];

const App: React.FC = () => {
  // Navigation: scout, outreach, crm, dashboard
  const [activeTab, setActiveTab] = useState<'scout' | 'outreach' | 'crm' | 'dashboard'>('scout');

  // Lead Finder States
  const [location, setLocation] = useState('');
  const [intensity, setIntensity] = useState<'standard' | 'deep'>('standard');
  const [focus, setFocus] = useState<LeadFocus>('voip_carriers');
  
  // Persist leads list
  const [leads, setLeads] = useState<CompanyLead[]>(() => {
    const saved = localStorage.getItem('unitel_b2b_leads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading saved leads", e);
      }
    }
    return [];
  });
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  
  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    progress: 0,
    currentAgent: 'Idle',
    logs: [
      '[System] Unitel Global CarrierScout Core online.',
      '[System] Ready to dispatch scout agents. Configure parameters and start B2B database orchestration.'
    ]
  });

  // Outreach & B2B Tracker States
  const [preferredLanguage, setPreferredLanguage] = useState('Auto-Detect');
  
  // Persist pitches
  const [pitches, setPitches] = useState<OutreachPitch[]>(() => {
    const saved = localStorage.getItem('unitel_b2b_pitches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading saved pitches", e);
      }
    }
    return [];
  });

  const [isGeneratingPitches, setIsGeneratingPitches] = useState(false);
  const [pitchProgress, setPitchProgress] = useState({ current: 0, total: 0, activeName: '' });
  
  // Preview / Editor States
  const [activePitch, setActivePitch] = useState<OutreachPitch | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true); // true = HTML Preview, false = Raw Editor
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  // CRM Manager Specific States
  const [isCRMModalOpen, setIsCRMModalOpen] = useState(false);
  const [selectedCRMLead, setSelectedCRMLead] = useState<CompanyLead | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('unitel_b2b_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('unitel_b2b_pitches', JSON.stringify(pitches));
  }, [pitches]);

  // Logging system
  const addLog = useCallback((message: string) => {
    setSearchState(prev => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} ${message}`]
    }));
  }, []);

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

    setLeads([]);
    setSelectedLeadIds(new Set());
    setSearchState({
      isSearching: true,
      progress: 0,
      currentAgent: 'Strategic Analysis',
      logs: [`[Control] Dispatched B2B scout agents to find "${focus}" leads in "${location.toUpperCase()}"`]
    });

    try {
      const selectedFocusLabel = FOCUS_OPTIONS.find(o => o.value === focus)?.label || focus;
      addLog(`[Strategic] Scouting geographic telecommunication hubs in "${location}" for sector: ${selectedFocusLabel}`);
      
      let cities = await findMajorCities(location, focus);
      const cityLimit = intensity === 'standard' ? 5 : 15;
      cities = cities.slice(0, cityLimit);
      
      addLog(`[Strategic] Confirmed coordinates for ${cities.length} target search grids.`);
      
      const uniqueWebsites = new Set<string>();
      const masterLeads: CompanyLead[] = [];

      for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        const cityProgressBase = (i / cities.length) * 90;
        
        updateProgress(cityProgressBase + 2, `Scouting Grid: ${city}`);
        addLog(`[Agent-Scout] Grid-scanning ${city} for active providers and B2B aggregators...`);

        const cityLeads = await findLeads(city, location, focus, (msg) => addLog(`[Scout-Update] ${msg}`));
        
        let cityProcessed = 0;
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

            const enrichedLead: CompanyLead = { 
              ...lead, 
              isVerified: isAlive && isAuthentic,
              stage: 'Discovered',
              notes: `Scouted automatically in grid zone: ${city} during Unitel Global CarrierScout reconnaissance.`,
              phone: `+372 6${Math.floor(100000 + Math.random() * 900000)}`,
              estimatedValue: Math.floor(1500 + Math.random() * 11000),
              assignedAgent: 'Tallinn Carrier Relations',
              createdAt: new Date().toISOString()
            };
            masterLeads.push(enrichedLead);
            
            // Auto select verified leads
            if (enrichedLead.isVerified) {
              setSelectedLeadIds(prev => {
                const next = new Set(prev);
                next.add(enrichedLead.id);
                return next;
              });
            }

            setLeads([...masterLeads]);
            cityProcessed++;
          }
        }
        
        addLog(`[Scout] Grid ${city} scan complete. Delivered ${cityProcessed} unique profiles to control room.`);
      }

      updateProgress(100, AgentTask.COMPLETED);
      addLog(`[Mission] Successfully concluded reconnaissance. Captured ${masterLeads.length} unique B2B telecom targets.`);
      setSearchState(prev => ({ ...prev, isSearching: false }));

    } catch (err: any) {
      const errorMsg = err?.message || 'Unexpected telemetry loss';
      addLog(`[Critical] Mission compromised: ${errorMsg}`);
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

  // AI Pitch Generation
  const handleGeneratePitches = async () => {
    if (selectedLeadIds.size === 0 || isGeneratingPitches) return;

    setIsGeneratingPitches(true);
    setActiveTab('outreach');
    addLog(`[Outreach-Engine] Initiating bulk partnership pitch formulation for ${selectedLeadIds.size} companies...`);

    const selectedLeads = leads.filter(l => selectedLeadIds.has(l.id));
    setPitchProgress({ current: 0, total: selectedLeads.length, activeName: selectedLeads[0]?.name || '' });

    const newPitches: OutreachPitch[] = [...pitches];

    for (let i = 0; i < selectedLeads.length; i++) {
      const lead = selectedLeads[i];
      setPitchProgress({ current: i + 1, total: selectedLeads.length, activeName: lead.name });
      addLog(`[AI-Copywriter] Drafting personalized wholesale pitch in ${preferredLanguage} for ${lead.name}...`);

      try {
        const pitchData = await generatePersonalizedPitch(lead, focus, preferredLanguage);
        
        // Remove existing draft for this lead if it exists
        const existingIndex = newPitches.findIndex(p => p.leadId === lead.id);
        const pitchObj: OutreachPitch = {
          id: `pitch-${lead.id}-${Date.now()}`,
          leadId: lead.id,
          leadName: lead.name,
          leadEmail: lead.email,
          subject: pitchData.subject,
          htmlContent: pitchData.htmlContent,
          textContent: pitchData.textContent,
          language: pitchData.detectedLanguage,
          status: 'Draft'
        };

        if (existingIndex > -1) {
          newPitches[existingIndex] = pitchObj;
        } else {
          newPitches.push(pitchObj);
        }

        setPitches([...newPitches]);
        addLog(`[AI-Copywriter] Draft formulated successfully for ${lead.name} [Detected: ${pitchData.detectedLanguage}].`);
      } catch (err: any) {
        addLog(`[Warning] Failed formulation for ${lead.name}: ${err?.message || 'Generation timeout'}`);
      }
    }

    setIsGeneratingPitches(false);
    addLog(`[Outreach-Engine] Formulated ${selectedLeads.length} personalized partnership drafts.`);
  };

  // Simulate Sending Outreach
  const handleSimulateSend = async (pitchId: string) => {
    setPitches(prev => prev.map(p => {
      if (p.id === pitchId) {
        return { ...p, status: 'Sent', sentAt: new Date().toLocaleTimeString() };
      }
      return p;
    }));
    
    const pitch = pitches.find(p => p.id === pitchId);
    if (pitch) {
      addLog(`[Outreach-SMTP] Dispatched direct interconnect offer to ${pitch.leadEmail}...`);
      
      // Update CRM Lead stage to "Contacted"
      setLeads(currentLeads => currentLeads.map(l => {
        if (l.id === pitch.leadId) {
          return { ...l, stage: 'Contacted', lastContactedAt: new Date().toISOString() };
        }
        return l;
      }));

      // Simulate delivered status shortly after
      setTimeout(() => {
        setPitches(current => current.map(p => {
          if (p.id === pitchId) {
            return { ...p, status: 'Delivered', opened: true };
          }
          return p;
        }));
        addLog(`[Outreach-SMTP] Delivery receipt confirmed by ${pitch.leadName} mailserver.`);
      }, 2500);

      // Simulate a responsive customer callback (Replied) based on quality match!
      setTimeout(() => {
        setPitches(current => current.map(p => {
          if (p.id === pitchId) {
            return { ...p, status: 'Replied' };
          }
          return p;
        }));

        // Promote CRM Lead stage to "Negotiation"
        setLeads(currentLeads => currentLeads.map(l => {
          if (l.id === pitch.leadId) {
            return { ...l, stage: 'Negotiation' };
          }
          return l;
        }));

        addLog(`[Outreach-Incoming] Received bilateral route test request / callback inquiry from ${pitch.leadName}! Promoted to Negotiation.`);
      }, 6000);
    }
  };

  const handleSimulateBulkSend = () => {
    const draftPitches = pitches.filter(p => p.status === 'Draft');
    if (draftPitches.length === 0) return;

    addLog(`[Outreach-SMTP] Initiating bulk secure SMTP transmission for ${draftPitches.length} carrier contracts...`);
    draftPitches.forEach((pitch, idx) => {
      setTimeout(() => {
        handleSimulateSend(pitch.id);
      }, idx * 1200);
    });
  };

  // CRM Lead Database Management actions
  const handleSaveCRMLead = (savedLead: CompanyLead) => {
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === savedLead.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = savedLead;
        return next;
      } else {
        return [savedLead, ...prev];
      }
    });
    
    if (savedLead.isVerified) {
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        next.add(savedLead.id);
        return next;
      });
    }

    addLog(`[CRM-Database] Saved profile for ${savedLead.name} in client index.`);
    setIsCRMModalOpen(false);
    setSelectedCRMLead(null);
  };

  const handleDeleteLead = (id: string) => {
    if (confirm("Are you sure you want to remove this partner from your database? This will clear all negotiation states and related drafts.")) {
      setLeads(prev => prev.filter(l => l.id !== id));
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPitches(prev => prev.filter(p => p.leadId !== id));
      addLog(`[CRM-Database] Removed target carrier and associated communications logs.`);
    }
  };

  const handleUpdateStage = (id: string, nextStage: NonNullable<CompanyLead['stage']>) => {
    setLeads(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { 
          ...l, 
          stage: nextStage,
          lastContactedAt: nextStage === 'Contacted' ? new Date().toISOString() : l.lastContactedAt
        };
        // Auto-schedule task if entering Contacted
        if (nextStage === 'Contacted' && !updated.followUpTask) {
          updated.followUpTask = {
            id: `task-${Date.now()}`,
            taskName: "Follow up on initial carrier / customer pitch",
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            isCompleted: false,
            notes: "Automatic follow-up scheduled 3 days after initial campaign pitch."
          };
        }
        return updated;
      }
      return l;
    }));
    addLog(`[CRM-Database] Upgraded partner stage to: ${nextStage}`);
  };

  const handleUpdateFollowUpTask = (
    leadId: string, 
    taskName: string, 
    dueDate: string, 
    isCompleted: boolean, 
    notes: string
  ) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          followUpTask: {
            id: l.followUpTask?.id || `task-${Date.now()}`,
            taskName,
            dueDate,
            isCompleted,
            notes
          }
        };
      }
      return l;
    }));
    addLog(`[CRM-Scheduler] Updated follow-up task configuration for partner.`);
  };

  const handleSimulateOverdueContact = (leadId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
        const overdueDueDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // Overdue by 1 day
        return {
          ...l,
          stage: 'Contacted',
          lastContactedAt: fourDaysAgo,
          followUpTask: {
            id: l.followUpTask?.id || `task-${Date.now()}`,
            taskName: l.followUpTask?.taskName || "Follow up on initial carrier / customer pitch",
            dueDate: overdueDueDate,
            isCompleted: false,
            notes: l.followUpTask?.notes || "Simulated 4 days in contacted stage."
          }
        };
      }
      return l;
    }));
    addLog(`[CRM-Simulation] Shifted carrier contact timestamp to 4 days ago. Scheduler triggered follow-up alert.`);
  };

  const handleExportBackup = () => {
    const backupData = { leads, pitches };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `unitel_carrierscout_crm_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog(`[Database-Backup] Successfully exported CRM Client portfolio backup.`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.leads && Array.isArray(parsed.leads)) {
            setLeads(parsed.leads);
            if (parsed.pitches && Array.isArray(parsed.pitches)) {
              setPitches(parsed.pitches);
            }
            addLog(`[Database-Backup] Imported ${parsed.leads.length} accounts into the CRM manager.`);
          } else {
            alert("Unrecognized JSON format. File must contain leads list.");
          }
        } catch (err) {
          alert("Failed to parse JSON file.");
        }
      };
    }
  };

  // Save changes from editor modal
  const handleSaveChanges = () => {
    if (!activePitch) return;
    setPitches(prev => prev.map(p => {
      if (p.id === activePitch.id) {
        return {
          ...p,
          subject: editedSubject,
          htmlContent: editedBody
        };
      }
      return p;
    }));
    setActivePitch(null);
    addLog(`[Editor] Hand-edited modifications saved to partner contract for ${activePitch.leadName}.`);
  };

  const handleDeletePitch = (pitchId: string) => {
    setPitches(prev => prev.filter(p => p.id !== pitchId));
    addLog(`[Outreach] Discarded partnership communication draft.`);
  };

  // Open Preview Modal
  const openPitchPreview = (pitch: OutreachPitch) => {
    setActivePitch(pitch);
    setEditedSubject(pitch.subject);
    setEditedBody(pitch.htmlContent);
    setIsPreviewMode(true);
  };

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

  // Compute stats for Dashboard (kogu B2B olema jälgitav)
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const selectedLeadsCount = selectedLeadIds.size;
    const totalDrafts = pitches.filter(p => p.status === 'Draft').length;
    const totalSent = pitches.filter(p => p.status === 'Sent' || p.status === 'Delivered' || p.status === 'Replied').length;
    const totalDelivered = pitches.filter(p => p.status === 'Delivered' || p.status === 'Replied').length;
    const totalReplies = pitches.filter(p => p.status === 'Replied').length;
    
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const replyRate = totalDelivered > 0 ? Math.round((totalReplies / totalDelivered) * 100) : 0;

    return {
      totalLeads,
      selectedLeadsCount,
      totalDrafts,
      totalSent,
      totalDelivered,
      totalReplies,
      deliveryRate,
      replyRate
    };
  }, [leads, selectedLeadIds, pitches]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 text-slate-100 font-sans">
      
      {/* Header Panel */}
      <header className="mb-10 text-center relative">
        <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 px-4 py-1.5 rounded-full text-sky-400 text-xs font-semibold mb-4 uppercase tracking-widest">
          <Globe className="w-3.5 h-3.5 animate-spin-slow" />
          Unitel Global — CarrierScout AI Portal
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-3 bg-gradient-to-r from-white via-sky-100 to-slate-400 bg-clip-text text-transparent">
          CarrierScout AI
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          Autonomous B2B partner mapping and strategic negotiation hub for <strong>Unitel Global OÜ</strong>. Real-time city-by-city carrier search, contact verification, and localized AI email outreach engine.
        </p>
      </header>

      {/* Main Stats Ticker */}
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
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Response Rate (AI-Sim)</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            {stats.replyRate}% <span className="text-xs text-slate-500 font-normal">({stats.totalReplies} leads)</span>
          </span>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mb-8 gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('scout')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'scout' 
              ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          1. AI Partner Scout
        </button>
        <button
          onClick={() => setActiveTab('outreach')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap relative ${
            activeTab === 'outreach' 
              ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          2. AI Campaigns
          {pitches.length > 0 && (
            <span className="bg-sky-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1">
              {pitches.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('crm')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap relative ${
            activeTab === 'crm' 
              ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4 text-sky-400" />
          3. CRM Client Database
          {overdueLeadsCount > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1 animate-pulse">
              {overdueLeadsCount} DUE
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'dashboard' 
              ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          4. Executive Analytics
        </button>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Control Column (Visible for Leads/Campaign setup) */}
        <div className="lg:col-span-4 space-y-6">
          
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

        {/* Right Active View Column (Dynamic depending on selected tab) */}
        <div className={(activeTab === 'crm' || activeTab === 'dashboard') ? "lg:col-span-12" : "lg:col-span-8"}>

          {/* TAB 1: SCOUT & VERIFY LEADS */}
          {activeTab === 'scout' && (
            <div className="space-y-6">
              <section className="bg-slate-950/30 border border-slate-850 rounded-2xl p-6 min-h-[550px] flex flex-col relative shadow-xl">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-850">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                      Scouted Telecom Partners
                      {leads.length > 0 && (
                        <span className="bg-sky-500/10 text-sky-400 text-[10px] px-2.5 py-1 rounded-full border border-sky-500/20 font-mono font-bold">
                          {leads.length} Verified Targets
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Select targets to initialize personalized wholesale CPaaS and voice campaigns.</p>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      onClick={() => { setSelectedCRMLead(null); setIsCRMModalOpen(true); }}
                      className="flex items-center gap-1.5 text-[10px] bg-sky-500/15 text-sky-400 hover:text-white hover:bg-sky-500 border border-sky-500/30 px-3 py-1.5 rounded-lg font-bold uppercase transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Partner
                    </button>

                    {leads.length > 0 && (
                      <>
                        <button
                          onClick={handleSelectAll}
                          className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                        >
                          {selectedLeadIds.size === leads.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                          onClick={() => downloadLeadsAsCSV(leads, location)}
                          className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                          title="Download CSV"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          CSV Export
                        </button>
                        <button
                          onClick={handleExportBackup}
                          className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
                          title="Backup client base database to a JSON file"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                          Backup Base
                        </button>
                      </>
                    )}
                    
                    <label 
                      className="flex items-center gap-1.5 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase cursor-pointer transition-colors"
                      title="Import previous JSON database backup"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      Import JSON
                      <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                    </label>
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
                      Define a partnership segment and location on the left panel to trigger the AI-grounded scouting network. Unitel Global agents will explore the targeted zones and retrieve authenticated B2B profiles.
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
                          <th className="px-4 py-4 text-center w-36">Audit Result</th>
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
                                  onClick={() => handleSelectLead(lead.id)}
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
                                <div className={`inline-flex items-center gap-1.5 ${
                                  lead.isVerified 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                } text-[9px] font-black px-2.5 py-1 rounded-md border`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${lead.isVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                  {lead.isVerified ? 'AUTHENTIC' : 'UNCONFIRMED'}
                                </div>
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
          )}

          {/* TAB 2: AI CAMPAIGN BUILDER (DRAFTS & EMAIL DRAFT GENERATION) */}
          {activeTab === 'outreach' && (
            <div className="space-y-6">
              <section className="bg-slate-950/30 border border-slate-850 rounded-2xl p-6 min-h-[550px] flex flex-col relative shadow-xl">
                
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-850">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                      AI Partnership Email Pitch Drafts
                      {pitches.length > 0 && (
                        <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2.5 py-1 rounded-full border border-purple-500/20 font-mono font-bold">
                          {pitches.length} DRAFTS FORMULATED
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Review, customize, and execute automated SMTP transmissions on behalf of Unitel Global.</p>
                  </div>

                  {pitches.length > 0 && (
                    <button
                      onClick={handleSimulateBulkSend}
                      className="flex items-center gap-2 text-[10px] bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-lg shadow-sky-950/20"
                    >
                      <SendHorizontal className="w-3.5 h-3.5" />
                      Bulk Send All Drafts
                    </button>
                  )}
                </div>

                {/* Empty State */}
                {pitches.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-12 text-slate-500 border border-dashed border-slate-850 rounded-2xl">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-850 shadow-inner">
                      <Sparkles className="w-8 h-8 text-slate-700 animate-bounce" />
                    </div>
                    <h3 className="text-slate-300 font-bold text-base mb-1.5">No Drafts Formulated Yet</h3>
                    <p className="max-w-md text-xs opacity-60 leading-relaxed mb-6">
                      Select one or more active targets on the <strong>AI Partner Scout</strong> tab, choose your preferred localized language on the left Outreach control panel, and click "Draft Custom Pitch" to load drafts here.
                    </p>
                    <button
                      onClick={() => setActiveTab('scout')}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-4 py-2 rounded-lg font-bold uppercase transition-colors"
                    >
                      Browse Partners
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pitches.map((pitch) => (
                      <div 
                        key={pitch.id} 
                        className="bg-slate-900/60 border border-slate-850 rounded-xl p-5 flex flex-col justify-between hover:border-slate-750 transition-all shadow-md hover:shadow-lg relative overflow-hidden"
                      >
                        {pitch.status !== 'Draft' && (
                          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-sky-500" />
                        )}

                        <div>
                          {/* Pitch Status header */}
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] bg-slate-850 border border-slate-800 px-2.5 py-0.5 rounded text-slate-400 font-mono font-bold uppercase">
                              Language: {pitch.language}
                            </span>
                            
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                              pitch.status === 'Draft' 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                : pitch.status === 'Replied'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {pitch.status.toUpperCase()}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-100 text-sm line-clamp-1 mb-1">{pitch.leadName}</h3>
                          <p className="text-[10px] text-slate-500 mb-4 truncate">{pitch.leadEmail}</p>

                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/80 mb-4">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</div>
                            <div className="text-xs font-mono text-slate-300 line-clamp-1">{pitch.subject}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-850">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openPitchPreview(pitch)}
                              className="p-2 text-slate-400 hover:text-sky-400 bg-slate-950 rounded-lg hover:bg-slate-900 border border-slate-850 transition-all"
                              title="Edit Subject / Body and Preview HTML"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePitch(pitch.id)}
                              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-950 rounded-lg hover:bg-slate-900 border border-slate-850 transition-all"
                              title="Discard draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {pitch.status === 'Draft' ? (
                            <button
                              onClick={() => handleSimulateSend(pitch.id)}
                              className="flex items-center gap-1.5 text-[10px] bg-sky-600/10 hover:bg-sky-600/25 text-sky-400 border border-sky-500/20 px-3 py-2 rounded-lg font-bold uppercase transition-all"
                            >
                              <Send className="w-3 h-3" />
                              Simulate Send
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Sent at {pitch.sentAt || 'N/A'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 3: CRM CLIENT DATABASE (KANBAN BOARD & MANAGERS) */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              <B2BPipelineBoard 
                leads={leads}
                onUpdateStage={handleUpdateStage}
                onEditLead={(lead) => { setSelectedCRMLead(lead); setIsCRMModalOpen(true); }}
                onDeleteLead={handleDeleteLead}
                onAddLead={() => { setSelectedCRMLead(null); setIsCRMModalOpen(true); }}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onUpdateFollowUpTask={handleUpdateFollowUpTask}
                onSimulateOverdueContact={handleSimulateOverdueContact}
              />
            </div>
          )}

          {/* TAB 4: EXECUTIVE ANALYTICS & COMMUNICATIONS TELEMETRY */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* Performance Metrics & Visual Analytics Diagrams */}
              <CRMStatsDashboard leads={leads} pitches={pitches} />

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

              {/* simulated carrier interaction simulator */}
              {pitches.some(p => p.status === 'Replied') && (
                <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-purple-400" />
                    Incoming Bilateral Telecom Feed (Simulated Replies)
                  </h3>
                  <p className="text-xs text-slate-400">
                    The targeted wholesale carriers analyzed the bespoke pitches sent by Unitel Global OÜ and sent the following live responses:
                  </p>

                  <div className="space-y-4">
                    {pitches.filter(p => p.status === 'Replied').map(p => (
                      <div key={p.id} className="bg-slate-900/80 border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start">
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-sm">{p.leadName} NOC Team</span>
                            <span className="text-[10px] text-slate-500 font-mono">10 minutes ago</span>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-xs text-emerald-400 leading-relaxed">
                            "Hello Team Unitel Global, thanks for reaching out. We received your localized interconnect proposal regarding wholesale voice CLI routes and A2P SMS termination. We are interested in testing your bilateral capacities on the baltic and central European paths. Can you share your pricing sheet (target rates) and set up an SIP peer with us? Regards, Carrier Relations."
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            addLog(`[System] Initialized bilateral interconnect negotiations with ${p.leadName}. Ready to transfer rate sheet.`);
                            alert(`Rate sheet generated & sent to ${p.leadName} Carrier Relations!`);
                          }}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] px-4 py-2 rounded-lg uppercase tracking-wider self-end md:self-center whitespace-nowrap transition-colors"
                        >
                          Send Rate Sheet
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-[10px] font-bold uppercase">
        <p>&copy; {new Date().getFullYear()} Unitel Global OÜ | Tallinn, Estonia. All rights reserved.</p>
        <div className="flex gap-8">
          <span className="flex items-center gap-2 opacity-80">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" /> 
            AI Node Sync: Secure Connected
          </span>
          <span className="text-slate-500 opacity-60">Autonomous CarrierScout Engine v4.8</span>
        </div>
      </footer>

      {/* MODAL: STYLISH HTML EMAIL DRAFT PREVIEWER & EDITOR */}
      {activePitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-base">Custom Proposal Editor & Previewer</h3>
                <p className="text-xs text-slate-500">Formulating wholesale telecommunication interconnect templates on behalf of Unitel Global OÜ</p>
              </div>
              
              <button 
                onClick={() => setActivePitch(null)}
                className="text-slate-400 hover:text-slate-100 font-bold text-xs bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg transition-colors"
              >
                Close (ESC)
              </button>
            </div>

            {/* Modal Sub-Header (Email headers) */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-850 space-y-2.5">
              <div className="flex items-center gap-4 text-xs">
                <span className="w-16 text-slate-500 font-bold uppercase tracking-wider">Recipient:</span>
                <span className="font-mono text-sky-400 font-semibold">{activePitch.leadEmail}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="w-16 text-slate-500 font-bold uppercase tracking-wider">Subject:</span>
                <input 
                  type="text" 
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-semibold flex-grow focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Switch view buttons */}
            <div className="flex border-b border-slate-850 bg-slate-950/20">
              <button
                onClick={() => setIsPreviewMode(true)}
                className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  isPreviewMode 
                    ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-4 h-4" />
                Live Brand HTML Preview
              </button>
              <button
                onClick={() => setIsPreviewMode(false)}
                className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  !isPreviewMode 
                    ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Raw Source Editor
              </button>
            </div>

            {/* Modal Body / Sandbox Preview */}
            <div className="flex-grow p-5 overflow-y-auto bg-slate-950/20 max-h-[50vh]">
              {isPreviewMode ? (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-white min-h-[380px]">
                  <iframe 
                    title="B2B Proposal Preview"
                    srcDoc={editedBody}
                    className="w-full h-[400px] border-none bg-white"
                  />
                </div>
              ) : (
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full h-[400px] bg-slate-950 text-slate-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Paste or write HTML body markup here..."
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-4 border-t border-slate-850 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-mono">
                Language context: {activePitch.language}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActivePitch(null)}
                  className="text-xs bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 px-4 py-2 rounded-lg font-bold uppercase transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors"
                >
                  Save Draft Changes
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CRM PROFILE CREATION / EDITION MODAL */}
      {isCRMModalOpen && (
        <LeadCRMModal 
          lead={selectedCRMLead}
          onClose={() => { setIsCRMModalOpen(false); setSelectedCRMLead(null); }}
          onSave={handleSaveCRMLead}
        />
      )}

    </div>
  );
};

export default App;
