import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCcw, UserPlus, Search, Filter, X,
  Users, CheckCircle, Clock, ChevronRight,
  Phone, Mail, UserCheck,
  TrendingUp, Accessibility, GraduationCap,
  CalendarDays, Hash,
} from 'lucide-react';
import api from '../../api/api';
import type { Student } from '../../api/types';
import AdmitStudentModal from '../../components/Student/AdmitStudentModal';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import NewStudentModal from '../../components/Student/NewStudentModal';
import { useSession } from '../../context/SessionContext';
import ActionBar from '../../components/common/ActionBar';
import { useToast } from '../../context/ToastContext';

interface SessionOption {
  id: string;
  name: string;
  status?: "ACTIVE" | "ENDING" | "ENDED";
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  APPLIED:     { label: 'Applied',     dot: 'bg-slate-400',   bg: 'bg-slate-100',   text: 'text-slate-600'   },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700'   },
  ACTIVE:      { label: 'Active',      dot: 'bg-emerald-500', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  REJECTED:    { label: 'Rejected',    dot: 'bg-red-500',     bg: 'bg-red-50',      text: 'text-red-700'     },
  ALUMNI:      { label: 'Alumni',      dot: 'bg-blue-500',    bg: 'bg-blue-50',     text: 'text-blue-700'    },
  GRADUATED:   { label: 'Graduated',   dot: 'bg-purple-500',  bg: 'bg-purple-50',   text: 'text-purple-700'  },
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS  = Object.keys(STATUS_CONFIG);

function getInitials(first: string, last?: string) {
  return `${first.charAt(0)}${last?.charAt(0) ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'from-indigo-400 to-indigo-600',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-sky-400 to-sky-600',
];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

const StudentsHome: React.FC = () => {
  const { addToast } = useToast();
  // Sessions + selection are global — sourced from the layout topbar.
  const { sessions: ctxSessions, selectedSessionId, loading: sessionsCtxLoading } = useSession();
  const sessions = ctxSessions as unknown as SessionOption[];
  const queryClient = useQueryClient();
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAdmitModal, setShowAdmitModal]   = useState(false);
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [showFilters, setShowFilters]     = useState(false);

  // Filters
  const [search,       setSearch]         = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [genderFilter, setGenderFilter]   = useState('');
  const [enrolledOnly, setEnrolledOnly]   = useState<'all' | 'enrolled' | 'notEnrolled'>('all');

  const navigate = useNavigate();

  // Students list, cached per session id. Switching sessions reads from
  // cache when we've fetched it before; revisit feels instant.
  const studentsQuery = useQuery({
    queryKey: ['students', 'list', selectedSessionId],
    queryFn: () => api.getStudents(undefined, undefined, selectedSessionId),
    enabled: !!selectedSessionId,
  });
  useEffect(() => {
    if (studentsQuery.error) {
      const err = studentsQuery.error as any;
      addToast(err?.response?.data?.message || 'Failed to load students. Please refresh.', 'error');
    }
  }, [studentsQuery.error, addToast]);
  const students: Student[] = useMemo(
    () => Array.isArray(studentsQuery.data) ? studentsQuery.data : [],
    [studentsQuery.data]
  );
  const loading = studentsQuery.isFetching;
  const fetchStudents = () =>
    queryClient.invalidateQueries({ queryKey: ['students', 'list', selectedSessionId] });

  // Mirror the SessionContext loading state into the local flag so existing
  // conditionals (`!sessionsLoading`) keep working without a wider refactor.
  useEffect(() => { setSessionsLoading(sessionsCtxLoading); }, [sessionsCtxLoading]);

  const handleAdmit = async (formData: any) => {
    if (!selectedStudent) return;
    await api.admitStudent(selectedStudent.id, formData);
    addToast(`${selectedStudent.firstName} admitted successfully.`, 'success');
    fetchStudents();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (genderFilter && s.gender.toLowerCase() !== genderFilter.toLowerCase()) return false;
      if (enrolledOnly === 'enrolled' && !s.sessionEnrollment) return false;
      if (enrolledOnly === 'notEnrolled' && s.sessionEnrollment) return false;
      if (q) {
        const full = `${s.firstName} ${s.middleName ?? ''} ${s.lastName}`.toLowerCase();
        if (!full.includes(q) && !s.phone.includes(q) && !s.email.toLowerCase().includes(q) &&
            !s.fatherName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [students, search, statusFilter, genderFilter, enrolledOnly]);

  // Per-session enrollment counts (computed from current student list).
  const enrollmentStats = useMemo(() => {
    const enrolled = students.filter(s => s.sessionEnrollment).length;
    const notEnrolled = students.filter(s => !s.sessionEnrollment).length;
    return { enrolled, notEnrolled };
  }, [students]);

  // Richer insights: status counts, recent admissions, gender split, alumni rate,
  // accessibility flags. Numbers are derived once from the in-memory list.
  const stats = useMemo(() => {
    // Time-since calculations need a fresh `now` per render; the impurity is intentional.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const total      = students.length;
    const active     = students.filter(s => s.status === 'ACTIVE').length;
    const inProgress = students.filter(s => s.status === 'IN_PROGRESS').length;
    const alumni     = students.filter(s => ['ALUMNI', 'GRADUATED'].includes(s.status)).length;
    const other      = students.filter(s => !['ACTIVE','IN_PROGRESS','ALUMNI','GRADUATED'].includes(s.status)).length;

    const newThisWeek = students.filter(s => s.createdAt && now - new Date(s.createdAt).getTime() < SEVEN_DAYS).length;
    const newThisMonth = students.filter(s => s.createdAt && now - new Date(s.createdAt).getTime() < THIRTY_DAYS).length;

    const genderBreakdown = students.reduce<Record<string, number>>((acc, s) => {
      const g = (s.gender || 'Other').trim() || 'Other';
      acc[g] = (acc[g] ?? 0) + 1;
      return acc;
    }, {});

    const disabilityCount = students.filter(s => s.disability).length;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : null;

    return { total, active, inProgress, alumni, other, newThisWeek, newThisMonth, genderBreakdown, disabilityCount, activeRate };
  }, [students]);

  const activeFilterCount = [statusFilter, genderFilter, enrolledOnly !== 'all' ? enrolledOnly : ''].filter(Boolean).length;
  const clearFilters = () => { setStatusFilter(''); setGenderFilter(''); setSearch(''); setEnrolledOnly('all'); };

  const selectedSession = sessions.find(s => s.id === selectedSessionId) ?? null;

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        icon={Users}
        title="Student Management"
        gradient={MODULE_THEMES.people}
        subtitle="View, search and manage enrolled students"
        onRefresh={fetchStudents}
        refreshing={loading}
        primaryActions={
          <button data-testid="students-show-new-student-modal-btn" onClick={() => setShowNewStudentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 transition backdrop-blur-sm shrink-0">
            <UserPlus size={15} /> New Student
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-2.5">

        {selectedSessionId && (
          <ActionBar
            leading={
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  <CheckCircle size={11} /> {enrollmentStats.enrolled} enrolled
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-bold">
                  <UserPlus size={11} /> {enrollmentStats.notEnrolled} not enrolled
                </span>
              </div>
            }
          />
        )}

        {/* Contextual session-status notices (ENDING / ENDED). */}
        {selectedSession?.status === "ENDING" && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <strong>This session is ending.</strong> Teachers are recording promotion decisions. New admissions are still allowed.
          </div>
        )}
        {selectedSession?.status === "ENDED" && (
          <div className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
            <strong>This session has ended.</strong> Use a current session for new admissions.
          </div>
        )}

        {/* Empty state when no session is selected */}
        {!selectedSessionId && !sessionsLoading && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <CalendarDays size={26} className="text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">Pick a session to begin</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Students are listed per academic session. Select a session above to see who's enrolled and admit new students.
            </p>
          </div>
        )}

        {selectedSessionId && (<>

        {/* ── Primary stat strip (compact) ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total Students',   value: stats.total,      sub: stats.newThisMonth ? `+${stats.newThisMonth} this month` : undefined, icon: Users,       color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Active',           value: stats.active,     sub: stats.activeRate !== null ? `${stats.activeRate}% of total` : undefined, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Admission Pending',value: stats.inProgress, sub: stats.inProgress > 0 ? 'awaiting placement' : undefined, icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50'   },
            { label: 'Alumni',           value: stats.alumni,     sub: stats.other > 0 ? `+${stats.other} other` : undefined, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
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

        {/* ── Secondary insights ───────────────────────────────────────────── */}
        {students.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* New this week */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-2 flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-50 rounded-md flex items-center justify-center shrink-0">
                <TrendingUp size={13} className="text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-tight">{stats.newThisWeek}</p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">Admitted this week</p>
              </div>
              {stats.newThisWeek > 0 && stats.total > 0 && (
                <span className="text-[9px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                  {Math.round((stats.newThisWeek / stats.total) * 100)}%
                </span>
              )}
            </div>

            {/* Pending placement */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-2 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${stats.inProgress > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <UserPlus size={13} className={stats.inProgress > 0 ? 'text-amber-600' : 'text-slate-500'} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-tight">{stats.inProgress}</p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">Need to be admitted</p>
              </div>
              {stats.inProgress > 0 && (
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

        {/* Search & filter bar */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input data-testid="students-search-input"
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, email, or father's name…"
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 placeholder-slate-400"
              />
              {search && (
                <button data-testid="students-search-btn" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Clear all */}
            {(search || activeFilterCount > 0) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-2.5 py-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100">
                <X size={12} /> Clear all
              </button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Enrollment in selected session */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">In this session</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['all','enrolled','notEnrolled'] as const).map(v => (
                    <button key={v} onClick={() => setEnrolledOnly(v)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        enrolledOnly === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}>
                      {v === 'all' ? 'All' : v === 'enrolled' ? 'Enrolled' : 'Not enrolled'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
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
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                          active ? `${cfg.bg} ${cfg.text} border-current` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg.dot : 'bg-slate-300'}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gender filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setGenderFilter('')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!genderFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    All
                  </button>
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => setGenderFilter(genderFilter === g ? '' : g)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        genderFilter === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{students.length}</span> students
          </p>
        </div>

        {/* Table card — denser rows */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <RefreshCcw size={18} className="animate-spin text-indigo-400" />
              <p className="text-[11px] text-slate-500">Loading students…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-1.5">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users size={18} className="text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No students found</p>
              <p className="text-[11px] text-slate-400">
                {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : 'No students have been enrolled yet.'}
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
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Family</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(student => {
                    const cfg = STATUS_CONFIG[student.status] ?? STATUS_CONFIG['APPLIED'];
                    const color = avatarColor(student.firstName);
                    return (
                      <tr key={student.id}
                        data-testid="student-row"
                        data-student-id={student.id}
                        data-student-name={`${student.firstName} ${student.lastName}`}
                        data-status={student.status}
                        onClick={() => navigate(`/student/${student.id}`)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        {/* Name + gender — bigger text on mobile for readability */}
                        <td className="px-3 py-2.5 sm:py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 sm:w-7 sm:h-7 bg-gradient-to-br ${color} rounded-md flex items-center justify-center text-white text-[11px] sm:text-[10px] font-bold shrink-0`}>
                              {getInitials(student.firstName, student.lastName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-[11px] font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                                {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
                              </p>
                              <p className="text-[11px] sm:text-[10px] text-slate-400 capitalize leading-tight">{student.gender}{student.disability ? ' · ♿' : ''}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-3 py-2.5 sm:py-2 hidden md:table-cell">
                          <p className="flex items-center gap-1 text-xs sm:text-[11px] text-slate-600 leading-tight">
                            <Phone size={10} className="text-slate-400 shrink-0" />{student.phone}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] sm:text-[10px] text-slate-500 truncate max-w-[170px] leading-tight">
                            <Mail size={10} className="text-slate-400 shrink-0" />{student.email}
                          </p>
                        </td>

                        {/* Family */}
                        <td className="px-3 py-2.5 sm:py-2 hidden lg:table-cell">
                          <p className="text-[11px] sm:text-[10px] text-slate-600 truncate max-w-[150px] leading-tight">{student.fatherName}</p>
                          <p className="text-[11px] sm:text-[10px] text-slate-400 truncate max-w-[150px] leading-tight">{student.motherName}</p>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 sm:py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-1.5 rounded-full text-[11px] sm:text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Actions — session-aware: show enrolled badge OR admit-to-this-session button */}
                        <td className="px-3 py-2.5 sm:py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {student.sessionEnrollment ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold">
                                <CheckCircle size={10} />
                                <span className="hidden sm:inline">{student.sessionEnrollment.className ?? '—'}</span>
                                {student.sessionEnrollment.sectionName && <span className="hidden md:inline">·{student.sessionEnrollment.sectionName}</span>}
                                {student.sessionEnrollment.rollNo && (
                                  <span className="inline-flex items-center gap-0.5 ml-0.5 text-emerald-600">
                                    <Hash size={9} />{student.sessionEnrollment.rollNo}
                                  </span>
                                )}
                              </span>
                            ) : (selectedSession?.status !== "ENDED") ? (
                              <button
                                data-testid={`student-admit-btn-${student.id}`}
                                data-student-phone={student.phone}
                                onClick={e => { e.stopPropagation(); setSelectedStudent(student); setShowAdmitModal(true); }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm"
                              >
                                <UserPlus size={11} />
                                <span className="hidden xs:inline sm:hidden md:inline">Admit</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">session ended</span>
                            )}
                            <span className="flex items-center gap-0.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                              <UserCheck size={12} />
                              <ChevronRight size={12} />
                            </span>
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

      {showAdmitModal && selectedStudent && (
        <AdmitStudentModal
          student={selectedStudent}
          preselectedSessionId={selectedSessionId || undefined}
          onClose={() => { setShowAdmitModal(false); setSelectedStudent(null); }}
          onAdmit={handleAdmit}
        />
      )}

      {showNewStudentModal && (
        <NewStudentModal
          onClose={() => setShowNewStudentModal(false)}
          onCreated={fetchStudents}
        />
      )}
    </div>
  );
};

export default StudentsHome;
