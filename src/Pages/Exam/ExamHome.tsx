import { useEffect, useState } from "react";
import { Plus, RefreshCcw, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import CreateExamModal from "../../components/Exam/CreateExamModal";

const ExamHome = () => {

    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState("");

    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState("");

    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");

    const [terms, setTerms] = useState<string[]>([]);
    const [selectedTerm, setSelectedTerm] = useState("");

    const [exams, setExams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

    const navigate = useNavigate();

    // Load Sessions
    useEffect(() => {
        const loadSessions = async () => {
            const data = await api.getSessions();
            setSessions(data || []);
        };

        loadSessions();
    }, []);

    // Fetch classes
    useEffect(() => {
        const loadClasses = async () => {
            const classes = await api.getClasses();
            setClasses(classes || []);
        };
        loadClasses();
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
                examTerm: selectedTerm || undefined,});

            setExams(data.exams || []);
            setCourses(data.filters?.courses || []);
            setTerms(data.filters?.terms || []);
        } catch {
            setExams([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Load classes when session changes
    useEffect(() => {
        if (!selectedSession) return;

        setSelectedClass("");
        setSelectedCourse("");
        setSelectedTerm("");
        setExams([]);

    }, [selectedSession]);

    // Fetch exams only when class is selected
    useEffect(() => {
        if (!selectedSession || !selectedClass) return;
        fetchExams();
    }, [selectedClass, selectedCourse, selectedTerm]);

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

            {/*Header Section*/}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold">Exam Management</h1>
                    <p className="text-slate-500">Manage exams</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={fetchExams}
                        disabled={!selectedSession || !selectedClass}
                        className="px-3 py-1.5 border rounded-xl flex gap-2 disabled:opacity-50"
                    >
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>

                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Exam
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">

                {/* Session */}
                <select
                    value={selectedSession}
                    onChange={(e) => {
                        setSelectedSession(e.target.value);
                        setSelectedClass("");
                        setSelectedCourse("");
                        setSelectedTerm("");
                    }}
                    className="border p-2 rounded-lg"
                >
                    <option value="">Select Session</option>
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                {/* Class */}
                <select
                    value={selectedClass}
                    onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedCourse("");
                        setSelectedTerm("");
                    }}
                    disabled={!selectedSession}
                    className="border p-2 rounded-lg"
                >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {/* Course */}
                <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    disabled={!selectedClass}
                    className="border p-2 rounded-lg"
                >
                    <option value="">All Courses</option>
                    {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {/* Term */}
                <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    disabled={!selectedClass}
                    className="border p-2 rounded-lg"
                >
                    <option value="">All Terms</option>
                    {terms.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            {/*Exams Table*/}
            <div className="bg-white rounded-2xl border p-4">
                <table className="w-full text-left">
                    <thead>
                    <tr>
                        <th className="p-4">Exam</th>
                        <th className="p-4">Term</th>
                        <th className="p-4">Class</th>
                        <th className="p-4">Course</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Date</th>
                    </tr>
                    </thead>

                    <tbody>
                    {!selectedSession ? (
                        <tr>
                            <td colSpan={4} className="p-10 text-center text-slate-500">
                                Please select a session to begin
                            </td>
                        </tr>

                    ) : !selectedClass ? (
                        <tr>
                            <td colSpan={5} className="p-10 text-center text-slate-500">
                                Select class to view exams
                            </td>
                        </tr>

                    ) : isLoading ? (
                        <tr>
                            <td colSpan={4} className="p-10 text-center">Loading...</td>
                        </tr>

                    ) : exams.length ? (
                        exams.map((exam) => (
                            <tr
                                key={exam.id}
                                onClick={() => navigate(`/exam/${exam.id}`)}
                                className="hover:bg-slate-50 cursor-pointer"
                            >
                                <td className="p-4 flex gap-3 items-center">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                        <BookOpen size={18}/>
                                    </div>
                                    {exam.examName}
                                </td>

                                <td className="p-4">{exam.examTerm}</td>
                                <td className="p-4">{exam.class.name}</td>
                                <td className="p-4">{exam.course.name}</td>
                                <td className="p-4">{exam.status}</td>

                                <td className="p-4">
                                    {exam.examDate
                                        ? new Date(exam.examDate).toLocaleString()
                                        : "-"}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={4} className="p-10 text-center">No exams found</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExamHome;