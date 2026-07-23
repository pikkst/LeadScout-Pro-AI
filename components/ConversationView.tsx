import React, { useState, useEffect } from 'react';
import { Conversation, ConversationMessage } from '../types';
import { listConversationsApi, getConversationApi, markConversationReadApi, syncConversationsApi, startGoogleOAuth, disconnectGoogleApi, sendGmailReplyApi, stopSequencesForLead } from '../services/crmService';
import { api } from '../services/apiClient';
import { Mail, RefreshCw, ExternalLink, Send, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ConversationViewProps {
  leadId?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ leadId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeBody, setComposeBody] = useState('');

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await listConversationsApi(leadId);
      setConversations(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadConversations();
  }, [leadId]);

  const checkConnection = async () => {
    try {
      await api('/auth/me');
    } catch {
      setConnected(false);
      return;
    }
    setConnected(true);
  };

  const handleConnect = async () => {
    try {
      const { authorizeUrl } = await startGoogleOAuth();
      window.location.href = authorizeUrl;
    } catch (err) {
      console.error('Failed to start OAuth:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleApi();
      setConnected(false);
      setConversations([]);
      setActiveConversation(null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncConversationsApi();
      await loadConversations();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    try {
      const full = await getConversationApi(conversation.id);
      setActiveConversation(full);
      await markConversationReadApi(conversation.id);
      setConversations((prev) => prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)));
    } catch {
      // keep partial data on read failure
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  if (!connected) {
    return (
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 text-center">
        <Mail className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-1">Connect Gmail</h3>
        <p className="text-[10px] text-slate-500 mb-4 max-w-sm mx-auto">
          Connect your Google account to sync conversations, send replies, and auto-advance lead stages directly from the CRM.
        </p>
        <button
          onClick={handleConnect}
          className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/20 flex items-center gap-2 mx-auto transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Connect Google
        </button>
      </div>
    );
  }

  if (activeConversation) {
    return (
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 truncate max-w-lg">{activeConversation.subject}</h3>
            <p className="text-[9px] text-slate-500 mt-0.5">
              {activeConversation.connection?.accountEmail} • {formatTime(activeConversation.lastMessageAt)}
            </p>
          </div>
          <button onClick={() => setActiveConversation(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {activeConversation.messages.map((msg) => {
            const isOutbound = msg.direction === 'OUTBOUND';
            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-[10px] leading-relaxed ${
                  isOutbound ? 'bg-sky-500/10 border border-sky-500/20 text-slate-200' : 'bg-slate-900 border border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">
                      {isOutbound ? 'You' : msg.senderEmail}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">{formatTime(msg.occurredAt)}</span>
                  </div>
                  {msg.subject && <div className="text-[9px] font-bold text-slate-300 mb-0.5">{msg.subject}</div>}
                  <p className="whitespace-pre-wrap">{msg.textBody}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800">
          {composing ? (
            <div className="space-y-2">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-y"
                placeholder="Write your reply..."
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setComposing(false); setComposeBody(''); }} className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!composeBody.trim() || !activeConversation) return;
                  try {
                    const to = activeConversation.messages.find(m => m.direction === 'INBOUND')?.senderEmail || activeConversation.connection?.accountEmail || '';
                    const result = await sendGmailReplyApi({ to, subject: activeConversation.subject, body: composeBody, threadId: activeConversation.id });
                    const newMessage: ConversationMessage = {
                      id: result.id,
                      direction: 'OUTBOUND',
                      senderEmail: 'me',
                      recipientEmails: [to],
                      subject: activeConversation.subject,
                      textBody: composeBody,
                      occurredAt: new Date().toISOString(),
                      isRead: true,
                    };
                    setActiveConversation({
                      ...activeConversation,
                      messages: [...activeConversation.messages, newMessage],
                      lastMessageAt: new Date().toISOString(),
                    });
                    if (activeConversation.legacyLeadId) {
                      void stopSequencesForLead(activeConversation.legacyLeadId, 'REPLY').catch((err) => console.error('[conversation] stopSequencesForLead failed', err));
                    }
                    setComposing(false);
                    setComposeBody('');
                  } catch (err) {
                    console.error('Failed to send reply:', err);
                  }
                }} className="px-3 py-1.5 text-[10px] font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1.5 transition-all">
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setComposing(true)} className="text-[10px] font-bold uppercase tracking-wider text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors">
              <Send className="w-3.5 h-3.5" /> Compose Reply
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Conversations</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing} className="text-[10px] font-bold uppercase tracking-wider text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button onClick={handleDisconnect} className="text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors">
            <X className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-slate-500 text-[10px]">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-[10px]">No conversations synced yet. Click Sync to import recent emails.</div>
      ) : (
        <div className="divide-y divide-slate-800">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className="w-full flex items-start gap-3 p-4 hover:bg-slate-900/50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-300">
                {getInitials(conv.subject.split(' ').slice(0, 2).join(' ') || '?')}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-200 truncate flex-grow">{conv.subject}</span>
                  {conv.unreadCount > 0 && (
                    <span className="text-[8px] font-black bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-full">{conv.unreadCount}</span>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 truncate">{conv.connection?.accountEmail} • {formatTime(conv.lastMessageAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
