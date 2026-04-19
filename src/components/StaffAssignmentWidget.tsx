import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, User, Loader2, X,
  ChevronRight, School, Layers, BookOpen, UserCheck,
  RefreshCw, GraduationCap,
} from "lucide-react";
import api from "../api/api";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface TeacherRef   { id: string; name: string; qualification?: string }
interface SectionRef   { id: string; name: string; slug: string; teacherId?: string | null; teacher?: TeacherRef | null }
interface ClassEntry   { id: string; name: string; slug: string; teacher?: TeacherRef | null; sections: SectionRef[] }
interface SubjectGap   { sectionId: string; sectionName: string; classId: string; className: string; subjectId: string; subjectName: string }

type AssignTarget =
  | { type: "class";   id: string; label: string }
  | { type: "section"; id: string; label: string }
  | { type: "subject"; subjectId: string; sectionId: string; label: string };

type TabKey = "classes" | "sections" | "subjects";

/* ── Assign Modal ────────────────────────────────────────────────────────────*/
const AssignModal = ({
  target, teachers, onClose, onDone,
}: {
  target: AssignTarget; teachers: TeacherRef[];
  onClose: () => void; onDone: () => void;
}) => {
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
        <select data-testid="assign-teacher-select" value={selected} onChange={e => setSelected(e.target.value)}
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
          <button data-testid="assign-confirm-btn" onClick={handleAssign} disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            {submitting ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Coverage Bar ─────────────────────────────────────────────────────────── */
const CoverageBar = ({ assigned, total, color }: { assigned: number; total: number; color: string }) => {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 100;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-slate-500 shrink-0">{assigned}/{total}</span>
    </div>
  );
};

/* ── Assigned Badge ──────────────────────────────────────────────────────────*/
const AssignedBadge = ({ teacher }: { teacher: TeacherRef }) => (
  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg px-2 py-1">
    <GraduationCap size={11} />
    <span className="text-[11px] font-semibold truncate max-w-[120px]">{teacher.name}</span>
  </div>
);

/* ── Unassigned Badge ────────────────────────────────────────────────────────*/
const UnassignedBadge = ({ onAssign }: { onAssign: () => void }) => (
  <button onClick={onAssign}
    data-testid="unassigned-badge"
    className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors group">
    <AlertTriangle size={11} />
    <span className="text-[11px] font-semibold">Unassigned</span>
    <span className="text-[10px] text-amber-500 group-hover:text-amber-700 hidden sm:inline">· Assign →</span>
  </button>
);

/* ── Main Widget ─────────────────────────────────────────────────────────────*/
const StaffAssignmentWidget = () => {
  const navigate = useNavigate();

  const [loading, setLoading]           = useState(true);
  const [classes, setClasses]           = useState<ClassEntry[]>([]);
  const [subjectGaps, setSubjectGaps]   = useState<SubjectGap[]>([]);
  const [totalSubjectPairs, setTotalSubjectPairs] = useState(0);
  const [teachers, setTeachers]         = useState<TeacherRef[]>([]);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [activeTab, setActiveTab]       = useState<TabKey>("classes");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classData, gaps, teacherData] = await Promise.all([
        api.getClasses(),
        api.getStaffGaps(),
        api.getTeachers(),
      ]);
      setClasses(Array.isArray(classData) ? classData : classData?.classes ?? []);
      setSubjectGaps(gaps.subjectGaps ?? []);
      setTotalSubjectPairs(gaps.totalSubjectSectionPairs ?? 0);
      const list = Array.isArray(teacherData) ? teacherData : teacherData?.teachers ?? [];
      setTeachers(list.filter((t: any) => t.isActive !== false));
    } catch {
      // widget is supplementary — fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Stats ──────────────────────────────────────────────────────────────── */
  const allSections  = classes.flatMap(c => c.sections.map(s => ({ ...s, className: c.name, classId: c.id })));
  const classAssigned   = classes.filter(c => !!c.teacher).length;
  const sectionAssigned = allSections.filter(s => !!s.teacher).length;
  const subjectAssigned = totalSubjectPairs - subjectGaps.length;
  const totalGaps = (classes.length - classAssigned) + (allSections.length - sectionAssigned) + subjectGaps.length;

  const TABS: { key: TabKey; label: string; icon: typeof School; assigned: number; total: number; gapColor: string; barColor: string }[] = [
    { key: "classes",  label: "Classes",  icon: School,   assigned: classAssigned,   total: classes.length,      gapColor: "text-indigo-600", barColor: "bg-indigo-500" },
    { key: "sections", label: "Sections", icon: Layers,   assigned: sectionAssigned, total: allSections.length,  gapColor: "text-violet-600", barColor: "bg-violet-500" },
    { key: "subjects", label: "Subjects", icon: BookOpen, assigned: subjectAssigned, total: totalSubjectPairs,   gapColor: "text-rose-600",   barColor: "bg-rose-500"   },
  ];

  /* ── Loading ──────────────────────────────────────────────────────────────*/
  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-slate-400" />
        <span className="text-xs text-slate-400">Loading staff coverage…</span>
      </div>
    );
  }

  return (
    <>
      {assignTarget && (
        <AssignModal target={assignTarget} teachers={teachers}
          onClose={() => setAssignTarget(null)}
          onDone={() => { setAssignTarget(null); load(); }} />
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <User size={13} className="text-slate-500" />
            <h3 className="text-xs font-semibold text-slate-700">Staff Coverage Overview</h3>
            {totalGaps > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {totalGaps} gap{totalGaps > 1 ? "s" : ""}
              </span>
            )}
            {totalGaps === 0 && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <CheckCircle2 size={11} /> All covered
              </span>
            )}
          </div>
          <button onClick={load} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-100">
          {TABS.map(tab => {
            const gaps = tab.total - tab.assigned;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                data-testid={`staff-tab-${tab.key}`}
                className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-semibold transition-all border-b-2 ${
                  isActive ? "border-indigo-500 text-indigo-700 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                <div className="flex items-center gap-1">
                  <tab.icon size={12} />
                  {tab.label}
                  {gaps > 0 && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full bg-amber-100 text-amber-700`}>{gaps}</span>
                  )}
                </div>
                <CoverageBar assigned={tab.assigned} total={tab.total} color={tab.barColor} />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">

          {/* ── Classes tab ── */}
          {activeTab === "classes" && (
            classes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No classes found.</div>
            ) : (
              classes.map(cls => (
                <div key={cls.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <School size={12} className="text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{cls.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">#{cls.slug} · {cls.sections.length} section{cls.sections.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {cls.teacher
                      ? <AssignedBadge teacher={cls.teacher} />
                      : <UnassignedBadge onAssign={() => setAssignTarget({ type: "class", id: cls.id, label: `Class: ${cls.name}` })} />
                    }
                    <button onClick={() => navigate(`/class/${cls.id}`)}
                      className="p-1 text-slate-300 group-hover:text-slate-500 transition-colors rounded">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* ── Sections tab ── */}
          {activeTab === "sections" && (
            allSections.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No sections found.</div>
            ) : (
              allSections.map(sec => (
                <div key={sec.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Layers size={12} className="text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{sec.name}</p>
                      <p className="text-[10px] text-slate-400">{sec.className} · #{sec.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {sec.teacher
                      ? <AssignedBadge teacher={sec.teacher} />
                      : <UnassignedBadge onAssign={() => setAssignTarget({ type: "section", id: sec.id, label: `Section: ${sec.name} (${sec.className})` })} />
                    }
                    <button onClick={() => navigate(`/section/${sec.id}`)}
                      className="p-1 text-slate-300 group-hover:text-slate-500 transition-colors rounded">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* ── Subjects tab ── */}
          {activeTab === "subjects" && (
            subjectGaps.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 size={20} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-xs text-emerald-700 font-semibold">All subjects have teachers assigned</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{totalSubjectPairs} subject-section pair{totalSubjectPairs !== 1 ? "s" : ""} covered</p>
              </div>
            ) : (
              subjectGaps.map((sg, idx) => (
                <div key={`${sg.subjectId}_${sg.sectionId}_${idx}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                      <BookOpen size={12} className="text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{sg.subjectName}</p>
                      <p className="text-[10px] text-slate-400">{sg.className} › {sg.sectionName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <UnassignedBadge onAssign={() => setAssignTarget({
                      type: "subject", subjectId: sg.subjectId, sectionId: sg.sectionId,
                      label: `${sg.subjectName} in ${sg.sectionName} (${sg.className})`,
                    })} />
                    <button onClick={() => navigate(`/section/${sg.sectionId}`)}
                      className="p-1 text-slate-300 group-hover:text-slate-500 transition-colors rounded">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-50 bg-slate-50/40 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Click <strong className="text-amber-600">Unassigned</strong> on any row to assign a teacher instantly.
          </p>
          <button onClick={() => navigate("/teacher-home")}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5">
            All teachers <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </>
  );
};

export default StaffAssignmentWidget;

