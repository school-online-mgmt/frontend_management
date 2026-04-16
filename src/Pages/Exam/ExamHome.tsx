import { useEffect, useState } from "react";
import { Plus, RefreshCcw, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import CreateExamModal from "../../components/Exam/CreateExamModal";
import useAuth from "../../hooks/useAuth";

// ── Status badge helper ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    AWAITING_SYLLABUS: {
        label: "Syllabus Required",
        className: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    AWAITING_EXAM_DATE: {
        label: "Ready to Schedule",
        className: "bg-blue-100 text-blue-700 border border-blue-200",
    },
    EXAM_CONDUCTED: {
        label: "Attendance In Progress",
        className: "bg-purple-100 text-purple-700 border border-purple-200",
    },
    AWAITING_RESULT: {
        label: "Grading In Progress",
        className: "bg-indigo-100 text-indigo-700 border border-indigo-200",
    },
    PUBLISHED: {
        label: "Results Published",
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    },
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? {
        label: status,
        className: "bg-slate-100 text-slate-600 border border-slate-200",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
            {cfg.label}
        </span>
    );
};
// ───────────────────────────────────────────────────────────────────────────

const ExamHome = () => {
    const { role } = useAuth();

    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState("");

    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState("");

    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");

    const [terms, setTerms] = useState<string[]>([]);
    const [selectedTerm, setSelectedTerm] = useState("");

    const [exams, setExams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

    const navigate = useNavigate();

    const canCreate = role === "PRINCIPAL" || role === "SUPER_ADMIN" || role === "DIRECTOR" || role === "MANAGEMENT_STAFF";

    // Load Sessions
    useEffect(() => {
        const loadSessions = async () => {
            const data = await api.getSessions();
            setSessions(data || []);
        };
        const loadClasses = async () => {
            const data = await api.getClasses();
            setClasses(data || []);
        };
        loadClasses();
        loadSessions();
    }, []);

    // Fetch Exams
    const fetchExams = async () => {
        if (!selectedSession || !selectedClass) return;

        setIsLoading(true);
        try {
            const data = await api.getExams({
                sessionId: selectedSession,
                classId: selectedClass,
                courseId: selectedCourse || undefined,
                examTerm: selectedTerm || undefined,
            });

            setExams(data.exams || []);
            setCourses(data.filters?.courses || []);
            setTerms(data.filters?.terms || []);
        } catch (err: any) {
            setExams([]);
            setMessage(err?.response?.data?.message || "Failed to fetch exams");
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    // Reset dependent filters when session changes
    useEffect(() => {
        if (!selectedSession) return;

        setSelectedClass("");
        setSelectedCourse("");
        setSelectedTerm("");
        setExams([]);
        setCourses([]);
        setTerms([]);

    }, [selectedSession]);

    // Fetch exams when any filter changes (session + class required)
    useEffect(() => {
        if (!selectedSession || !selectedClass) return;
        fetchExams();
    }, [selectedSession, selectedClass, selectedCourse, selectedTerm]);

    // Auto-dismiss messages
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 5000);
        return () => clearTimeout(t);
    }, [message]);

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">

            {/*Create exam component*/}
            {isCreateOpen && (
                <CreateExamModal
                    onClose={() => setIsCreateOpen(false)}
                    onRefresh={fetchExams}
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
            )}

            {/*Message Section*/}
            {message && (
                <div className={`p-4 rounded-xl border ${
                    messageType === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                }`}>
                    {message}
                </div>
            )}

            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold">Exam Management</h1>
                    <p className="text-slate-500 mt-1">View and manage exam papers</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchExams}
                        disabled={!selectedSession || !selectedClass}
                        className="px-3 py-1.5 border rounded-xl flex gap-2 items-center disabled:opacity-50 hover:bg-slate-50"
                    >
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow hover:bg-emerald-700 flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Create Exam
                        </button>
                    )}
                </div>
            </header>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-3">
                <select
                    value={selectedSession}
                    onChange={(e) => {
                        setSelectedSession(e.target.value);
                        setSelectedClass("");
                        setSelectedCourse("");
                        setSelectedTerm("");
                    }}
                    className="border p-2 rounded-lg text-sm"
                >
                    <option value="">Select Session</option>
                    {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select
                    value={selectedClass}
                    onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedCourse("");
                        setSelectedTerm("");
                    }}
                    disabled={!selectedSession}
                    className="border p-2 rounded-lg text-sm disabled:opacity-50"
                >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select
                    value={selectedCourse}
                    onChange={(e) => {
                        setSelectedCourse(e.target.value);
                        setSelectedTerm("");
                    }}
                    disabled={!selectedClass}
                    className="border p-2 rounded-lg text-sm disabled:opacity-50"
                >
                    <option value="">All Courses</option>
                    {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    disabled={!selectedClass}
                    className="border p-2 rounded-lg text-sm disabled:opacity-50"
                >
                    <option value="">All Terms</option>
                    {terms.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            {/* Exams Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-slate-600">Exam</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Subject</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Term</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Class</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Course</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Exam Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!selectedSession ? (
                            <tr>
                                <td colSpan={7} className="p-10 text-center text-slate-400">
                                    Please select a session to begin
                                </td>
                            </tr>
                        ) : !selectedClass ? (
                            <tr>
                                <td colSpan={7} className="p-10 text-center text-slate-400">
                                    Select a class to view exams
                                </td>
                            </tr>
                        ) : isLoading ? (
                            <tr>
                                <td colSpan={7} className="p-10 text-center text-slate-400">
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
                                    </div>
                                </td>
                            </tr>
                        ) : exams.length ? (
                            exams.map(exam => (
                                <tr
                                    key={exam.id}
                                    onClick={() => navigate(`/exam/${exam.id}`)}
                                    className="hover:bg-slate-50 cursor-pointer border-b last:border-0"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                                                <BookOpen size={16} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{exam.examName}</p>
                                                <p className="text-xs text-slate-400">Marks: {exam.fullMarks}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">{exam.subjectName ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-medium">
                                            {exam.examTerm}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">{exam.className ?? "—"}</td>
                                    <td className="px-4 py-3 text-slate-700">{exam.courseName ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={exam.status} />
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {exam.examDate
                                            ? new Date(exam.examDate).toLocaleDateString(undefined, {
                                                day: "numeric", month: "short", year: "numeric",
                                            })
                                            : "—"}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="p-10 text-center text-slate-400">
                                    No exam papers found for the selected filters
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExamHome;

