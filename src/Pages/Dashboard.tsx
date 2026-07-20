import { useNavigate } from "react-router-dom";
import {
  Users, BookOpen, GraduationCap, Calendar, Clock, Activity,
  CreditCard, AlertTriangle, CheckCircle2, UserPlus, Layers,
  ClipboardCheck, Library, Bell, Loader2, RefreshCw,
  ChevronRight, Sparkles, BookMarked, Wallet, CalendarDays,
  School, UserCog, CalendarRange, Bus, BarChart3, TrendingUp,
  TrendingDown, Shield, AlertCircle, ArrowRight, Receipt,
  XCircle,
} from "lucide-react";
import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import api from "../api/api";
import useAuth from "../hooks/useAuth";

/* ── helpers ─────────────────────────────────────────────────────────── */
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmtCompact = (n: number) =>
  n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L`
  : n >= 1_000 ? `₹${(n / 1_000).toFixed(1)}K`
  : `₹${n}`;

/* ── Attendance Ring ───────────────────────────────────────────────────── */
const Ring = ({ value, size = 56, stroke = 5, color }: { value: number; size?: number; stroke?: number; color: string }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center" fontSize={size * 0.22} fontWeight="800" fill={color}>
        {value}%
      </text>
    </svg>
  );
};

/* ── Trend chip — shows + / - delta vs prior period ──────────────────── */
const TrendChip = ({ delta, suffix }: { delta: number; suffix?: string }) => {
  if (Number.isNaN(delta) || !isFinite(delta)) return null;
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${up ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>
      <Icon size={9} /> {Math.abs(delta).toFixed(0)}{suffix ?? "%"}
    </span>
  );
};

/* ── Main Dashboard ────────────────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;

  // ── Each section of the dashboard is its own React Query call. They
  // run in parallel, are independently cached, and the list of `keys`
  // makes invalidation surgical (one button to refresh, one shared
  // staleTime, etc). We mark them all as `notifyOnChangeProps: ["data"]`
  // so the dashboard doesn't re-render on every fetching/error tick.
  // Share query keys with the per-module pages so cache is reused on
  // navigation: visiting `/teacher-home` after the dashboard loads its
  // teachers list takes 0ms — the data is already in cache.
  const studentsQ = useQuery({ queryKey: ["students", "list", undefined] as const, queryFn: () => api.getStudents() });
  const teachersQ = useQuery({ queryKey: ["teachers", "list"]            as const, queryFn: () => api.getTeachers(), select: (res: any) => Array.isArray(res) ? res : (res?.teachers ?? []) });
  const subjectsQ = useQuery({ queryKey: ["subjects", "list"]            as const, queryFn: () => api.getSubjects() });
  const classesQ  = useQuery({ queryKey: ["classes", "list", undefined]  as const, queryFn: () => api.getClasses() });
  const studentAttQ = useQuery({ queryKey: ["dash", "student-att-today"], queryFn: () => api.getAttendanceTodaySummary(),  staleTime: 30_000 });
  const teacherAttQ = useQuery({ queryKey: ["dash", "teacher-att-today"], queryFn: () => api.getTeacherAttendanceTodaySummary(), staleTime: 30_000 });
  const feeYTDQ   = useQuery({ queryKey: ["dash", "fee-summary", year], queryFn: () => api.getFeeSummary({ year }) });
  const feeMonthQ = useQuery({ queryKey: ["dash", "fee-month", year, month],         queryFn: () => api.getFeeSummary({ year, month }) });
  const feeLastQ  = useQuery({ queryKey: ["dash", "fee-month", lastMonthYear, lastMonth], queryFn: () => api.getFeeSummary({ year: lastMonthYear, month: lastMonth }) });
  const libraryQ  = useQuery({ queryKey: ["dash", "library"],      queryFn: () => api.getLibraryStats() });
  const leavesQ   = useQuery({ queryKey: ["dash", "leaves-pending"], queryFn: () => api.getStudentLeaves({ status: "PENDING" }) });
  const teacherLeavesQ = useQuery({ queryKey: ["dash", "teacher-leaves-pending"], queryFn: () => api.getTeacherLeaves({ status: "PENDING" }) });
  const noticesQ  = useQuery({ queryKey: ["dash", "notices-pending"], queryFn: () => api.getPendingNotices() });
  const staffGapsQ = useQuery({ queryKey: ["dash", "staff-gaps"], queryFn: () => api.getStaffGaps() });
  const schoolStatsQ = useQuery({ queryKey: ["dash", "school-stats"], queryFn: () => api.getSchoolStats() });

  // The dashboard fans data across many query keys (some shared with
  // module pages). Refresh invalidates only the keys we actually own.
  const dashKeys: readonly (readonly unknown[])[] = [
    ["students", "list", undefined],
    ["teachers", "list"],
    ["subjects", "list"],
    ["classes", "list", undefined],
    ["dash", "student-att-today"],
    ["dash", "teacher-att-today"],
    ["dash", "fee-summary", year],
    ["dash", "fee-month", year, month],
    ["dash", "fee-month", lastMonthYear, lastMonth],
    ["dash", "library"],
    ["dash", "leaves-pending"],
    ["dash", "teacher-leaves-pending"],
    ["dash", "notices-pending"],
    ["dash", "staff-gaps"],
    ["dash", "school-stats"],
  ];
  const isFetching = useIsFetching();
  const refreshAll = () => {
    for (const key of dashKeys) queryClient.invalidateQueries({ queryKey: key as readonly unknown[] });
  };

  const firstName = user?.firstName ?? "Admin";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // ── Coalesce / unwrap responses ────────────────────────────────────────
  const students = (studentsQ.data && (Array.isArray(studentsQ.data) ? studentsQ.data : (studentsQ.data as any).students)) ?? [];
  const teachers = (teachersQ.data && (Array.isArray(teachersQ.data) ? teachersQ.data : (teachersQ.data as any).teachers)) ?? [];
  const subjects = (subjectsQ.data && (Array.isArray(subjectsQ.data) ? subjectsQ.data : (subjectsQ.data as any).subjects)) ?? [];
  const classes  = (classesQ.data  && (Array.isArray(classesQ.data)  ? classesQ.data  : (classesQ.data  as any).classes))  ?? [];
  const studentAtt = (studentAttQ.data as any)?.summary ?? studentAttQ.data ?? null;
  const teacherAtt = (teacherAttQ.data as any)?.summary ?? teacherAttQ.data ?? null;
  const feeSummary = (feeYTDQ.data as any)?.summary ?? null;
  const feeMonth   = (feeMonthQ.data as any)?.summary ?? null;
  const feeLast    = (feeLastQ.data as any)?.summary ?? null;
  const library    = libraryQ.data ?? null;
  const pendingLeaves        = ((leavesQ.data as any)?.leaves ?? leavesQ.data ?? []) as any[];
  const pendingTeacherLeaves = ((teacherLeavesQ.data as any)?.leaves ?? teacherLeavesQ.data ?? []) as any[];
  const pendingNotices = ((noticesQ.data as any)?.notices ?? noticesQ.data ?? []) as any[];
  const staffGaps = staffGapsQ.data;
  const schoolStats = schoolStatsQ.data;

  // ── Loading gate — first paint waits for the cheap-and-cheerful queries.
  // Subsequent fetches are background-revalidations, so the user keeps
  // seeing the last-known values while we update.
  const firstLoad = studentsQ.isLoading && classesQ.isLoading && teachersQ.isLoading;
  if (firstLoad) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  /* ── Derived insights ──────────────────────────────────────────────── */
  const activeTeachers = teachers.filter((t: any) => t.isActive !== false).length;
  const studentAttPct = studentAtt && studentAtt.total > 0 ? pct(studentAtt.present + (studentAtt.late ?? 0), studentAtt.total) : null;
  const teacherAttPct = teacherAtt && teacherAtt.total > 0 ? pct(teacherAtt.present + (teacherAtt.late ?? 0), teacherAtt.total) : null;

  // Fee collection trend — this month vs last month
  const collectionRate = feeSummary && feeSummary.totalDemand > 0
    ? pct(feeSummary.totalCollected, feeSummary.totalDemand) : null;
  const monthCollected = feeMonth?.totalCollected ?? 0;
  const lastCollected  = feeLast?.totalCollected ?? 0;
  const collectionDelta = lastCollected > 0
    ? ((monthCollected - lastCollected) / lastCollected) * 100
    : (monthCollected > 0 ? 100 : 0);

  // Recent admissions — students admitted this month
  const oneMonthAgo = new Date(); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const newThisMonth = students.filter((s: any) => {
    const d = s.createdAt ? new Date(s.createdAt) : null;
    return d && d >= oneMonthAgo;
  }).length;

  // Staff gap totals
  const classGapCount   = staffGaps?.classGaps.length ?? 0;
  const sectionGapCount = staffGaps?.sectionGaps.length ?? 0;
  const subjectGapCount = staffGaps?.subjectGaps.length ?? 0;
  const totalStaffGaps  = classGapCount + sectionGapCount + subjectGapCount;
  const subjectInchargeMissing = subjects.filter((s: any) => !s.teacherId).length;

  // Library health
  const overdueIssues   = library?.overdueIssues   ?? 0;
  const pendingRequests = library?.pendingRequests ?? 0;
  const pendingRenewals = library?.pendingRenewals ?? 0;

  // Action items — single source of truth for the action center
  type Action = { key: string; label: string; count: number; tone: "rose" | "amber" | "blue" | "violet"; icon: typeof Bell; to: string; description: string };
  const actions: Action[] = [
    pendingLeaves.length > 0 && {
      key: "leaves-students", label: "Student leave requests", count: pendingLeaves.length, tone: "amber" as const,
      icon: CalendarDays, to: "/leaves", description: "Awaiting your approval",
    },
    pendingTeacherLeaves.length > 0 && {
      key: "leaves-teachers", label: "Teacher leave requests", count: pendingTeacherLeaves.length, tone: "amber" as const,
      icon: UserCog, to: "/leaves?tab=teacher", description: "Awaiting your approval",
    },
    pendingNotices.length > 0 && {
      key: "notices", label: "Notices pending approval", count: pendingNotices.length, tone: "blue" as const,
      icon: Bell, to: "/notices", description: "Teachers waiting on publication",
    },
    feeSummary && feeSummary.overdue > 0 && {
      key: "fee-overdue", label: "Overdue fee invoices", count: feeSummary.overdue, tone: "rose" as const,
      icon: AlertCircle, to: "/fees?tab=invoices", description: "Past due date — follow up",
    },
    overdueIssues > 0 && {
      key: "library-overdue", label: "Overdue library books", count: overdueIssues, tone: "rose" as const,
      icon: Library, to: "/library?tab=issues", description: "Books not returned on time",
    },
    pendingRequests > 0 && {
      key: "library-requests", label: "Library issue requests", count: pendingRequests, tone: "violet" as const,
      icon: BookOpen, to: "/library?tab=requests", description: "Students requesting books",
    },
    pendingRenewals > 0 && {
      key: "library-renewals", label: "Library renewal requests", count: pendingRenewals, tone: "violet" as const,
      icon: Library, to: "/library?tab=renewals", description: "Students requesting extra time",
    },
    classGapCount > 0 && {
      key: "class-gaps", label: "Classes without a class teacher", count: classGapCount, tone: "amber" as const,
      icon: School, to: "/assignments", description: "Assign a class teacher",
    },
    sectionGapCount > 0 && {
      key: "section-gaps", label: "Sections without a section teacher", count: sectionGapCount, tone: "amber" as const,
      icon: Layers, to: "/assignments", description: "Assign a section teacher",
    },
    subjectGapCount > 0 && {
      key: "subject-gaps", label: "Subject-section pairs without a teacher", count: subjectGapCount, tone: "amber" as const,
      icon: BookOpen, to: "/assignments?tab=section-teaching", description: "Assign teachers to subject mappings",
    },
    subjectInchargeMissing > 0 && {
      key: "incharge-missing", label: "Subjects without an incharge", count: subjectInchargeMissing, tone: "amber" as const,
      icon: Shield, to: "/assignments?tab=subject-incharge", description: "Subject ownership unassigned",
    },
  ].filter(Boolean) as Action[];

  const totalPendingActions = actions.reduce((sum, a) => sum + a.count, 0);

  const QUICK_LINKS = [
    { to: "/sessions",       label: "Sessions",   icon: CalendarRange, bg: "bg-violet-50", text: "text-violet-700", desc: "Academic year setup" },
    { to: "/applicants-home", label: "Applicants", icon: UserPlus, bg: "bg-blue-50", text: "text-blue-700", desc: "Review applications" },
    { to: "/students-home", label: "Students", icon: Users, bg: "bg-indigo-50", text: "text-indigo-700", desc: "Manage students" },
    { to: "/teacher-home", label: "Teachers", icon: GraduationCap, bg: "bg-purple-50", text: "text-purple-700", desc: "Staff management" },
    { to: "/exam-home", label: "Exams", icon: BookMarked, bg: "bg-violet-50", text: "text-violet-700", desc: "Papers & results" },
    { to: "/attendance", label: "Attendance", icon: ClipboardCheck, bg: "bg-teal-50", text: "text-teal-700", desc: "Mark attendance" },
    { to: "/fees", label: "Fees", icon: Wallet, bg: "bg-amber-50", text: "text-amber-700", desc: "Fee management" },
    { to: "/library", label: "Library", icon: Library, bg: "bg-rose-50", text: "text-rose-700", desc: "Books & issues" },
    { to: "/notices", label: "Notices", icon: Bell, bg: "bg-pink-50", text: "text-pink-700", desc: "Announcements" },
    { to: "/calendar", label: "Calendar", icon: Calendar, bg: "bg-cyan-50", text: "text-cyan-700", desc: "Events & schedule" },
    { to: "/leaves", label: "Leaves", icon: CalendarDays, bg: "bg-orange-50", text: "text-orange-700", desc: "Leave requests" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">

      {/* ── Hero Welcome ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-4 md:p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10" />
        <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-emerald-400" />
                <span className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">Management Portal</span>
                {schoolStats?.currentSession && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-emerald-200 text-[10px] font-bold">
                    <CalendarDays size={9} /> {schoolStats.currentSession.name}
                  </span>
                )}
              </div>
              <h1 className="text-white text-xl md:text-2xl font-bold leading-tight truncate">{greeting}, {firstName} <span className="inline-block">👋</span></h1>
              <p className="text-slate-400 text-xs mt-1">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <button data-testid="dashboard-refresh-all-btn"
              onClick={refreshAll}
              aria-label="Refresh dashboard"
              title="Refresh"
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              disabled={isFetching > 0}
            >
              <RefreshCw size={15} className={isFetching > 0 ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Hero stat pills — clickable, drill down to the relevant module */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { icon: Users,         label: "Students",   value: students.length,    color: "text-blue-400",    to: "/students-home" },
              { icon: GraduationCap, label: "Teachers",   value: activeTeachers,     color: "text-purple-400",  to: "/teacher-home" },
              { icon: Layers,        label: "Classes",    value: classes.length,     color: "text-teal-400",    to: "/class-Home" },
              { icon: BookOpen,      label: "Subjects",   value: subjects.length,    color: "text-emerald-400", to: "/subject-Home" },
            ].map(({ icon: Icon, label, value, color, to }) => (
              <button data-testid="dashboard-navigate-btn"
                key={label}
                onClick={() => navigate(to)}
                className="group flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 hover:bg-white/15 transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <Icon size={14} className={color} />
                <div className="text-left">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="text-white text-sm font-bold leading-none">{value}</p>
                </div>
                <ChevronRight size={11} className="text-slate-500 group-hover:text-white -ml-0.5 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
            {totalPendingActions > 0 && (
              <button onClick={() => document.getElementById("action-center")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/30 rounded-xl px-3 py-2 hover:bg-rose-500/30 transition-colors">
                <AlertTriangle size={14} className="text-rose-400" />
                <div className="text-left">
                  <p className="text-[10px] text-rose-300">Pending actions</p>
                  <p className="text-rose-300 text-sm font-bold leading-none">{totalPendingActions}</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Center ────────────────────────────────────────────────────
          Single banner that surfaces every actionable item across the school
          with deep-link buttons. The user can tackle the school's open work
          in one scan. */}
      {actions.length > 0 && (
        <div id="action-center" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-20">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/40 to-amber-50/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <AlertCircle size={15} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Action Center</h3>
                <p className="text-[10px] text-slate-500">{totalPendingActions} item{totalPendingActions > 1 ? "s" : ""} need attention across {actions.length} area{actions.length > 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {actions.map(a => {
              const tone = {
                rose:   { dot: "bg-rose-500",   text: "text-rose-700",   pill: "bg-rose-50 text-rose-700 border-rose-200",   hover: "hover:border-rose-300" },
                amber:  { dot: "bg-amber-500",  text: "text-amber-700",  pill: "bg-amber-50 text-amber-700 border-amber-200", hover: "hover:border-amber-300" },
                blue:   { dot: "bg-blue-500",   text: "text-blue-700",   pill: "bg-blue-50 text-blue-700 border-blue-200",   hover: "hover:border-blue-300" },
                violet: { dot: "bg-violet-500", text: "text-violet-700", pill: "bg-violet-50 text-violet-700 border-violet-200", hover: "hover:border-violet-300" },
              }[a.tone];
              const Icon = a.icon;
              return (
                <button key={a.key} onClick={() => navigate(a.to)}
                  className={`group flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white text-left transition-all ${tone.hover} hover:shadow-sm`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${tone.pill}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[12px] font-bold ${tone.text} truncate`}>{a.label}</p>
                      <span className={`shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black border ${tone.pill}`}>{a.count}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{a.description}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Today's Pulse — three KPI tiles side by side ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Today's attendance */}
        <button onClick={() => navigate("/attendance")}
          className="text-left bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 group">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Today · Attendance</p>
              <p className="text-xs text-slate-500 mt-0.5">Students {studentAtt?.total ?? 0} · Teachers {teacherAtt?.total ?? 0}</p>
            </div>
            <ClipboardCheck size={15} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          {studentAttPct !== null ? (
            <div className="flex items-center gap-3 mt-2">
              <Ring size={48} stroke={4} value={studentAttPct} color={studentAttPct >= 80 ? "#10b981" : studentAttPct >= 60 ? "#f59e0b" : "#ef4444"} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold text-slate-500">Students</span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">{studentAtt.present + (studentAtt.late ?? 0)}/{studentAtt.total}</span>
                </div>
                {teacherAttPct !== null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500">Teachers</span>
                    <span className={`text-[11px] font-bold tabular-nums ${teacherAttPct >= 80 ? "text-emerald-700" : teacherAttPct >= 60 ? "text-amber-700" : "text-rose-700"}`}>{teacherAttPct}%</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-600 mt-0.5">Teachers not marked yet</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mt-2">
              <Clock size={14} className="text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700">Not marked yet today</p>
            </div>
          )}
        </button>

        {/* Fee collection — this month with trend */}
        <button onClick={() => navigate("/fees")}
          className="text-left bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 group">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">This Month · Fees</p>
              <p className="text-xs text-slate-500 mt-0.5">{now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
            </div>
            <Wallet size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-2xl font-black text-slate-900 tabular-nums">{fmtCompact(monthCollected)}</p>
            <TrendChip delta={collectionDelta} />
          </div>
          <p className="text-[10px] text-slate-500">
            Demand <span className="font-bold text-slate-700">{fmtCompact(feeMonth?.totalDemand ?? 0)}</span>
            {feeMonth && feeMonth.totalDemand > 0 && (
              <span className="ml-1.5 text-emerald-600 font-bold">· {pct(monthCollected, feeMonth.totalDemand)}% rate</span>
            )}
          </p>
          {feeSummary && feeSummary.totalDemand > 0 && (
            <div className="mt-2.5">
              <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                <span>YTD collection</span>
                <span className="font-bold text-emerald-700">{collectionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${collectionRate}%` }} />
              </div>
            </div>
          )}
        </button>

        {/* New admissions / growth */}
        <button onClick={() => navigate("/students-home")}
          className="text-left bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 group">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Last 30 Days · New</p>
              <p className="text-xs text-slate-500 mt-0.5">Admissions snapshot</p>
            </div>
            <UserPlus size={15} className="text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 tabular-nums">{newThisMonth}</p>
            <span className="text-[11px] text-slate-500 font-semibold">new student{newThisMonth !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
            <div className="bg-blue-50 rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider">Active</p>
              <p className="text-sm font-black text-blue-700 tabular-nums">{schoolStats?.students.active ?? students.length}</p>
            </div>
            <div className="bg-violet-50 rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-violet-600 font-semibold uppercase tracking-wider">Ratio</p>
              <p className="text-sm font-black text-violet-700 tabular-nums">{schoolStats?.ratios.studentsPerTeacher ?? "—"}<span className="text-[9px] font-bold">:1</span></p>
            </div>
          </div>
        </button>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button onClick={() => navigate("/students-home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-blue-700 bg-blue-50 border-blue-100">
          <Users size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{students.length}</p>
          <p className="text-[10px] font-medium opacity-70">Students</p>
        </button>
        <button onClick={() => navigate("/teacher-home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-purple-700 bg-purple-50 border-purple-100">
          <GraduationCap size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{activeTeachers}</p>
          <p className="text-[10px] font-medium opacity-70">Active Teachers</p>
        </button>
        <button onClick={() => navigate("/subject-Home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-emerald-700 bg-emerald-50 border-emerald-100">
          <BookOpen size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{subjects.length}</p>
          <p className="text-[10px] font-medium opacity-70">Subjects</p>
        </button>
        <button onClick={() => navigate("/class-Home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-teal-700 bg-teal-50 border-teal-100">
          <Layers size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{classes.length}</p>
          <p className="text-[10px] font-medium opacity-70">Classes</p>
        </button>
        <button onClick={() => navigate("/library")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-rose-700 bg-rose-50 border-rose-100">
          <Library size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{library?.totalBooks ?? 0}</p>
          <p className="text-[10px] font-medium opacity-70">Library Books</p>
        </button>
        <button onClick={() => navigate("/fees")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-amber-700 bg-amber-50 border-amber-100">
          <CreditCard size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{feeSummary?.totalInvoices ?? 0}</p>
          <p className="text-[10px] font-medium opacity-70">Invoices</p>
        </button>
      </div>

      {/* ── Staff Coverage + Finance Health row ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Staff coverage card */}
        <button onClick={() => navigate("/assignments")}
          className="group text-left bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <UserCog size={13} className="text-indigo-500" /> Staff Coverage
            </h3>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <CoverageTile label="Class teachers"   filled={classes.length - classGapCount} total={classes.length} tone="indigo" />
            <CoverageTile label="Section teachers" filled={(schoolStats ? (schoolStats as any).byClass.length : 0) || ((classes as any[]).reduce((s: number, c: any) => s + (c.sections?.length ?? 0), 0)) - sectionGapCount}
              total={(classes as any[]).reduce((s: number, c: any) => s + (c.sections?.length ?? 0), 0)} tone="violet" />
            <CoverageTile label="Subject incharges" filled={subjects.length - subjectInchargeMissing} total={subjects.length} tone="teal" />
          </div>
          {totalStaffGaps > 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-700">
              <AlertTriangle size={11} />
              <span><strong>{totalStaffGaps}</strong> assignment gap{totalStaffGaps > 1 ? "s" : ""} across staff coverage</span>
              <ArrowRight size={11} className="ml-auto" />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-700">
              <CheckCircle2 size={11} />
              <span>All teachers, sections and subject incharges are assigned</span>
            </div>
          )}
        </button>

        {/* Fee invoice status breakdown */}
        <button onClick={() => navigate("/fees?tab=invoices")}
          className="group text-left bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Receipt size={13} className="text-amber-500" /> Invoice Status — YTD
            </h3>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
          </div>
          {feeSummary ? (
            <>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <InvoiceTile icon={CheckCircle2} label="Paid" value={feeSummary.paid} tone="emerald" />
                <InvoiceTile icon={Clock} label="Pending" value={feeSummary.pending} tone="amber" />
                <InvoiceTile icon={AlertTriangle} label="Overdue" value={feeSummary.overdue} tone="rose" />
                <InvoiceTile icon={XCircle} label="Cancelled" value={(feeSummary as any).cancelled ?? 0} tone="slate" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <FinSnap label="Demand" value={fmtCompact(feeSummary.totalDemand)} bg="bg-blue-50" text="text-blue-700" />
                <FinSnap label="Collected" value={fmtCompact(feeSummary.totalCollected)} bg="bg-emerald-50" text="text-emerald-700" />
                <FinSnap label="Outstanding" value={fmtCompact(feeSummary.outstanding)} bg="bg-orange-50" text="text-orange-700" />
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No fee data available</p>
          )}
        </button>
      </div>

      {/* ── Library & School Summary row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Library Overview */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Library size={13} className="text-rose-500" /> Library Health
            </h3>
            <button onClick={() => navigate("/library")}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5">
              View <ChevronRight size={10} />
            </button>
          </div>
          <div className="p-4">
            {library ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-slate-800">{library.totalBooks ?? 0}</p>
                  <p className="text-[9px] text-slate-500">Total Books</p>
                </div>
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-blue-700">{library.activeIssues ?? 0}</p>
                  <p className="text-[9px] text-blue-600">Issued</p>
                </div>
                <div className={`rounded-lg px-3 py-2 text-center ${overdueIssues > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                  <p className={`text-sm font-bold ${overdueIssues > 0 ? "text-red-700" : "text-slate-500"}`}>{overdueIssues}</p>
                  <p className={`text-[9px] ${overdueIssues > 0 ? "text-red-600" : "text-slate-400"}`}>Overdue</p>
                </div>
                <div className={`rounded-lg px-3 py-2 text-center ${pendingRequests > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                  <p className={`text-sm font-bold ${pendingRequests > 0 ? "text-amber-700" : "text-slate-500"}`}>{pendingRequests}</p>
                  <p className={`text-[9px] ${pendingRequests > 0 ? "text-amber-600" : "text-slate-400"}`}>Requests</p>
                </div>
                <div className={`rounded-lg px-3 py-2 text-center ${pendingRenewals > 0 ? "bg-purple-50" : "bg-slate-50"}`}>
                  <p className={`text-sm font-bold ${pendingRenewals > 0 ? "text-purple-700" : "text-slate-500"}`}>{pendingRenewals}</p>
                  <p className={`text-[9px] ${pendingRenewals > 0 ? "text-purple-600" : "text-slate-400"}`}>Renewals</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Library size={20} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">Library data unavailable</p>
              </div>
            )}
          </div>
        </div>

        {/* School Summary */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Activity size={13} className="text-indigo-500" /> School Summary
            </h3>
          </div>
          <div data-testid="dashboard-school-summary" className="p-4 space-y-2.5">
            {[{
              label: "Total Enrollments", value: students.length, icon: Users, color: "text-blue-600", testId: "dashboard-kpi-students" },
              { label: "Active Teachers", value: activeTeachers, icon: GraduationCap, color: "text-purple-600", testId: "dashboard-kpi-teachers" },
              { label: "Classes Running", value: classes.length, icon: Layers, color: "text-teal-600", testId: "dashboard-kpi-classes" },
              { label: "Subjects Offered", value: subjects.length, icon: BookOpen, color: "text-emerald-600", testId: "dashboard-kpi-subjects" },
              { label: "Pending Leave Requests", value: pendingLeaves.length + pendingTeacherLeaves.length, icon: CalendarDays, color: (pendingLeaves.length + pendingTeacherLeaves.length) > 0 ? "text-amber-600" : "text-slate-400", testId: "dashboard-kpi-pending-leaves" },
              { label: "Notices Awaiting Approval", value: pendingNotices.length, icon: Bell, color: pendingNotices.length > 0 ? "text-blue-600" : "text-slate-400", testId: "dashboard-kpi-pending-notices" },
            ].map((row) => (
              <div key={row.label} data-testid={row.testId} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <row.icon size={13} className={`${row.color} opacity-70`} />
                  <span className="text-xs text-slate-600">{row.label}</span>
                </div>
                <span className={`text-xs font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── School Demographics & Insights ──────────────────────────────────── */}
      {schoolStats && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={13} className="text-emerald-500" /> School Demographics &amp; Insights
          </h2>

          {/* Top row: gender + teacher stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Student Gender */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Users size={13} className="text-blue-500" /> Student Gender Split
              </h3>
              <div className="space-y-2">
                {schoolStats.students.byGender.map(g => {
                  const p = schoolStats.students.total > 0 ? Math.round((g.count / schoolStats.students.total) * 100) : 0;
                  const color = g.gender === "MALE" ? "bg-blue-500" : g.gender === "FEMALE" ? "bg-pink-500" : "bg-slate-400";
                  const textColor = g.gender === "MALE" ? "text-blue-700" : g.gender === "FEMALE" ? "text-pink-700" : "text-slate-600";
                  return (
                    <div key={g.gender}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-[10px] font-semibold capitalize ${textColor}`}>{g.gender.toLowerCase()}</span>
                        <span className="text-[10px] text-slate-500">{g.count} ({p}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Total Students</span>
                  <span className="text-xs font-bold text-slate-700">{schoolStats.students.total}</span>
                </div>
                {schoolStats.students.withDisability > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">With Disability</span>
                    <span className="text-xs font-bold text-amber-600">{schoolStats.students.withDisability}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Teacher Stats */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <GraduationCap size={13} className="text-purple-500" /> Teacher Gender Split
              </h3>
              <div className="space-y-2">
                {schoolStats.teachers.byGender.map(g => {
                  const p = schoolStats.teachers.total > 0 ? Math.round((g.count / schoolStats.teachers.total) * 100) : 0;
                  const color = g.gender === "MALE" ? "bg-blue-500" : g.gender === "FEMALE" ? "bg-pink-500" : "bg-slate-400";
                  const textColor = g.gender === "MALE" ? "text-blue-700" : g.gender === "FEMALE" ? "text-pink-700" : "text-slate-600";
                  return (
                    <div key={g.gender}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-[10px] font-semibold capitalize ${textColor}`}>{g.gender.toLowerCase()}</span>
                        <span className="text-[10px] text-slate-500">{g.count} ({p}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Total Teachers</span>
                  <span className="text-xs font-bold text-slate-700">{schoolStats.teachers.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Active</span>
                  <span className="text-xs font-bold text-emerald-600">{schoolStats.teachers.active}</span>
                </div>
              </div>
            </div>

            {/* Ratios */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-emerald-500" /> Key Ratios
              </h3>
              <div className="space-y-3">
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-emerald-600 font-medium">Students per Teacher</p>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{schoolStats.ratios.studentsPerTeacher}</p>
                </div>
                <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-blue-600 font-medium">Active Students</p>
                  <p className="text-xl font-extrabold text-blue-700 mt-0.5">{schoolStats.students.active}</p>
                  <p className="text-[9px] text-blue-500 mt-0.5">of {schoolStats.students.total} enrolled</p>
                </div>
                {schoolStats.currentSession && (
                  <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-indigo-600 font-medium">Current Session</p>
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">{schoolStats.currentSession.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: transport + class enrollment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Transport */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Bus size={13} className="text-teal-500" /> Transport Opt-in
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Opted</span>
                    <span className="text-[10px] font-bold text-teal-700">{schoolStats.transport.opted} ({schoolStats.transport.optedPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${schoolStats.transport.optedPercent}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-slate-400">Not opted: {schoolStats.transport.notOpted}</span>
                    <span className="text-[9px] text-slate-400">Total: {schoolStats.students.total}</span>
                  </div>
                </div>
              </div>
              {schoolStats.transport.byZone.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Zone Distribution</p>
                  {schoolStats.transport.byZone.map(z => (
                    <div key={z.zoneName} className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] font-medium text-teal-700">{z.zoneName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">₹{z.zonePrice.toLocaleString("en-IN")}/mo</span>
                        <span className="text-[10px] font-bold text-teal-800">{z.count} students</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrollment by Class */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Layers size={13} className="text-indigo-500" /> Enrollment by Class
              </h3>
              {schoolStats.byClass.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {schoolStats.byClass.map(c => {
                    const max = Math.max(...schoolStats.byClass.map(x => x.count), 1);
                    const p = Math.round((c.count / max) * 100);
                    return (
                      <div key={c.className}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[10px] font-medium text-slate-600">{c.className}</span>
                          <span className="text-[10px] text-slate-400">{c.count} students</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-400 transition-all duration-700" style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No enrollment data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Access Grid ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {QUICK_LINKS.map((link) => (
            <button key={link.to} onClick={() => navigate(link.to)}
              className="group text-left bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-slate-200 transition-all relative">
              <div className={`w-8 h-8 ${link.bg} rounded-lg flex items-center justify-center mb-2`}>
                <link.icon size={15} className={link.text} />
              </div>
              <p className="text-slate-800 text-xs font-semibold">{link.label}</p>
              <p className="text-slate-400 text-[9px] mt-0.5 leading-snug">{link.desc}</p>
              <div className={`flex items-center gap-1 mt-1.5 text-[9px] font-medium ${link.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Open <ChevronRight size={9} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────────────────── */
const CoverageTile = ({ label, filled, total, tone }: { label: string; filled: number; total: number; tone: "indigo" | "violet" | "teal" }) => {
  const p = total > 0 ? Math.round((filled / total) * 100) : 100;
  const ok = p === 100;
  const cfg = {
    indigo: { bar: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50" },
    violet: { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
    teal:   { bar: "bg-teal-500",   text: "text-teal-700",   bg: "bg-teal-50" },
  }[tone];
  return (
    <div className={`rounded-xl border border-slate-200 p-2.5 ${ok ? cfg.bg : "bg-amber-50/40"}`}>
      <p className={`text-[9px] font-bold uppercase tracking-wider truncate ${ok ? cfg.text : "text-amber-700"}`}>{label}</p>
      <p className="text-base font-black tabular-nums mt-0.5 text-slate-800">{filled}<span className="text-[10px] font-bold text-slate-400">/{total}</span></p>
      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden mt-1">
        <div className={`h-full rounded-full transition-all duration-700 ${ok ? cfg.bar : "bg-amber-400"}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
};

const InvoiceTile = ({ icon: Icon, label, value, tone }: { icon: typeof Bell; label: string; value: number; tone: "emerald" | "amber" | "rose" | "slate" }) => {
  const cfg = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   icon: "text-amber-500" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    icon: "text-rose-500" },
    slate:   { bg: "bg-slate-50",   text: "text-slate-600",   icon: "text-slate-400" },
  }[tone];
  return (
    <div className={`rounded-lg ${cfg.bg} px-2.5 py-2 flex items-center gap-2`}>
      <Icon size={13} className={cfg.icon} />
      <div className="min-w-0">
        <p className={`text-base font-black tabular-nums leading-none ${cfg.text}`}>{value}</p>
        <p className={`text-[9px] font-semibold uppercase tracking-wider mt-0.5 truncate ${cfg.text} opacity-80`}>{label}</p>
      </div>
    </div>
  );
};

const FinSnap = ({ label, value, bg, text }: { label: string; value: string; bg: string; text: string }) => (
  <div className={`rounded-lg ${bg} px-2.5 py-1.5`}>
    <p className={`text-[9px] font-bold uppercase tracking-wider ${text}`}>{label}</p>
    <p className={`text-sm font-black tabular-nums ${text}`}>{value}</p>
  </div>
);

export default Dashboard;
