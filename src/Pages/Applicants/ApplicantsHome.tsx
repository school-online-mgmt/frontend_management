import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCcw, Search, X, Filter, Users, UserCheck,
  UserX, Clock, ChevronRight, Phone, Mail, Calendar,
  AlertCircle, CheckCircle2, XCircle, ClipboardList, Loader2,
} from 'lucide-react';
import api from '../../api/api';
import type { Applicant } from '../../api/types';
import PageHeader from '../../components/PageHeader';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  APPLIED:   { label: 'Applied',   dot: 'bg-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200'    },
  ACCEPTED:  { label: 'Accepted',  dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
  REJECTED:  { label: 'Rejected',  dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200'    },
  CANCELLED: { label: 'Cancelled', dot: 'bg-slate-400',   bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200'  },
  ABANDONED: { label: 'Abandoned', dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200'  },
};
const STATUS_OPTIONS  = Object.keys(STATUS_CONFIG);
const GENDER_OPTIONS  = ['Male', 'Female', 'Other'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'from-indigo-400 to-indigo-600', 'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600', 'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',   'from-sky-400 to-sky-600',
];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  type: 'accept' | 'reject';
  applicant: Applicant;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}
const ConfirmModal: React.FC<ConfirmModalProps> = ({ type, applicant, onConfirm, onCancel, loading }) => {
  const isAccept = type === 'accept';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${isAccept ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {isAccept
            ? <CheckCircle2 size={24} className="text-emerald-600" />
            : <XCircle size={24} className="text-red-600" />}
        </div>
        <h3 className="text-center text-lg font-bold text-slate-900 mb-1">
          {isAccept ? 'Accept Application?' : 'Reject Application?'}
        </h3>
        <p className="text-center text-sm text-slate-500 mb-6">
          {isAccept
            ? <><span className="font-semibold text-slate-700">{applicant.firstName} {applicant.lastName}</span> will be moved to the Students list for admission processing.</>
            : <>You are rejecting the application of <span className="font-semibold text-slate-700">{applicant.firstName} {applicant.lastName}</span>. This action cannot be undone.</>}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${
              isAccept ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}>
            {loading && <RefreshCcw size={13} className="animate-spin" />}
            {isAccept ? 'Yes, Accept' : 'Yes, Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ApplicantsHome: React.FC = () => {
  const [applicants, setApplicants]     = useState<Applicant[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [confirm, setConfirm]           = useState<{ type: 'accept' | 'reject'; applicant: Applicant } | null>(null);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const navigate = useNavigate();

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getApplicants();
      setApplicants(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load applicants.', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  const handleAccept = async (applicant: Applicant) => {
    setActionLoading(true);
    try {
      await api.acceptApplication(applicant.id);
      showToast(`${applicant.firstName} ${applicant.lastName} accepted successfully.`, true);
      await fetchApplicants();
    } catch {
      showToast('Failed to accept application.', false);
    } finally { setActionLoading(false); setConfirm(null); }
  };

  const handleReject = async (applicant: Applicant) => {
    setActionLoading(true);
    try {
      await api.rejectApplication(applicant.id);
      showToast(`${applicant.firstName} ${applicant.lastName}'s application rejected.`, true);
      await fetchApplicants();
    } catch {
      showToast('Failed to reject application.', false);
    } finally { setActionLoading(false); setConfirm(null); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicants.filter(a => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (genderFilter && a.gender.toLowerCase() !== genderFilter.toLowerCase()) return false;
      if (q) {
        const hay = `${a.firstName} ${a.middleName ?? ''} ${a.lastName} ${a.phone} ${a.email} ${a.fatherName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applicants, search, statusFilter, genderFilter]);

  const stats = useMemo(() => ({
    total:    applicants.length,
    applied:  applicants.filter(a => a.status === 'APPLIED').length,
    accepted: applicants.filter(a => a.status === 'ACCEPTED').length,
    rejected: applicants.filter(a => a.status === 'REJECTED').length,
  }), [applicants]);

  const activeFilterCount = [statusFilter, genderFilter].filter(Boolean).length;
  const clearFilters = () => { setStatusFilter(''); setGenderFilter(''); setSearch(''); };

  if (loading && applicants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm text-slate-500">Loading applicants…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          type={confirm.type}
          applicant={confirm.applicant}
          loading={actionLoading}
          onConfirm={() => confirm.type === 'accept' ? handleAccept(confirm.applicant) : handleReject(confirm.applicant)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        icon={ClipboardList}
        title="Applicant Management"
        subtitle="Review, accept or reject student applications"
        actions={
          <button onClick={fetchApplicants} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-bold rounded-xl hover:bg-white/20 active:scale-95 disabled:opacity-50 transition-all backdrop-blur-sm">
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { label: 'Total Applicants', value: stats.total,    icon: ClipboardList, color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Pending Review',   value: stats.applied,  icon: Clock,         color: 'text-sky-600',     bg: 'bg-sky-50'     },
            { label: 'Accepted',         value: stats.accepted, icon: UserCheck,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Rejected',         value: stats.rejected, icon: UserX,         color: 'text-red-500',     bg: 'bg-red-50'     },
          ] as const).map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, email or father's name…"
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 placeholder-slate-400" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0 ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
            {(search || activeFilterCount > 0) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">
                <X size={13} /> Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setStatusFilter('')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!statusFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    All
                  </button>
                  {STATUS_OPTIONS.map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const active = statusFilter === s;
                    return (
                      <button key={s} onClick={() => setStatusFilter(active ? '' : s)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${active ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg.dot : 'bg-slate-300'}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setGenderFilter('')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!genderFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    All
                  </button>
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => setGenderFilter(genderFilter === g ? '' : g)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${genderFilter === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-800">{applicants.length}</span> applicants
        </p>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCcw size={24} className="animate-spin text-indigo-400" />
              <p className="text-sm text-slate-500">Loading applicants…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Users size={24} className="text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-700">No applicants found</p>
              <p className="text-sm text-slate-400">
                {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : 'No applications submitted yet.'}
              </p>
              {(search || activeFilterCount > 0) && (
                <button onClick={clearFilters} className="mt-1 text-sm text-indigo-600 hover:underline font-medium">Clear filters</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Family</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Applied On</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(applicant => {
                    const cfg = STATUS_CONFIG[applicant.status] ?? STATUS_CONFIG['APPLIED'];
                    const color = avatarColor(applicant.firstName);
                    const isPending = applicant.status === 'APPLIED';
                    return (
                      <tr key={applicant.id} onClick={() => navigate(`/applicant/${applicant.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group">

                        {/* Applicant */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {getInitials(applicant.firstName, applicant.lastName)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                {applicant.firstName}{applicant.middleName ? ` ${applicant.middleName}` : ''} {applicant.lastName}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 capitalize">{applicant.gender}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone size={11} className="text-slate-400 shrink-0" />{applicant.phone}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                            <Mail size={11} className="text-slate-400 shrink-0" />{applicant.email}
                          </p>
                        </td>

                        {/* Family */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <p className="text-xs text-slate-600">{applicant.fatherName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{applicant.motherName}</p>
                        </td>

                        {/* Applied On */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={11} className="text-slate-400" />
                            {formatDate(applicant.createdAt)}
                          </div>
                          {applicant.disability && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                              ♿ Disability noted
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={e => { e.stopPropagation(); setConfirm({ type: 'accept', applicant }); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                                  <UserCheck size={12} /> Accept
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setConfirm({ type: 'reject', applicant }); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                                  <UserX size={12} /> Reject
                                </button>
                              </>
                            )}
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicantsHome;
