import { useState, useEffect } from "react";
import { Plus, BookOpen, RefreshCcw, Filter } from "lucide-react";
import api from "../../api/api";
import CreateSubject from "../../components/CreateSubject.tsx";
import { useNavigate } from "react-router-dom";

const SubjectPage = () => {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const navigate = useNavigate();

    const fetchSubjects = async () => {
        setIsLoading(true);
        try {
            const data = await api.getSubjects();
            setSubjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching subjects", error);
            setSubjects([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const data = await api.getSessions();
            setSessions(Array.isArray(data) ? data : data?.sessions || []);
        } catch (error) {
            console.error("Error fetching sessions", error);
            setSessions([]);
        }
    };

    const filteredSubjects = selectedSession
        ? subjects.filter((subject) => subject.sessionId === selectedSession)
        : subjects;

    useEffect(() => {
        fetchSubjects();
        fetchSessions();
    }, []);

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
            {isCreateModalOpen && (
                <CreateSubject
                    onClose={() => setIsCreateModalOpen(false)}
                    onRefresh={fetchSubjects}
                />
            )}

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Subject Management
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Create, view and manage subjects
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchSubjects}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Subject
                    </button>
                </div>
            </header>

            <main>
                <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">

                    {/* Filter Bar */}
                    <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                        <Filter size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Filter by Session:</span>
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">All Sessions</option>
                            {sessions.map((session: any) => (
                                <option key={session.id} value={session.id}>
                                    {session.name}
                                </option>
                            ))}
                        </select>
                        {selectedSession && (
                            <button
                                onClick={() => setSelectedSession("")}
                                className="text-sm text-emerald-600 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-700">
                            All Subjects
                            {selectedSession && (
                                <span className="ml-2 text-sm font-normal text-slate-400">
                                    ({filteredSubjects.length} result{filteredSubjects.length !== 1 ? "s" : ""})
                                </span>
                            )}
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="p-4 text-sm font-semibold uppercase">Slug</th>
                                    <th className="p-4 text-sm font-semibold uppercase">Subject Name</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={2} className="text-center p-16 text-slate-500">
                                            <RefreshCcw size={18} className="animate-spin inline mr-2" />
                                            Loading subjects...
                                        </td>
                                    </tr>
                                ) : filteredSubjects.length > 0 ? (
                                    filteredSubjects.map((subject: any) => (
                                        <tr
                                            key={subject.id}
                                            onClick={() => navigate(`/subject/${subject.slug}`)}
                                            className="hover:bg-slate-50 cursor-pointer transition"
                                        >
                                            <td className="p-4 font-mono text-slate-500">
                                                #{subject.slug}
                                            </td>
                                            <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                    <BookOpen size={20} />
                                                </div>
                                                {subject.name}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="text-center p-16 text-slate-500">
                                            {selectedSession ? "No subjects found for this session" : "No subjects found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SubjectPage;