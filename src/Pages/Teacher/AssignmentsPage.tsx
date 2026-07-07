import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Loader2, X,
  ChevronRight, School, BookOpen, UserCheck,
  GraduationCap, Users, ClipboardList, UserCog,
  UserMinus, Edit2, ChevronDown, Layers, Shield,
  Search, Award, Filter,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSessionId } from "../../context/SessionContext";

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

/** A single "who teaches this subject in this section" cell. */
interface TeachingCell { subjectId: string; subjectName: string; teacherId: string | null; teacherName: string | null }

type AssignTarget =
  | { type: "class";            id: string; label: string; currentTeacherId?: string }
  | { type: "section";          id: string; label: string; currentTeacherId?: string }
  | { type: "subject-incharge"; subjectId: string; subjectData: SubjectEntry; label: string; currentTeacherId?: string }
  | { type: "subject";          subjectId: string; sectionId: string; label: string; currentTeacherId?: string };

/* ── Assign Modal ─────────────────────────────────────────────────────────── */
const AssignModal = ({
  target, teachers, onClose, onDone,
}: { target: AssignTarget; teachers: TeacherRef[]; onClose: () => void; onDone: () => void }) => {
  const [selected, setSelected] = useState(target.currentTeacherId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [unassignConfirm, setUnassignConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const isReassign = !!target.currentTeacherId;

  const currentTeacher = teachers.find(t => t.id === target.currentTeacherId);

  const filteredTeachers = teachers.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.qualification?.toLowerCase().includes(q) ?? false);
  });

  const handleAssign = async () => {
    if (!selected) { setError("Please select a teacher first."); return; }
    if (selected === target.currentTeacherId) { setError("This teacher is already assigned."); return; }
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
          await api.removeTeacherFromSubject(target.subjectId, { teacherId: target.currentTeacherId, sectionId: target.sectionId });
        }
        await api.addTeacherToSubject(target.subjectId, { teacherId: selected, sectionId: target.sectionId });
      }
      const teacherName = teachers.find(t => t.id === selected)?.name ?? "Teacher";
      setSuccess(`${teacherName} assigned successfully.`);
      setTimeout(() => { onDone(); }, 900);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Assignment failed. Please try again.");
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
        await api.removeTeacherFromSubject(target.subjectId, { teacherId: target.currentTeacherId, sectionId: target.sectionId });
      }
      setSuccess("Teacher unassigned successfully.");
      setTimeout(() => { onDone(); }, 900);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Unassignment failed. Please try again.");
      setUnassignConfirm(false);
    } finally { setUnassigning(false); }
  };

  const typeLabel = target.type === "class" ? "Class Teacher"
    : target.type === "section" ? "Section Teacher"
    : target.type === "subject-incharge" ? "Subject Head"
    : "Subject Teacher";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isReassign ? "bg-amber-100" : "bg-emerald-100"}`}>
                <UserCheck size={18} className={isReassign ? "text-amber-600" : "text-emerald-600"} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {isReassign ? "Change Teacher" : "Assign Teacher"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-indigo-600">{typeLabel}</span> · {target.label}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Success state */}
        {success && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 px-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800 text-center">{success}</p>
            <Loader2 size={16} className="animate-spin text-slate-400 mt-1" />
          </div>
        )}

        {/* Unassign confirm */}
        {!success && unassignConfirm && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10 px-6">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <UserMinus size={26} className="text-red-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">Remove {currentTeacher?.name ?? "this teacher"}?</p>
              <p className="text-xs text-slate-500 mt-1">
                This will unassign them from <span className="font-medium">{target.label}</span>. You can reassign later.
              </p>
            </div>
            {error && (
              <div className="w-full flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button onClick={() => { setUnassignConfirm(false); setError(""); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleUnassign} disabled={unassigning}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {unassigning ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
                {unassigning ? "Removing…" : "Yes, Remove"}
              </button>
            </div>
          </div>
        )}

        {/* Main form */}
        {!success && !unassignConfirm && (
          <>
            {/* Current teacher banner */}
            {currentTeacher && (
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2.5 shrink-0">
                <div className="w-7 h-7 bg-amber-200 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-amber-800 text-[10px] font-bold">{currentTeacher.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-700">
                    Currently: <span className="font-bold">{currentTeacher.name}</span>
                    {currentTeacher.qualification && <span className="text-amber-600 font-normal"> · {currentTeacher.qualification}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setUnassignConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                >
                  <UserMinus size={12} /> Unassign
                </button>
              </div>
            )}

            {/* Search */}
            <div className="px-6 pt-4 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or qualification…"
                  autoFocus
                  className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50 placeholder-slate-400"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Teacher list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 min-h-0">
              {filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No teachers match your search</p>
                </div>
              ) : filteredTeachers.map(t => {
                const isCurrent = t.id === target.currentTeacherId;
                const isSelected = t.id === selected;
                return (
                  <button
                    key={t.id}
                    data-testid={`teacher-option`}
                    data-teacher-name={t.name}
                    onClick={() => setSelected(t.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100"
                        : isCurrent
                        ? "bg-amber-50 border-amber-200 opacity-60"
                        : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isSelected ? "bg-indigo-600 text-white" : isCurrent ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {t.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>{t.name}</p>
                      {t.qualification && <p className="text-[10px] text-slate-400 truncate flex items-center gap-1"><Award size={9} />{t.qualification}</p>}
                    </div>
                    {isCurrent && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">Current</span>}
                    {isSelected && !isCurrent && <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Error + Actions */}
            <div className="px-6 py-4 border-t border-slate-100 space-y-3 shrink-0">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={13} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button
                  data-testid="assign-confirm-btn"
                  onClick={handleAssign}
                  disabled={!selected || selected === target.currentTeacherId || submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                  {submitting ? (isReassign ? "Changing…" : "Assigning…") : (isReassign ? "Change Teacher" : "Assign Teacher")}
                </button>
              </div>
            </div>
          </>
        )}
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

/* ── Coverage Meter (header card) ──────────────────────────────────────────── */
const CoverageMeter = ({ icon: Icon, label, assigned, total, color, tint, tintText }: {
  icon: typeof School; label: string; assigned: number; total: number; color: string; tint: string; tintText: string;
}) => {
  const done = total > 0 && assigned === total;
  const gaps = total - assigned;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 ${tint} rounded-lg flex items-center justify-center shrink-0`}><Icon size={15} className={tintText} /></div>
          <span className="text-xs font-semibold text-slate-600 truncate">{label}</span>
        </div>
        {done
          ? <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 shrink-0"><CheckCircle2 size={11} /> All set</span>
          : <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full shrink-0">{gaps} gap{gaps !== 1 ? "s" : ""}</span>}
      </div>
      <CoverageBar assigned={assigned} total={total} color={color} />
    </div>
  );
};

