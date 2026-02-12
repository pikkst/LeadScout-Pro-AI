import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserQueryHistory, deleteQuery } from '../services/queryHistoryService';
import { QueryHistory } from '../services/supabaseClient';
import { downloadCSVSecure, triggerCSVDownload } from '../services/downloadService';
import CreditPurchaseModal from './CreditPurchaseModal';
import Footer from './Footer';

type FilterStatus = 'all' | 'downloaded' | 'not-downloaded';
type SortBy = 'date-desc' | 'date-asc' | 'leads-desc' | 'leads-asc';

const UserDashboard: React.FC = () => {
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Filter & search state
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterFocus, setFilterFocus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [pageSize, setPageSize] = useState<number>(5);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  // Get unique focus categories from history
  const focusCategories = useMemo(() => {
    const categories = new Set(queryHistory.map(q => q.focus));
    return Array.from(categories).sort();
  }, [queryHistory]);

  // Filtered & sorted results
  const filteredHistory = useMemo(() => {
    let results = [...queryHistory];

    // Text search (location, focus, query)
    if (searchText.trim()) {
      const term = searchText.toLowerCase();
      results = results.filter(q =>
        q.location.toLowerCase().includes(term) ||
        q.focus.toLowerCase().includes(term) ||
        q.query.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus === 'downloaded') {
      results = results.filter(q => q.downloaded);
    } else if (filterStatus === 'not-downloaded') {
      results = results.filter(q => !q.downloaded);
    }

    // Focus filter
    if (filterFocus !== 'all') {
      results = results.filter(q => q.focus === filterFocus);
    }

    // Sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'leads-desc':
          return (b.results?.length || 0) - (a.results?.length || 0);
        case 'leads-asc':
          return (a.results?.length || 0) - (b.results?.length || 0);
        default:
          return 0;
      }
    });

    return results;
  }, [queryHistory, searchText, filterStatus, filterFocus, sortBy]);

  const handleDownload = async (query: QueryHistory) => {
    // First download: needs credit; re-download: free (up to 10x)
    if (!query.downloaded && (!profile || profile.credits < 1)) {
      setShowCreditModal(true);
      return;
    }

    setDownloading(query.id);
    try {
      const { csv, filename } = await downloadCSVSecure(query.id);
      triggerCSVDownload(csv, filename);
      await refreshProfile();
      await loadQueryHistory();
    } catch (error: any) {
      console.error('Download failed:', error);
      if (error.message?.includes('Insufficient credits')) {
        setShowCreditModal(true);
      } else if (error.message?.includes('Maximum re-download')) {
        alert('Re-download limit reached (10 times). Please run a new search.');
      } else {
        alert(error.message || 'Download failed. Please try again.');
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (query: QueryHistory) => {
    if (deleteConfirm !== query.id) {
      setDeleteConfirm(query.id);
      // Auto-clear confirm after 3 seconds
      setTimeout(() => setDeleteConfirm(prev => prev === query.id ? null : prev), 3000);
      return;
    }

    setDeleting(query.id);
    try {
      const success = await deleteQuery(query.id, user!.id);
      if (success) {
        setQueryHistory(prev => prev.filter(q => q.id !== query.id));
      } else {
        alert('Failed to delete. Please try again.');
      }
    } catch (error) {
      alert('Failed to delete. Please try again.');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  // Paginated results
  const paginatedHistory = useMemo(() => {
    if (pageSize === 0) return filteredHistory; // 0 = show all
    return filteredHistory.slice(0, pageSize);
  }, [filteredHistory, pageSize]);

  const getDownloadButtonProps = (query: QueryHistory) => {
    const maxDownloads = 10;
    const count = query.download_count || 0;
    const isProcessing = downloading === query.id;
    const limitReached = query.downloaded && count >= maxDownloads;

    if (isProcessing) {
      return {
        label: 'Processing...',
        className: 'bg-blue-500/20 text-blue-300 cursor-wait border border-blue-500/30',
        disabled: true,
      };
    }

    if (limitReached) {
      return {
        label: 'Limit Reached',
        className: 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30',
        disabled: true,
      };
    }

    if (query.downloaded) {
      return {
        label: `Re-download (${count}/${maxDownloads})`,
        className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg',
        disabled: false,
      };
    }

    return {
      label: 'Download CSV',
      className: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg',
      disabled: false,
    };
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
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold tracking-tight">LeadScout Pro AI</h1>
                <p className="text-blue-200 text-xs hidden sm:block">AI-Powered Lead Generation</p>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-4">
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

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-2 border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-200 text-sm">Credits: <span className="text-white font-bold">{profile?.credits || 0}</span></span>
                <button
                  onClick={() => { setShowCreditModal(true); setMobileMenuOpen(false); }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  Buy Credits
                </button>
              </div>
              <button
                onClick={() => { navigate('/search'); setMobileMenuOpen(false); }}
                className="block w-full text-left bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl font-medium"
              >
                New Search
              </button>
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="block w-full text-left text-blue-200 hover:text-white py-2 font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
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
                <p className="text-2xl font-bold text-white">{queryHistory?.length || 0}</p>
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
                  {queryHistory?.filter(q => q.downloaded)?.length || 0}
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

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by location, category..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Status</option>
              <option value="downloaded">Downloaded</option>
              <option value="not-downloaded">Not Downloaded</option>
            </select>

            {/* Focus filter */}
            <select
              value={filterFocus}
              onChange={(e) => setFilterFocus(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="all">All Categories</option>
              {focusCategories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="leads-desc">Most Leads</option>
              <option value="leads-asc">Fewest Leads</option>
            </select>

            {/* Per page */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value={5}>Show 5</option>
              <option value={10}>Show 10</option>
              <option value={20}>Show 20</option>
              <option value={0}>Show All</option>
            </select>

            {/* Results count */}
            <span className="text-blue-300 text-sm">
              {pageSize > 0 ? `${Math.min(pageSize, filteredHistory.length)} of ` : ''}{filteredHistory.length} results
            </span>
          </div>
        </div>

        {/* Query History */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Search History</h2>
          </div>
          
          {(paginatedHistory?.length || 0) === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-2xl">🔍</span>
              </div>
              {queryHistory.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium text-white mb-2">No searches yet</h3>
                  <p className="text-blue-200 mb-4">Start your first lead search to see results here.</p>
                  <button
                    onClick={() => navigate('/search')}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    Start Searching
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-white mb-2">No matches found</h3>
                  <p className="text-blue-200 mb-4">Try adjusting your filters or search terms.</p>
                  <button
                    onClick={() => { setSearchText(''); setFilterStatus('all'); setFilterFocus('all'); }}
                    className="text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
            <div className="divide-y divide-white/10">
              {paginatedHistory.map((query) => {
                const btnProps = getDownloadButtonProps(query);
                const isDeleting = deleting === query.id;
                const isConfirming = deleteConfirm === query.id;
                return (
                  <div key={query.id} className="p-6 group">
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
                            {query.downloaded ? `Downloaded (${query.download_count || 1}/10)` : 'Ready to Download'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-blue-200">
                          <span>🎯 {query.intensity} search</span>
                          <span>📊 {query.results?.length || 0} leads found</span>
                          <span>📅 {new Date(query.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold text-blue-300">
                          {query.downloaded ? 'Free re-download' : '1 credit'}
                        </span>
                        <button
                          onClick={() => handleDownload(query)}
                          disabled={btnProps.disabled}
                          className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${btnProps.className}`}
                        >
                          {btnProps.label}
                        </button>
                        <button
                          onClick={() => handleDelete(query)}
                          disabled={isDeleting}
                          className={`px-3 py-2 rounded-xl font-medium transition-all duration-200 ${
                            isDeleting
                              ? 'bg-gray-500/20 text-gray-400 cursor-wait'
                              : isConfirming
                              ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                              : 'bg-white/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/30'
                          }`}
                          title={isConfirming ? 'Click again to confirm' : 'Delete search'}
                        >
                          {isDeleting ? '...' : isConfirming ? 'Confirm?' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more / pagination info */}
            {pageSize > 0 && filteredHistory.length > pageSize && (
              <div className="px-6 py-4 border-t border-white/10 text-center">
                <button
                  onClick={() => setPageSize(prev => prev + 5)}
                  className="text-blue-400 hover:text-blue-300 font-medium mr-4"
                >
                  Show 5 more
                </button>
                <button
                  onClick={() => setPageSize(0)}
                  className="text-blue-400/60 hover:text-blue-300 font-medium"
                >
                  Show all ({filteredHistory.length})
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      <Footer />

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />
    </div>
  );
};

export default UserDashboard;