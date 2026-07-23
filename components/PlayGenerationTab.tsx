import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { GeneratedPlay } from '../types';
import * as api from '../services/phase3Api';

const VERTICALS = [
  "voip_carriers", "sms_aggregators", "fintech", "ecommerce", "call_centers", "mvnos",
  "enterprise_saas", "manufacturing", "industrial", "retail", "technology", "it_services",
  "software", "healthcare", "finance", "real_estate", "construction", "energy",
  "logistics", "travel_hospitality", "media", "education", "professional_services",
  "telecom", "automotive", "food_beverage"
];

export const PlayGenerationTab: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [vertical, setVertical] = useState("enterprise_saas");
  const [generated, setGenerated] = useState<GeneratedPlay | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const play = await api.generatePlay(prompt, vertical);
      setGenerated(play);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    const text = JSON.stringify(generated, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-400" /> AI Play Generator
        </h2>
      </div>

      <form onSubmit={handleGenerate} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">Describe your play in plain language</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. Reach out to VP of Sales at Series B SaaS companies that recently hired 5+ new SDRs. Use a multi-step email cadence focused on reducing ramp time..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Vertical</label>
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
            >
              {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              {loading ? "Generating..." : "Generate Play"}
            </button>
          </div>
        </div>
      </form>

      {generated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">{generated.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{generated.description}</p>
              <p className="text-[10px] text-slate-500 mt-1">Audience: {generated.targetAudience} · Vertical: {generated.vertical}</p>
            </div>
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg">
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <div className="text-xs font-bold text-slate-300 mb-3">Workflow Steps</div>
            <div className="space-y-2">
              {generated.steps.map((step) => (
                <div key={step.order} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.order ? null : step.order)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <span className="text-xs font-bold text-white">{step.order}. {step.name}</span>
                      <span className="text-[10px] text-slate-500 ml-2">{step.type}</span>
                    </div>
                    {expandedStep === step.order ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {expandedStep === step.order && (
                    <div className="px-4 pb-4 space-y-2">
                      <div className="text-xs text-slate-300">{step.template}</div>
                      <div className="text-[10px] text-slate-500">Success: {step.successCriteria}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <div className="text-xs font-bold text-slate-300 mb-3">Messages</div>
            <div className="space-y-3">
              {generated.messages.map((msg, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                  {msg.subject && <div className="text-xs font-bold text-white mb-1">Subject: {msg.subject}</div>}
                  <div className="text-xs text-slate-300 whitespace-pre-wrap">{msg.body}</div>
                  <div className="text-[10px] text-slate-500 mt-2">Tone: {msg.tone}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <div className="text-xs font-bold text-slate-300 mb-3">Success Criteria</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-900/60 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 font-bold">METRIC</div>
                <div className="text-sm font-bold text-white">{generated.successCriteria.targetMetric}</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 font-bold">TARGET</div>
                <div className="text-sm font-bold text-white">{generated.successCriteria.targetValue}%</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 font-bold">TIMEFRAME</div>
                <div className="text-sm font-bold text-white">{generated.successCriteria.timeframe}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
