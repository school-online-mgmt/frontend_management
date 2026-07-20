import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCcw, Search, X, Filter, Users, UserCheck,
  UserX, Clock, ChevronRight, Phone, Mail, Calendar,
  AlertCircle, CheckCircle2, XCircle, ClipboardList, Loader2,
  TrendingUp, Accessibility, Hourglass, CheckCircle,
} from 'lucide-react';
import api from '../../api/api';
import type { Applicant } from '../../api/types';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { EmptySessionState } from '../../components/common/SessionGate';
import { useSession } from '../../context/SessionContext';
import ActionBar from '../../components/common/ActionBar';

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
          <button data-testid="applicants-cancel-btn" onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button data-testid={isAccept ? "applicant-confirm-accept-btn" : "applicant-confirm-reject-btn"}
            onClick={onConfirm} disabled={loading}
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
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  // Applicants are session-scoped — the chosen session id comes from the
  // global SessionContext rendered in the layout topbar.
  const { selectedSessionId, loading: sessionsLoading } = useSession();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters]   = useState(false);
  const [confirm, setConfirm]           = useState<{ type: 'accept' | 'reject'; applicant: Applicant } | null>(null);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const navigate = useNavigate();

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Applicants list — cached per session id. Switching sessions reads
  // the cached array when available; revisit feels instant.
  const applicantsQuery = useQuery({
    queryKey: ['applicants', 'list', selectedSessionId],
    queryFn: () => api.getApplicants(selectedSessionId),
    enabled: !!selectedSessionId,
  });
  useEffect(() => {
    if (applicantsQuery.error) showToast('Failed to load applicants.', false);
  }, [applicantsQuery.error]);
  const applicants: Applicant[] = useMemo(
    () => Array.isArray(applicantsQuery.data) ? applicantsQuery.data : [],
    [applicantsQuery.data]
  );
  const loading = applicantsQuery.isFetching;
  const fetchApplicants = () =>
    queryClient.invalidateQueries({ queryKey: ['applicants', 'list', selectedSessionId] });

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

  // Richer insights: counts, conversion funnel, recent activity, accessibility flags,
  // and "oldest pending" so management can see what to act on first.
  const stats = useMemo(() => {
    // Time-since calculations need a fresh `now` per render; the impurity is intentional.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const applied   = applicants.filter(a => a.status === 'APPLIED');
    const accepted  = applicants.filter(a => a.status === 'ACCEPTED');
    const rejected  = applicants.filter(a => a.status === 'REJECTED');
    const decided   = accepted.length + rejected.length;
    const total     = applicants.length;

    const newThisWeek = applicants.filter(a => now - new Date(a.createdAt).getTime() < SEVEN_DAYS).length;
    const newThisMonth = applicants.filter(a => now - new Date(a.createdAt).getTime() < THIRTY_DAYS).length;

    const acceptanceRate = decided > 0 ? Math.round((accepted.length / decided) * 100) : null;

    const oldestPending = applied
      .map(a => Math.floor((now - new Date(a.createdAt).getTime()) / (24 * 60 * 60 * 1000)))
      .reduce((max, d) => Math.max(max, d), 0);

    const genderBreakdown = applicants.reduce<Record<string, number>>((acc, a) => {
      const g = (a.gender || 'Other').trim() || 'Other';
      acc[g] = (acc[g] ?? 0) + 1;
      return acc;
    }, {});

    const disabilityCount = applicants.filter(a => a.disability).length;

    return {
      total,
      applied: applied.length,
      accepted: accepted.length,
      rejected: rejected.length,
      newThisWeek,
      newThisMonth,
      acceptanceRate,
      oldestPending,
      genderBreakdown,
      disabilityCount,
    };
  }, [applicants]);

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
        gradient={MODULE_THEMES.people}
        onRefresh={fetchApplicants}
        refreshing={loading}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-2.5">

        {/* Page-level summary stats. */}
        {selectedSessionId && applicants.length > 0 && (
          <ActionBar
            leading={
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  <CheckCircle size={11} /> {applicants.filter(a => a.status === 'ACCEPTED').length} accepted
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 font-bold">
                  <Clock size={11} /> {applicants.filter(a => a.status === 'APPLIED').length} pending
                </span>
              </div>
            }
          />
        )}

        {/* Empty state when no session is selected */}
        {!selectedSessionId && !sessionsLoading && (
          <EmptySessionState entityPlural="applicants" />
        )}

        {selectedSessionId && (<>

        {/* ── Primary stat strip (compact) ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total Applicants', value: stats.total,    sub: stats.newThisMonth ? `+${stats.newThisMonth} this month` : undefined, icon: ClipboardList, color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Pending Review',   value: stats.applied,  sub: stats.oldestPending > 0 ? `oldest ${stats.oldestPending}d` : undefined, icon: Clock,         color: 'text-sky-600',     bg: 'bg-sky-50'     },
            { label: 'Accepted',         value: stats.accepted, sub: stats.acceptanceRate !== null ? `${stats.acceptanceRate}% acceptance` : undefined, icon: UserCheck,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Rejected',         value: stats.rejected, sub: undefined, icon: UserX,         color: 'text-red-500',     bg: 'bg-red-50'     },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-lg border border-slate-100 shadow-sm p-2 flex items-center gap-2">
              <div className={`w-7 h-7 ${bg} rounded-md flex items-center justify-center shrink-0`}>
                <Icon size={13} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 leading-tight">{value}</p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
                {sub && <p className="text-[9px] text-slate-400 truncate">{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Secondary insights row ────────────────────────────────────────── */}
        {applicants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* This-week throughput */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-2 flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-50 rounded-md flex items-center justify-center shrink-0">
                <TrendingUp size={13} className="text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-tight">{stats.newThisWeek}</p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">New this week</p>
              </div>
              {stats.newThisWeek > 0 && stats.total > 0 && (
                <span className="text-[9px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                  {Math.round((stats.newThisWeek / stats.total) * 100)}%
                </span>
              )}
            </div>

            {/* Oldest pending */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-2 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${stats.oldestPending >= 7 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <Hourglass size={13} className={stats.oldestPending >= 7 ? 'text-amber-600' : 'text-slate-500'} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  {stats.applied === 0 ? '—' : `${stats.oldestPending}d`}
                </p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">Oldest pending</p>
              </div>
              {stats.oldestPending >= 7 && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  Action
                </span>
              )}
            </div>

            {/* Gender split — inline mini bars */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={11} className="text-slate-400" />
                <p className="text-[9px] uppercase font-semibold tracking-wider text-slate-500">Gender split</p>
                {stats.disabilityCount > 0 && (
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    <Accessibility size={9} /> {stats.disabilityCount}
                  </span>
                )}
              </div>
              <div className="flex items-center h-2 rounded-full overflow-hidden bg-slate-100">
                {(['Male', 'Female', 'Other'] as const).map((g, i) => {
                  const c = stats.genderBreakdown[g] ?? 0;
                  if (c === 0) return null;
                  const pct = (c / stats.total) * 100;
                  const cls = i === 0 ? 'bg-sky-500' : i === 1 ? 'bg-rose-500' : 'bg-slate-400';
                  return <div key={g} className={cls} style={{ width: `${pct}%` }} title={`${g}: ${c}`} />;
                })}
              </div>
              <div className="flex items-center gap-2.5 mt-1 text-[9px] font-semibold text-slate-500">
                {(['Male', 'Female', 'Other'] as const).map((g, i) => {
                  const c = stats.genderBreakdown[g] ?? 0;
                  if (c === 0) return null;
                  const dot = i === 0 ? 'bg-sky-500' : i === 1 ? 'bg-rose-500' : 'bg-slate-400';
                  return (
                    <span key={g} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      {g} {c}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input data-testid="applicants-search-input" type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, email or father's name…"
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 placeholder-slate-400" />
              {search && (
                <button data-testid="applicants-search-btn" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0 ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              <Filter size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
            {(search || activeFilterCount > 0) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-2.5 py-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100">
                <X size={12} /> Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Session is selected as a primary gate above; status + gender
                  remain as the in-list refinement filters here. */}
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
        <p className="text-[11px] text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-800">{applicants.length}</span> applicants
        </p>

        {/* Table — denser rows */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <RefreshCcw size={18} className="animate-spin text-indigo-400" />
              <p className="text-[11px] text-slate-500">Loading applicants…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-1.5">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users size={18} className="text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No applicants found</p>
              <p className="text-[11px] text-slate-400">
                {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : 'No applications submitted yet.'}
              </p>
              {(search || activeFilterCount > 0) && (
                <button onClick={clearFilters} className="text-[11px] text-indigo-600 hover:underline font-medium">Clear filters</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Family</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Applied</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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

                        {/* Applicant — bigger text on mobile for readability */}
                        <td className="px-3 py-2.5 sm:py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 sm:w-7 sm:h-7 bg-gradient-to-br ${color} rounded-md flex items-center justify-center text-white text-[11px] sm:text-[10px] font-bold shrink-0`}>
                              {getInitials(applicant.firstName, applicant.lastName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-[11px] font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                                {applicant.firstName}{applicant.middleName ? ` ${applicant.middleName}` : ''} {applicant.lastName}
                              </p>
                              <p className="text-[11px] sm:text-[10px] text-slate-400 capitalize leading-tight">{applicant.gender}{applicant.disability ? ' · ♿' : ''}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-3 py-2.5 sm:py-2 hidden md:table-cell">
                          <p className="flex items-center gap-1 text-xs sm:text-[11px] text-slate-600 leading-tight">
                            <Phone size={10} className="text-slate-400 shrink-0" />{applicant.phone}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] sm:text-[10px] text-slate-500 truncate max-w-[170px] leading-tight">
                            <Mail size={10} className="text-slate-400 shrink-0" />{applicant.email}
                          </p>
                        </td>

                        {/* Family */}
                        <td className="px-3 py-2.5 sm:py-2 hidden lg:table-cell">
                          <p className="text-[11px] sm:text-[10px] text-slate-600 truncate max-w-[150px] leading-tight">{applicant.fatherName}</p>
                          <p className="text-[11px] sm:text-[10px] text-slate-400 truncate max-w-[150px] leading-tight">{applicant.motherName}</p>
                        </td>

                        {/* Applied On */}
                        <td className="px-3 py-2.5 sm:py-2 hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-[11px] sm:text-[10px] text-slate-500">
                            <Calendar size={10} className="text-slate-400" />
                            {formatDate(applicant.createdAt)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 sm:py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-1.5 rounded-full text-[11px] sm:text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            <span className={`w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Actions — bigger tap targets on mobile, denser on desktop */}
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isPending && (
                              <>
                                <button
                                  data-testid={`applicant-accept-btn-${applicant.id}`}
                                  data-applicant-phone={applicant.phone}
                                  onClick={e => { e.stopPropagation(); setConfirm({ type: 'accept', applicant }); }}
                                  className="flex items-center gap-1 px-2.5 py-1 sm:px-2 sm:py-0.5 bg-emerald-600 text-white text-[11px] sm:text-[10px] font-semibold rounded hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm min-h-[28px] sm:min-h-0">
                                  <UserCheck size={11} className="sm:hidden" />
                                  <UserCheck size={10} className="hidden sm:block" />
                                  <span className="hidden xs:inline sm:hidden md:inline">Accept</span>
                                </button>
                                <button
                                  data-testid={`applicant-reject-btn-${applicant.id}`}
                                  data-applicant-phone={applicant.phone}
                                  onClick={e => { e.stopPropagation(); setConfirm({ type: 'reject', applicant }); }}
                                  className="flex items-center gap-1 px-2.5 py-1 sm:px-2 sm:py-0.5 bg-white border border-red-200 text-red-600 text-[11px] sm:text-[10px] font-semibold rounded hover:bg-red-50 active:bg-red-100 transition-colors min-h-[28px] sm:min-h-0">
                                  <UserX size={11} className="sm:hidden" />
                                  <UserX size={10} className="hidden sm:block" />
                                  <span className="hidden xs:inline sm:hidden md:inline">Reject</span>
                                </button>
                              </>
                            )}
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
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
        </>)}
      </div>
    </div>
  );
};

export default ApplicantsHome;
