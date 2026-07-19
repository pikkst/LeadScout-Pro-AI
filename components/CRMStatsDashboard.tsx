import React from 'react';
import { CompanyLead } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Users, 
  Layers, 
  PieChart, 
  Percent, 
  Activity, 
  Globe, 
  ArrowUpRight,
  TrendingDown,
  Briefcase,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  CalendarDays
} from 'lucide-react';

interface CRMStatsDashboardProps {
  leads: CompanyLead[];
}

export const CRMStatsDashboard: React.FC<CRMStatsDashboardProps> = ({ leads }) => {
  const activeLeads = leads.filter(l => l.stage !== 'Archived');
  const countTotal = activeLeads.length;
  
  // Stages breakdown
  const countDiscovered = activeLeads.filter(l => (l.stage || 'Discovered') === 'Discovered').length;
  const countContacted = activeLeads.filter(l => l.stage === 'Contacted').length;
  const countNegotiation = activeLeads.filter(l => l.stage === 'Negotiation').length;
  const countSigned = activeLeads.filter(l => l.stage === 'Signed').length;
  const countActive = activeLeads.filter(l => l.stage === 'Active').length;

  // Potential Values
  const valueTotal = activeLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
  const valueNegotiation = activeLeads.filter(l => l.stage === 'Negotiation').reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
  const valueSigned = activeLeads.filter(l => l.stage === 'Signed').reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
  const valueActive = activeLeads.filter(l => l.stage === 'Active').reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

  // Conversion rates
  const signedConversionRate = countTotal > 0 ? Math.round(((countSigned + countActive) / countTotal) * 100) : 0;
  const activeConversionRate = countTotal > 0 ? Math.round((countActive / countTotal) * 100) : 0;

  // Segment statistics
  const segmentsMap = activeLeads.reduce((acc, l) => {
    const key = l.category || 'voip_carriers';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find top sector
  let topSectorName = 'VoIP Wholesalers';
  let maxCount = 0;
  Object.entries(segmentsMap).forEach(([key, value]) => {
    if (value > maxCount) {
      maxCount = value;
      topSectorName = key.replace(/_/g, ' ').toUpperCase();
    }
  });

  return (
    <div className="space-y-6">
      {/* Visual KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Pipeline Contract Value */}
        <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pipeline Value</span>
            <div className="text-xl font-mono font-bold text-white">
              €{valueTotal.toLocaleString()}
              <span className="text-xs font-sans text-slate-500 font-semibold ml-1">/mo</span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">€{(valueSigned + valueActive).toLocaleString()}</span> secured & live
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 2: Total Wholesalers Mapped */}
        <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global Partners Mapped</span>
            <div className="text-xl font-mono font-bold text-white">
              {countTotal}
            </div>
            <p className="text-[10px] text-slate-400">
              <span className="text-sky-400 font-bold">{leads.filter(l => l.isVerified).length}</span> verified contacts
            </p>
          </div>
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/10">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 3: Live Interconnections */}
        <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Traffic (Active)</span>
            <div className="text-xl font-mono font-bold text-emerald-400">
              {countActive}
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              MRR: <strong className="text-white">€{valueActive.toLocaleString()}</strong>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 4: Signed Win Rate */}
        <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contract Win Rate</span>
            <div className="text-xl font-mono font-bold text-purple-400">
              {signedConversionRate}%
            </div>
            <p className="text-[10px] text-slate-400">
              Of all mapped targets
            </p>
          </div>
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/10">
            <Percent className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Funnel Graph and Sector Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Funnel Conversion Meter */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Wholesale Conversion Funnel
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              Track how prospective B2B targets flow from initial system discovery down to signed active contracts.
            </p>
          </div>

          <div className="space-y-3">
            {/* Funnel Level 1: Discovered */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                <span>1. Discovered / Scouted Targets</span>
                <span className="font-mono text-white">{countDiscovered} ({countTotal > 0 ? Math.round((countDiscovered/countTotal)*100) : 0}%)</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all duration-500" 
                  style={{ width: `${countTotal > 0 ? (countDiscovered/countTotal)*100 : 0}%` }}
                />
              </div>
            </div>

            {/* Funnel Level 2: Contacted */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-semibold text-sky-400">
                <span>2. Pitch Transmitted / Outreach</span>
                <span className="font-mono">{countContacted} ({countTotal > 0 ? Math.round((countContacted/countTotal)*100) : 0}%)</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                <div 
                  className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                  style={{ width: `${countTotal > 0 ? (countContacted/countTotal)*100 : 0}%` }}
                />
              </div>
            </div>

            {/* Funnel Level 3: Negotiation */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-semibold text-amber-400">
                <span>3. Active Negotiation (MTR / Rates Exchange)</span>
                <span className="font-mono">{countNegotiation} ({countTotal > 0 ? Math.round((countNegotiation/countTotal)*100) : 0}%)</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                  style={{ width: `${countTotal > 0 ? (countNegotiation/countTotal)*100 : 0}%` }}
                />
              </div>
            </div>

            {/* Funnel Level 4: Signed */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-semibold text-purple-400">
                <span>4. Interconnect Agreement Signed (Bilateral)</span>
                <span className="font-mono">{countSigned} ({countTotal > 0 ? Math.round((countSigned/countTotal)*100) : 0}%)</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                  style={{ width: `${countTotal > 0 ? (countSigned/countTotal)*100 : 0}%` }}
                />
              </div>
            </div>

            {/* Funnel Level 5: Active */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-semibold text-emerald-400">
                <span>5. Live Billing & Telecommunications Traffic</span>
                <span className="font-mono">{countActive} ({countTotal > 0 ? Math.round((countActive/countTotal)*100) : 0}%)</span>
              </div>
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${countTotal > 0 ? (countActive/countTotal)*100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sector Distribution List */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-400" />
              Industry Segment Proportions
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              Distribution of target accounts categorized by wholesale focus.
            </p>
          </div>

          <div className="space-y-2.5">
            {Object.keys(segmentsMap).length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No segment data recorded.</p>
            ) : (
              Object.entries(segmentsMap).map(([key, value]) => {
                const label = key.replace(/_/g, ' ').toUpperCase();
                const percentage = countTotal > 0 ? Math.round((value / countTotal) * 100) : 0;
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-300">
                      <span className="truncate">{label}</span>
                      <span className="font-mono text-slate-400">{value} ({percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/40">
                      <div 
                        className="h-full bg-sky-500 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400">
            Dominant target segment: <strong className="text-white">{topSectorName}</strong>
          </div>
        </div>
      </div>

      {/* Unified B2B Meetings & Agenda (Calendar Integration) */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-sky-400" />
              Unified Team Meetings &amp; Calls Schedule
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              Consolidated chronological calendar of all active carrier relation audio calls, demos, and bilateral alignment meetings.
            </p>
          </div>
          <span className="bg-sky-500/10 text-sky-400 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border border-sky-500/20">
            {leads.flatMap(l => l.scheduledMeetings || []).length} Scheduled
          </span>
        </div>

        {(() => {
          const allMeetings = leads.flatMap(l => 
            (l.scheduledMeetings || []).map(m => ({
              ...m,
              leadId: l.id,
              leadName: l.name,
              leadCategory: l.category
            }))
          ).sort((a, b) => {
            const dateTimeA = `${a.date}T${a.time}`;
            const dateTimeB = `${b.date}T${b.time}`;
            return dateTimeA.localeCompare(dateTimeB);
          });

          if (allMeetings.length === 0) {
            return (
              <div className="h-28 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center text-center p-4">
                <p className="text-[10px] text-slate-500 italic">No meetings or audio calls currently scheduled across any pipeline targets.</p>
                <p className="text-[9px] text-slate-600 mt-1 leading-relaxed">
                  Open any partner details on the Kanban board to attach new calls, demos, or meetings to specific leads.
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[360px] overflow-y-auto pr-1">
              {allMeetings.map(m => (
                <div key={m.id} className="p-3.5 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl space-y-2.5 flex flex-col justify-between transition-all">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        m.type === 'Call' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                        m.type === 'Meeting' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' :
                        m.type === 'Demo' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {m.type}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{m.date}</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <h5 className="text-xs font-bold text-white line-clamp-1">{m.title}</h5>
                      <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                        <span>🏢</span> {m.leadName}
                      </span>
                    </div>

                    {m.agenda && (
                      <p className="text-[10px] text-slate-500 italic leading-relaxed line-clamp-2">{m.agenda}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-850/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono text-[9px]">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      {m.time} ({m.duration}m)
                    </span>

                    {m.link && (
                      <a 
                        href={m.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[9px] text-sky-400 hover:text-sky-300 font-bold tracking-wide uppercase"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Call
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Operational Intelligence Section */}
      <div className="p-5 bg-slate-900 border border-slate-800/80 rounded-2xl space-y-4">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            Strategic Telecommunication Recommendations
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">
            AI-generated Carrier Relations guidance for Unitel Global based on the current active partner pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800/60 rounded-xl space-y-1.5">
            <strong className="text-sky-300 font-bold block">🚨 Pricing Arbitrage Action Needed</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We have {countNegotiation} carriers in <strong>Negotiation</strong>. It is highly advised to immediately request their latest LCR (Least Cost Routing) voice destinations to compare pricing margins against Tallinn core transit gateways.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/60 rounded-xl space-y-1.5">
            <strong className="text-purple-300 font-bold block">📜 Interconnection Acceleration</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              There are {countSigned} bilateral agreements <strong>Signed</strong> but not yet active. Coordinate with NOC tech team to set up SIP trunks, request test traffic (100 test calls), and open routing permissions.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/60 rounded-xl space-y-1.5">
            <strong className="text-emerald-300 font-bold block">💰 Revenue Projection Optimism</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              With your pipeline value sitting at <strong>€{valueTotal.toLocaleString()}/month</strong>, converting even 10% of remaining negotiators will bolster Unitel Global gross SMS/VoIP profit margins significantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
