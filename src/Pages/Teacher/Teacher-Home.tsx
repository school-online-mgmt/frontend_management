import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus, Users, Search, ChevronRight, Phone,
  GraduationCap, Filter, X, CheckCircle2, XCircle,
  Loader2, UserPlus, BarChart3, UserCheck, UserX,
  Briefcase, AlignJustify, Mail, MapPin, FileText,
  Clock, CheckCheck, Ban, Star, MessageSquare, Calculator,
} from "lucide-react";
import api from "../../api/api";
import TeacherOnboardingModal from "./TeacherOnboardingModal";
import TeacherCalculatorModal from "../../components/Teacher/TeacherCalculatorModal";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";
import type { Teacher, TeacherApplication } from "../../api/types";

/* ── Helpers ────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "from-emerald-400 to-emerald-600",
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
  "from-sky-400 to-sky-600",
  "from-teal-400 to-teal-600",
];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
const GENDER_OPTIONS = ["Male", "Female", "Other"];

type AppStatus = 'APPLIED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';

const STATUS_META: Record<AppStatus, { label: string; bg: string; text: string; dot: string }> = {
  APPLIED:     { label: 'Applied',     bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  SHORTLISTED: { label: 'Shortlisted', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  ACCEPTED:    { label: 'Accepted',    bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  REJECTED:    { label: 'Rejected',    bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
};

/* ── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({
  icon: Icon, label, value, sub, bg, iconColor,
}: {
  icon: typeof Users; label: string; value: number; sub?: string;
  bg: string; iconColor: string;
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
      <Icon size={20} className={iconColor} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ── Teacher Card (Grid) ────────────────────────────────────────────────── */
