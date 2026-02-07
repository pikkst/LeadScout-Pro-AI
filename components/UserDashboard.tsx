import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserQueryHistory, markQueryAsDownloaded } from '../services/queryHistoryService';
import { QueryHistory } from '../services/supabaseClient';
import { downloadLeadsAsCSV } from '../utils/csvExport';
import CreditPurchaseModal from './CreditPurchaseModal';

const UserDashboard: React.FC = () => {
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadQueryHistory();
    }
  }, [user]);

  const loadQueryHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    const history = await getUserQueryHistory(user.id);
    setQueryHistory(history);
    setLoading(false);
  };

  const handleDownload = async (query: QueryHistory) => {
    if (!profile || profile.credits < 1) {
      setShowCreditModal(true);
      return;
    }

    try {
      // Download the CSV
      downloadLeadsAsCSV(
        query.results,
        query.location,
        async () => {
          // Mark as downloaded and deduct credit
          await markQueryAsDownloaded(query.id);
          await useAuth().updateCredits(-1);
          await loadQueryHistory(); // Refresh the history
        }
      );
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold tracking-tight">LeadScout Pro AI</h1>
                <p className="text-blue-200 text-xs">AI-Powered Lead Generation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/search')}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg"
              >
                New Search
              </button>
              <div className="text-right">
                <p className="text-blue-200 text-sm">Credits Available</p>
                <p className="text-white text-lg font-bold">{profile?.credits || 0}</p>
              </div>
              <button
                onClick={() => setShowCreditModal(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
              >
                Buy Credits
              </button>
              <button
                onClick={signOut}
                className="text-blue-200 hover:text-white transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Dashboard</h1>
          <p className="text-blue-200">
            Welcome back, {profile?.full_name || user?.email}! Here's your search history.
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🔍</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-white">{queryHistory.length}</p>
                <p className="text-blue-200">Total Searches</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">📥</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-white">
                  {queryHistory.filter(q => q.downloaded).length}
                </p>
                <p className="text-blue-200">Downloads</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-white">{profile?.credits || 0}</p>
                <p className="text-blue-200">Available Credits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Query History */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Search History</h2>
          </div>
          
          {queryHistory.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No searches yet</h3>
              <p className="text-blue-200 mb-4">Start your first lead search to see results here.</p>
              <button
                onClick={() => navigate('/search')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
              >
                Start Searching
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {queryHistory.map((query) => (
                <div key={query.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {query.focus} leads in {query.location}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          query.downloaded 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {query.downloaded ? 'Downloaded' : 'Ready to Download'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-blue-200">
                        <span>🎯 {query.intensity} search</span>
                        <span>📊 {query.results.length} leads found</span>
                        <span>📅 {new Date(query.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-blue-300">€5</span>
                      <button
                        onClick={() => handleDownload(query)}
                        disabled={query.downloaded}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                          query.downloaded
                            ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg'
                        }`}
                      >
                        {query.downloaded ? 'Downloaded' : 'Download CSV'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />
    </div>
  );
};

export default UserDashboard;