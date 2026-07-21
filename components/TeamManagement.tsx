import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Plus,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  fetchAllUsers,
  createUser,
  updateUser,
  deleteUser,
  AuthUser,
} from '../services/authService';
import { ApiError } from '../services/apiClient';

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT';
  isActive: boolean;
};

const emptyForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: 'AGENT',
  isActive: true,
};

export const TeamManagement: React.FC = () => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('You do not have permission to manage users. This area is available to administrators only.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (user: AuthUser) => {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    setEditingId(user.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      if (editingId) {
        const payload: Partial<UserFormData> = {
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        const updated = await updateUser(editingId, payload);
        setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
        setSuccess('User updated successfully.');
      } else {
        if (!form.password) throw new Error('Password is required for new users.');
        const created = await createUser({
          email: form.email,
          name: form.name,
          password: form.password,
          role: form.role,
          isActive: form.isActive,
        });
        setUsers(prev => [...prev, created]);
        setSuccess('User created successfully.');
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Permission denied. Only administrators can modify users.');
      } else {
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Operation failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setDeleting(id);
    setError(null);
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setSuccess('User deleted successfully.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Permission denied. Only administrators can delete users.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to delete user');
      }
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (user: AuthUser) => {
    setError(null);
    try {
      const updated = await updateUser(user.id, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Permission denied. Only administrators can change user status.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to update user status');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest">Loading team…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            Team Members
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Create and manage user accounts for your agents and managers.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/40">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50 text-xs">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No users found. Create the first team member to get started.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-200">{user.name}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          user.role === 'ADMIN'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : user.role === 'MANAGER'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-slate-800/50 text-slate-400 border-slate-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(user)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors ${
                          user.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {user.isActive ? (
                          <><CheckCircle2 className="w-3 h-3" /> Active</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="text-slate-400 hover:text-sky-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
                          title="Edit user"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id)}
                          disabled={deleting === user.id}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                          title="Delete user"
                        >
                          {deleting === user.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                {editingId ? 'Edit User' : 'Create User'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Full Name
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Work Email
                </label>
                <input
                  type="email"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="agent@unitelglobal.com"
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              )}

              {editingId && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    minLength={8}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Role
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  value={form.role}
                  onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'MANAGER' | 'AGENT' }))}
                >
                  <option value="AGENT">Agent</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