/* ── Teacher Chips ─────────────────────────────────────────────────────────── */
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
    {onReassign && <Edit2 size={11} className="shrink-0 opacity-50 ml-0.5" />}
  </button>
);

const UnassignedChip = ({ onAssign, label, testId }: { onAssign: () => void; label?: string; testId?: string }) => (
  <button onClick={onAssign} data-testid={testId ?? "unassigned-chip"}
    className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2.5 py-1 hover:bg-amber-100 active:scale-95 transition-all">
    <AlertTriangle size={12} className="shrink-0" />
    <span className="text-xs font-semibold">{label ?? "Assign"}</span>
  </button>
);

/* ── Main Page ────────────────────────────────────────────────────────────── */
const AssignmentsPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(false);
  const selectedSessionId = useSessionId();
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [classes, setClasses]         = useState<ClassEntry[]>([]);
  const [subjectGaps, setSubjectGaps] = useState<SubjectGap[]>([]);
  const [totalSubjectPairs, setTotalSubjectPairs] = useState(0);
  const [teachers, setTeachers]       = useState<TeacherRef[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectEntry[]>([]);
  const [assignedPairs, setAssignedPairs] = useState<AssignedPair[]>([]);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [search, setSearch]           = useState("");
  const [gapsOnly, setGapsOnly]       = useState(false);
  const [showHeads, setShowHeads]     = useState(false);

  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const toggleClass = (id: string) => setExpandedClasses(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  /* ── load assigned pairs (per-section subject teaching) ──────────────────── */
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
    if (!selectedSessionId) {
      setClasses([]); setSubjectGaps([]); setTotalSubjectPairs(0);
      setAllSubjects([]); setAssignedPairs([]);
      return;
    }
    setLoading(true); setLoadError(null);
    try {
      const [classResult, gapsResult, teacherResult, subjectResult] = await Promise.allSettled([
        api.getClasses(selectedSessionId),
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
        // Auto-expand classes that still have any gap so the work is visible.
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
      } else { errors.push("subject gaps"); }

      if (teacherResult.status === "fulfilled") {
        const d = teacherResult.value;
        const list = Array.isArray(d) ? d : d?.teachers ?? [];
        teacherList = list.filter((t: any) => t.isActive !== false);
        setTeachers(teacherList);
      } else { errors.push("teachers"); }

      if (subjectResult.status === "fulfilled") {
        const subjects = Array.isArray(subjectResult.value) ? subjectResult.value : [];
        const enriched = subjects.map((s: SubjectEntry) => ({
          ...s,
          teacherName: s.teacherId ? (teacherList.find(t => t.id === s.teacherId)?.name ?? undefined) : undefined,
        }));
        setAllSubjects(enriched);
      } else { errors.push("subjects"); }

      if (errors.length) setLoadError(`Failed to load: ${errors.join(", ")}.`);

      if (classList.length) await loadAssignedPairs(classList);
    } catch {
      setLoadError("Unexpected error loading assignment data.");
    } finally { setLoading(false); }
  }, [loadAssignedPairs, selectedSessionId]);

  useEffect(() => { load(); }, [load]);

  /* ── Derived ─────────────────────────────────────────────────────────────── */
  const allSections     = classes.flatMap(c => c.sections);
  const classAssigned   = classes.filter(c => !!c.teacher).length;
  const sectionAssigned = allSections.filter(s => !!s.teacher).length;
  const subjectAssigned = totalSubjectPairs - subjectGaps.length;
  const subjectHeadCount = allSubjects.filter(s => !!s.teacherId).length;

  const q = search.trim().toLowerCase();

  /** Subject-teaching cells for a section = assigned pairs + gaps, sorted by subject. */
  const teachingCellsFor = (sectionId: string): TeachingCell[] => {
    const cells: TeachingCell[] = [
      ...assignedPairs.filter(p => p.sectionId === sectionId).map(p => ({
        subjectId: p.subjectId, subjectName: p.subjectName, teacherId: p.teacherId, teacherName: p.teacherName,
      })),
      ...subjectGaps.filter(g => g.sectionId === sectionId).map(g => ({
        subjectId: g.subjectId, subjectName: g.subjectName, teacherId: null, teacherName: null,
      })),
    ];
    return cells.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  };

  const sectionHasGap = (s: SectionRef) => !s.teacher || teachingCellsFor(s.id).some(c => !c.teacherId);
  const classHasGap   = (c: ClassEntry) => !c.teacher || c.sections.some(sectionHasGap);

  const classMatchesSearch = (c: ClassEntry) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    (c.teacher?.name.toLowerCase().includes(q) ?? false) ||
    c.sections.some(s => s.name.toLowerCase().includes(q) || (s.teacher?.name.toLowerCase().includes(q) ?? false)) ||
    assignedPairs.some(p => p.classId === c.id && (p.subjectName.toLowerCase().includes(q) || p.teacherName.toLowerCase().includes(q)));

  const filteredClasses = classes.filter(c => classMatchesSearch(c) && (!gapsOnly || classHasGap(c)));

  const filteredHeads = allSubjects.filter(s =>
    !q || s.name.toLowerCase().includes(q) || (s.teacherName?.toLowerCase().includes(q) ?? false)
  );

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
        gradient={MODULE_THEMES.assignment}
        subtitle="Staff each class top to bottom — class teacher, section teachers, and who teaches every subject."
        onRefresh={load}
        refreshing={loading}
        primaryActions={
          <button onClick={() => navigate("/teacher-home")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 transition backdrop-blur-sm shrink-0">
            <Users size={14} /> Manage Teachers
          </button>
        }
      />

      {!selectedSessionId ? (
        <div className="p-6 max-w-6xl mx-auto"><EmptySessionState entityPlural="staff assignments" /></div>
      ) : (<>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-6 pb-4 space-y-5">
        {/* Coverage meters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CoverageMeter icon={School}        label="Class teachers"   assigned={classAssigned}   total={classes.length}     color="bg-indigo-500" tint="bg-indigo-50" tintText="text-indigo-600" />
          <CoverageMeter icon={Layers}        label="Section teachers" assigned={sectionAssigned} total={allSections.length} color="bg-violet-500" tint="bg-violet-50" tintText="text-violet-600" />
          <CoverageMeter icon={ClipboardList} label="Subject teaching" assigned={subjectAssigned} total={totalSubjectPairs}   color="bg-teal-500"   tint="bg-teal-50"   tintText="text-teal-600" />
        </div>

        {/* Search + gaps-only filter + legend */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search classes, sections, subjects, teachers…"
              className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm placeholder-slate-400" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
          <button onClick={() => setGapsOnly(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              gapsOnly ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Filter size={13} /> {gapsOnly ? "Showing gaps only" : "Only show gaps"}
          </button>
          <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-400 ml-auto">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> Assigned</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" /> Gap</span>
          </div>
        </div>
      </div>

      {/* Unified Class → Section → Subject accordion */}
      <div className="max-w-6xl mx-auto px-6 lg:px-8 pb-16 space-y-3">
        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">
            {gapsOnly ? "No gaps — every class is fully staffed. 🎉" : search ? `No classes matching "${search}"` : "No classes found for this session."}
          </div>
        ) : filteredClasses.map(cls => {
          const isExpanded = expandedClasses.has(cls.id);
          const secAssigned = cls.sections.filter(s => !!s.teacher).length;
          const gapClass = classHasGap(cls);
          return (
            <div key={cls.id} data-testid="class-row" data-class-name={cls.name} data-expanded={isExpanded ? "true" : "false"}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${gapClass ? "border-amber-200" : "border-slate-100"}`}>
              {/* Class header */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors">
                <button onClick={() => toggleClass(cls.id)} data-testid="expand-class-toggle" data-class-name={cls.name}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors shrink-0">
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                </button>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <School size={16} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{cls.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {cls.sections.length} section{cls.sections.length !== 1 ? "s" : ""} · {secAssigned}/{cls.sections.length} have a section teacher
                  </p>
                </div>
                {/* Class Teacher */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-wider text-slate-400">Class Teacher</span>
                  {cls.teacher
                    ? <AssignedChip variant="incharge" teacher={cls.teacher} onReassign={() => setAssignTarget({ type: "class", id: cls.id, label: `Class ${cls.name}`, currentTeacherId: cls.teacher!.id })} />
                    : <UnassignedChip testId="unassigned-badge" onAssign={() => setAssignTarget({ type: "class", id: cls.id, label: `Class ${cls.name}` })} />
                  }
                </div>
              </div>

              {/* Sections + subject teaching */}
              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {cls.sections.length === 0 ? (
                    <p className="px-6 py-4 text-xs text-slate-400">No sections in this class yet.</p>
                  ) : cls.sections.map(sec => {
                    const cells = teachingCellsFor(sec.id);
                    const visibleCells = gapsOnly ? cells.filter(c => !c.teacherId) : cells;
                    return (
                      <div key={sec.id} data-testid="section-row" data-class-name={cls.name} data-section-name={sec.name}
                        className={`px-4 py-3 ${!sec.teacher ? "bg-amber-50/30" : ""}`}>
                        {/* Section header row */}
                        <div className="flex items-center gap-3 mb-2.5">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 ml-9">
                            <Layers size={14} className="text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700">Section {sec.name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden md:inline text-[10px] font-semibold uppercase tracking-wider text-slate-400">Section Teacher</span>
                            {sec.teacher
                              ? <AssignedChip teacher={sec.teacher} onReassign={() => setAssignTarget({ type: "section", id: sec.id, label: `Section ${sec.name} (${cls.name})`, currentTeacherId: sec.teacher!.id })} />
                              : <UnassignedChip onAssign={() => setAssignTarget({ type: "section", id: sec.id, label: `Section ${sec.name} (${cls.name})` })} />
                            }
                            <button onClick={() => navigate(`/section/${sec.id}`)}
                              className="p-1.5 text-slate-300 hover:text-violet-500 rounded-lg hover:bg-violet-50 transition-colors shrink-0">
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Subject → teacher grid */}
                        {cells.length === 0 ? (
                          <p className="pl-16 text-[11px] text-slate-400 italic">No subjects mapped to this section's course yet — add subjects to the course first.</p>
                        ) : visibleCells.length === 0 ? (
                          <p className="pl-16 text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> All subjects staffed.</p>
                        ) : (
                          <div className="pl-16 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {visibleCells.map(cell => (
                              <div key={cell.subjectId}
                                data-testid="teaching-cell"
                                data-subject-name={cell.subjectName}
                                data-section-name={sec.name}
                                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 border ${cell.teacherId ? "bg-white border-slate-100" : "bg-amber-50/60 border-amber-100"}`}>
                                <span className="text-xs font-medium text-slate-600 truncate flex items-center gap-1.5 min-w-0">
                                  <BookOpen size={11} className="text-slate-400 shrink-0" />{cell.subjectName}
                                </span>
                                {cell.teacherId
                                  ? <AssignedChip teacher={{ id: cell.teacherId, name: cell.teacherName ?? "Teacher" }}
                                      onReassign={() => setAssignTarget({ type: "subject", subjectId: cell.subjectId, sectionId: sec.id, label: `${cell.subjectName} · Section ${sec.name} (${cls.name})`, currentTeacherId: cell.teacherId! })} />
                                  : <UnassignedChip onAssign={() => setAssignTarget({ type: "subject", subjectId: cell.subjectId, sectionId: sec.id, label: `${cell.subjectName} · Section ${sec.name} (${cls.name})` })} />
                                }
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Secondary: Subject Heads (session-wide subject owners) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button onClick={() => setShowHeads(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors">
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showHeads ? "rotate-0" : "-rotate-90"}`} />
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Shield size={14} className="text-slate-500" /></div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold text-slate-700">Subject Heads <span className="text-[11px] font-normal text-slate-400">· optional, session-wide owner per subject</span></p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">{subjectHeadCount}/{allSubjects.length}</span>
          </button>
          {showHeads && (
            <div className="border-t border-slate-100 p-3 grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {filteredHeads.length === 0 ? (
                <p className="text-xs text-slate-400 px-2 py-2">No subjects.</p>
              ) : filteredHeads.map(s => {
                const head = teachers.find(t => t.id === s.teacherId);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 border border-slate-100 bg-white">
                    <span className="text-xs font-medium text-slate-600 truncate flex items-center gap-1.5 min-w-0">
                      <BookOpen size={11} className="text-slate-400 shrink-0" />{s.name}
                      {s.type && <span className="text-[9px] uppercase tracking-wide text-slate-400">{s.type}</span>}
                    </span>
                    {s.teacherId && head
                      ? <AssignedChip variant="incharge" teacher={head} onReassign={() => setAssignTarget({ type: "subject-incharge", subjectId: s.id, subjectData: s, label: `Head of ${s.name}`, currentTeacherId: s.teacherId! })} />
                      : <UnassignedChip label="Set head" onAssign={() => setAssignTarget({ type: "subject-incharge", subjectId: s.id, subjectData: s, label: `Head of ${s.name}` })} />
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </>)}
    </div>
  );
};

export default AssignmentsPage;
