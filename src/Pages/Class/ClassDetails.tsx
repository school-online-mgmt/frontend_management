import { useEffect, useState, useCallback } from "react";
import { RefreshCcw, Layers, Plus, Users, User, BookOpen, ChevronRight, ArrowLeft, Calendar, Bell } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import AddSectionModal from "../../components/Classes/AddSectionModal";
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

    if (isLoading && !classData) {
        return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCcw size={28} className="animate-spin text-emerald-600" /></div>;
    }
    if (!classData) return null;

    const totalStudents = classData.sections?.reduce((s: number, sec: any) => s + (sec.studentCount ?? 0), 0) ?? 0;

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>{toast.text}</div>
            )}

            {showSectionModal && (
                <AddSectionModal
                    classId={classId}
                    onClose={() => setShowSectionModal(false)}
                    onSuccess={(msg: any) => { showToast(msg.text, msg.type); fetchClass(); }}
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
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
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
                        <button onClick={fetchClass} className="px-3 py-2 border border-slate-200 rounded-xl flex items-center gap-2 text-sm text-slate-600 hover:bg-white transition">
                            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
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
                        <button onClick={() => setShowSectionModal(true)} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm">Add First Section</button>
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
                subtitle="Pick a session to see who's enrolled — click any row to open the student profile."
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

