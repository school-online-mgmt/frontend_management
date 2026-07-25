import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    BookOpen, Calendar, CheckCircle2, Clock, FileText,
    Pencil, Trash2, User, BookMarked, GraduationCap, Loader2,
    AlertCircle, ChevronRight, Award, BarChart3,
    XCircle, FileDown, ShieldCheck, Zap, Users, ClipboardList, Scale,
} from "lucide-react";
import api from "../../api/api";
import BackButton from "../../components/common/BackButton";
import useAuth from "../../hooks/useAuth";
import UpdateExamModal from "../../components/Exam/UpdateExamModal";
import ScheduleExamModal from "../../components/Exam/ScheduleExamModal";
import AddSyllabusModal from "../../components/Exam/AddSyllabusModal";
import AddQuestionPaperModal from "../../components/Exam/AddQuestionPaperModal";
import ConfirmModal from "../../components/common/ConfirmModal";
import ExamReport from "../../components/Exam/ExamReport";
import ReEvaluateModal from "../../components/Exam/ReEvaluateModal";
import { usePrompt } from "../../hooks/usePrompt";

// ── Stage Map (all legacy + new statuses → 0-based stage index) ──────────────

const STAGE_MAP: Record<string, number> = {
    CREATED: 0,
    PUBLISHED: 1,
    READY_TO_CONDUCT: 2,
    CONDUCTED: 3,
    RESULT_PUBLISHED: 4,
};

function getStageIndex(status: string): number {
    return STAGE_MAP[status] ?? 0;
}

// ── Stage Priority Config ─────────────────────────────────────────────────────

const STAGE_PRIORITY: Record<number, {
    label: string;
    sublabel: string;
    icon: typeof Clock;
    pill: string;
    border: string;
    header: string;
    badge: string;
}> = {
    0: {
        label:    "Setup Required",
        sublabel: "Add syllabus & exam date, then publish to teachers",
        icon:     AlertCircle,
        pill:     "bg-amber-100 text-amber-700 border border-amber-300",
        border:   "border-amber-300",
        header:   "bg-amber-50",
        badge:    "bg-amber-500",
    },
    1: {
        label:    "Action Needed",
        sublabel: "Review details and mark exam ready to conduct",
        icon:     Zap,
        pill:     "bg-blue-100 text-blue-700 border border-blue-300",
        border:   "border-blue-300",
        header:   "bg-blue-50",
        badge:    "bg-blue-500",
    },
    2: {
        label:    "Urgent — Attendance",
        sublabel: "Teacher must mark attendance before exam can be conducted",
        icon:     Users,
        pill:     "bg-orange-100 text-orange-700 border border-orange-300",
        border:   "border-orange-300",
        header:   "bg-orange-50",
        badge:    "bg-orange-500",
    },
    3: {
        label:    "Marks Entry Pending",
        sublabel: "Section teachers are entering marks for present students",
        icon:     ClipboardList,
        pill:     "bg-purple-100 text-purple-700 border border-purple-300",
        border:   "border-purple-300",
        header:   "bg-purple-50",
        badge:    "bg-purple-500",
    },
    4: {
        label:    "Complete",
        sublabel: "Results published — students can view their scores",
        icon:     CheckCircle2,
        pill:     "bg-emerald-100 text-emerald-700 border border-emerald-300",
        border:   "border-emerald-300",
        header:   "bg-emerald-50",
        badge:    "bg-emerald-500",
    },
};

// ── Priority Banner ───────────────────────────────────────────────────────────

const PriorityBanner = ({ stage, extra }: { stage: number; extra?: React.ReactNode }) => {
    const p = STAGE_PRIORITY[stage];
    if (!p) return null;
    const Icon = p.icon;
    return (
        <div className={`flex items-start justify-between gap-3 px-5 py-3.5 rounded-xl border ${p.pill} mb-1`}>
            <div className="flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${p.badge}`} />
                <div>
                    <p className="text-sm font-bold flex items-center gap-1.5">
                        <Icon size={14} />
                        {p.label}
                    </p>
                    <p className="text-xs opacity-75 mt-0.5">{p.sublabel}</p>
                </div>
            </div>
            {extra && <div className="shrink-0">{extra}</div>}
        </div>
    );
};

// ── 5-Step Stepper ────────────────────────────────────────────────────────────

const STEPS = [
    { label: "Created",           sub: "Exam created" },
    { label: "Published",         sub: "Exam published to teachers" },
    { label: "Ready to Conduct",  sub: "Admit cards sent to students" },
    { label: "Conducted",         sub: "Marks being entered" },
    { label: "Results Published", sub: "Students can view results" },
];

