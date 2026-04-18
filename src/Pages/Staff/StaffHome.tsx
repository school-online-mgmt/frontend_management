import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Loader2, AlertTriangle, CheckCircle2, RefreshCcw,
  KeyRound, Eye, EyeOff, X, Phone, Mail, UserCog, Shield,
  Clock, Search, GraduationCap, BookOpen,
} from 'lucide-react';
import api from '../../api/api';
import PageHeader from '../../components/PageHeader';

interface ManagementUser {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  email: string;
  role: string | null;
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  gender: string;
  age: number;
  qualification: string;
  phone: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

/* ── Reset Password Dialog ──────────────────────────────────────────────── */
const ResetPasswordDialog: React.FC<{
  isOpen: boolean; userName: string;
  onConfirm: (password: string) => Promise<void>; onCancel: () => void;
}> = ({ isOpen, userName, onConfirm, onCancel }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setIsSubmitting(true); setError(null);
    try { await onConfirm(password); setPassword(''); }
    catch (err: any) { setError(err?.response?.data?.message || 'Failed to reset password.'); }
    finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <KeyRound size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
              <p className="text-xs text-slate-500 font-medium">For {userName}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">User will use this password on next login.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting || password.length < 8} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Role Badge ─────────────────────────────────────────────────────────── */
const RoleBadge: React.FC<{ role: string | null }> = ({ role }) => {
  const config: Record<string, { label: string; color: string }> = {
    PRINCIPAL: { label: 'Principal', color: 'bg-purple-100 text-purple-700' },
    DIRECTOR: { label: 'Director', color: 'bg-indigo-100 text-indigo-700' },
    ADMIN: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
    TEACHER: { label: 'Teacher', color: 'bg-emerald-100 text-emerald-700' },
    ACCOUNTANT: { label: 'Accountant', color: 'bg-amber-100 text-amber-700' },
    MANAGEMENT_STAFF: { label: 'Management Staff', color: 'bg-cyan-100 text-cyan-700' },
  };
  const r = role ? config[role.toUpperCase()] : null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${r?.color ?? 'bg-slate-100 text-slate-600'}`}>
      <Shield size={10} />
      {r?.label ?? role ?? 'Staff'}
    </span>
  );
};

/* ── Main Component ─────────────────────────────────────────────────────── */
type TabKey = 'admin' | 'teachers';

const StaffHome: React.FC = () => {
  const [users, setUsers] = useState<ManagementUser[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('admin');
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; type: 'admin' | 'teacher' } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, teachersData] = await Promise.all([
        api.getManagementUsers(),
        api.getTeachers(),
      ]);
      setUsers(usersData ?? []);
      const tList = Array.isArray(teachersData) ? teachersData : (teachersData?.teachers ?? []);
      setTeachers(tList);
    } catch {
      showToast('Failed to load staff data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleResetPassword = async (password: string) => {
    if (!resetTarget) return;
    if (resetTarget.type === 'admin') {
      await api.resetManagementUserPassword(resetTarget.id, password);
    } else {
      await api.resetTeacherPassword(resetTarget.id, password);
    }
    showToast(`Password reset successfully for ${resetTarget.name}.`, 'success');
    setResetTarget(null);
  };

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${u.firstName} ${u.middleName ?? ''} ${u.lastName}`.toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q) || (u.role ?? '').toLowerCase().includes(q);
  });

  const filteredTeachers = teachers.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.email ?? '').toLowerCase().includes(q) || t.phone.includes(q) || t.qualification.toLowerCase().includes(q);
  });

  const tabs: { key: TabKey; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'admin', label: 'Admin Accounts', icon: UserCog, count: users.length },
    { key: 'teachers', label: 'Teachers', icon: GraduationCap, count: teachers.length },
  ];

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      <ResetPasswordDialog
        isOpen={!!resetTarget}
        userName={resetTarget?.name ?? ''}
        onConfirm={handleResetPassword}
        onCancel={() => setResetTarget(null)}
      />

      <PageHeader
        icon={UserCog}
        title="Staff Management"
        subtitle="View and manage all school staff accounts"
        gradient="from-indigo-600 via-violet-600 to-purple-600"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
              <Users size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{users.length + teachers.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total Staff</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
              <UserCog size={18} className="text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{users.length}</p>
              <p className="text-xs text-slate-500 font-medium">Admin Accounts</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
              <GraduationCap size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{teachers.length}</p>
              <p className="text-xs text-slate-500 font-medium">Teachers</p>
            </div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
            />
          </div>
          <button onClick={fetchAll} disabled={loading} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-50 shrink-0">
            <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-20 text-center">
              <Loader2 size={32} className="animate-spin mx-auto text-indigo-400/30 mb-3" />
              <p className="text-slate-400 text-sm font-medium">Loading staff members...</p>
            </div>
          ) : activeTab === 'admin' ? (
            filteredUsers.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200"><Users size={28} /></div>
                <p className="text-slate-500 font-bold">{search ? 'No matching admin accounts found' : 'No admin accounts found'}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Staff Member</th>
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Role</th>
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                    <th className="px-5 py-3.5 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(user => {
                    const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
                    const initials = [user.firstName[0], user.lastName[0]].join('').toUpperCase();
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{fullName}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.id.split('-')[0].toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone size={11} className="text-slate-400" /> {user.phone}</div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600"><Mail size={11} className="text-slate-400" /> {user.email}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell"><RoleBadge role={user.role} /></td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock size={11} className="text-slate-400" />
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setResetTarget({ id: user.id, name: fullName, type: 'admin' })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 hover:border-amber-200 transition-all"
                          >
                            <KeyRound size={13} /> Reset Password
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            filteredTeachers.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200"><GraduationCap size={28} /></div>
                <p className="text-slate-500 font-bold">{search ? 'No matching teachers found' : 'No teachers found'}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Teacher</th>
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Qualification</th>
                    <th className="px-5 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTeachers.map(teacher => {
                    const initials = teacher.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{teacher.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{teacher.gender} · Age {teacher.age}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="space-y-1">
                            {teacher.phone && <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone size={11} className="text-slate-400" /> {teacher.phone}</div>}
                            {teacher.email && <div className="flex items-center gap-1.5 text-xs text-slate-600"><Mail size={11} className="text-slate-400" /> {teacher.email}</div>}
                            {!teacher.phone && !teacher.email && <span className="text-xs text-slate-400">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <BookOpen size={11} className="text-slate-400" /> {teacher.qualification}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${teacher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {teacher.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setResetTarget({ id: teacher.id, name: teacher.name, type: 'teacher' })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 hover:border-amber-200 transition-all"
                          >
                            <KeyRound size={13} /> Reset Password
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center font-medium">
          {activeTab === 'admin' ? `${filteredUsers.length} of ${users.length} admin account${users.length !== 1 ? 's' : ''}` : `${filteredTeachers.length} of ${teachers.length} teacher${teachers.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};

export default StaffHome;

