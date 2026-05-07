import { useState, useMemo } from "react";
import { Plus, BookOpen, RefreshCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import CreateCourse from "../../components/Courses/CreateCourse.tsx";
import { useNavigate } from "react-router-dom";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSession } from "../../context/SessionContext";

interface SessionOpt { id: string; name: string; status?: "ACTIVE" | "ENDING" | "ENDED" }

const CourseHome = () => {
    // Sessions + active selection are global — sourced from the layout topbar.
    const { sessions: ctxSessions, selectedSessionId, loading: sessionsLoading } = useSession();
    const sessions = ctxSessions as unknown as SessionOpt[];
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [message, setMessage]                 = useState<string | null>(null);
    const [messageType, setMessageType]         = useState<"success" | "error" | null>(null);

    const navigate = useNavigate();

    const coursesQuery = useQuery({
        queryKey: ["courses", "list", selectedSessionId],
        queryFn: () => api.getCourses({ sessionId: selectedSessionId }),
        enabled: !!selectedSessionId,
    });
    const courses: any[] = Array.isArray(coursesQuery.data) ? coursesQuery.data : [];
    const isLoading = coursesQuery.isFetching;
    const fetchCourses = () =>
        queryClient.invalidateQueries({ queryKey: ["courses", "list", selectedSessionId] });

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
                gradient={MODULE_THEMES.academics}
                onRefresh={fetchCourses}
                refreshing={isLoading}
                primaryActions={
                    <button data-testid="create-course-btn" onClick={() => setIsCreateModalOpen(true)} disabled={!selectedSessionId}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white rounded-lg text-sm font-semibold hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition backdrop-blur-sm shrink-0">
                        <Plus size={15} /> Create Course
                    </button>
                }
            />

            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">

                {/* Empty gate */}
                {!selectedSessionId && !sessionsLoading && (
                    <EmptySessionState entityPlural="courses" />
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
