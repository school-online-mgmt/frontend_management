import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    BookOpen, Calendar, CheckCircle2, Clock, FileText,
    Pencil, Trash2, User, BookMarked, GraduationCap, Loader2
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

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
    label: string; className: string; icon: ReactElement | null; description: string;
}> = {
    AWAITING_SYLLABUS: {
        label: "Syllabus Required",
        className: "bg-amber-100 text-amber-700 border border-amber-200",
        icon: <Clock size={14} />,
        description: "The assigned teacher needs to submit the syllabus for this exam paper.",
    },
    AWAITING_EXAM_DATE: {
        label: "Ready to Schedule",
        className: "bg-blue-100 text-blue-700 border border-blue-200",
        icon: <Calendar size={14} />,
        description: "Syllabus has been submitted. Schedule the exam date to proceed.",
    },
    EXAM_CONDUCTED: {
        label: "Attendance In Progress",
        className: "bg-purple-100 text-purple-700 border border-purple-200",
        icon: <CheckCircle2 size={14} />,
        description: "The exam has been conducted. Teachers are recording student attendance.",
    },
    AWAITING_RESULT: {
        label: "Grading In Progress",
        className: "bg-indigo-100 text-indigo-700 border border-indigo-200",
        icon: <FileText size={14} />,
        description: "Attendance is complete. Teachers are entering marks for present students.",
    },
    PUBLISHED: {
        label: "Results Published",
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        icon: <CheckCircle2 size={14} />,
        description: "All results have been published and are visible to students.",
    },
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? {
        label: status,
        className: "bg-slate-100 text-slate-600 border border-slate-200",
        icon: null,
        description: "",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.className}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
};

// ─── Info card ───────────────────────────────────────────────────────────────
const InfoItem = ({ icon, label, value }: { icon: ReactElement; label: string; value: string | number | null | undefined }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 text-slate-400">{icon}</div>
        <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-slate-800 font-medium mt-0.5">{value ?? "—"}</p>
        </div>
    </div>
);

// ─── Workflow step indicator ─────────────────────────────────────────────────
const STEPS = [
    { key: "AWAITING_SYLLABUS", label: "Syllabus" },
    { key: "AWAITING_EXAM_DATE", label: "Scheduling" },
    { key: "EXAM_CONDUCTED", label: "Attendance" },
    { key: "AWAITING_RESULT", label: "Grading" },
    { key: "PUBLISHED", label: "Published" },
];

const stepIndex = (status: string) => STEPS.findIndex(s => s.key === status);