const TeacherCard = ({ teacher, onClick }: { teacher: Teacher; onClick: () => void }) => {
  const color    = avatarColor(teacher.name);
  const initials = getInitials(teacher.name);
  return (
    <div
      data-testid={`teacher-card-${teacher.phone}`}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group flex flex-col"
    >
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
              {teacher.name}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
              <GraduationCap size={11} className="shrink-0" />
              {teacher.qualification}
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          teacher.isActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
          {teacher.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="border-t border-slate-100 mx-5" />

      <div className="px-5 py-3.5 space-y-2 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Phone size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{teacher.phone || "No phone on record"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Mail size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{teacher.email || "No email provided"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{teacher.address || "No address provided"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Briefcase size={12} className="text-slate-400 shrink-0" />
          <span className="capitalize">{teacher.gender}</span>
          <span className="text-slate-300">·</span>
          <span>{teacher.age} yrs</span>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">View profile</span>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
      </div>
    </div>
  );
};

/* ── Application Card ───────────────────────────────────────────────────── */
const ApplicationCard = ({
  app,
  onUpdate,
}: {
  app: TeacherApplication;
  onUpdate: (id: string, status: AppStatus, comments?: string) => Promise<void>;
}) => {
  const [expanded, setExpanded]   = useState(false);
  const [comments, setComments]   = useState(app.comments ?? '');
  const [updating, setUpdating]   = useState(false);

  const meta = STATUS_META[app.status];

  const act = async (status: AppStatus) => {
    setUpdating(true);
    try { await onUpdate(app.id, status, comments || undefined); }
    finally { setUpdating(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className={`w-11 h-11 bg-gradient-to-br ${avatarColor(app.name)} rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0`}>
          {getInitials(app.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-bold text-slate-900">{app.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <GraduationCap size={11} className="shrink-0" />{app.qualification}
                {app.experienceYears != null && (
                  <><span className="text-slate-300">·</span>{app.experienceYears} yr{app.experienceYears !== 1 ? 's' : ''} exp</>
                )}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.text} shrink-0`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={11} className="text-slate-400" />{app.phone}
            </span>
            {app.email && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail size={11} className="text-slate-400" />{app.email}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={11} />{new Date(app.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {app.subjectsInterested && (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Subjects: </span>{app.subjectsInterested}
            </p>
          )}
        </div>
      </div>

      {/* Expand / collapse details */}
      <button data-testid="teacher-expanded-btn"
        onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <span>{expanded ? 'Hide details' : 'View details & take action'}</span>
        <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {app.message && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
              <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MessageSquare size={11} /> Message
              </p>
              {app.message}
            </div>
          )}

          {(app.gender || app.age || app.address) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-500">
              {app.gender && <span><span className="font-semibold text-slate-600">Gender: </span>{app.gender}</span>}
              {app.age    && <span><span className="font-semibold text-slate-600">Age: </span>{app.age}</span>}
              {app.address && <span className="col-span-2 sm:col-span-1"><span className="font-semibold text-slate-600">Address: </span>{app.address}</span>}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Internal comments (optional)</label>
            <textarea data-testid="teacher-comments-input"
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={2}
              placeholder="Add notes about this applicant…"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {app.status !== 'SHORTLISTED' && app.status !== 'ACCEPTED' && app.status !== 'REJECTED' && (
              <button data-testid="teacher-act-btn" onClick={() => act('SHORTLISTED')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors">
                <Star size={12} /> Shortlist
              </button>
            )}
            {app.status !== 'ACCEPTED' && (
              <button data-testid="teacher-act-btn-2" onClick={() => act('ACCEPTED')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 disabled:opacity-50 transition-colors">
                <CheckCheck size={12} /> Accept
              </button>
            )}
            {app.status !== 'REJECTED' && (
              <button data-testid="teacher-act-btn-3" onClick={() => act('REJECTED')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                <Ban size={12} /> Reject
              </button>
            )}
            {app.status !== 'APPLIED' && (
              <button data-testid="teacher-act-btn-4" onClick={() => act('APPLIED')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors">
                <Clock size={12} /> Reset to Applied
              </button>
            )}
            {updating && <Loader2 size={14} className="animate-spin text-slate-400 self-center" />}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main Page ──────────────────────────────────────────────────────────── */
const TeacherHome = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'teachers' | 'applications'>('teachers');

  const queryClient = useQueryClient();

  /* ── Teachers state ── */
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [genderFilter, setGenderFilter] = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [viewMode, setViewMode]         = useState<"grid" | "table">("grid");

  /* ── Applications state ── */
  const [appStatusFilter, setAppStatusFilter] = useState<string>('');

  // Teachers list — cached, shared with Dashboard via the same query key
  // shape (`["teachers", "list"]`). Once loaded, the list is reused on
  // navigation back to this page.
  const teachersQuery = useQuery({
    queryKey: ["teachers", "list"],
    queryFn: () => api.getTeachers(),
    select: (res: any) => Array.isArray(res) ? res : (res?.teachers ?? []),
  });
  const teachers: Teacher[] = teachersQuery.data ?? [];
  const isLoading = teachersQuery.isFetching;
  const fetchTeachers = () => queryClient.invalidateQueries({ queryKey: ["teachers", "list"] });

  // Applications — only fetched when the Applications tab is active.
  // Re-keyed by status filter so each filter has its own cache slot.
  const applicationsQuery = useQuery({
    queryKey: ["teacher-applications", appStatusFilter],
    queryFn: () => api.getTeacherApplications(appStatusFilter || undefined),
    enabled: activeTab === "applications",
    select: (res: any) => res?.applications ?? [],
  });
  const applications: TeacherApplication[] = applicationsQuery.data ?? [];
  const appsLoading = applicationsQuery.isFetching;
  const fetchApplications = () =>
    queryClient.invalidateQueries({ queryKey: ["teacher-applications", appStatusFilter] });

  const handleUpdateApplication = async (id: string, status: AppStatus, comments?: string) => {
    await api.updateTeacherApplicationStatus(id, { status, comments });
    // Optimistically patch the cached list so the UI updates without a
    // round trip; React Query will reconcile if a refetch arrives.
    queryClient.setQueryData(["teacher-applications", appStatusFilter], (prev: any) => {
      if (!prev?.applications) return prev;
      return {
        ...prev,
        applications: prev.applications.map((a: TeacherApplication) =>
          a.id === id ? { ...a, status, comments: comments ?? a.comments } : a
        ),
      };
    });
  };

  const stats = useMemo(() => ({
    total:    teachers.length,
    active:   teachers.filter((t) => t.isActive).length,
    inactive: teachers.filter((t) => !t.isActive).length,
  }), [teachers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (statusFilter === "active"   && !t.isActive) return false;
      if (statusFilter === "inactive" &&  t.isActive) return false;
      if (genderFilter && t.gender.toLowerCase() !== genderFilter.toLowerCase()) return false;
      if (q) {
        const hay = `${t.name} ${t.qualification ?? ""} ${t.phone ?? ""} ${t.email ?? ""} ${t.address ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [teachers, search, statusFilter, genderFilter]);

  const activeFilterCount = [statusFilter !== "all" ? statusFilter : "", genderFilter].filter(Boolean).length;
  const clearFilters = () => { setStatusFilter("all"); setGenderFilter(""); setSearch(""); };

  const appCounts = useMemo(() => ({
    total:      applications.length,
    applied:    applications.filter(a => a.status === 'APPLIED').length,
    shortlisted:applications.filter(a => a.status === 'SHORTLISTED').length,
    accepted:   applications.filter(a => a.status === 'ACCEPTED').length,
    rejected:   applications.filter(a => a.status === 'REJECTED').length,
  }), [applications]);

  if (isLoading && teachers.length === 0 && activeTab === 'teachers') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-500">Loading teachers…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      {isModalOpen && (
        <TeacherOnboardingModal onClose={() => setIsModalOpen(false)} onDone={fetchTeachers} />
      )}

      <PageHeader
        icon={Users}
        title="Teachers"
        gradient={MODULE_THEMES.people}
        subtitle="Manage faculty, track assignments and review job applications"
        onRefresh={activeTab === 'teachers' ? fetchTeachers : fetchApplications}
        refreshing={isLoading || appsLoading}
        primaryActions={
          activeTab === 'teachers' ? (
            <div className="flex items-center gap-2 shrink-0">
              <button data-testid="staffing-calculator-btn" onClick={() => setShowCalculator(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 transition backdrop-blur-sm">
                <Calculator size={14} /> Staffing Calculator
              </button>
              <button data-testid="add-teacher-btn" onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 transition backdrop-blur-sm">
                <UserPlus size={14} /> Onboard Teacher
              </button>
            </div>
          ) : undefined
        }
      />

      {showCalculator && (
        <TeacherCalculatorModal currentTeachers={stats.total ?? teachers.length} onClose={() => setShowCalculator(false)} />
      )}

      <TabbedSection
        idPrefix="teacher"
        theme="violet"
        flushPanel
        value={activeTab}
        onChange={(k) => setActiveTab(k as typeof activeTab)}
        tabs={[
          { key: 'teachers',     label: 'Teachers',     icon: Users,    badge: stats.total || undefined },
          { key: 'applications', label: 'Applications', icon: FileText, badge: appCounts.applied || undefined },
        ]}
      >
        {/* ─────────────── TEACHERS TAB ─────────────────────────────────── */}
        <TabPanel tabKey="teachers">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Users}     label="Total Teachers" value={stats.total}    bg="bg-indigo-50"  iconColor="text-indigo-600" />
              <StatCard icon={UserCheck} label="Active"         value={stats.active}   bg="bg-emerald-50" iconColor="text-emerald-600"
                sub={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of faculty` : undefined}
              />
              <StatCard icon={UserX}     label="Inactive"       value={stats.inactive} bg="bg-slate-100"  iconColor="text-slate-500" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input data-testid="teacher-search-input"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, qualification, phone, email or address…"
                    className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 placeholder-slate-400"
                  />
                  {search && (
                    <button data-testid="teacher-search-btn" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${
                    showFilters || activeFilterCount > 0
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                  <button
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                    className={`px-3 py-2 transition-all ${viewMode === "grid" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <BarChart3 size={15} className="rotate-90" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    title="Table view"
                    className={`px-3 py-2 transition-all ${viewMode === "table" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <AlignJustify size={15} />
                  </button>
                </div>

                {(search || activeFilterCount > 0) && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                  >
                    <X size={13} /> Clear all
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(["all", "active", "inactive"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                            statusFilter === s
                              ? s === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : s === "inactive"
                                ? "bg-slate-200 text-slate-700 border-slate-300"
                                : "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {s === "active"   && <CheckCircle2 size={11} />}
                          {s === "inactive" && <XCircle size={11} />}
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setGenderFilter("")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!genderFilter ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                      >
                        All
                      </button>
                      {GENDER_OPTIONS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGenderFilter(genderFilter === g ? "" : g)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${genderFilter === g ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{" "}
                <span className="font-semibold text-slate-800">{teachers.length}</span> teachers
              </p>
              {isLoading && teachers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 size={13} className="animate-spin" /> Refreshing…
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Users size={24} className="text-slate-300" />
                </div>
                <p className="text-base font-semibold text-slate-700">No teachers found</p>
                <p className="text-sm text-slate-400">
                  {search || activeFilterCount > 0
                    ? "Try adjusting your search or filters."
                    : "Add your first teacher to get started."}
                </p>
                {search || activeFilterCount > 0 ? (
                  <button onClick={clearFilters} className="mt-1 text-sm text-emerald-600 hover:underline font-medium">Clear filters</button>
                ) : (
                  <button
                    data-testid="add-teacher-empty-btn"
                    onClick={() => setIsModalOpen(true)}
                    className="mt-1 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition"
                  >
                    <Plus size={14} /> Onboard Teacher
                  </button>
                )}
              </div>

            ) : viewMode === "grid" ? (
              <div data-testid="teacher-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((teacher) => (
                  <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    onClick={() => navigate(`/teacher/${teacher.id}`)}
                  />
                ))}
              </div>

            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Qualification</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Address</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((teacher) => {
                        const color    = avatarColor(teacher.name);
                        const initials = getInitials(teacher.name);
                        return (
                          <tr
                            key={teacher.id}
                            data-testid={`teacher-row-${teacher.phone}`}
                            onClick={() => navigate(`/teacher/${teacher.id}`)}
                            className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                  {initials}
                                </div>
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                  {teacher.name}
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <span className="text-xs text-slate-600">{teacher.qualification}</span>
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                {teacher.phone || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell">
                               <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail size={11} className="text-slate-400 shrink-0" />
                                {teacher.email || "—"}
                              </div>
                            </td>
                             <td className="px-5 py-4 hidden lg:table-cell">
                               <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-[150px] truncate">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                {teacher.address || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                teacher.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {teacher.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <ChevronRight size={16} className="inline text-slate-300 group-hover:text-emerald-500 transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabPanel>

        {/* ─────────────── APPLICATIONS TAB ─────────────────────────────── */}
        <TabPanel tabKey="applications">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-6">
            {/* App stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={FileText}    label="Total"       value={appCounts.total}       bg="bg-slate-100"   iconColor="text-slate-500" />
              <StatCard icon={Clock}       label="Applied"     value={appCounts.applied}     bg="bg-blue-50"     iconColor="text-blue-600" />
              <StatCard icon={Star}        label="Shortlisted" value={appCounts.shortlisted}  bg="bg-amber-50"    iconColor="text-amber-600" />
              <StatCard icon={CheckCircle2}label="Accepted"    value={appCounts.accepted}    bg="bg-emerald-50"  iconColor="text-emerald-600" />
            </div>

            {/* Filter by status */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: '',            label: 'All Applications' },
                { value: 'APPLIED',     label: 'Applied' },
                { value: 'SHORTLISTED', label: 'Shortlisted' },
                { value: 'ACCEPTED',    label: 'Accepted' },
                { value: 'REJECTED',    label: 'Rejected' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setAppStatusFilter(opt.value)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                    appStatusFilter === opt.value
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {appsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-violet-500" />
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <FileText size={24} className="text-slate-300" />
                </div>
                <p className="text-base font-semibold text-slate-700">No applications found</p>
                <p className="text-sm text-slate-400">
                  {appStatusFilter ? `No ${appStatusFilter.toLowerCase()} applications yet.` : 'Teacher job applications will appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {applications.map(app => (
                  <ApplicationCard key={app.id} app={app} onUpdate={handleUpdateApplication} />
                ))}
              </div>
            )}
          </div>
        </TabPanel>
      </TabbedSection>
    </div>
  );
};

export default TeacherHome;
