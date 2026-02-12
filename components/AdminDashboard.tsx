import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

interface AdminStats {
  total_users: number;
  total_revenue: number;
  total_queries: number;
  total_downloads: number;
  active_users: number;
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

const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topLocations, setTopLocations] = useState<LocationData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

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
      const totalCreditsPurchased = (paymentsData || []).reduce((sum, p) => sum + Number(p.credits_added || 0), 0);
      console.log('Admin stats - payments:', paymentsData?.length, 'total revenue:', totalRevenue, 'credits purchased:', totalCreditsPurchased);

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

      setStats({
        total_users: totalUsers || 0,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_queries: totalQueries || 0,
        total_downloads: totalDownloads || 0,
        active_users: activeUsers,
      });

      // Revenue by date (last 30 days)
      const revenueByDate: Record<string, number> = {};
      (paymentsData || []).forEach(p => {
        const date = new Date(p.created_at).toISOString().split('T')[0];
        revenueByDate[date] = (revenueByDate[date] || 0) + Number(p.amount || 0);
      });
      const revenueArr = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setRevenueData(revenueArr);

      // Top locations
      const { data: locData, error: locError } = await supabase
        .from('query_history')
        .select('location');
      if (locError) console.error('Admin stats - locations error:', locError);
      
      const locationCounts: Record<string, number> = {};
      (locData || []).forEach(r => {
        if (r.location) {
          locationCounts[r.location] = (locationCounts[r.location] || 0) + 1;
        }
      });
      const topLoc = Object.entries(locationCounts)
        .map(([location, query_count]) => ({ location, query_count }))
        .sort((a, b) => b.query_count - a.query_count)
        .slice(0, 10);
      setTopLocations(topLoc);

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

  const exportData = async (type: 'users' | 'payments' | 'queries') => {
    try {
      let data;
      let filename;

      switch (type) {
        case 'users':
          const { data: usersData } = await supabase.from('user_profiles').select('*');
          data = usersData;
          filename = 'users_export.csv';
          break;
        case 'payments':
          const { data: paymentsData } = await supabase.from('payments').select('*');
          data = paymentsData;
          filename = 'payments_export.csv';
          break;
        case 'queries':
          const { data: queriesData } = await supabase.from('query_history').select('*');
          data = queriesData;
          filename = 'queries_export.csv';
          break;
      }

      if (!data) return;

      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
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
        <div className="container mx-auto px-6 py-4">
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
              <div className="flex items-center space-x-2 bg-orange-500/20 border border-orange-400/30 px-3 py-1 rounded-xl">
                <span className="text-orange-300 text-sm">👑</span>
                <span className="text-orange-300 font-medium">{user?.email}</span>
              </div>
              <button
                onClick={signOut}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats?.total_users || 0}</p>
                <p className="text-gray-600">Total Users</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">€{stats?.total_revenue || 0}</p>
                <p className="text-gray-600">Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-xl">🔍</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats?.total_queries || 0}</p>
                <p className="text-gray-600">Searches</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-xl">📥</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats?.total_downloads || 0}</p>
                <p className="text-gray-600">Downloads</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats?.active_users || 0}</p>
                <p className="text-gray-600">Active Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Revenue (Last 30 Days)</h2>
              <button
                onClick={() => exportData('payments')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
              >
                Export
              </button>
            </div>
            <div className="space-y-2">
              {revenueData.slice(0, 10).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-600">{new Date(item.date).toLocaleDateString()}</span>
                  <span className="font-semibold text-green-600">€{item.revenue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Locations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Search Locations</h2>
            <div className="space-y-2">
              {topLocations.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-600">{item.location}</span>
                  <span className="font-semibold text-blue-600">{item.query_count} searches</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Export</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => exportData('users')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Export Users
            </button>
            <button
              onClick={() => exportData('payments')}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Export Payments
            </button>
            <button
              onClick={() => exportData('queries')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Export Searches
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Registered Users</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.slice(0, 20).map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.full_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.credits}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length > 20 && (
            <div className="px-6 py-4 bg-gray-50 text-center">
              <p className="text-gray-600">Showing 20 of {users.length} users</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;