const WorkflowStepper = ({ status }: { status: string }) => {
    const current = stepIndex(status);
    return (
        <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={step.key} className="flex items-center">
                        <div className={`flex flex-col items-center`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                ${done ? "bg-emerald-500 text-white" : active ? "bg-emerald-600 text-white ring-4 ring-emerald-100" : "bg-slate-200 text-slate-400"}`}>
                                {done ? <CheckCircle2 size={16} /> : i + 1}
                            </div>
                            <p className={`text-xs mt-1 font-medium ${active ? "text-emerald-600" : done ? "text-slate-500" : "text-slate-400"}`}>
                                {step.label}
                            </p>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`h-0.5 w-16 mx-1 mb-5 ${i < current ? "bg-emerald-400" : "bg-slate-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ExamDetails = () => {
    const { examId } = useParams() as { examId: string };
    const { role } = useAuth();
    const navigate = useNavigate();

    const [exam, setExam] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [completingAttendance, setCompletingAttendance] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [syllabusOpen, setSyllabusOpen] = useState(false);
    const [qpOpen, setQpOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

    // Results state for AWAITING_RESULT status
    const [examResults, setExamResults] = useState<any[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const fetchExam = async () => {
        try {
            const data = await api.getExamById(examId);
            setExam(data);
        } catch (_) {
            setExam(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchExam(); }, [examId]);

    // Fetch results when exam is AWAITING_RESULT or PUBLISHED
    useEffect(() => {
        if (exam && (exam.status === "AWAITING_RESULT" || exam.status === "PUBLISHED")) {
            setResultsLoading(true);
            api.getExamResults(examId)
                .then((data: unknown) => {
                    const list = Array.isArray(data) ? data : (data.results || []);
                    setExamResults(list);
                })
                .catch(() => setExamResults([]))
                .finally(() => setResultsLoading(false));
        }
    }, [exam?.status, examId]);

    // Auto-dismiss messages
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 5000);
        return () => clearTimeout(t);
    }, [message]);

    const isPrincipalOrAdmin = role === "PRINCIPAL" || role === "SUPER_ADMIN";
    const isTeacher = role === "TEACHER";

    const handleDelete = async () => {
        try {
            setDeleteLoading(true);
            await api.deleteExam(examId);
            navigate("/exam-home");
        } catch (err: unknown) {
            setMessage(err?.response?.data?.message || "Failed to delete exam paper");
            setMessageType("error");
            setDeleteOpen(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleCompleteAttendance = async () => {
        try {
            setCompletingAttendance(true);
            await api.completeAttendance(examId);
            setMessage("Attendance completed — exam status transitioned to Grading In Progress.");
            setMessageType("success");
            fetchExam();
        } catch (err: unknown) {
            setMessage(err?.response?.data?.message || "Failed to complete attendance marking");
            setMessageType("error");
        } finally {
            setCompletingAttendance(false);
        }
    };

    const handlePublishResults = async () => {
        try {
            setPublishing(true);
            await api.publishExamResults(examId);
            setMessage("Results published successfully!");
            setMessageType("success");
            fetchExam();
        } catch (err: unknown) {
            setMessage(err?.response?.data?.message || "Failed to publish results");
            setMessageType("error");
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
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

    const statusCfg = STATUS_CONFIG[exam.status] ?? { description: "" };

    // ── Action visibility rules ──────────────────────────────────────────────
    // Add Syllabus: teacher or principal when status is AWAITING_SYLLABUS
    const canAddSyllabus = exam.status === "AWAITING_SYLLABUS"
        && (isTeacher || isPrincipalOrAdmin);

    // Add Question Paper: teacher or principal when status is AWAITING_EXAM_DATE
    const canAddQP = exam.status === "AWAITING_EXAM_DATE"
        && (isTeacher || isPrincipalOrAdmin);

    // Schedule & Publish: principal only when status is AWAITING_EXAM_DATE and no date set yet
    const canSchedule = exam.status === "AWAITING_EXAM_DATE" 
        && isPrincipalOrAdmin 
        && (!exam.examDate || exam.examDate === null);

    // Edit / Delete: principal only

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">

            {/* Modals */}
            {editOpen && (
                <UpdateExamModal exam={exam} onClose={() => setEditOpen(false)}
                    onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType} />
            )}
            {scheduleOpen && (
                <ScheduleExamModal examId={exam.id} onClose={() => setScheduleOpen(false)}
                    onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType} />
            )}
            {syllabusOpen && (
                <AddSyllabusModal examId={exam.id} onClose={() => setSyllabusOpen(false)}
                    onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType} />
            )}
            {qpOpen && (
                <AddQuestionPaperModal examId={exam.id} onClose={() => setQpOpen(false)}
                    onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType} />
            )}
            {deleteOpen && (
                <ConfirmModal
                    title="Delete Exam Paper"
                    message={`Are you sure you want to delete the exam paper for "${exam.subject?.name ?? exam.examName}"? This action cannot be undone.`}
                    confirmText="Delete"
                    loading={deleteLoading}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteOpen(false)}
                />
            )}

            {/* Message Banner */}
            {message && (
                <div className={`p-4 rounded-xl border text-sm ${
                    messageType === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                }`}>
                    {message}
                </div>
            )}

            <BackButton />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <span>{exam.session?.name ?? "—"}</span>
                        <span>·</span>
                        <span>{exam.examTerm}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">{exam.examName}</h1>
                    <p className="text-slate-500 mt-0.5">{exam.subject?.name ?? "—"}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <StatusBadge status={exam.status} />
                    {isPrincipalOrAdmin && (
                        <button
                            onClick={() => setEditOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-sm hover:bg-slate-50"
                        >
                            <Pencil size={14} />
                            Edit
                        </button>
                    )}
                    {exam.status === "EXAM_CONDUCTED" && isPrincipalOrAdmin && (
                        <button
                            onClick={handleCompleteAttendance}
                            disabled={completingAttendance}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <CheckCircle2 size={14} />
                            {completingAttendance ? "Completing..." : "Complete Attendance"}
                        </button>
                    )}
                    {exam.status === "AWAITING_RESULT" && isPrincipalOrAdmin && (
                        <button
                            onClick={handlePublishResults}
                            disabled={publishing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <CheckCircle2 size={14} />
                            {publishing ? "Publishing..." : "Publish Results"}
                        </button>
                    )}
                    {isPrincipalOrAdmin && (
                        <button
                            onClick={() => setDeleteOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50"
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Workflow Progress */}
            <div className="bg-white p-6 rounded-2xl border">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Progress</h2>
                <WorkflowStepper status={exam.status} />
                {statusCfg.description && (
                    <p className="mt-4 text-sm text-slate-500">{statusCfg.description}</p>
                )}
            </div>

            {/* Details Grid */}
            <div className="bg-white p-6 rounded-2xl border">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-5">Exam Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InfoItem icon={<BookOpen size={16} />} label="Exam Name" value={exam.examName} />
                    <InfoItem icon={<BookMarked size={16} />} label="Subject" value={exam.subject?.name} />
                    <InfoItem icon={<GraduationCap size={16} />} label="Session" value={exam.session?.name} />
                    <InfoItem icon={<User size={16} />} label="Assigned Teacher" value={exam.teacher?.name} />
                    <InfoItem icon={<FileText size={16} />} label="Full Marks" value={exam.fullMarks} />
                    <InfoItem icon={<FileText size={16} />} label="Marking System" value={exam.markingSystem} />
                    <InfoItem icon={<Calendar size={16} />} label="Exam Date"
                        value={exam.examDate
                            ? new Date(exam.examDate).toLocaleDateString(undefined, {
                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                            })
                            : null}
                    />
                    <InfoItem icon={<Clock size={16} />} label="Term" value={exam.examTerm} />
                </div>
            </div>

            {/* Pending Actions Banner */}
            {(canAddSyllabus || canSchedule) && (
                <div className={`rounded-2xl border-2 p-5 ${
                    exam.status === "AWAITING_SYLLABUS"
                        ? "border-amber-200 bg-amber-50"
                        : "border-blue-200 bg-blue-50"
                }`}>
                    <p className="font-semibold text-slate-800 mb-1">
                        {exam.status === "AWAITING_SYLLABUS"
                            ? "⚠️ Action Required: Submit Syllabus"
                            : "📅 Action Required: Schedule Exam"}
                    </p>
                    <p className="text-sm text-slate-600 mb-4">
                        {exam.status === "AWAITING_SYLLABUS"
                            ? "Please add the syllabus for this exam paper to proceed to the scheduling stage."
                            : "The syllabus has been submitted. Please set an exam date to publish this paper."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {canAddSyllabus && (
                            <button
                                onClick={() => setSyllabusOpen(true)}
                                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm hover:bg-amber-700 font-medium"
                            >
                                {exam.syllabus ? "Update Syllabus" : "Add Syllabus"}
                            </button>
                        )}
                        {canSchedule && (
                            <button
                                onClick={() => setScheduleOpen(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 font-medium"
                            >
                                Schedule &amp; Publish
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Syllabus */}
            <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen size={16} className="text-slate-400" />
                        Syllabus
                    </h2>
                    {canAddSyllabus && (
                        <button
                            onClick={() => setSyllabusOpen(true)}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                            {exam.syllabus ? "Edit" : "+ Add"}
                        </button>
                    )}
                </div>
                {exam.syllabus ? (
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{exam.syllabus}</p>
                ) : (
                    <p className="text-slate-400 italic text-sm">
                        {exam.status === "AWAITING_SYLLABUS"
                            ? "No syllabus submitted yet."
                            : "No syllabus on record."}
                    </p>
                )}
            </div>

            {/* Question Paper */}
            <div className="bg-white p-6 rounded-2xl border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" />
                        Question Paper
                    </h2>
                    {canAddQP && (
                        <button
                            onClick={() => setQpOpen(true)}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                            {exam.questionPaper ? "Edit" : "+ Add"}
                        </button>
                    )}
                </div>
                {exam.questionPaper ? (
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{exam.questionPaper}</p>
                ) : (
                    <p className="text-slate-400 italic text-sm">
                        {exam.status === "AWAITING_SYLLABUS"
                            ? "Question paper can be added after the syllabus is submitted."
                            : "No question paper uploaded yet."}
                    </p>
                )}
            </div>

            {/* Results Overview — show for AWAITING_RESULT and PUBLISHED */}
            {(exam.status === "AWAITING_RESULT" || exam.status === "PUBLISHED") && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="p-6 border-b bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <FileText size={16} className="text-slate-400" />
                            Exam Results
                        </h2>
                        {!resultsLoading && examResults.length > 0 && (() => {
                            const present = examResults.filter((r: unknown) => r.attendanceStatus === "PRESENT");
                            const absent = examResults.filter((r: unknown) => r.attendanceStatus === "ABSENT");
                            const marksEntered = present.filter((r: unknown) => r.marks !== null && r.marks !== undefined);
                            const marksMissing = present.length - marksEntered.length;
                            return (
                                <div className="flex flex-wrap gap-2 mt-3 text-sm font-medium">
                                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
                                        {examResults.length} Total
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        ✓ {present.length} Present
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
                                        ✗ {absent.length} Absent
                                    </span>
                                    <span className={`px-3 py-1.5 rounded-lg border ${
                                        marksMissing === 0
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : "bg-amber-50 border-amber-200 text-amber-700"
                                    }`}>
                                        📝 {marksEntered.length}/{present.length} marks entered
                                    </span>
                                </div>
                            );
                        })()}
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {examResults.map((r: unknown) => (
                                        <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="px-5 py-3 font-medium text-slate-800">
                                                {r.studentName || `${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""}`.trim() || "—"}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">
                                                {r.rollNo || r.academic?.rollNo || "—"}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">
                                                {r.sectionName || r.academic?.section?.name || "—"}
                                            </td>
                                            <td className="px-5 py-3">
                                                {r.attendanceStatus === "PRESENT" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">✓ Present</span>
                                                ) : r.attendanceStatus === "ABSENT" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Absent</span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {r.attendanceStatus === "ABSENT" ? (
                                                    <span className="text-slate-400 text-xs">N/A</span>
                                                ) : r.marks !== null && r.marks !== undefined ? (
                                                    <span className="font-medium text-slate-800">{r.marks} / {exam.fullMarks}</span>
                                                ) : (
                                                    <span className="text-amber-600 text-xs font-medium">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500 text-xs">{r.remarks || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Exam Performance Report — only for PUBLISHED exams */}
            {exam.status === "PUBLISHED" && (
                <ExamReport examId={examId} />
            )}

        </div>
    );
};

export default ExamDetails;

