import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, Loader2, Layers, Users, User, BookOpen,
    School, Calendar, AlertTriangle, RefreshCcw, GraduationCap, Phone,
} from "lucide-react";
import api from "../../api/api";


const SectionDetails = () => {
    const { sectionId } = useParams<{ sectionId: string }>();
    const navigate = useNavigate();

    const [section, setSection] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSection = useCallback(async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        if (!sectionId) {
            setError("No section ID provided.");
            setIsLoading(false);
            return;
        }

        try {
            const data = await api.getSectionById(sectionId);
            setSection(data.section);
        } catch {
            setError("Failed to load section details.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [sectionId]);

    useEffect(() => { fetchSection(); }, [fetchSection]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-emerald-600 mb-3" size={36} />
                    <p className="text-slate-500 text-sm">Loading section details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-sm">
                    <AlertTriangle className="mx-auto text-amber-500 mb-3" size={36} />
                    <p className="text-slate-700 font-semibold mb-1">Could not load section</p>
                    <p className="text-slate-500 text-sm mb-4">{error}</p>
                    <button onClick={() => fetchSection()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!section) return null;

    const createdDate = section.createdAt
        ? new Date(section.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : "N/A";

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
            {/* Back */}
            <button
                onClick={() => navigate(section.class?.id ? `/class/${section.class.id}` : "/section-home")}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
            >
                <ArrowLeft size={18} /> Back to {section.class?.name ?? "Sections"}
            </button>

            {/* Hero Card */}
            <div className="bg-gradient-to-br from-violet-50 to-white border-2 border-violet-100 rounded-2xl p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                            <Layers size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{section.name}</h1>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">#{section.slug}</span>
                                {section.class && (
                                    <button
                                        onClick={() => navigate(`/class/${section.class.id}`)}
                                        className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition flex items-center gap-1"
                                    >
                                        <School size={10} /> {section.class.name}
                                    </button>
                                )}
                                <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} />{createdDate}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => fetchSection(true)}
                        disabled={isRefreshing}
                        className="px-3 py-2 border border-slate-200 rounded-xl flex items-center gap-2 text-sm text-slate-600 hover:bg-white transition disabled:opacity-60"
                    >
                        <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                        { icon: <Users size={18} className="text-emerald-500" />, value: section.studentCount ?? 0, label: "Students Enrolled", bg: "bg-emerald-50" },
                        { icon: <BookOpen size={18} className="text-amber-500" />, value: section.subjectAssignments?.length ?? 0, label: "Subject Teachers", bg: "bg-amber-50" },
                        { icon: <User size={18} className="text-indigo-500" />, value: section.teacher ? 1 : 0, label: section.teacher ? "Teacher Assigned" : "No Teacher", bg: section.teacher ? "bg-indigo-50" : "bg-slate-50" },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>{stat.icon}</div>
                            <div>
                                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                                <p className="text-xs text-slate-500">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section Teacher Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <User size={16} className="text-slate-600" />
                    </div>
                    <h2 className="text-base font-bold text-slate-800">Section Teacher</h2>
                </div>

                {section.teacher ? (
                    <button
                        type="button"
                        className="w-full flex items-center gap-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-50 transition text-left"
                        onClick={() => navigate(`/teacher/${section.teacher.id}`)}
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {section.teacher.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-slate-900">{section.teacher.name}</p>
                            <p className="text-sm text-slate-500">{section.teacher.qualification}</p>
                        </div>
                        <div className="text-right text-xs text-slate-500 space-y-1">
                            {section.teacher.phone && (
                                <div className="flex items-center gap-1 justify-end">
                                    <Phone size={11} />
                                    {section.teacher.phone}
                                </div>
                            )}
                            <div className="flex items-center gap-1 justify-end capitalize">
                                <GraduationCap size={11} />
                                {section.teacher.gender}
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <User size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm font-medium">No section teacher assigned</p>
                        <p className="text-xs text-slate-400 mt-1">Assign a teacher from the Teacher management page</p>
                    </div>
                )}
            </div>

            {/* Subject Assignments */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Subject Teachers</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Teachers assigned to subjects in this section</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                        {section.subjectAssignments?.length ?? 0} assigned
                    </span>
                </div>

                {section.subjectAssignments?.length ? (
                    <div className="divide-y divide-slate-50">
                        {section.subjectAssignments.map((sa: any) => (
                            <div key={sa.subjectTeachers?.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                                {/* Subject info */}
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                                        <BookOpen size={16} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{sa.subjects?.name ?? "—"}</p>
                                        <p className="text-xs text-slate-400 font-mono">#{sa.subjects?.slug}</p>
                                    </div>
                                </div>

                                {/* Teacher info - navigate to teacher details */}
                                {sa.teachers ? (
                                    <button
                                        onClick={() => navigate(`/teacher/${sa.teachers.id}`)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {sa.teachers.name.charAt(0)}
                                        </div>
                                        <span className="text-sm text-slate-700 font-medium">{sa.teachers.name}</span>
                                    </button>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">No teacher</span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center">
                        <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No subject teachers assigned</p>
                        <p className="text-xs text-slate-400 mt-1">Assign teachers to subjects from the Subject management page.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SectionDetails;

