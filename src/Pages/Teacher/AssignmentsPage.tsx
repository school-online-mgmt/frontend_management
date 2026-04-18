import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Loader2, X,
  ChevronRight, School, BookOpen, UserCheck,
  RefreshCw, GraduationCap, Users, ClipboardList, UserCog,
  UserMinus, Edit2, ChevronDown, Layers, Shield, Info,
} from "lucide-react";
import api from "../../api/api";
import PageHeader from "../../components/PageHeader";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface TeacherRef  { id: string; name: string; qualification?: string }
interface SectionRef  { id: string; name: string; slug: string; teacherId?: string | null; teacher?: TeacherRef | null }
interface ClassEntry  { id: string; name: string; slug: string; teacher?: TeacherRef | null; sections: SectionRef[] }
interface SubjectGap  { sectionId: string; sectionName: string; classId: string; className: string; subjectId: string; subjectName: string }
interface SubjectEntry { id: string; name: string; slug: string; bookName?: string; teacherId?: string | null; sessionId?: string; type?: string; teacherName?: string }

interface AssignedPair {
  subjectId: string; subjectName: string;
  sectionId: string; sectionName: string;
  classId: string; className: string;
  teacherId: string; teacherName: string;
}

type AssignTarget =
  | { type: "class";            id: string; label: string; currentTeacherId?: string }
  | { type: "section";          id: string; label: string; currentTeacherId?: string }
  | { type: "subject-incharge"; subjectId: string; subjectData: SubjectEntry; label: string; currentTeacherId?: string }
  | { type: "subject";          subjectId: string; sectionId: string; label: string; currentTeacherId?: string };

type TabKey = "classes-sections" | "subjects-mapping";

