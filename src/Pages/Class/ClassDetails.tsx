import { useEffect, useState, useCallback } from "react";
import { RefreshCcw, Layers, Plus, Users, User, BookOpen, ChevronRight, ArrowLeft, Calendar, Bell } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import AddSectionModal from "../../components/Structure/AddSectionModal";
import CreateCourseInClassModal from "../../components/Courses/CreateCourseInClassModal.tsx";
import SessionStudentsTable from "../../components/Student/SessionStudentsTable";
import NoticeBoardsModal from "../../components/Classes/NoticeBoardsModal";

const ClassDetails = () => {
    const { classId } = useParams() as { classId: string };
    const navigate = useNavigate();

    const [classData, setClassData] = useState<any>(null);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
    const [showBoardsModal, setShowBoardsModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [confirmDeleteClass, setConfirmDeleteClass] = useState(false);
    const [confirmDeleteSection, setConfirmDeleteSection] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    const showToast = (text: string, type: "success" | "error") => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchClass = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getClassById(classId);
            setClassData(data.classData);
        } finally {
            setIsLoading(false);
        }
    }, [classId]);

    useEffect(() => { fetchClass(); }, [fetchClass]);

    const doDeleteClass = async () => {
        setDeleting(true);
        try {
            await api.deleteClass(classId);
            showToast("Class deleted", "success");
            setConfirmDeleteClass(false);
            navigate("/class-Home");
        } catch (e: any) {
            showToast(e?.response?.data?.message || "Cannot delete this class", "error");
            setConfirmDeleteClass(false);
        } finally { setDeleting(false); }
    };

    const doDeleteSection = async () => {
        if (!confirmDeleteSection) return;
        setDeleting(true);
        try {
            await api.deleteSection(confirmDeleteSection.id);
            showToast("Section deleted", "success");
            setConfirmDeleteSection(null);
            fetchClass();
        } catch (e: any) {
            showToast(e?.response?.data?.message || "Cannot delete this section", "error");
            setConfirmDeleteSection(null);
        } finally { setDeleting(false); }
    };

    if (isLoading && !classData) {
        return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCcw size={28} className="animate-spin text-emerald-600" /></div>;
    }
    if (!classData) return null;

    const totalStudents = classData.sections?.reduce((s: number, sec: any) => s + (sec.studentCount ?? 0), 0) ?? 0;

    return (
        <div className="p-2 max-w-7xl mx-auto space-y-6">
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>{toast.text}</div>
            )}

            {confirmDeleteClass && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40" onClick={() => setConfirmDeleteClass(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-bold text-slate-800">Delete class?</h3>
                        <p className="text-sm text-slate-500 mt-1">Delete <span className="font-semibold">{classData.name}</span>? This cannot be undone.</p>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setConfirmDeleteClass(false)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                            <button data-testid="class-delete-confirm-btn" onClick={doDeleteClass} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDeleteSection && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/40" onClick={() => setConfirmDeleteSection(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-bold text-slate-800">Delete section?</h3>
                        <p className="text-sm text-slate-500 mt-1">Delete <span className="font-semibold">{confirmDeleteSection.name}</span>? This cannot be undone.</p>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setConfirmDeleteSection(null)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                            <button data-testid="section-delete-confirm-btn" onClick={doDeleteSection} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {showSectionModal && (
                <AddSectionModal
                    classId={classId}
                    className={classData.name}
                    existingSlugs={(classData.sections ?? []).map((s: any) => s.slug)}
                    onClose={() => setShowSectionModal(false)}
                    onSuccess={(n: number) => {
                        showToast(`Added ${n} section${n === 1 ? "" : "s"}`, "success");
                        setShowSectionModal(false);
                        fetchClass();
                    }}
                />
            )}
            {showCreateCourseModal && (
                <CreateCourseInClassModal
                    classId={classId}
                    className={classData.name}
                    onClose={() => setShowCreateCourseModal(false)}
                    onSuccess={(msg: string) => { showToast(msg, "success"); fetchClass(); }}
                />
            )}
            <NoticeBoardsModal
                open={showBoardsModal}
                onClose={() => setShowBoardsModal(false)}
                classId={classId}
                scopeLabel={`Boards visible to ${classData.name}`}
            />

            {/* Back */}
            <button data-testid="class-navigate-btn" onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
                <ArrowLeft size={18} /> Back
            </button>

            {/* Hero */}
            <div className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 rounded-2xl p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0">
                            {classData.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{classData.name}</h1>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">#{classData.slug}</span>
                                <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} />Created {new Date(classData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className={`mt-2 flex items-center gap-2 text-sm ${classData.teacher ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                                <User size={13} />
                                {classData.teacher ? `${classData.teacher.name} · ${classData.teacher.qualification}` : 'No class teacher assigned'}
                                {classData.teacher?.phone && <span className="text-slate-400 text-xs">· {classData.teacher.phone}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setShowBoardsModal(true)}
                            data-testid="class-notice-boards-btn"
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-2 text-sm font-semibold shadow-sm transition-colors"
                        >
                            <Bell size={14} /> Notice Boards
                        </button>
                        <button data-testid="class-fetch-class-btn" onClick={fetchClass} className="px-3 py-2 border border-slate-200 rounded-xl flex items-center gap-2 text-sm text-slate-600 hover:bg-white transition">
                            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button
                            data-testid="class-delete-btn"
                            data-in-use={((classData.sections?.length ?? 0) > 0 || (classData.courses?.length ?? 0) > 0) ? "true" : "false"}
                            disabled={(classData.sections?.length ?? 0) > 0 || (classData.courses?.length ?? 0) > 0}
                            title={((classData.sections?.length ?? 0) > 0 || (classData.courses?.length ?? 0) > 0) ? "Remove all sections and courses before deleting this class" : "Delete this class"}
                            onClick={() => setConfirmDeleteClass(true)}
                            className="px-3 py-2 border border-red-200 text-red-600 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Delete Class
                        </button>
                    </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                        { icon: <Layers size={18} className="text-violet-500" />, value: classData.sections?.length ?? 0, label: "Sections", bg: "bg-violet-50" },
                        { icon: <Users size={18} className="text-emerald-500" />, value: totalStudents, label: "Total Students", bg: "bg-emerald-50" },
                        { icon: <BookOpen size={18} className="text-amber-500" />, value: classData.courses?.length ?? 0, label: "Courses", bg: "bg-amber-50" },
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

            {/* Sections */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Sections</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{classData.sections?.length ?? 0} section{classData.sections?.length !== 1 ? 's' : ''} in this class</p>
                    </div>
                    <button data-testid="add-section-btn" onClick={() => setShowSectionModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5">
                        <Plus size={15} /> Add Section
                    </button>
                </div>

                {classData.sections?.length === 0 ? (
                    <div className="p-10 text-center">
                        <Layers size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No sections yet</p>
                        <button data-testid="class-show-section-modal-btn" onClick={() => setShowSectionModal(true)} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm">Add First Section</button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {classData.sections.map((section: any) => (
                            <div
                                key={section.id}
                                data-testid={`section-row-${section.slug}`}
                                onClick={() => navigate(`/section/${section.id}`)}
                                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{section.name}</p>
                                        <p className="text-xs text-slate-400 font-mono">#{section.slug}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Section Teacher */}
                                    <div className="hidden sm:flex items-center gap-2 text-sm">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${section.teacher ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {section.teacher ? section.teacher.name.charAt(0) : '?'}
                                        </div>
                                        <span className={`text-sm ${section.teacher ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                            {section.teacher ? section.teacher.name : 'No teacher'}
                                        </span>
                                    </div>

                                    {/* Student Count */}
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
                                        <Users size={12} />
                                        {section.studentCount ?? 0} students
                                    </div>

                                    <button
                                        data-testid={`section-delete-btn-${section.slug}`}
                                        data-in-use={(section.studentCount ?? 0) > 0 ? "true" : "false"}
                                        disabled={(section.studentCount ?? 0) > 0}
                                        title={(section.studentCount ?? 0) > 0 ? "Move all students out before deleting this section" : "Delete this section"}
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteSection({ id: section.id, name: section.name }); }}
                                        className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Delete
                                    </button>

                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Students enrolled in this class for the chosen session */}
            <SessionStudentsTable
                filterClassId={classId}
                title={`Students in ${classData.name}`}
                subtitle="Click any row to open the student profile."
                accent="indigo"
            />

            {/* Courses */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Courses</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Academic courses offered in {classData.name}</p>
                    </div>
                    <button data-testid="add-course-btn" onClick={() => setShowCreateCourseModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5">
                        <Plus size={15} /> Add Course
                    </button>
                </div>

                {classData.courses?.length === 0 ? (
                    <div className="p-10 text-center">
                        <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No courses yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {classData.courses?.map((course: any) => (
                            <div
                                key={course.id}
                                data-testid={`course-row-${course.slug}`}
                                onClick={() => navigate(`/course/${course.id}`)}
                                className="px-6 py-4 hover:bg-slate-50/60 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                                            <BookOpen size={16} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{course.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">#{course.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                            {course.courseSubjects?.length ?? 0} subjects
                                        </span>
                                        <ChevronRight size={15} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                                    </div>
                                </div>

                                {/* Subject pills */}
                                {course.courseSubjects?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3 ml-12">
                                        {course.courseSubjects.slice(0, 6).map((cs: any) => (
                                            <span key={cs.subject?.id} className="text-xs px-2.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-full">{cs.subject?.name}</span>
                                        ))}
                                        {course.courseSubjects.length > 6 && (
                                            <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">+{course.courseSubjects.length - 6}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassDetails;

