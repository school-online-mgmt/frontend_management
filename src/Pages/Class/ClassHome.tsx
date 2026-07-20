import React, { useState } from "react";
import { Plus, RefreshCcw, School, Users, Layers, User, ChevronRight, BookOpen, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import CreateClassModal from "../../components/Classes/CreateClassModal";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSessionId } from "../../context/SessionContext";

const StatBadge = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
    <div className="flex items-center gap-2">
        <div className="text-slate-400">{icon}</div>
        <div>
            <p className="text-base font-bold text-slate-800 leading-none">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        </div>
    </div>
);

const ClassHome = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const selectedSessionId = useSessionId();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const showToast = (text: string, type: "success" | "error") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Cached per session id — switching sessions rehydrates from cache
    // when we've fetched it before, so the page feels instant on revisit.
    const classesQuery = useQuery({
        queryKey: ["classes", "list", selectedSessionId],
        queryFn: () => api.getClasses(selectedSessionId),
        enabled: !!selectedSessionId,
    });
    const classes: any[] = Array.isArray(classesQuery.data) ? classesQuery.data : [];
    const isLoading = classesQuery.isFetching;
    const fetchClasses = () =>
        queryClient.invalidateQueries({ queryKey: ["classes", "list", selectedSessionId] });

    const filtered = classes.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount ?? 0), 0);
    const totalSections = classes.reduce((sum, c) => sum + (c.sectionCount ?? 0), 0);

    return (
        <div className="min-h-full bg-slate-50">
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
                    {toast.text}
                </div>
            )}

            {showCreateModal && selectedSessionId && (
                <CreateClassModal
                    sessionId={selectedSessionId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(msg: any) => {
                        showToast(msg?.text ?? "Class created", "success");
                        fetchClasses();
                    }}
                />
            )}

            <PageHeader
                icon={School}
                title="Class Management"
                subtitle="Manage classes, sections, and class teachers"
                gradient={MODULE_THEMES.classes}
                onRefresh={fetchClasses}
                refreshing={isLoading}
                primaryActions={
                    <button onClick={() => setShowCreateModal(true)} disabled={!selectedSessionId}
                        data-testid="create-class-btn"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition backdrop-blur-sm shrink-0">
                        <Plus size={15} /> Create Class
                    </button>
                }
            />
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-6">

            {!selectedSessionId ? (
                <EmptySessionState entityPlural="classes" />
            ) : (<>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { icon: <School size={22} className="text-indigo-500" />, value: classes.length, label: "Total Classes", bg: "bg-indigo-50" },
                    { icon: <Layers size={22} className="text-violet-500" />, value: totalSections, label: "Total Sections", bg: "bg-violet-50" },
                    { icon: <Users size={22} className="text-emerald-500" />, value: totalStudents, label: "Total Students", bg: "bg-emerald-50" },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input data-testid="class-search-term-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by class name or slug..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
            </div>

            {/* Class Cards */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCcw size={28} className="animate-spin text-emerald-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <School size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">{searchTerm ? "No classes match your search" : "No classes yet"}</p>
                    {!searchTerm && <button data-testid="class-show-create-modal-btn" onClick={() => setShowCreateModal(true)} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Create First Class</button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(cls => (
                        <div
                            key={cls.id}
                            data-testid={`class-card-${cls.slug}`}
                            onClick={() => navigate(`/class/${cls.id}`)}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all cursor-pointer group"
                        >
                            {/* Card Header */}
                            <div className="p-5 pb-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                                        {cls.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">#{cls.slug}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{cls.name}</h3>

                                {/* Class Teacher */}
                                <div className={`mt-2 flex items-center gap-2 text-sm ${cls.teacher ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                                    <User size={13} className="flex-shrink-0" />
                                    {cls.teacher ? (
                                        <span>{cls.teacher.name} <span className="text-slate-400 text-xs">({cls.teacher.qualification})</span></span>
                                    ) : 'No class teacher assigned'}
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="border-t border-slate-100 px-5 py-3.5 grid grid-cols-3 gap-3">
                                <StatBadge icon={<Layers size={15} />} value={cls.sectionCount ?? cls.sections?.length ?? 0} label="Sections" />
                                <StatBadge icon={<Users size={15} />} value={cls.studentCount ?? 0} label="Students" />
                                <StatBadge icon={<BookOpen size={15} />} value={cls.courses?.length ?? 0} label="Courses" />
                            </div>

                            {/* Sections Preview */}
                            {cls.sections && cls.sections.length > 0 && (
                                <div className="px-5 pb-4">
                                    <p className="text-xs text-slate-400 mb-2">Sections</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cls.sections.slice(0, 5).map((s: any) => (
                                            <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-lg border border-violet-100">
                                                <Layers size={10} />{s.name}
                                            </span>
                                        ))}
                                        {cls.sections.length > 5 && (
                                            <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-xs rounded-lg border border-slate-100">+{cls.sections.length - 5} more</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
                                <span className="text-xs text-slate-500">View Details</span>
                                <ChevronRight size={15} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filtered.length > 0 && (
                <p className="text-xs text-slate-400 text-center">Showing {filtered.length} of {classes.length} classes</p>
            )}
            </>)}
            </div>
        </div>
    );
};

export default ClassHome;