/* ── Assign Modal ─────────────────────────────────────────────────────────── */
const AssignModal = ({
  target, teachers, onClose, onDone,
}: { target: AssignTarget; teachers: TeacherRef[]; onClose: () => void; onDone: () => void }) => {
  const [selected, setSelected] = useState(target.currentTeacherId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const isReassign = !!target.currentTeacherId;

  const filteredTeachers = teachers.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.qualification?.toLowerCase().includes(q) ?? false);
  });

  const handleAssign = async () => {
    if (!selected) { setError("Please select a teacher"); return; }
    setSubmitting(true); setError("");
    try {
      if (target.type === "class") {
        await api.updateClass(target.id, { teacherId: selected });
      } else if (target.type === "section") {
        await api.updateSection(target.id, { teacherId: selected });
      } else if (target.type === "subject-incharge") {
        await api.updateSubject(target.subjectId, { teacherId: selected });
      } else {
        if (target.currentTeacherId) {
          await api.removeTeacherFromSubject(target.subjectId, { teacherId: target.currentTeacherId });
        }
        await api.addTeacherToSubject(target.subjectId, { teacherId: selected, sectionId: target.sectionId });
      }
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Assignment failed");
    } finally { setSubmitting(false); }
  };

  const handleUnassign = async () => {
    setUnassigning(true); setError("");
    try {
      if (target.type === "class") {
        await api.updateClass(target.id, { teacherId: null });
      } else if (target.type === "section") {
        await api.updateSection(target.id, { teacherId: null });
      } else if (target.type === "subject-incharge") {
        await api.updateSubject(target.subjectId, { teacherId: null });
      } else if (target.currentTeacherId) {
        await api.removeTeacherFromSubject(target.subjectId, { teacherId: target.currentTeacherId });
      }
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Unassignment failed");
    } finally { setUnassigning(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{isReassign ? "Change Teacher" : "Assign Teacher"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{target.label}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"><X size={16} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Search teachers */}
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search teachers by name or qualification…"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-slate-50 placeholder-slate-400"
          />

          {/* Teacher select */}
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
            <option value="">Select a teacher…</option>
            {filteredTeachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.qualification ? ` (${t.qualification})` : ""}</option>
            ))}
          </select>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            {isReassign && (
              <button onClick={handleUnassign} disabled={unassigning || submitting}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                {unassigning ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
                {unassigning ? "Removing…" : "Unassign"}
              </button>
            )}
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleAssign} disabled={submitting || unassigning}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
              {submitting ? (isReassign ? "Changing…" : "Assigning…") : (isReassign ? "Change" : "Assign")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Coverage Progress Bar ─────────────────────────────────────────────────── */
const CoverageBar = ({ assigned, total, color }: { assigned: number; total: number; color: string }) => {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${assigned === total ? "bg-emerald-500" : color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold shrink-0 tabular-nums ${assigned === total ? "text-emerald-600" : "text-slate-600"}`}>{assigned}/{total}</span>
      <span className={`text-xs font-semibold shrink-0 ${assigned === total ? "text-emerald-600" : "text-amber-600"}`}>{pct}%</span>
    </div>
  );
};

/* ── Teacher Chip ──────────────────────────────────────────────────────────── */
const AssignedChip = ({ teacher, onReassign, variant }: { teacher: TeacherRef; onReassign?: () => void; variant?: "incharge" }) => (
  <button onClick={onReassign} disabled={!onReassign}
    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 max-w-[200px] transition-all
      ${variant === "incharge"
        ? "bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
        : "bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100"
      }
      ${onReassign ? "active:scale-95 cursor-pointer" : "cursor-default"}`}>
    {variant === "incharge" ? <Shield size={11} className="shrink-0" /> : <GraduationCap size={12} className="shrink-0" />}
    <span className="text-xs font-semibold truncate">{teacher.name}</span>
    {variant === "incharge" && <span className="text-[9px] font-bold uppercase tracking-wide opacity-60">IC</span>}
    {onReassign && <Edit2 size={11} className="shrink-0 opacity-50 ml-0.5" />}
  </button>
);

const UnassignedChip = ({ onAssign, label }: { onAssign: () => void; label?: string }) => (
  <button onClick={onAssign}
    className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2.5 py-1 hover:bg-amber-100 active:scale-95 transition-all">
    <AlertTriangle size={12} className="shrink-0" />
    <span className="text-xs font-semibold">{label ?? "Unassigned"}</span>
    <span className="text-[10px] text-amber-500 hidden sm:inline">· Assign</span>
  </button>
);

/* ── Stat Card ─────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, assigned, total, bg, iconColor, barColor, onClick, active }: {
  icon: typeof School; label: string; assigned: number; total: number;
  bg: string; iconColor: string; barColor: string; onClick: () => void; active?: boolean;
}) => {
  const gaps = total - assigned;
  return (
    <button onClick={onClick}
      className={`bg-white rounded-2xl border shadow-sm p-5 text-left hover:shadow-md transition-all group w-full ${active ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100 hover:border-slate-200"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
        {gaps > 0
          ? <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full animate-pulse">{gaps} gap{gaps > 1 ? "s" : ""}</span>
          : <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600"><CheckCircle2 size={11} /> All set</span>
        }
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{assigned}<span className="text-sm font-medium text-slate-400">/{total}</span></p>
      <p className="text-xs text-slate-500 font-medium mt-0.5 mb-3">{label}</p>
      <CoverageBar assigned={assigned} total={total} color={barColor} />
    </button>
  );
};

/* ── Main Page ────────────────────────────────────────────────────────────── */
const AssignmentsPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [classes, setClasses]         = useState<ClassEntry[]>([]);
  const [subjectGaps, setSubjectGaps] = useState<SubjectGap[]>([]);
  const [totalSubjectPairs, setTotalSubjectPairs] = useState(0);
  const [teachers, setTeachers]       = useState<TeacherRef[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectEntry[]>([]);
  const [assignedPairs, setAssignedPairs] = useState<AssignedPair[]>([]);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [activeTab, setActiveTab]     = useState<TabKey>("classes-sections");
  const [search, setSearch]           = useState("");

  const [expandedClasses, setExpandedClasses]   = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const toggleClass   = (id: string) => setExpandedClasses(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSubject = (id: string) => setExpandedSubjects(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  /* ── load assigned pairs ─────────────────────────────────────────────────── */
  const loadAssignedPairs = useCallback(async (classList: ClassEntry[]) => {
    const pairs: AssignedPair[] = [];
    await Promise.all(
      classList.flatMap(cls =>
        cls.sections.map(async sec => {
          try {
            const result = await api.getSectionById(sec.id);
            const sectionDetail = result?.section ?? result;
            for (const a of (sectionDetail?.subjectAssignments ?? [])) {
              if (a.teachers && a.subjects) {
                pairs.push({
                  subjectId: a.subjects.id, subjectName: a.subjects.name,
                  sectionId: sec.id, sectionName: sec.name,
                  classId: cls.id, className: cls.name,
                  teacherId: a.teachers.id, teacherName: a.teachers.name,
                });
              }
            }
          } catch { /* ignore */ }
        })
      )
    );
    setAssignedPairs(pairs);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const [classResult, gapsResult, teacherResult, subjectResult] = await Promise.allSettled([
        api.getClasses(),
        api.getStaffGaps(),
        api.getTeachers(),
        api.getSubjects(),
      ]);

      const errors: string[] = [];
      let classList: ClassEntry[] = [];
      let teacherList: TeacherRef[] = [];

      if (classResult.status === "fulfilled") {
        const d = classResult.value;
        classList = Array.isArray(d) ? d : d?.classes ?? [];
        setClasses(classList);
        setExpandedClasses(new Set(
          classList
            .filter((c: ClassEntry) => !c.teacher || c.sections.some((s: SectionRef) => !s.teacher))
            .map((c: ClassEntry) => c.id)
        ));
      } else { errors.push("classes"); }

      if (gapsResult.status === "fulfilled") {
        const gaps: SubjectGap[] = gapsResult.value.subjectGaps ?? [];
        setSubjectGaps(gaps);
        setTotalSubjectPairs(gapsResult.value.totalSubjectSectionPairs ?? 0);
        setExpandedSubjects(new Set(gaps.map((g: SubjectGap) => g.subjectId)));
      } else { errors.push("subject gaps"); }

      if (teacherResult.status === "fulfilled") {
        const d = teacherResult.value;
        const list = Array.isArray(d) ? d : d?.teachers ?? [];
        teacherList = list.filter((t: any) => t.isActive !== false);
        setTeachers(teacherList);
      } else { errors.push("teachers"); }

      if (subjectResult.status === "fulfilled") {
        const subjects = Array.isArray(subjectResult.value) ? subjectResult.value : [];
        // Enrich with teacher name from teacher list
        const enriched = subjects.map((s: SubjectEntry) => ({
          ...s,
          teacherName: s.teacherId ? (teacherList.find(t => t.id === s.teacherId)?.name ?? undefined) : undefined,
        }));
        setAllSubjects(enriched);
      } else { errors.push("subjects"); }

      if (errors.length) setLoadError(`Failed to load: ${errors.join(", ")}.`);

      // Load assigned pairs after classes are known
      if (classList.length) await loadAssignedPairs(classList);
    } catch {
      setLoadError("Unexpected error loading assignment data.");
    } finally { setLoading(false); }
  }, [loadAssignedPairs]);

  useEffect(() => { load(); }, [load]);

  /* ── Derived ─────────────────────────────────────────────────────────────── */
  const allSections     = classes.flatMap(c => c.sections.map(s => ({ ...s, className: c.name, classId: c.id })));
  const classAssigned   = classes.filter(c => !!c.teacher).length;
  const sectionAssigned = allSections.filter(s => !!s.teacher).length;
  const subjectAssigned = totalSubjectPairs - subjectGaps.length;
  const subjectInchargeCount = allSubjects.filter(s => !!s.teacherId).length;

  // Build subject → section map from assignedPairs + subjectGaps
  const subjectSectionMap = new Map<string, {
    assigned: AssignedPair[];
    unassigned: SubjectGap[];
  }>();
  allSubjects.forEach(s => subjectSectionMap.set(s.id, { assigned: [], unassigned: [] }));
  assignedPairs.forEach(p => subjectSectionMap.get(p.subjectId)?.assigned.push(p));
  subjectGaps.forEach(g => subjectSectionMap.get(g.subjectId)?.unassigned.push(g));

  const q = search.trim().toLowerCase();

  const filteredClasses = classes.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.teacher?.name.toLowerCase().includes(q) ||
    c.sections.some(s => s.name.toLowerCase().includes(q) || s.teacher?.name.toLowerCase().includes(q))
  );
  const filteredSubjects = allSubjects.filter(s =>
    !q || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) ||
    (s.teacherName?.toLowerCase().includes(q) ?? false) || (s.type?.toLowerCase().includes(q) ?? false)
  );

  const TABS: { key: TabKey; label: string; icon: typeof School; count?: number }[] = [
    { key: "classes-sections", label: "Classes & Sections", icon: School, count: classes.length - classAssigned + allSections.length - sectionAssigned },
    { key: "subjects-mapping", label: "Subjects & Section Mapping", icon: BookOpen, count: allSubjects.length - subjectInchargeCount + subjectGaps.length },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <Loader2 size={28} className="animate-spin text-indigo-400 mx-auto" />
        <p className="text-sm text-slate-500">Loading assignment data…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50">
      {assignTarget && (
        <AssignModal
          target={assignTarget} teachers={teachers}
          onClose={() => setAssignTarget(null)}
          onDone={() => { setAssignTarget(null); load(); }}
        />
      )}

      {loadError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-red-600 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg max-w-lg">
          <AlertTriangle size={14} className="shrink-0" />{loadError}
          <button onClick={() => setLoadError(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      <PageHeader
        icon={UserCog} title="Staff Assignments"
        gradient="from-rose-600 via-pink-600 to-fuchsia-600"
        subtitle="Assign teachers to classes, sections, and subjects — manage incharges and section-level mappings"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/teacher-home")}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition backdrop-blur-sm">
              <Users size={14} /> Manage Teachers
            </button>
            <button onClick={load}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition backdrop-blur-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={School}       label="Class teachers assigned"    assigned={classAssigned}   total={classes.length}     bg="bg-indigo-50" iconColor="text-indigo-600"  barColor="bg-indigo-500"  onClick={() => setActiveTab("classes-sections")} active={activeTab === "classes-sections"} />
          <StatCard icon={Layers}       label="Section teachers assigned"  assigned={sectionAssigned} total={allSections.length} bg="bg-violet-50" iconColor="text-violet-600"  barColor="bg-violet-500"  onClick={() => setActiveTab("classes-sections")} active={activeTab === "classes-sections"} />
          <StatCard icon={Shield}       label="Subjects with incharge"     assigned={subjectInchargeCount} total={allSubjects.length} bg="bg-teal-50" iconColor="text-teal-600" barColor="bg-teal-500" onClick={() => setActiveTab("subjects-mapping")} active={activeTab === "subjects-mapping"} />
          <StatCard icon={ClipboardList} label="Subject-section pairs"     assigned={subjectAssigned} total={totalSubjectPairs}  bg="bg-rose-50"   iconColor="text-rose-500"    barColor="bg-rose-500"    onClick={() => setActiveTab("subjects-mapping")} active={activeTab === "subjects-mapping"} />
        </div>

        {/* Main panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Search + Tabs */}
          <div className="px-5 pt-4 pb-0 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <ClipboardList size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search teachers, classes, subjects…"
                className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 placeholder-slate-400" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
            {/* Legend */}
            <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-400 rounded-full" /> Incharge</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> Section Teacher</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" /> Unassigned</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 mt-3">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === tab.key
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                <tab.icon size={13} />
                {tab.label}
                {(tab.count ?? 0) > 0 && (
                  <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold flex items-center justify-center">
                    {tab.count! > 99 ? "99+" : tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── CLASSES & SECTIONS accordion ── */}
          {activeTab === "classes-sections" && (
            <div className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  {search ? `No classes matching "${search}"` : "No classes found."}
                </div>
              ) : filteredClasses.map(cls => {
                const isExpanded = expandedClasses.has(cls.id);
                const secAssigned = cls.sections.filter(s => !!s.teacher).length;
                return (
                  <div key={cls.id}>
                    {/* Class row */}
                    <div className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors group ${(!cls.teacher || cls.sections.some(s => !s.teacher)) ? "border-l-2 border-amber-400" : ""}`}>
                      {/* Expand toggle */}
                      <button onClick={() => toggleClass(cls.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors shrink-0">
                        <ChevronDown size={15} className={`transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                      </button>
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <School size={15} className="text-indigo-500" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{cls.name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          #{cls.slug} · {cls.sections.length} section{cls.sections.length !== 1 ? "s" : ""} · {secAssigned}/{cls.sections.length} assigned
                        </p>
                      </div>
                      {/* Class teacher chip */}
                      <div className="shrink-0">
                        {cls.teacher
                          ? <AssignedChip teacher={cls.teacher} onReassign={() => setAssignTarget({ type: "class", id: cls.id, label: `Class: ${cls.name}`, currentTeacherId: cls.teacher!.id })} />
                          : <UnassignedChip onAssign={() => setAssignTarget({ type: "class", id: cls.id, label: `Class: ${cls.name}` })} />
                        }
                      </div>
                      <button onClick={() => navigate(`/class/${cls.id}`)}
                        className="p-1.5 text-slate-300 group-hover:text-indigo-400 rounded-lg hover:bg-indigo-50 transition-colors shrink-0">
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Sections (expanded) */}
                    {isExpanded && cls.sections.length > 0 && (
                      <div className="bg-slate-50/60 border-t border-slate-100">
                        {cls.sections.map((sec, idx) => (
                          <div key={sec.id}
                            className={`flex items-center gap-3 pl-14 pr-5 py-2 hover:bg-slate-100/60 transition-colors group ${idx < cls.sections.length - 1 ? "border-b border-slate-100" : ""} ${!sec.teacher ? "bg-amber-50/40" : ""}`}>
                            <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                              <Layers size={13} className="text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-700">{sec.name}</p>
                              <p className="text-xs text-slate-400 font-mono">#{sec.slug}</p>
                            </div>
                            <div className="shrink-0">
                              {sec.teacher
                                ? <AssignedChip teacher={sec.teacher} onReassign={() => setAssignTarget({ type: "section", id: sec.id, label: `Section: ${sec.name} (${cls.name})`, currentTeacherId: sec.teacher!.id })} />
                                : <UnassignedChip onAssign={() => setAssignTarget({ type: "section", id: sec.id, label: `Section: ${sec.name} (${cls.name})` })} />
                              }
                            </div>
                            <button onClick={() => navigate(`/section/${sec.id}`)}
                              className="p-1.5 text-slate-300 group-hover:text-violet-400 rounded-lg hover:bg-violet-50 transition-colors shrink-0">
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded && cls.sections.length === 0 && (
                      <div className="pl-14 pr-5 py-3 text-xs text-slate-400 italic bg-slate-50/60 border-t border-slate-100">
                        No sections in this class.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SUBJECTS & SECTION MAPPING (merged) ── */}
          {activeTab === "subjects-mapping" && (
            <div>
              {/* Summary banner */}
              {(allSubjects.length - subjectInchargeCount > 0 || subjectGaps.length > 0) && (
                <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
                  <Info size={12} className="text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700 font-medium">
                    {allSubjects.length - subjectInchargeCount > 0 && <span>{allSubjects.length - subjectInchargeCount} subject{allSubjects.length - subjectInchargeCount > 1 ? "s" : ""} without incharge</span>}
                    {allSubjects.length - subjectInchargeCount > 0 && subjectGaps.length > 0 && <span> · </span>}
                    {subjectGaps.length > 0 && <span>{subjectGaps.length} section mapping{subjectGaps.length > 1 ? "s" : ""} without teacher</span>}
                  </p>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {filteredSubjects.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm">
                    {search ? `No subjects matching "${search}"` : "No subjects found."}
                  </div>
                ) : filteredSubjects.map(subject => {
                  const isExpanded = expandedSubjects.has(subject.id);
                  const sectionData = subjectSectionMap.get(subject.id) ?? { assigned: [], unassigned: [] };
                  const totalSec = sectionData.assigned.length + sectionData.unassigned.length;
                  const assignedSec = sectionData.assigned.length;

                  const inchargeTeacher = subject.teacherId
                    ? teachers.find(t => t.id === subject.teacherId) ?? null
                    : null;


                  const hasIssues = !inchargeTeacher || sectionData.unassigned.length > 0;

                  return (
                    <div key={subject.id}>
                      {/* Subject row */}
                      <div
                        onClick={() => toggleSubject(subject.id)}
                        className={`flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70 transition-colors group cursor-pointer ${hasIssues ? "border-l-2 border-amber-400" : ""}`}
                      >
                        <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!hasIssues ? "bg-teal-50" : "bg-amber-50"}`}>
                          <BookOpen size={15} className={!hasIssues ? "text-teal-500" : "text-amber-500"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800">{subject.name}</p>
                            {subject.type && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase">{subject.type}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {subject.bookName ? `📖 ${subject.bookName} · ` : ""}
                            {totalSec > 0 ? `${assignedSec}/${totalSec} sections mapped` : "No section mappings yet"}
                          </p>
                        </div>

                        {/* Incharge + summary chips */}
                        <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end max-w-sm" onClick={e => e.stopPropagation()}>
                          {/* Incharge */}
                          {inchargeTeacher ? (
                            <AssignedChip
                              teacher={inchargeTeacher}
                              variant="incharge"
                              onReassign={() => setAssignTarget({ type: "subject-incharge", subjectId: subject.id, subjectData: subject, label: `Subject Incharge: ${subject.name}`, currentTeacherId: inchargeTeacher.id })}
                            />
                          ) : (
                            <UnassignedChip
                              label="No Incharge"
                              onAssign={() => setAssignTarget({ type: "subject-incharge", subjectId: subject.id, subjectData: subject, label: `Assign Incharge: ${subject.name}` })}
                            />
                          )}

                          {/* Section teachers summary */}
                          {totalSec > 0 && sectionData.unassigned.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg px-2 py-1 text-[11px] font-semibold">
                              <AlertTriangle size={10} /> {sectionData.unassigned.length} gap{sectionData.unassigned.length > 1 ? "s" : ""}
                            </span>
                          )}
                          {totalSec > 0 && sectionData.unassigned.length === 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                              <CheckCircle2 size={11} /> All mapped
                            </span>
                          )}
                        </div>

                        <button onClick={e => { e.stopPropagation(); navigate(`/subject/${subject.slug}`); }}
                          className="p-1.5 text-slate-300 group-hover:text-teal-400 rounded-lg hover:bg-teal-50 transition-colors shrink-0">
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* Expanded: Incharge row + section assignments */}
                      {isExpanded && (
                        <div className="bg-slate-50/60 border-t border-slate-100">
                          {/* Incharge detail row */}
                          <div className={`flex items-center gap-3 pl-14 pr-5 py-2.5 border-b border-slate-100 ${!inchargeTeacher ? "bg-amber-50/40" : "bg-indigo-50/20"}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${inchargeTeacher ? "bg-indigo-50 border-indigo-100" : "bg-amber-50 border-amber-100"}`}>
                              <Shield size={13} className={inchargeTeacher ? "text-indigo-500" : "text-amber-400"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Incharge</p>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                                {inchargeTeacher ? inchargeTeacher.name : <span className="text-amber-600 italic">Not assigned</span>}
                              </p>
                              {inchargeTeacher?.qualification && (
                                <p className="text-[11px] text-slate-400">{inchargeTeacher.qualification}</p>
                              )}
                            </div>
                            <div className="shrink-0">
                              {inchargeTeacher ? (
                                <AssignedChip
                                  teacher={inchargeTeacher}
                                  variant="incharge"
                                  onReassign={() => setAssignTarget({ type: "subject-incharge", subjectId: subject.id, subjectData: subject, label: `Subject Incharge: ${subject.name}`, currentTeacherId: inchargeTeacher.id })}
                                />
                              ) : (
                                <UnassignedChip
                                  label="Assign Incharge"
                                  onAssign={() => setAssignTarget({ type: "subject-incharge", subjectId: subject.id, subjectData: subject, label: `Assign Incharge: ${subject.name}` })}
                                />
                              )}
                            </div>
                          </div>

                          {/* Section header */}
                          {totalSec > 0 && (
                            <div className="pl-14 pr-5 py-1.5 bg-slate-100/80 border-b border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section-wise Teacher Mapping ({assignedSec}/{totalSec})</p>
                            </div>
                          )}

                          {/* Section assignment rows */}
                          {totalSec === 0 ? (
                            <div className="pl-14 pr-5 py-3 text-xs text-slate-400 italic">
                              This subject is not mapped to any course-section yet.
                            </div>
                          ) : (
                            <>
                              {sectionData.assigned.map((p, idx) => (
                                <div key={`a_${p.sectionId}_${idx}`}
                                  className={`flex items-center gap-3 pl-14 pr-5 py-2 hover:bg-slate-100/60 transition-colors group ${(idx < sectionData.assigned.length - 1 || sectionData.unassigned.length > 0) ? "border-b border-slate-100" : ""}`}>
                                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                                    <Layers size={13} className="text-teal-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700">{p.sectionName}</p>
                                    <p className="text-xs text-slate-400">{p.className}</p>
                                  </div>
                                  <div className="shrink-0">
                                    <AssignedChip
                                      teacher={{ id: p.teacherId, name: p.teacherName }}
                                      onReassign={() => setAssignTarget({
                                        type: "subject", subjectId: p.subjectId, sectionId: p.sectionId,
                                        label: `${subject.name} in ${p.sectionName} (${p.className})`,
                                        currentTeacherId: p.teacherId,
                                      })}
                                    />
                                  </div>
                                  <button onClick={() => navigate(`/section/${p.sectionId}`)}
                                    className="p-1.5 text-slate-300 group-hover:text-teal-400 rounded-lg hover:bg-teal-50 transition-colors shrink-0">
                                    <ChevronRight size={15} />
                                  </button>
                                </div>
                              ))}
                              {sectionData.unassigned.map((g, idx) => (
                                <div key={`u_${g.sectionId}_${idx}`}
                                  className={`flex items-center gap-3 pl-14 pr-5 py-2 hover:bg-amber-50/60 transition-colors group bg-amber-50/30 ${idx < sectionData.unassigned.length - 1 ? "border-b border-slate-100" : ""}`}>
                                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                                    <Layers size={13} className="text-rose-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700">{g.sectionName}</p>
                                    <p className="text-xs text-slate-400">{g.className}</p>
                                  </div>
                                  <div className="shrink-0">
                                    <UnassignedChip onAssign={() => setAssignTarget({
                                      type: "subject", subjectId: g.subjectId, sectionId: g.sectionId,
                                      label: `${subject.name} in ${g.sectionName} (${g.className})`,
                                    })} />
                                  </div>
                                  <button onClick={() => navigate(`/section/${g.sectionId}`)}
                                    className="p-1.5 text-slate-300 group-hover:text-rose-400 rounded-lg hover:bg-rose-50 transition-colors shrink-0">
                                    <ChevronRight size={15} />
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentsPage;

