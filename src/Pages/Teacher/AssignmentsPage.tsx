import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Loader2, X,
  ChevronRight, School, Layers, BookOpen, UserCheck,
  RefreshCw, GraduationCap, Users, ClipboardList, UserCog,
} from "lucide-react";
import api from "../../api/api";
import PageHeader from "../../components/PageHeader";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface TeacherRef  { id: string; name: string; qualification?: string }
interface SectionRef  { id: string; name: string; slug: string; teacherId?: string | null; teacher?: TeacherRef | null }
interface ClassEntry  { id: string; name: string; slug: string; teacher?: TeacherRef | null; sections: SectionRef[] }
interface SubjectGap  { sectionId: string; sectionName: string; classId: string; className: string; subjectId: string; subjectName: string }

type AssignTarget =
  | { type: "class";   id: string; label: string }
  | { type: "section"; id: string; label: string }
  | { type: "subject"; subjectId: string; sectionId: string; label: string };

type TabKey = "classes" | "sections" | "subjects";

/* ── Assign Modal ─────────────────────────────────────────────────────────── */
const AssignModal = ({
  target, teachers, onClose, onDone,
}: { target: AssignTarget; teachers: TeacherRef[]; onClose: () => void; onDone: () => void }) => {
  const [selected, setSelected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAssign = async () => {
    if (!selected) { setError("Please select a teacher"); return; }
    setSubmitting(true); setError("");
    try {
      if (target.type === "class") {
        await api.updateClass(target.id, { teacherId: selected });
      } else if (target.type === "section") {
        await api.updateSection(target.id, { teacherId: selected });
      } else {
        await api.addTeacherToSubject(target.subjectId, { teacherId: selected, sectionId: target.sectionId });
      }
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Assignment failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Assign Teacher</h3>
            <p className="text-xs text-slate-500 mt-0.5">{target.label}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"><X size={16} /></button>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300">
          <option value="">Select a teacher…</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.name}{t.qualification ? ` (${t.qualification})` : ""}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleAssign} disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            {submitting ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Coverage Progress Bar ─────────────────────────────────────────────────── */
const CoverageBar = ({ assigned, total, color }: { assigned: number; total: number; color: string }) => {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 100;
  const isFullyCovered = assigned === total;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isFullyCovered ? "bg-emerald-500" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold shrink-0 tabular-nums ${isFullyCovered ? "text-emerald-600" : "text-slate-600"}`}>
        {assigned}/{total}
      </span>
      <span className={`text-xs font-semibold shrink-0 ${isFullyCovered ? "text-emerald-600" : "text-amber-600"}`}>
        {pct}%
      </span>
    </div>
  );
};

/* ── Teacher Chip ──────────────────────────────────────────────────────────── */
const AssignedChip = ({ teacher }: { teacher: TeacherRef }) => (
  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg px-2.5 py-1 max-w-[180px]">
    <GraduationCap size={12} className="shrink-0" />
    <span className="text-xs font-semibold truncate">{teacher.name}</span>
  </div>
);

const UnassignedChip = ({ onAssign }: { onAssign: () => void }) => (
  <button
    onClick={onAssign}
    className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2.5 py-1 hover:bg-amber-100 active:scale-95 transition-all"
  >
    <AlertTriangle size={12} className="shrink-0" />
    <span className="text-xs font-semibold">Unassigned</span>
    <span className="text-[10px] text-amber-500 hidden sm:inline">· Assign</span>
  </button>
);

/* ── Stat Card ─────────────────────────────────────────────────────────────── */
const StatCard = ({
  icon: Icon, label, assigned, total, bg, iconColor, barColor, onClick,
}: {
  icon: typeof School; label: string; assigned: number; total: number;
  bg: string; iconColor: string; barColor: string; onClick: () => void;
}) => {
  const gaps = total - assigned;
  return (
    <button onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md hover:border-slate-200 transition-all group w-full">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
        {gaps > 0
          ? <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{gaps} gap{gaps > 1 ? "s" : ""}</span>
          : <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600"><CheckCircle2 size={11} /> All set</span>
        }
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{assigned}<span className="text-sm font-medium text-slate-400">/{total}</span></p>
      <p className="text-xs text-slate-500 font-medium mt-0.5 mb-3">{label} assigned</p>
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
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [activeTab, setActiveTab]     = useState<TabKey>("classes");
  const [search, setSearch]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [classResult, gapsResult, teacherResult] = await Promise.allSettled([
        api.getClasses(),
        api.getStaffGaps(),
        api.getTeachers(),
      ]);

      const errors: string[] = [];

      if (classResult.status === "fulfilled") {
        const classData = classResult.value;
        setClasses(Array.isArray(classData) ? classData : classData?.classes ?? []);
      } else {
        errors.push("classes");
        console.error("getClasses failed:", classResult.reason);
      }

      if (gapsResult.status === "fulfilled") {
        const gaps = gapsResult.value;
        setSubjectGaps(gaps.subjectGaps ?? []);
        setTotalSubjectPairs(gaps.totalSubjectSectionPairs ?? 0);
      } else {
        errors.push("subject gaps");
        console.error("getStaffGaps failed:", gapsResult.reason);
      }

      if (teacherResult.status === "fulfilled") {
        const teacherData = teacherResult.value;
        const list = Array.isArray(teacherData) ? teacherData : teacherData?.teachers ?? [];
        setTeachers(list.filter((t: any) => t.isActive !== false));
      } else {
        errors.push("teachers");
        console.error("getTeachers failed:", teacherResult.reason);
      }

      if (errors.length > 0) {
        setLoadError(`Failed to load: ${errors.join(", ")}. Check the console for details.`);
      }
    } catch (e) {
      console.error("Assignments load error:", e);
      setLoadError("Unexpected error loading assignment data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Derived data ────────────────────────────────────────────────────────── */
  const allSections = classes.flatMap(c =>
    c.sections.map(s => ({ ...s, className: c.name, classId: c.id }))
  );
  const classAssigned   = classes.filter(c => !!c.teacher).length;
  const sectionAssigned = allSections.filter(s => !!s.teacher).length;
  const subjectAssigned = totalSubjectPairs - subjectGaps.length;

  const q = search.trim().toLowerCase();

  const filteredClasses = classes.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) ||
    c.teacher?.name.toLowerCase().includes(q)
  );
  const filteredSections = allSections.filter(s =>
    !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q) ||
    s.teacher?.name.toLowerCase().includes(q)
  );
  const filteredSubjectGaps = subjectGaps.filter(sg =>
    !q || sg.subjectName.toLowerCase().includes(q) ||
    sg.sectionName.toLowerCase().includes(q) || sg.className.toLowerCase().includes(q)
  );

  const TABS: { key: TabKey; label: string; icon: typeof School; assigned: number; total: number; barColor: string }[] = [
    { key: "classes",  label: "Classes",  icon: School,   assigned: classAssigned,   total: classes.length,     barColor: "bg-indigo-500" },
    { key: "sections", label: "Sections", icon: Layers,   assigned: sectionAssigned, total: allSections.length, barColor: "bg-violet-500" },
    { key: "subjects", label: "Subjects", icon: BookOpen, assigned: subjectAssigned, total: totalSubjectPairs,  barColor: "bg-rose-500"   },
  ];

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm text-slate-500">Loading assignment data…</p>
        </div>
      </div>
    );
  }

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
          <AlertTriangle size={14} className="shrink-0" />
          {loadError}
          <button onClick={() => setLoadError(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Page header */}
      <PageHeader
        icon={UserCog}
        title="Staff Assignments"
        gradient="from-rose-600 via-pink-600 to-fuchsia-600"
        subtitle="View teacher assignments across all classes, sections and subjects"
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

        {/* Coverage stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={School} label="Class teachers" assigned={classAssigned} total={classes.length}
            bg="bg-indigo-50" iconColor="text-indigo-600" barColor="bg-indigo-500"
            onClick={() => setActiveTab("classes")}
          />
          <StatCard
            icon={Layers} label="Section teachers" assigned={sectionAssigned} total={allSections.length}
            bg="bg-violet-50" iconColor="text-violet-600" barColor="bg-violet-500"
            onClick={() => setActiveTab("sections")}
          />
          <StatCard
            icon={BookOpen} label="Subject teachers" assigned={subjectAssigned} total={totalSubjectPairs}
            bg="bg-rose-50" iconColor="text-rose-500" barColor="bg-rose-500"
            onClick={() => setActiveTab("subjects")}
          />
        </div>

        {/* Search + Tab bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Search */}
          <div className="px-5 pt-4 pb-0">
            <div className="relative max-w-sm">
              <ClipboardList size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${activeTab}…`}
                className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 placeholder-slate-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 mt-3">
            {TABS.map(tab => {
              const gaps = tab.total - tab.assigned;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    isActive
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50/40"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}>
                  <tab.icon size={13} />
                  {tab.label}
                  {gaps > 0
                    ? <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-full">{gaps}</span>
                    : <CheckCircle2 size={11} className="text-emerald-500" />
                  }
                </button>
              );
            })}
          </div>

          {/* ── Table content ── */}
          <div className="divide-y divide-slate-50">

            {/* CLASSES */}
            {activeTab === "classes" && (
              filteredClasses.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  {search ? `No classes matching "${search}"` : "No classes found."}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-2.5 bg-slate-50 border-b border-slate-100 gap-4">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Class</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Class Teacher</span>
                    <span className="w-6" />
                  </div>
                  {filteredClasses.map(cls => (
                    <div key={cls.id} className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-4 gap-4 hover:bg-slate-50/70 group transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <School size={14} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{cls.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            #{cls.slug} · {cls.sections.length} section{cls.sections.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div>
                        {cls.teacher
                          ? <AssignedChip teacher={cls.teacher} />
                          : <UnassignedChip onAssign={() => setAssignTarget({ type: "class", id: cls.id, label: `Class: ${cls.name}` })} />
                        }
                      </div>
                      <button onClick={() => navigate(`/class/${cls.id}`)}
                        className="p-1.5 text-slate-300 group-hover:text-indigo-400 rounded-lg hover:bg-indigo-50 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                </>
              )
            )}

            {/* SECTIONS */}
            {activeTab === "sections" && (
              filteredSections.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  {search ? `No sections matching "${search}"` : "No sections found."}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-2.5 bg-slate-50 border-b border-slate-100 gap-4">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Section</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Section Teacher</span>
                    <span className="w-6" />
                  </div>
                  {filteredSections.map(sec => (
                    <div key={sec.id} className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-4 gap-4 hover:bg-slate-50/70 group transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                          <Layers size={14} className="text-violet-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{sec.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {sec.className} · <span className="font-mono">#{sec.slug}</span>
                          </p>
                        </div>
                      </div>
                      <div>
                        {sec.teacher
                          ? <AssignedChip teacher={sec.teacher} />
                          : <UnassignedChip onAssign={() => setAssignTarget({ type: "section", id: sec.id, label: `Section: ${sec.name} (${sec.className})` })} />
                        }
                      </div>
                      <button onClick={() => navigate(`/section/${sec.id}`)}
                        className="p-1.5 text-slate-300 group-hover:text-violet-400 rounded-lg hover:bg-violet-50 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                </>
              )
            )}

            {/* SUBJECTS — show only gaps */}
            {activeTab === "subjects" && (
              filteredSubjectGaps.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-700">
                    {search ? `No unassigned subjects matching "${search}"` : "All subjects have teachers assigned!"}
                  </p>
                  {!search && (
                    <p className="text-xs text-slate-400">
                      {totalSubjectPairs} subject-section pair{totalSubjectPairs !== 1 ? "s" : ""} fully covered
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
                    <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-700 font-medium">
                      {filteredSubjectGaps.length} subject-section pair{filteredSubjectGaps.length > 1 ? "s" : ""} without a teacher
                      {!search && totalSubjectPairs > 0 && (
                        <span className="ml-1 text-amber-500">
                          · {subjectAssigned}/{totalSubjectPairs} assigned ({Math.round((subjectAssigned / totalSubjectPairs) * 100)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-2.5 bg-slate-50 border-b border-slate-100 gap-4">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Subject</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Subject Teacher</span>
                    <span className="w-6" />
                  </div>
                  {filteredSubjectGaps.map((sg, idx) => (
                    <div key={`${sg.subjectId}_${sg.sectionId}_${idx}`}
                      className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-4 gap-4 hover:bg-slate-50/70 group transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                          <BookOpen size={14} className="text-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{sg.subjectName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sg.className} › {sg.sectionName}</p>
                        </div>
                      </div>
                      <div>
                        <UnassignedChip onAssign={() => setAssignTarget({
                          type: "subject", subjectId: sg.subjectId, sectionId: sg.sectionId,
                          label: `${sg.subjectName} in ${sg.sectionName} (${sg.className})`,
                        })} />
                      </div>
                      <button onClick={() => navigate(`/section/${sg.sectionId}`)}
                        className="p-1.5 text-slate-300 group-hover:text-rose-400 rounded-lg hover:bg-rose-50 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsPage;