const WorkflowStepper = ({ status }: { status: string }) => {
    const current = getStageIndex(status);
    const priority = STAGE_PRIORITY[current];
    return (
        <div className="w-full overflow-x-auto">
            <div className="flex items-start min-w-max gap-0 py-2">
                {STEPS.map((step, i) => {
                    const done   = i < current;
                    const active = i === current;
                    return (
                        <div key={step.label} className="flex items-center">
                            <div className="flex flex-col items-center min-w-[80px] relative">
                                {active && priority && (
                                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${priority.badge} animate-pulse`} />
                                )}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                    ${done   ? "bg-emerald-500 text-white shadow-sm"
                                    : active ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md"
                                    :          "bg-slate-100 text-slate-400"}`}>
                                    {done ? <CheckCircle2 size={15} /> : i + 1}
                                </div>
                                <p className={`text-[10px] mt-1.5 font-medium text-center leading-tight w-16
                                    ${active ? "text-emerald-600" : done ? "text-slate-500" : "text-slate-400"}`}>
                                    {step.label}
                                </p>
                                {active && priority && (
                                    <span className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${priority.pill}`}>
                                        {priority.label}
                                    </span>
                                )}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`h-0.5 w-12 mx-1 mb-5 flex-shrink-0 ${i < current ? "bg-emerald-400" : "bg-slate-200"}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    CREATED:          { label: "Created",           className: "bg-slate-100 text-slate-600 border border-slate-200" },
    PUBLISHED:        { label: "Published",         className: "bg-blue-100 text-blue-700 border border-blue-200" },
    READY_TO_CONDUCT: { label: "Ready to Conduct",  className: "bg-orange-100 text-orange-700 border border-orange-200" },
    CONDUCTED:        { label: "Conducted",         className: "bg-purple-100 text-purple-700 border border-purple-200" },
    RESULT_PUBLISHED: { label: "Results Published", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_LABELS[status] ?? {
        label: status.replace(/_/g, " "),
        className: "bg-slate-100 text-slate-600 border border-slate-200",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.className}`}>
            {cfg.label}
        </span>
    );
};

// ── Info Item ─────────────────────────────────────────────────────────────────

const InfoItem = ({ icon, label, value }: { icon: ReactElement; label: string; value: string | number | null | undefined }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
        <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-slate-800 font-medium mt-0.5">{value ?? "—"}</p>
        </div>
    </div>
);

// ── Checklist Item ────────────────────────────────────────────────────────────

const CheckItem = ({ done, label }: { done: boolean; label: string }) => (
    <div className="flex items-center gap-2">
        {done
            ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            : <XCircle size={16} className="text-slate-300 shrink-0" />}
        <span className={`text-sm ${done ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const ExamDetails = () => {
    const { examId } = useParams() as { examId: string };
    const { hasModuleAdmin } = useAuth();
    const navigate = useNavigate();

    const [exam, setExam]             = useState<any>(null);
    const [loading, setLoading]       = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Modal states
    const [editOpen, setEditOpen]       = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [syllabusOpen, setSyllabusOpen] = useState(false);
    const [qpOpen, setQpOpen]           = useState(false);
    const [deleteOpen, setDeleteOpen]   = useState(false);
    // FR-002: publishing is the point of no return (marks lock, students see
    // results) — confirm it over a mini-summary instead of a bare click.
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

    // Action loading key
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Enrolled students (READY_TO_CONDUCT — before result shells exist)
    const [enrolledStudents, setEnrolledStudents]   = useState<any[]>([]);
    const [enrolledLoading, setEnrolledLoading]     = useState(false);

    // Results & sections
    const [examResults, setExamResults]   = useState<any[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [resultsReloadKey, setResultsReloadKey] = useState(0);
    const [reEval, setReEval] = useState<{ id: string; name: string; marks: number | null } | null>(null);
    const [sections, setSections]         = useState<any[]>([]);
    const [sectionsLoading, setSectionsLoading] = useState(false);

    // Message
    const [message, setMessage]         = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
    const { prompt, dialog: promptDialog } = usePrompt();

    const fetchExam = async () => {
        try {
            const data = await api.getExamById(examId);
            setExam(data);
        } catch {
            setExam(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchExam(); }, [examId]);

    // Fetch enrolled students at stage 2 (READY_TO_CONDUCT — no result shells yet)
    useEffect(() => {
        if (!exam) return;
        const stage = getStageIndex(exam.status);
        if (stage !== 2) { setEnrolledStudents([]); return; }
        setEnrolledLoading(true);
        api.getExamEnrolledStudents(examId)
            .then((data: any) => setEnrolledStudents(data.students ?? []))
            .catch(() => setEnrolledStudents([]))
            .finally(() => setEnrolledLoading(false));
    }, [exam?.status, examId]);

    // Fetch results for stages 3+
    const RESULTS_STAGES = [3, 4];
    useEffect(() => {
        if (!exam) return;
        const stage = getStageIndex(exam.status);
        if (!RESULTS_STAGES.includes(stage)) { setExamResults([]); return; }
        setResultsLoading(true);
        api.getExamResults(examId)
            .then((data: any) => setExamResults(Array.isArray(data) ? data : (data.results ?? [])))
            .catch(() => setExamResults([]))
            .finally(() => setResultsLoading(false));
    }, [exam?.status, examId, resultsReloadKey]);

    // Fetch sections summary for CONDUCTED stage
    useEffect(() => {
        if (!exam) return;
        const stage = getStageIndex(exam.status);
        if (stage !== 3) { setSections([]); return; }
        setSectionsLoading(true);
        api.getExamSections(examId)
            .then((data: any) => setSections(Array.isArray(data) ? data : (data.sections ?? [])))
            .catch(() => setSections([]))
            .finally(() => setSectionsLoading(false));
    }, [exam?.status, examId]);

    // Auto-dismiss messages
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 6000);
        return () => clearTimeout(t);
    }, [message]);

    const isPrincipalOrAdmin = hasModuleAdmin('ACADEMICS');

    // ── Action runner ─────────────────────────────────────────────────────────

    const runAction = async (key: string, fn: () => Promise<any>, successMsg: string) => {
        setActionLoading(key);
        try {
            await fn();
            setMessage(successMsg);
            setMessageType("success");
            fetchExam();
        } catch (err: any) {
            setMessage(err?.response?.data?.message || `Action failed.`);
            setMessageType("error");
        } finally {
            setActionLoading(null);
        }
    };

    const handlePublishExam = () =>
        runAction("publish-exam", () => api.publishExam(examId), "Exam published. Teachers can now see all details.");

    const handleReadyToConduct = () =>
        runAction("ready-conduct", () => api.readyToConduct(examId), "Exam marked as ready to conduct. Admit cards are now visible to students.");

    const handleMarkConducted = () =>
        runAction("conduct", () => api.markConducted(examId), "Exam marked as conducted. Section teachers can now enter marks.");

    const handlePublishResults = () =>
        runAction("publish-results", () => api.publishExamResults(examId), "Results published successfully! Students can now view their results.").finally(() => setPublishConfirmOpen(false));

    const handleDelete = async () => {
        try {
            setDeleteLoading(true);
            await api.deleteExam(examId);
            navigate("/exam-home");
        } catch (err: any) {
            setMessage(err?.response?.data?.message || "Failed to delete exam paper.");
            setMessageType("error");
            setDeleteOpen(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Loading & error states ────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="p-8">
                <BackButton />
                <div className="mt-6 text-center text-slate-500">Exam paper not found.</div>
            </div>
        );
    }

    const stage = getStageIndex(exam.status);
    const isTerminal = stage === 4;

    // ── Result stats ──────────────────────────────────────────────────────────
    const present      = examResults.filter(r => r.attendanceStatus === "PRESENT");
    const absent       = examResults.filter(r => r.attendanceStatus === "ABSENT");
    const unmarked     = examResults.filter(r => !r.attendanceStatus);
    const marksEntered = present.filter(r => r.marks !== null && r.marks !== undefined);
    const allMarksIn   = present.length > 0 && marksEntered.length === present.length && unmarked.length === 0;

    // Sections progress check — backend now returns allEntered boolean per section
    const allSectionsComplete = sections.length > 0 && sections.every((s: any) => s.allEntered === true);

    // Can publish: sections check takes precedence; fall back to raw results check if no sections data
    const canPublishResults = allSectionsComplete || allMarksIn;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-5">

            {/* ── Modals ────────────────────────────────────────────────────── */}
            {editOpen && (
                <UpdateExamModal
                    exam={exam}
                    onClose={() => setEditOpen(false)}
                    onRefresh={fetchExam}
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
            )}
            {scheduleOpen && (
                <ScheduleExamModal
                    examId={exam.id}
                    onClose={() => setScheduleOpen(false)}
                    onRefresh={fetchExam}
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
            )}
            {syllabusOpen && (
                <AddSyllabusModal
                    examId={exam.id}
                    onClose={() => setSyllabusOpen(false)}
                    onRefresh={fetchExam}
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
            )}
            {qpOpen && (
                <AddQuestionPaperModal
                    examId={exam.id}
                    onClose={() => setQpOpen(false)}
                    onRefresh={fetchExam}
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
            )}
            {deleteOpen && (
                <ConfirmModal
                    title="Delete Exam Paper"
                    message={`Are you sure you want to delete "${exam.subject?.name ?? exam.examName}"? This action cannot be undone.`}
                    confirmText="Delete"
                    loading={deleteLoading}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteOpen(false)}
                />
            )}

            {/* ── Message Banner ────────────────────────────────────────────── */}
            {message && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                    messageType === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                }`}>
                    {messageType === "success"
                        ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                    <p>{message}</p>
                </div>
            )}

            {promptDialog}

            <BackButton />

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <span>{exam.session?.name ?? "—"}</span>
                        <ChevronRight size={14} />
                        <span>{exam.examTerm}</span>
                        {exam.subject?.name && (
                            <>
                                <ChevronRight size={14} />
                                <span>{exam.subject.name}</span>
                            </>
                        )}
                    </div>
                    <h1 data-testid="exam-title" data-exam-id={exam.id} data-status={exam.status} className="text-2xl font-bold text-slate-900">{exam.examName}</h1>
                    <div className="mt-2">
                        <StatusBadge status={exam.status} />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {isPrincipalOrAdmin && (
                        <button data-testid="exam-edit-open-btn"
                            onClick={() => setEditOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-sm hover:bg-slate-50 text-slate-600">
                            <Pencil size={14} />Edit
                        </button>
                    )}
                    {isPrincipalOrAdmin && (
                        <button data-testid="exam-delete-open-btn"
                            onClick={() => setDeleteOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50">
                            <Trash2 size={14} />Delete
                        </button>
                    )}
                </div>
            </div>

            {/* ── Workflow Stepper ──────────────────────────────────────────── */}
            <div className="bg-white p-5 rounded-2xl border">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Exam Lifecycle</h2>
                <WorkflowStepper status={exam.status} />
                {!isTerminal && (
                    <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
                        {STEPS[stage]?.sub} — {stage < 4 ? `next: ${STEPS[stage + 1]?.label}` : "complete"}
                    </p>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Stage 0 — CREATED                                              */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {stage === 0 && isPrincipalOrAdmin && (
                <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 space-y-5">
                    <PriorityBanner stage={0} />
                    <div>
                        <h2 className="font-semibold text-slate-800 text-base mb-1">Setup Checklist</h2>
                        <p className="text-sm text-slate-500">Complete both requirements below, then publish the exam to teachers.</p>
                    </div>

                    {/* Checklist */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <CheckItem done={!!exam.syllabus} label="Syllabus added" />
                        <CheckItem done={!!exam.examDate} label="Exam date set" />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                        <button data-testid="exam-syllabus-open-btn"
                            onClick={() => setSyllabusOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium">
                            <BookOpen size={14} />
                            {exam.syllabus ? "Edit Syllabus" : "Add Syllabus"}
                        </button>
                        <button data-testid="exam-schedule-open-btn"
                            onClick={() => setScheduleOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium">
                            <Calendar size={14} />
                            {exam.examDate ? "Edit Exam Date" : "Set Exam Date"}
                        </button>
                    </div>

                    {/* Primary CTA */}
                    <div className="pt-2 border-t border-slate-100">
                        {(!exam.syllabus || !exam.examDate) && (
                            <p className="text-xs text-amber-600 mb-3 flex items-center gap-1.5">
                                <AlertCircle size={13} />
                                {!exam.syllabus && !exam.examDate
                                    ? "Add syllabus and set exam date to publish."
                                    : !exam.syllabus
                                    ? "Add syllabus to publish."
                                    : "Set exam date to publish."}
                            </p>
                        )}
                        <button data-testid="exam-publish-exam-btn"
                            onClick={handlePublishExam}
                            disabled={!exam.syllabus || !exam.examDate || actionLoading === "publish-exam"}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            {actionLoading === "publish-exam"
                                ? <Loader2 size={15} className="animate-spin" />
                                : <CheckCircle2 size={15} />}
                            Publish Exam
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Stage 1 — PUBLISHED                                            */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {stage === 1 && isPrincipalOrAdmin && (
                <div className="bg-white rounded-2xl border-2 border-blue-300 p-6 space-y-5">
                    <PriorityBanner stage={1} />
                    <div>
                        <h2 className="font-semibold text-slate-800 text-base mb-1">Exam Published</h2>
                        <p className="text-sm text-slate-500">Teachers can now view all exam details. Upload a question paper if needed, then mark the exam as ready to conduct.</p>
                    </div>

                    {/* Info summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Syllabus</p>
                            {exam.syllabus
                                ? <p className="text-sm text-slate-700 line-clamp-3 leading-relaxed">{exam.syllabus}</p>
                                : <p className="text-sm text-slate-400 italic">Not set</p>}
                            <button data-testid="exam-syllabus-open-btn-2"
                                onClick={() => setSyllabusOpen(true)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1 inline-block">
                                {exam.syllabus ? "Edit" : "+ Add"}
                            </button>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Exam Date</p>
                            {exam.examDate
                                ? <p className="text-sm text-slate-700 font-medium">
                                    {new Date(exam.examDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                  </p>
                                : <p className="text-sm text-slate-400 italic">Not set</p>}
                            <button data-testid="exam-schedule-open-btn-2"
                                onClick={() => setScheduleOpen(true)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1 inline-block">
                                {exam.examDate ? "Edit" : "+ Set Date"}
                            </button>
                        </div>
                    </div>

                    {/* Optional: question paper */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                            <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                <FileText size={14} className="text-slate-400" />
                                Question Paper
                                <span className="text-xs font-normal text-slate-400">(optional)</span>
                            </p>
                            {exam.questionPaper
                                ? <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1"><CheckCircle2 size={11} />Uploaded</p>
                                : <p className="text-xs text-slate-400 mt-0.5">Not uploaded yet</p>}
                        </div>
                        <button data-testid="exam-qp-open-btn"
                            onClick={() => setQpOpen(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            {exam.questionPaper ? "Update" : "+ Upload"}
                        </button>
                    </div>

                    {/* Primary CTA */}
                    <div className="pt-2 border-t border-slate-100">
                        <button data-testid="exam-ready-to-conduct-btn"
                            onClick={handleReadyToConduct}
                            disabled={actionLoading === "ready-conduct"}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                            {actionLoading === "ready-conduct"
                                ? <Loader2 size={15} className="animate-spin" />
                                : <ShieldCheck size={15} />}
                            Mark Ready to Conduct
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Stage 2 — READY_TO_CONDUCT                                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {stage === 2 && isPrincipalOrAdmin && (
                <div className="bg-white rounded-2xl border-2 border-orange-300 p-6 space-y-5">
                    {(() => {
                        const pendingCount = enrolledStudents.filter((s: any) => !s.attendanceStatus).length;
                        return (
                            <PriorityBanner
                                stage={2}
                                extra={!enrolledLoading && pendingCount > 0 ? (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white">
                                        {pendingCount} pending
                                    </span>
                                ) : !enrolledLoading && enrolledStudents.length > 0 ? (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                                        <CheckCircle2 size={11} /> All marked
                                    </span>
                                ) : undefined}
                            />
                        );
                    })()}
                    <div>
                        <h2 className="font-semibold text-slate-800 text-base mb-1">Ready to Conduct</h2>
                        <p className="text-sm text-slate-500">Admit cards are published to enrolled students. The assigned teacher will mark attendance. Once done, mark the exam as conducted below.</p>
                    </div>

                    {/* Admit cards badge */}
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                        <CheckCircle2 size={15} className="shrink-0" />
                        Admit cards are published — students can download them
                    </div>

                    {/* Enrolled students list */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                <GraduationCap size={15} className="text-slate-400" />
                                Enrolled Students
                                {!enrolledLoading && (
                                    <span className="ml-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">
                                        {enrolledStudents.length}
                                    </span>
                                )}
                            </p>
                        </div>
                        {enrolledLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 size={18} className="animate-spin text-slate-400" />
                            </div>
                        ) : enrolledStudents.length === 0 ? (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 py-6 text-center text-sm text-slate-400">
                                No eligible students found for this exam.
                            </div>
                        ) : (
                            <div className="rounded-xl border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Student</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Roll No</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Class / Section</th>
                                            <th className="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">Attendance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {enrolledStudents.map((s: any) => (
                                            <tr key={s.academicId} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-800">{s.studentName || "—"}</td>
                                                <td className="px-4 py-3 text-slate-500">{s.rollNo}</td>
                                                <td className="px-4 py-3 text-slate-500">{s.className} · {s.sectionName}</td>
                                                <td className="px-4 py-3">
                                                    {s.attendanceStatus === "PRESENT" ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                            <CheckCircle2 size={11} />Present
                                                        </span>
                                                    ) : s.attendanceStatus === "ABSENT" ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                            <XCircle size={11} />Absent
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                                            <Clock size={11} />Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Optional: question paper */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                            <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                <FileText size={14} className="text-slate-400" />Question Paper
                                <span className="text-xs font-normal text-slate-400">(optional)</span>
                            </p>
                            {exam.questionPaper
                                ? <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1"><CheckCircle2 size={11} />Uploaded</p>
                                : <p className="text-xs text-slate-400 mt-0.5">Not uploaded yet</p>}
                        </div>
                        <button data-testid="exam-qp-open-btn-2"
                            onClick={() => setQpOpen(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            {exam.questionPaper ? "Update" : "+ Upload"}
                        </button>
                    </div>

                    {/* Primary CTA */}
                    {(() => {
                        const pendingCount = enrolledStudents.filter((s: any) => !s.attendanceStatus).length;
                        const allMarked = !enrolledLoading && enrolledStudents.length > 0 && pendingCount === 0;
                        const noneEnrolled = !enrolledLoading && enrolledStudents.length === 0;
                        return (
                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                {!enrolledLoading && pendingCount > 0 && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                        <span>
                                            <strong>{pendingCount}</strong> student{pendingCount !== 1 ? "s" : ""} still need attendance marked before this exam can be conducted.
                                        </span>
                                    </div>
                                )}
                                <button data-testid="exam-mark-conducted-btn"
                                    onClick={handleMarkConducted}
                                    disabled={actionLoading === "conduct" || enrolledLoading || (!allMarked && !noneEnrolled)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    {actionLoading === "conduct"
                                        ? <Loader2 size={15} className="animate-spin" />
                                        : <CheckCircle2 size={15} />}
                                    Mark as Conducted
                                </button>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Stage 3 — CONDUCTED                                            */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {stage === 3 && (
                <div className="bg-white rounded-2xl border-2 border-purple-300 p-6 space-y-5">
                    <PriorityBanner
                        stage={3}
                        extra={!resultsLoading && present.length > 0 ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500 text-white">
                                {marksEntered.length}/{present.length} marks
                            </span>
                        ) : undefined}
                    />
                    <div>
                        <h2 className="font-semibold text-slate-800 text-base mb-1">Marks Entry in Progress</h2>
                        <p className="text-sm text-slate-500">Section teachers are entering marks for present students. Publish results once all marks are entered.</p>
                    </div>

                    {/* Attendance quick stats */}
                    {!resultsLoading && examResults.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium">
                                {examResults.length} Total enrolled
                            </span>
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                                {present.length} Present
                            </span>
                            <span className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                                {absent.length} Absent
                            </span>
                            {unmarked.length > 0 && (
                                <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                                    {unmarked.length} Attendance pending
                                </span>
                            )}
                        </div>
                    )}

                    {/* Sections progress table */}
                    {sectionsLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 size={20} className="animate-spin text-slate-400" />
                        </div>
                    ) : sections.length > 0 ? (
                        <div className="rounded-xl border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Present</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Absent</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Marks Entered</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sections.map((s: any, i: number) => (
                                        <tr key={s.sectionId ?? i} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800">{s.sectionName ?? s.name ?? "—"}</td>
                                            <td className="px-4 py-3 text-emerald-700 font-medium">{s.present ?? "—"}</td>
                                            <td className="px-4 py-3 text-red-600 font-medium">{s.absent ?? "—"}</td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {s.marksEntered ?? "—"}
                                                {s.present > 0 && <span className="text-slate-400"> / {s.present}</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {s.allEntered
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                        <CheckCircle2 size={11} />Complete
                                                      </span>
                                                    : s.unmarked > 0
                                                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                            <Clock size={11} />Attendance pending
                                                          </span>
                                                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                            <Clock size={11} />Marks pending
                                                          </span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : !resultsLoading && examResults.length > 0 ? (
                        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500">
                            {marksEntered.length} of {present.length} present students have marks entered.
                        </div>
                    ) : null}

                    {/* View question paper */}
                    {exam.questionPaper && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <FileText size={12} />Question Paper
                            </p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{exam.questionPaper}</p>
                        </div>
                    )}

                    {/* Primary CTA — only for admin */}
                    {isPrincipalOrAdmin && (
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                            {!canPublishResults && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                                    <AlertCircle size={14} className="shrink-0" />
                                    All marks must be entered for present students before publishing results.
                                </div>
                            )}
                            <button data-testid="exam-publish-results-btn"
                                onClick={() => setPublishConfirmOpen(true)}
                                disabled={!canPublishResults || actionLoading === "publish-results"}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                {actionLoading === "publish-results"
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <Award size={15} />}
                                Publish Results
                            </button>
                            {publishConfirmOpen && (() => {
                                // FR-002 mini-summary: what is about to go out, computed
                                // from the marks already on screen.
                                const scores = marksEntered.map(r => Number(r.marks));
                                const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                                const passMark = exam.passMarks ?? Math.ceil((exam.fullMarks || 0) * 0.4);
                                const passCount = scores.filter(m => m >= passMark).length;
                                return (
                                    <ConfirmModal
                                        title="Complete & publish results?"
                                        message="Marks lock permanently and every student sees their result. This cannot be undone."
                                        confirmText="Publish results"
                                        loading={actionLoading === "publish-results"}
                                        onConfirm={handlePublishResults}
                                        onCancel={() => setPublishConfirmOpen(false)}
                                    >
                                        <div className="text-sm text-slate-700 space-y-1.5" data-testid="publish-summary">
                                            <div className="flex justify-between"><span className="text-slate-500">Students present</span><strong>{present.length}</strong></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Marks entered</span><strong>{marksEntered.length} / {present.length}</strong></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Average</span><strong>{avg.toFixed(1)} / {exam.fullMarks}</strong></div>
                                            <div className="flex justify-between"><span className="text-slate-500">Passing (≥ {passMark})</span><strong>{passCount} of {scores.length}</strong></div>
                                        </div>
                                    </ConfirmModal>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Stage 4 — RESULT_PUBLISHED                                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {stage === 4 && (
                <div className="bg-white rounded-2xl border-2 border-emerald-300 p-6 space-y-5">
                    <PriorityBanner stage={4} />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <Award size={18} className="text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-800">Results Published</h2>
                            <p className="text-sm text-slate-500">Students can now view their results. Summary stats are shown below.</p>
                        </div>
                    </div>

                    {/* Summary stats */}
                    {!resultsLoading && examResults.length > 0 && (() => {
                        const totalStudents   = examResults.length;
                        const presentStudents = present.length;
                        const withMarks       = present.filter(r => r.marks !== null && r.marks !== undefined);
                        const avgPct          = withMarks.length > 0 && exam.fullMarks
                            ? Math.round(withMarks.reduce((sum: number, r: any) => sum + (r.marks / exam.fullMarks) * 100, 0) / withMarks.length)
                            : null;
                        const passCount       = exam.fullMarks
                            ? withMarks.filter((r: any) => (r.marks / exam.fullMarks) * 100 >= 33).length
                            : null;
                        const passRate        = passCount !== null && presentStudents > 0
                            ? Math.round((passCount / presentStudents) * 100)
                            : null;

                        return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-slate-800">{totalStudents}</p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Total Students</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-slate-800">
                                        {avgPct !== null ? `${avgPct}%` : "—"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Average Score</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {passRate !== null ? `${passRate}%` : "—"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Pass Rate</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Authorised re-evaluation (P0-EXM-05) — PRINCIPAL/ADMIN only. */}
                    {isPrincipalOrAdmin && !resultsLoading && present.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Scale size={15} className="text-indigo-500" />
                                <h3 className="text-sm font-semibold text-slate-700">Re-evaluation</h3>
                                <span className="text-[11px] text-slate-400">correct a published mark after a recheck — audited</span>
                            </div>
                            <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 overflow-hidden">
                                {present.map((r: any) => (
                                    <div key={r.id} data-testid="reeval-row" className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                        <span className="font-medium text-slate-700 truncate">{r.studentName}</span>
                                        <span className="flex items-center gap-3 shrink-0">
                                            <span className="tabular-nums text-slate-600">{r.marks ?? "—"} / {exam.fullMarks}</span>
                                            <button data-testid="reeval-open-btn"
                                                onClick={() => setReEval({ id: r.id, name: r.studentName, marks: r.marks ?? null })}
                                                className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1">
                                                Re-evaluate
                                            </button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Exam Info Card ────────────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl border">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-5">Exam Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InfoItem icon={<BookOpen size={16} />}      label="Exam Name"        value={exam.examName} />
                    <InfoItem icon={<BookMarked size={16} />}    label="Subject"          value={exam.subject?.name} />
                    <InfoItem icon={<GraduationCap size={16} />} label="Session"          value={exam.session?.name} />
                    <InfoItem icon={<User size={16} />}          label="Assigned Teacher" value={exam.teacher?.name} />
                    <InfoItem icon={<FileText size={16} />}      label="Full Marks"       value={exam.fullMarks} />
                    <InfoItem icon={<FileText size={16} />}      label="Marking System"   value={exam.markingSystem} />
                    <InfoItem icon={<Calendar size={16} />}      label="Exam Date"
                        value={exam.examDate
                            ? new Date(exam.examDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                            : null} />
                    <InfoItem icon={<Clock size={16} />}         label="Term"             value={exam.examTerm} />
                </div>
            </div>

            {/* ── Syllabus ──────────────────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen size={16} className="text-slate-400" />Syllabus
                    </h2>
                    {isPrincipalOrAdmin && stage <= 2 && (
                        <button data-testid="exam-syllabus-open-btn-3"
                            onClick={() => setSyllabusOpen(true)}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                            {exam.syllabus ? "Edit" : "+ Add"}
                        </button>
                    )}
                </div>
                {exam.syllabus
                    ? <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{exam.syllabus}</p>
                    : <p className="text-slate-400 italic text-sm">No syllabus added yet.</p>}
            </div>

            {/* ── Question Paper ────────────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" />Question Paper
                    </h2>
                    {isPrincipalOrAdmin && stage <= 2 && (
                        <button data-testid="exam-qp-open-btn-3"
                            onClick={() => setQpOpen(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            {exam.questionPaper ? "Edit" : "+ Upload"}
                        </button>
                    )}
                </div>
                {exam.questionPaper
                    ? <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{exam.questionPaper}</p>
                    : <p className="text-slate-400 italic text-sm">No question paper on record.</p>}
            </div>

            {/* ── Admit Cards Info (stages 2–3) ──────────────────────────────── */}
            {stage >= 2 && stage <= 3 && (
                <div className="bg-white p-6 rounded-2xl border">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                        <FileDown size={16} className="text-teal-500" />Admit Cards
                    </h2>
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                        <ShieldCheck size={15} className="shrink-0" />
                        Admit cards are automatically published for this exam — students can download them.
                    </div>
                </div>
            )}

            {/* ── Results Table (stages 3–4) ─────────────────────────────────── */}
            {stage >= 3 && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="p-6 border-b bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <BarChart3 size={16} className="text-slate-400" />Student Results
                        </h2>
                        {!resultsLoading && examResults.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium">
                                    {examResults.length} Total
                                </span>
                                <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                                    {present.length} Present
                                </span>
                                <span className="px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                                    {absent.length} Absent
                                </span>
                                {unmarked.length > 0 && (
                                    <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                                        {unmarked.length} Unmarked
                                    </span>
                                )}
                                <span className={`px-3 py-1 rounded-lg border text-sm font-medium ${
                                    marksEntered.length === present.length && present.length > 0
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                        : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}>
                                    {marksEntered.length}/{present.length} marks entered
                                </span>
                            </div>
                        )}
                    </div>

                    {resultsLoading ? (
                        <div className="p-12 flex items-center justify-center">
                            <Loader2 size={24} className="animate-spin text-indigo-600" />
                        </div>
                    ) : examResults.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-sm">No result records found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Student</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Roll No</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Section</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Attendance</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Marks</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Remarks</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                                        <th className="px-5 py-3 font-semibold text-slate-600">Report card</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {examResults.map((r: any) => (
                                        <tr key={r.id} data-testid="exam-row" data-id={r.id} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="px-5 py-3 font-medium text-slate-800">
                                                {r.studentName || `${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""}`.trim() || "—"}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500">{r.rollNo || r.academic?.rollNo || "—"}</td>
                                            <td className="px-5 py-3 text-slate-500">{r.sectionName || r.academic?.section?.name || "—"}</td>
                                            <td className="px-5 py-3">
                                                {r.attendanceStatus === "PRESENT"
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Present</span>
                                                    : r.attendanceStatus === "ABSENT"
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Absent</span>
                                                    : <span className="text-xs text-amber-600 font-medium">Not marked</span>}
                                            </td>
                                            <td className="px-5 py-3">
                                                {r.attendanceStatus === "ABSENT"
                                                    ? <span className="text-slate-400 text-xs">N/A</span>
                                                    : r.marks !== null && r.marks !== undefined
                                                    ? <span className="font-semibold text-slate-800">{r.marks}<span className="text-slate-400 font-normal"> / {exam.fullMarks}</span></span>
                                                    : <span className="text-amber-600 text-xs font-medium">Pending</span>}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500 text-xs">{r.remarks || "—"}</td>
                                            <td className="px-5 py-3">
                                                {r.isPublished
                                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                        <CheckCircle2 size={10} />Published
                                                      </span>
                                                    : <span className="text-slate-400 text-xs">Unpublished</span>}
                                            </td>
                                            <td className="px-5 py-3">
                                                {/* The class teacher's overall comment for this child's TERM —
                                                    not a note on this paper. It appears on the report card. */}
                                                <button
                                                    data-testid="exam-class-remark-btn"
                                                    data-student-id={r.studentId ?? ""}
                                                    onClick={() => prompt({
                                                        title: `Report card remark — ${r.studentName || "student"}`,
                                                        message: `Applies to the whole of ${exam.examTerm}, not just this paper. Leave blank to clear it.`,
                                                        label: "Class teacher's remark",
                                                        multiline: true,
                                                        confirmText: "Save remark",
                                                        validate: (v) => (v.length > 1000 ? "Keep the remark under 1000 characters." : null),
                                                        onSubmit: async (remark) => {
                                                            try {
                                                                await api.setClassTeacherRemark(r.studentId, {
                                                                    sessionId: exam.sessionId,
                                                                    examTerm: exam.examTerm,
                                                                    remark,
                                                                });
                                                                setMessage(remark ? "Remark saved to the report card." : "Remark cleared.");
                                                                setMessageType("success");
                                                            } catch (err: any) {
                                                                setMessage(err?.response?.data?.message ?? "Couldn't save the remark.");
                                                                setMessageType("error");
                                                            }
                                                        },
                                                    })}
                                                    disabled={!r.studentId}
                                                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:text-slate-300"
                                                >
                                                    Remark…
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Exam Report (stage 4 only) ─────────────────────────────────── */}
            {stage === 4 && (
                <ExamReport examId={examId} />
            )}

            {reEval && exam && (
                <ReEvaluateModal
                    resultId={reEval.id}
                    studentName={reEval.name}
                    currentMarks={reEval.marks}
                    fullMarks={exam.fullMarks}
                    onClose={() => setReEval(null)}
                    onDone={() => { setReEval(null); setResultsReloadKey(k => k + 1); }}
                />
            )}

        </div>
    );
};

export default ExamDetails;
