import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

interface AdminStats {
  total_users: number;
  total_revenue: number;
  total_queries: number;
  total_downloads: number;
  active_users: number;
  total_visits: number;
  unique_visitors: number;
}

interface RevenueData {
  date: string;
  revenue: number;
}

interface LocationData {
  location: string;
  query_count: number;
}

interface UserData {
  id: string;
  email: string;
  full_name: string;
  credits: number;
  created_at: string;
}

interface VisitorData {
  referrer: string;
  count: number;
}

interface TrafficByDate {
  date: string;
  visits: number;
  unique_sessions: number;
}

interface DeviceData {
  device_type: string;
  count: number;
}

interface BrowserData {
  browser: string;
  count: number;
}

interface PageData {
  page_url: string;
  views: number;
  avg_duration: number;
}

type TabType = 'overview' | 'visitors' | 'users' | 'export';

const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topLocations, setTopLocations] = useState<LocationData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Visitor analytics state
  const [topReferrers, setTopReferrers] = useState<VisitorData[]>([]);
  const [trafficByDate, setTrafficByDate] = useState<TrafficByDate[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceData[]>([]);
  const [browserStats, setBrowserStats] = useState<BrowserData[]>([]);
  const [topPages, setTopPages] = useState<PageData[]>([]);
  const [avgSessionDuration, setAvgSessionDuration] = useState(0);

  useEffect(() => {
    if (user) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Direct queries instead of RPC functions (more reliable)
      
      // 1. Total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      if (usersError) console.error('Admin stats - users error:', usersError);

      // 2. Total revenue from payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, credits_added, created_at, status')
        .eq('status', 'completed');
      if (paymentsError) console.error('Admin stats - payments error:', paymentsError);
      
      const totalRevenue = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // 3. Total queries
      const { count: totalQueries, error: queriesError } = await supabase
        .from('query_history')
        .select('*', { count: 'exact', head: true });
      if (queriesError) console.error('Admin stats - queries error:', queriesError);

      // 4. Total downloads
      const { count: totalDownloads, error: downloadsError } = await supabase
        .from('query_history')
        .select('*', { count: 'exact', head: true })
        .eq('downloaded', true);
      if (downloadsError) console.error('Admin stats - downloads error:', downloadsError);

      // 5. Active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: activeData, error: activeError } = await supabase
        .from('query_history')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());
      if (activeError) console.error('Admin stats - active users error:', activeError);
      const activeUsers = new Set((activeData || []).map(r => r.user_id)).size;

      // 6. Page visits stats
      const { data: visitsData, error: visitsError } = await supabase
        .from('page_visits')
        .select('*')
        .order('created_at', { ascending: false });
      if (visitsError) console.error('Admin stats - visits error:', visitsError);

      const allVisits = visitsData || [];
      const totalVisits = allVisits.length;
      const uniqueVisitors = new Set(allVisits.map(v => v.session_id)).size;

      setStats({
        total_users: totalUsers || 0,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_queries: totalQueries || 0,
        total_downloads: totalDownloads || 0,
        active_users: activeUsers,
        total_visits: totalVisits,
        unique_visitors: uniqueVisitors,
      });

      // Revenue by date
      const revenueByDate: Record<string, number> = {};
      (paymentsData || []).forEach(p => {
        const date = new Date(p.created_at).toISOString().split('T')[0];
        revenueByDate[date] = (revenueByDate[date] || 0) + Number(p.amount || 0);
      });
      setRevenueData(
        Object.entries(revenueByDate)
          .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
          .sort((a, b) => b.date.localeCompare(a.date))
      );

      // Top search locations
      const { data: locData } = await supabase.from('query_history').select('location');
      const locationCounts: Record<string, number> = {};
      (locData || []).forEach(r => {
        if (r.location) locationCounts[r.location] = (locationCounts[r.location] || 0) + 1;
      });
      setTopLocations(
        Object.entries(locationCounts)
          .map(([location, query_count]) => ({ location, query_count }))
          .sort((a, b) => b.query_count - a.query_count)
          .slice(0, 10)
      );

      // ---- Visitor Analytics ----

      // Top referrers
      const refCounts: Record<string, number> = {};
      allVisits.forEach(v => {
        const ref = v.referrer ? new URL(v.referrer).hostname || v.referrer : 'Direct';
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      });
      setTopReferrers(
        Object.entries(refCounts)
          .map(([referrer, count]) => ({ referrer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // Traffic by date (last 30 days)
      const trafficMap: Record<string, { visits: number; sessions: Set<string> }> = {};
      allVisits
        .filter(v => new Date(v.created_at) >= thirtyDaysAgo)
        .forEach(v => {
          const date = new Date(v.created_at).toISOString().split('T')[0];
          if (!trafficMap[date]) trafficMap[date] = { visits: 0, sessions: new Set() };
          trafficMap[date].visits++;
          trafficMap[date].sessions.add(v.session_id);
        });
      setTrafficByDate(
        Object.entries(trafficMap)
          .map(([date, d]) => ({ date, visits: d.visits, unique_sessions: d.sessions.size }))
          .sort((a, b) => b.date.localeCompare(a.date))
      );

      // Device stats
      const devCounts: Record<string, number> = {};
      allVisits.forEach(v => {
        const dev = v.device_type || 'unknown';
        devCounts[dev] = (devCounts[dev] || 0) + 1;
      });
      setDeviceStats(
        Object.entries(devCounts)
          .map(([device_type, count]) => ({ device_type, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Browser stats
      const brCounts: Record<string, number> = {};
      allVisits.forEach(v => {
        const br = v.browser || 'unknown';
        brCounts[br] = (brCounts[br] || 0) + 1;
      });
      setBrowserStats(
        Object.entries(brCounts)
          .map(([browser, count]) => ({ browser, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Top pages + avg duration
      const pageMap: Record<string, { views: number; totalDuration: number }> = {};
      let totalDuration = 0;
      let durationCount = 0;
      allVisits.forEach(v => {
        const page = v.page_url || '/';
        if (!pageMap[page]) pageMap[page] = { views: 0, totalDuration: 0 };
        pageMap[page].views++;
        pageMap[page].totalDuration += v.duration_seconds || 0;
        if (v.duration_seconds > 0) {
          totalDuration += v.duration_seconds;
          durationCount++;
        }
      });
      setTopPages(
        Object.entries(pageMap)
          .map(([page_url, d]) => ({
            page_url,
            views: d.views,
            avg_duration: d.views > 0 ? Math.round(d.totalDuration / d.views) : 0,
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10)
      );
      setAvgSessionDuration(durationCount > 0 ? Math.round(totalDuration / durationCount) : 0);

      // Load all users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(usersData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: 'users' | 'payments' | 'queries' | 'visits' | 'full_stats') => {
    try {
      let data: Record<string, any>[] | null = null;
      let filename = '';

      switch (type) {
        case 'users': {
          const { data: d } = await supabase.from('user_profiles').select('*');
          data = d;
          filename = 'users_export.csv';
          break;
        }
        case 'payments': {
          const { data: d } = await supabase.from('payments').select('*');
          data = d;
          filename = 'payments_export.csv';
          break;
        }
        case 'queries': {
          const { data: d } = await supabase.from('query_history').select('id, user_id, query, location, focus, intensity, cost, downloaded, created_at');
          data = d;
          filename = 'searches_export.csv';
          break;
        }
        case 'visits': {
          const { data: d } = await supabase.from('page_visits').select('*').order('created_at', { ascending: false });
          data = d;
          filename = 'page_visits_export.csv';
          break;
        }
        case 'full_stats': {
          // Create a combined stats export
          data = [
            { metric: 'Total Users', value: stats?.total_users || 0 },
            { metric: 'Total Revenue (EUR)', value: stats?.total_revenue || 0 },
            { metric: 'Total Searches', value: stats?.total_queries || 0 },
            { metric: 'Total Downloads', value: stats?.total_downloads || 0 },
            { metric: 'Active Users (30d)', value: stats?.active_users || 0 },
            { metric: 'Total Page Visits', value: stats?.total_visits || 0 },
            { metric: 'Unique Visitors', value: stats?.unique_visitors || 0 },
            { metric: 'Avg Session Duration (sec)', value: avgSessionDuration },
            { metric: '---', value: '---' },
            { metric: 'Revenue by Date', value: '' },
            ...revenueData.map(r => ({ metric: r.date, value: `€${r.revenue}` })),
            { metric: '---', value: '---' },
            { metric: 'Top Search Locations', value: '' },
            ...topLocations.map(l => ({ metric: l.location, value: `${l.query_count} searches` })),
            { metric: '---', value: '---' },
            { metric: 'Top Referrers', value: '' },
            ...topReferrers.map(r => ({ metric: r.referrer, value: r.count })),
            { metric: '---', value: '---' },
            { metric: 'Devices', value: '' },
            ...deviceStats.map(d => ({ metric: d.device_type, value: d.count })),
            { metric: '---', value: '---' },
            { metric: 'Browsers', value: '' },
            ...browserStats.map(b => ({ metric: b.browser, value: b.count })),
          ];
          filename = 'full_stats_report.csv';
          break;
        }
      }

      if (!data || data.length === 0) {
        alert('No data to export.');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'visitors', label: 'Visitors', icon: '👁️' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'export', label: 'Export', icon: '📥' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
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
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-blue-200 text-xs">LeadScout Pro AI Analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-orange-500/20 border border-orange-400/30 px-3 py-1 rounded-xl">
                <span className="text-orange-300 text-sm">👑</span>
                <span className="text-orange-300 font-medium text-sm">{user?.email}</span>
              </div>
              <button
                onClick={() => loadAdminData()}
                className="bg-white/10 text-white px-3 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 text-sm"
                title="Refresh data"
              >
                🔄
              </button>
              <button
                onClick={signOut}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 sm:px-6 pt-6">
        <div className="flex space-x-1 bg-white/10 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6">

        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              {[
                { label: 'Users', value: stats?.total_users || 0, icon: '👥', color: 'blue' },
                { label: 'Revenue', value: `€${stats?.total_revenue || 0}`, icon: '💰', color: 'green' },
                { label: 'Searches', value: stats?.total_queries || 0, icon: '🔍', color: 'purple' },
                { label: 'Downloads', value: stats?.total_downloads || 0, icon: '📥', color: 'orange' },
                { label: 'Active (30d)', value: stats?.active_users || 0, icon: '⚡', color: 'yellow' },
                { label: 'Page Views', value: stats?.total_visits || 0, icon: '👁️', color: 'cyan' },
                { label: 'Visitors', value: stats?.unique_visitors || 0, icon: '🌐', color: 'pink' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-white/60 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Revenue Chart */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">💰 Revenue (Last 30 Days)</h2>
                  <button onClick={() => exportData('payments')} className="text-green-400 hover:text-green-300 text-sm">
                    Export CSV
                  </button>
                </div>
                {revenueData.length === 0 ? (
                  <p className="text-white/40 text-sm">No revenue data yet</p>
                ) : (
                  <div className="space-y-2">
                    {revenueData.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">{new Date(item.date).toLocaleDateString()}</span>
                        <span className="font-semibold text-green-400">€{item.revenue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Search Locations */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">📍 Top Search Locations</h2>
                {topLocations.length === 0 ? (
                  <p className="text-white/40 text-sm">No search data yet</p>
                ) : (
                  <div className="space-y-2">
                    {topLocations.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">{item.location}</span>
                        <span className="font-semibold text-blue-400">{item.query_count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============ VISITORS TAB ============ */}
        {activeTab === 'visitors' && (
          <>
            {/* Visitor Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-1">👁️</div>
                <p className="text-3xl font-bold text-white">{stats?.total_visits || 0}</p>
                <p className="text-white/60 text-sm">Total Page Views</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-1">🌐</div>
                <p className="text-3xl font-bold text-white">{stats?.unique_visitors || 0}</p>
                <p className="text-white/60 text-sm">Unique Sessions</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-1">⏱️</div>
                <p className="text-3xl font-bold text-white">{formatDuration(avgSessionDuration)}</p>
                <p className="text-white/60 text-sm">Avg Duration</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-1">📱</div>
                <p className="text-3xl font-bold text-white">{deviceStats.find(d => d.device_type === 'mobile')?.count || 0}</p>
                <p className="text-white/60 text-sm">Mobile Visits</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Traffic by Date */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">📈 Daily Traffic (30 Days)</h2>
                  <button onClick={() => exportData('visits')} className="text-cyan-400 hover:text-cyan-300 text-sm">
                    Export CSV
                  </button>
                </div>
                {trafficByDate.length === 0 ? (
                  <p className="text-white/40 text-sm">No traffic data yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {trafficByDate.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">{new Date(item.date).toLocaleDateString()}</span>
                        <div className="text-right">
                          <span className="font-semibold text-cyan-400">{item.visits} views</span>
                          <span className="text-white/40 text-xs ml-2">({item.unique_sessions} sessions)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Referrers */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">🔗 Traffic Sources</h2>
                {topReferrers.length === 0 ? (
                  <p className="text-white/40 text-sm">No referrer data yet</p>
                ) : (
                  <div className="space-y-2">
                    {topReferrers.map((item, i) => {
                      const total = topReferrers.reduce((s, r) => s + r.count, 0);
                      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white/70 text-sm truncate max-w-[200px]">{item.referrer}</span>
                            <span className="text-white/90 text-sm font-medium">{item.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5">
                            <div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Top Pages */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">📄 Top Pages</h2>
                {topPages.length === 0 ? (
                  <p className="text-white/40 text-sm">No page data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topPages.map((page, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-white/70 text-sm truncate max-w-[150px]">{page.page_url}</span>
                        <div className="text-right">
                          <span className="text-white/90 text-sm font-medium">{page.views}</span>
                          <span className="text-white/40 text-xs ml-1">({formatDuration(page.avg_duration)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Devices */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">💻 Devices</h2>
                {deviceStats.length === 0 ? (
                  <p className="text-white/40 text-sm">No device data yet</p>
                ) : (
                  <div className="space-y-3">
                    {deviceStats.map((dev, i) => {
                      const total = deviceStats.reduce((s, d) => s + d.count, 0);
                      const pct = total > 0 ? Math.round((dev.count / total) * 100) : 0;
                      const icon = dev.device_type === 'desktop' ? '🖥️' : dev.device_type === 'mobile' ? '📱' : '📱';
                      return (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-white/70 text-sm">{icon} {dev.device_type}</span>
                          <span className="text-white/90 text-sm font-medium">{dev.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Browsers */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">🌍 Browsers</h2>
                {browserStats.length === 0 ? (
                  <p className="text-white/40 text-sm">No browser data yet</p>
                ) : (
                  <div className="space-y-3">
                    {browserStats.map((br, i) => {
                      const total = browserStats.reduce((s, b) => s + b.count, 0);
                      const pct = total > 0 ? Math.round((br.count / total) * 100) : 0;
                      return (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-white/70 text-sm">{br.browser}</span>
                          <span className="text-white/90 text-sm font-medium">{br.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============ USERS TAB ============ */}
        {activeTab === 'users' && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Registered Users ({users.length})</h2>
              <button
                onClick={() => exportData('users')}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition"
              >
                Export Users CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.slice(0, 50).map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-3 text-sm text-white/90">{u.email}</td>
                      <td className="px-6 py-3 text-sm text-white/70">{u.full_name || '-'}</td>
                      <td className="px-6 py-3 text-sm text-white/90 font-medium">{u.credits}</td>
                      <td className="px-6 py-3 text-sm text-white/60">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {users.length > 50 && (
              <div className="px-6 py-3 bg-white/5 text-center">
                <p className="text-white/40 text-sm">Showing 50 of {users.length} users</p>
              </div>
            )}
          </div>
        )}

        {/* ============ EXPORT TAB ============ */}
        {activeTab === 'export' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-8">
              <h2 className="text-xl font-semibold text-white mb-2">📥 Data Export</h2>
              <p className="text-white/50 text-sm mb-8">Download all your data as CSV files</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => exportData('full_stats')}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">📊</span>
                    <div className="text-left">
                      <p className="font-semibold">Full Stats Report</p>
                      <p className="text-white/70 text-xs">Revenue, locations, referrers, devices — everything</p>
                    </div>
                  </div>
                  <span className="text-sm">Download CSV →</span>
                </button>

                <button
                  onClick={() => exportData('users')}
                  className="w-full flex items-center justify-between bg-white/10 border border-white/10 text-white px-6 py-4 rounded-xl hover:bg-white/20 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">👥</span>
                    <div className="text-left">
                      <p className="font-semibold">Users</p>
                      <p className="text-white/50 text-xs">{stats?.total_users || 0} registered users</p>
                    </div>
                  </div>
                  <span className="text-white/50 text-sm">CSV →</span>
                </button>

                <button
                  onClick={() => exportData('payments')}
                  className="w-full flex items-center justify-between bg-white/10 border border-white/10 text-white px-6 py-4 rounded-xl hover:bg-white/20 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">💰</span>
                    <div className="text-left">
                      <p className="font-semibold">Payments</p>
                      <p className="text-white/50 text-xs">All transaction records</p>
                    </div>
                  </div>
                  <span className="text-white/50 text-sm">CSV →</span>
                </button>

                <button
                  onClick={() => exportData('queries')}
                  className="w-full flex items-center justify-between bg-white/10 border border-white/10 text-white px-6 py-4 rounded-xl hover:bg-white/20 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">🔍</span>
                    <div className="text-left">
                      <p className="font-semibold">Searches</p>
                      <p className="text-white/50 text-xs">{stats?.total_queries || 0} search queries</p>
                    </div>
                  </div>
                  <span className="text-white/50 text-sm">CSV →</span>
                </button>

                <button
                  onClick={() => exportData('visits')}
                  className="w-full flex items-center justify-between bg-white/10 border border-white/10 text-white px-6 py-4 rounded-xl hover:bg-white/20 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">👁️</span>
                    <div className="text-left">
                      <p className="font-semibold">Page Visits</p>
                      <p className="text-white/50 text-xs">{stats?.total_visits || 0} page views with referrers & devices</p>
                    </div>
                  </div>
                  <span className="text-white/50 text-sm">CSV →</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;