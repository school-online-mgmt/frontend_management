import { useState, useMemo } from "react";
import {
  Plus, BookOpen, Filter, Search, X,
  ChevronRight, Loader2, CheckCircle2, XCircle,
  BarChart3, AlignJustify, BookMarked, FlaskConical,
  Languages, Calculator, Palette, UserCheck, AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import CreateSubject from "../../components/CreateSubject.tsx";
import type { Subject, Session } from "../../api/types";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSession } from "../../context/SessionContext";

/* ── Subject type config ─────────────────────────────────────────────────── */
const TYPE_CONFIG: Record<string, { label: string; icon: typeof BookOpen; bg: string; text: string; border: string }> = {
  CORE:        { label: "Core",        icon: BookOpen,     bg: "bg-indigo-50",   text: "text-indigo-700",  border: "border-indigo-100" },
  ELECTIVE:    { label: "Elective",    icon: BookMarked,   bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-100" },
  LAB:         { label: "Lab",         icon: FlaskConical, bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-100" },
  LANGUAGE:    { label: "Language",    icon: Languages,    bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-100"  },
  MATHEMATICS: { label: "Mathematics", icon: Calculator,   bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-100"   },
  ARTS:        { label: "Arts",        icon: Palette,      bg: "bg-pink-50",     text: "text-pink-700",    border: "border-pink-100"   },
};
function getTypeConfig(type: string) {
  return TYPE_CONFIG[type?.toUpperCase()] ?? {
    label: type ?? "Other",
    icon: BookOpen,
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
  };
}

/* ── Stat Card ───────────────────────────────────────────────────────────── */
const StatCard = ({
  icon: Icon, label, value, sub, bg, iconColor,
}: {
  icon: typeof BookOpen; label: string; value: number; sub?: string;
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

/* ── Subject Card (Grid) ─────────────────────────────────────────────────── */
const SubjectCard = ({
  subject, sessionName, teacherName, onClick,
}: { subject: Subject; sessionName?: string; teacherName?: string; onClick: () => void }) => {
  const cfg = getTypeConfig(subject.type);
  const TypeIcon = cfg.icon;
  return (
    <div
      data-testid={`subject-card-${subject.slug}`}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group flex flex-col"
    >
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-11 h-11 ${cfg.bg} border ${cfg.border} rounded-xl flex items-center justify-center shrink-0`}>
            <TypeIcon size={18} className={cfg.text} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
              {subject.name}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">#{subject.slug}</p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          subject.isActive
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${subject.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
          {subject.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="border-t border-slate-100 mx-5" />

      <div className="px-5 py-3.5 space-y-2 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BookMarked size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{subject.bookName || "No textbook assigned"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            <TypeIcon size={10} /> {cfg.label}
          </span>
          {sessionName && (
            <span className="text-slate-400 truncate">{sessionName}</span>
          )}
        </div>
        {/* Teacher Incharge */}
        <div className="flex items-center gap-2 text-xs">
          <UserCheck size={12} className={teacherName ? "text-indigo-400 shrink-0" : "text-amber-400 shrink-0"} />
          {teacherName ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 truncate max-w-[160px]">
              {teacherName} <span className="text-[8px] opacity-60 font-bold">IC</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle size={9} /> No Incharge
            </span>
          )}
        </div>
        {subject.description && (
          <p className="text-xs text-slate-400 truncate">{subject.description}</p>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">View details</span>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
      </div>
    </div>
  );
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
const SubjectPage = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Session id comes from the layout-level SessionContext.
  const { selectedSessionId: selectedSession, sessions: ctxSessions, loading: sessionsLoading } = useSession();
  const sessions = ctxSessions as unknown as Session[];
  const sessionPicked = !!selectedSession;
  const [selectedType, setSelectedType]           = useState("");
  const [statusFilter, setStatusFilter]           = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch]                       = useState("");
  const [showFilters, setShowFilters]             = useState(false);
  const [viewMode, setViewMode]                   = useState<"grid" | "table">("grid");

  const {
    data: subjects = [], isLoading: subjectsLoading, refetch: refetchSubjects,
  } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: () => api.getSubjects(),
    staleTime: 5 * 60 * 1000,
    enabled: sessionPicked,
  });

  const {
    data: teachers = [],
  } = useQuery<{ id: string; name: string; qualification?: string }[]>({
    queryKey: ["teachers"],
    queryFn: async () => {
      const data = await api.getTeachers();
      const list = Array.isArray(data) ? data : data?.teachers ?? [];
      return list.filter((t: any) => t.isActive !== false);
    },
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = subjectsLoading || sessionsLoading;

  /* ── Session lookup map ──────────────────────────────────────────────── */
  const sessionMap = useMemo(() => {
    const m: Record<string, string> = {};
    sessions.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [sessions]);

  /* ── Teacher lookup map ──────────────────────────────────────────────── */
  const teacherMap = useMemo(() => {
    const m: Record<string, string> = {};
    teachers.forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [teachers]);

  /* ── Stats ───────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const active   = subjects.filter((s) => s.isActive).length;
    const inactive = subjects.filter((s) => !s.isActive).length;
    const assigned = subjects.filter((s) => !!s.teacherId).length;
    const types    = [...new Set(subjects.map((s) => s.type))].length;
    return { total: subjects.length, active, inactive, assigned, types };
  }, [subjects]);

  /* ── Derived type options ────────────────────────────────────────────── */
  const typeOptions = useMemo(
    () => [...new Set(subjects.map((s) => s.type).filter(Boolean))].sort(),
    [subjects],
  );

  /* ── Filtered list ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      if (selectedSession && s.sessionId !== selectedSession) return false;
      if (selectedType   && s.type !== selectedType)          return false;
      if (statusFilter === "active"   && !s.isActive)         return false;
      if (statusFilter === "inactive" &&  s.isActive)         return false;
      if (q) {
        const hay = `${s.name} ${s.slug} ${s.bookName ?? ""} ${s.type ?? ""} ${s.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [subjects, selectedSession, selectedType, statusFilter, search]);

  const activeFilterCount = [
    selectedType, statusFilter !== "all" ? statusFilter : "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedType(""); setStatusFilter("all"); setSearch("");
  };

  /* ── Full-page loading ───────────────────────────────────────────────── */
  if (isLoading && subjects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-500">Loading subjects…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      {isCreateModalOpen && (
        <CreateSubject
          onClose={() => setIsCreateModalOpen(false)}
          onRefresh={() => refetchSubjects()}
        />
      )}

      <PageHeader
        icon={BookOpen}
        title="Subjects"
        gradient={MODULE_THEMES.academics}
        subtitle="Manage curriculum subjects, track teacher assignments and course coverage"
        onRefresh={() => refetchSubjects()}
        refreshing={isLoading}
        primaryActions={
          <button data-testid="create-subject-btn" onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedSession}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition backdrop-blur-sm shrink-0">
            <Plus size={14} /> Create Subject
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* Empty gate */}
        {!selectedSession && !sessionsLoading && (
          <EmptySessionState entityPlural="subjects" />
        )}

        {selectedSession && (<>
        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}   label="Total Subjects"  value={stats.total}    bg="bg-indigo-50"  iconColor="text-indigo-600" />
          <StatCard icon={CheckCircle2} label="Active"        value={stats.active}   bg="bg-emerald-50" iconColor="text-emerald-600"
            sub={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of subjects` : undefined}
          />
          <StatCard icon={UserCheck}  label="With Teachers"  value={stats.assigned} bg="bg-violet-50"  iconColor="text-violet-600"
            sub={stats.total > 0 ? `${Math.round((stats.assigned / stats.total) * 100)}% coverage` : undefined}
          />
          <StatCard icon={AlertTriangle} label="Unassigned"  value={stats.total - stats.assigned} bg="bg-amber-50" iconColor="text-amber-600" />
        </div>

        {/* ── Search & Filters ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, slug, book or type…"
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 placeholder-slate-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
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

            {/* Grid / Table toggle */}
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

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Subject Type</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedType("")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!selectedType ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                  >
                    All
                  </button>
                  {typeOptions.map((t) => {
                    const cfg = getTypeConfig(t);
                    const TypeIcon = cfg.icon;
                    return (
                      <button
                        key={t}
                        onClick={() => setSelectedType(selectedType === t ? "" : t)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${selectedType === t ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                      >
                        <TypeIcon size={10} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "active", "inactive"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        statusFilter === s
                          ? s === "active"   ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : s === "inactive" ? "bg-slate-200 text-slate-700 border-slate-300"
                          :                   "bg-indigo-600 text-white border-indigo-600"
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
            </div>
          )}
        </div>

        {/* ── Result count ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{subjects.length}</span> subjects
            {selectedSession && sessionMap[selectedSession] && (
              <span className="ml-1 text-slate-400">in <span className="font-medium text-slate-600">{sessionMap[selectedSession]}</span></span>
            )}
          </p>
          {isLoading && subjects.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={13} className="animate-spin" /> Refreshing…
            </div>
          )}
        </div>

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <BookOpen size={24} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">No subjects found</p>
            <p className="text-sm text-slate-400">
              {search || activeFilterCount > 0
                ? "Try adjusting your search or filters."
                : "Create your first subject to get started."}
            </p>
            {search || activeFilterCount > 0 ? (
              <button onClick={clearFilters} className="mt-1 text-sm text-emerald-600 hover:underline font-medium">Clear filters</button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-1 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition"
              >
                <Plus size={14} /> Create Subject
              </button>
            )}
          </div>

        ) : viewMode === "grid" ? (
          /* ── Grid View ───────────────────────────────────────────────────── */
          <div data-testid="subject-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                sessionName={sessionMap[subject.sessionId]}
                teacherName={subject.teacherId ? teacherMap[subject.teacherId] : undefined}
                onClick={() => navigate(`/subject/${subject.slug}`)}
              />
            ))}
          </div>

        ) : (
          /* ── Table View ──────────────────────────────────────────────────── */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Textbook</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Session</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Incharge</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((subject) => {
                    const cfg = getTypeConfig(subject.type);
                    const TypeIcon = cfg.icon;
                    return (
                      <tr
                        key={subject.id}
                        data-testid={`subject-row-${subject.slug}`}
                        onClick={() => navigate(`/subject/${subject.slug}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 ${cfg.bg} border ${cfg.border} rounded-xl flex items-center justify-center shrink-0`}>
                              <TypeIcon size={15} className={cfg.text} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {subject.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">#{subject.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            <TypeIcon size={10} /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-xs text-slate-500 truncate max-w-[160px] block">{subject.bookName || "—"}</span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-xs text-slate-500">{sessionMap[subject.sessionId] ?? "—"}</span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          {subject.teacherId ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-medium max-w-[150px] truncate" title={teacherMap[subject.teacherId]}>
                              <UserCheck size={11} /> {teacherMap[subject.teacherId] ?? "Assigned"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
                              <AlertTriangle size={11} /> No Incharge
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            subject.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${subject.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {subject.isActive ? "Active" : "Inactive"}
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
        </>)}
      </div>
    </div>
  );
};

export default SubjectPage;

