import { useState, useEffect, useMemo } from "react";
import { Plus, BookOpen, RefreshCcw, CalendarDays } from "lucide-react";
import api from "../../api/api";
import CreateCourse from "../../components/Courses/CreateCourse.tsx";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";

interface SessionOpt { id: string; name: string; status?: "ACTIVE" | "ENDING" | "ENDED" }

const CourseHome = () => {
    const [sessions, setSessions]               = useState<SessionOpt[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [courses, setCourses]                 = useState<any[]>([]);
    const [isLoading, setIsLoading]             = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [message, setMessage]                 = useState<string | null>(null);
    const [messageType, setMessageType]         = useState<"success" | "error" | null>(null);

    const navigate = useNavigate();

    // Load sessions; preselect the ACTIVE one.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setSessionsLoading(true);
            try {
                const data = await api.getSessions();
                if (cancelled) return;
                const list: SessionOpt[] = Array.isArray(data) ? data : [];
                setSessions(list);
                const active = list.find(s => s.status === "ACTIVE") ?? list[0];
                if (active) setSelectedSessionId(active.id);
            } catch {
                if (!cancelled) {
                    setMessage("Failed to load sessions.");
                    setMessageType("error");
                }
            } finally {
                if (!cancelled) setSessionsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const fetchCourses = async () => {
        if (!selectedSessionId) { setCourses([]); return; }
        setIsLoading(true);
        try {
            const data = await api.getCourses({ sessionId: selectedSessionId });
            setCourses(Array.isArray(data) ? data : []);
        } catch {
            setMessage("Failed to load courses. Please refresh.");
            setMessageType("error");
            setCourses([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCourses(); }, [selectedSessionId]);

    const selectedSession = useMemo(
        () => sessions.find(s => s.id === selectedSessionId) ?? null,
        [sessions, selectedSessionId]
    );

    return (
        <div className="min-h-full bg-slate-50">
            {isCreateModalOpen && (
                <CreateCourse
                    onClose={() => setIsCreateModalOpen(false)}
                    onRefresh={fetchCourses}
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
            )}

            {message && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-xl shadow-lg text-sm font-medium border ${
                    messageType === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                }`}>
                    {message}
                </div>
            )}

            <PageHeader
                icon={BookOpen}
                title="Course Management"
                subtitle="Create, view and manage courses per academic session"
                actions={
                    <div className="flex gap-2">
                        <button onClick={fetchCourses} disabled={isLoading || !selectedSessionId}
                            className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl flex items-center gap-2 text-sm hover:bg-white/20 disabled:opacity-50 transition backdrop-blur-sm">
                            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button data-testid="create-course-btn" onClick={() => setIsCreateModalOpen(true)} disabled={!selectedSessionId}
                            className="px-4 py-2 bg-white/15 border border-white/25 text-white rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed transition backdrop-blur-sm">
                            <Plus size={18} /> Create Course
                        </button>
                    </div>
                }
            />

            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">

                {/* Session selector */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-3 sm:p-4 text-white shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
                                <CalendarDays size={17} />
                            </div>
                            <div className="leading-tight">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-white/70">Academic Session</p>
                                <p className="text-[11px] text-white/80">Pick a session to view its courses</p>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <select
                                data-testid="courses-session-select"
                                value={selectedSessionId}
                                onChange={e => setSelectedSessionId(e.target.value)}
                                disabled={sessionsLoading}
                                className="w-full px-3 py-2 rounded-lg bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
                            >
                                {sessionsLoading && <option>Loading sessions…</option>}
                                {!sessionsLoading && sessions.length === 0 && <option value="">No sessions found</option>}
                                {!sessionsLoading && sessions.length > 0 && <option value="">— Select a session —</option>}
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}{s.status && s.status !== "ACTIVE" ? ` (${s.status.toLowerCase()})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedSession && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 border border-white/20 font-bold text-[11px]">
                                {courses.length} courses
                            </span>
                        )}
                    </div>
                </div>

                {/* Empty gate */}
                {!selectedSessionId && !sessionsLoading && (
                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                            <CalendarDays size={26} className="text-emerald-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1">Pick a session to begin</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Courses are scoped to a single academic session. Choose one above to view or create courses.
                        </p>
                    </div>
                )}

                {selectedSessionId && (
                    <main>
                        <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-700">
                                    Courses in {selectedSession?.name ?? "—"}
                                </h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="p-4 text-sm font-semibold uppercase">Slug</th>
                                        <th className="p-4 text-sm font-semibold uppercase">Course Name</th>
                                    </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={2} className="text-center p-16 text-slate-500">
                                                <RefreshCcw size={18} className="animate-spin inline mr-2" />
                                                Loading courses...
                                            </td>
                                        </tr>
                                    ) : courses.length > 0 ? (
                                        courses.map((course: any) => (
                                            <tr
                                                key={course.id}
                                                data-testid={`course-row-${course.slug}`}
                                                onClick={() => navigate(`/course/${course.id}`)}
                                                className="hover:bg-slate-50 cursor-pointer transition"
                                            >
                                                <td className="p-4 font-mono text-slate-500">#{course.slug}</td>
                                                <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    {course.name}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="text-center p-16 text-slate-500">
                                                No courses found in this session
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
};

export default CourseHome;
