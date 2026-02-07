import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-gray-900 text-xl font-bold">LeadScout Pro AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Credits Available</p>
                <p className="text-lg font-bold text-blue-600">{profile?.credits || 0}</p>
              </div>
              <button
                onClick={() => setShowCreditModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Buy Credits
              </button>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {profile?.full_name || user?.email}! Here's your search history.
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">🔍</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{queryHistory.length}</p>
                <p className="text-gray-600">Total Searches</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">📥</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {queryHistory.filter(q => q.downloaded).length}
                </p>
                <p className="text-gray-600">Downloads</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{profile?.credits || 0}</p>
                <p className="text-gray-600">Available Credits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Query History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Search History</h2>
          </div>
          
          {queryHistory.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No searches yet</h3>
              <p className="text-gray-600 mb-4">Start your first lead search to see results here.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Start Searching
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {queryHistory.map((query) => (
                <div key={query.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {query.focus} leads in {query.location}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          query.downloaded 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {query.downloaded ? 'Downloaded' : 'Ready to Download'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>🎯 {query.intensity} search</span>
                        <span>📊 {query.results.length} leads found</span>
                        <span>📅 {new Date(query.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-blue-600">€5</span>
                      <button
                        onClick={() => handleDownload(query)}
                        disabled={query.downloaded}
                        className={`px-4 py-2 rounded-lg transition ${
                          query.downloaded
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
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