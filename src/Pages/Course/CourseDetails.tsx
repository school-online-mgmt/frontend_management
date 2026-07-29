import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft, Plus, Trash2, BookOpen, GraduationCap,
    Calendar, Layers, Hash, School, ChevronRight, Loader2
} from "lucide-react";
import api from "../../api/api";
import AddSubjectToCourseModal from "../../components/Courses/AddSubjectToCourseModal";
import ConfirmModal from "../../components/common/ConfirmModal.tsx";

const StatCard = ({ icon, label, value, color = "slate" }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) => {
    const colorMap: Record<string, string> = {
        emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
        blue: "bg-blue-50 border-blue-100 text-blue-600",
        indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
        slate: "bg-slate-50 border-slate-100 text-slate-500",
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${colorMap[color]}`}>{icon}</div>
            <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
            </div>
        </div>
    );
};

const CourseDetails = () => {
    const { courseId } = useParams() as { courseId: string };
    const navigate = useNavigate();

    const [course, setCourse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDeleteCourseActive, setIsDeleteCourseActive] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<{ id: string; name: string } | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const isCourseInUse = course?.subjects?.length > 0;

    const fetchCourse = async () => {
        try {
            const data = await api.getCourseById(courseId);
            setCourse(data);
        } catch {
            showMessage("error", "Failed to load course");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCourse(); }, []);

    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 2500);
    };

    const openDeleteModal = (subjectId: string, subjectName: string) => {
        setSelectedSubject({ id: subjectId, name: subjectName });
        setIsConfirmOpen(true);
    };

    const confirmRemoveSubject = async () => {
        if (!selectedSubject) return;
        try {
            await api.removeSubjectFromCourse(course.id, selectedSubject.id);
            setIsConfirmOpen(false);
            setSelectedSubject(null);
            showMessage("success", `${selectedSubject.name} removed from ${course.name}`);
            fetchCourse();
        } catch {
            showMessage("error", "Failed to remove subject");
        }
    };

    const confirmDeleteCourse = async () => {
        try {
            await api.deleteCourse(course.id);
            showMessage("success", `${course.name} deleted successfully`);
            setTimeout(() => navigate(-1), 1200);
        } catch {
            showMessage("error", "Failed to delete course");
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin text-emerald-600" size={36} />
        </div>
    );

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-7">

            {/* Modals */}
            {isAddModalOpen && (
                <AddSubjectToCourseModal
                    course={course}
                    onClose={() => setIsAddModalOpen(false)}
                    onRefresh={fetchCourse}
                    showMessage={showMessage}
                />
            )}
            {isConfirmOpen && selectedSubject && (
                <ConfirmModal
                    title="Remove Subject"
                    message={`Remove "${selectedSubject.name}" from ${course.name}?`}
                    confirmText="Remove"
                    cancelText="Cancel"
                    onConfirm={confirmRemoveSubject}
                    onCancel={() => setIsConfirmOpen(false)}
                />
            )}
            {isDeleteCourseActive && (
                <ConfirmModal
                    title="Delete Course"
                    message={`Are you sure you want to delete "${course.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={confirmDeleteCourse}
                    onCancel={() => setIsDeleteCourseActive(false)}
                />
            )}

            {/* Header */}
            <div>
                <button data-testid="course-navigate-btn"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition text-sm font-medium mb-4"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                            <GraduationCap size={26} className="text-blue-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
                                <span
                                    className="hover:text-slate-600 cursor-pointer transition"
                                    onClick={() => course.class?.id && navigate(`/class/${course.class.id}`)}
                                >
                                    {course.class?.name ?? "Class"}
                                </span>
                                <ChevronRight size={12} />
                                <span className="text-slate-600">Course</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
                            {course.session?.name && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-1">
                                    <Calendar size={11} /> {course.session.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        data-testid="course-delete-btn"
                        data-in-use={isCourseInUse ? "true" : "false"}
                        onClick={() => setIsDeleteCourseActive(true)}
                        disabled={isCourseInUse}
                        className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition text-sm font-medium ${
                            isCourseInUse
                                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                        }`}
                        title={isCourseInUse ? "Course has subjects and cannot be deleted" : "Delete course"}
                    >
                        <Trash2 size={15} />
                        {isCourseInUse ? "In Use" : "Delete Course"}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${
                    message.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                }`}>
                    {message.text}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Layers size={18} />} label="Subjects" value={course.subjects?.length ?? 0} color="blue" />
                <StatCard icon={<School size={18} />} label="Class" value={course.class?.name ?? "—"} color="indigo" />
                <StatCard icon={<Calendar size={18} />} label="Session" value={course.session?.name ?? "—"} color="emerald" />
                <StatCard icon={<Hash size={18} />} label="Slug" value={course.class?.slug ?? "—"} color="slate" />
            </div>

            {/* Description */}
            {course.description && (
                <div className="bg-white rounded-2xl border border-slate-100 px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</p>
                    <p className="text-slate-700 leading-relaxed">{course.description}</p>
                </div>
            )}

            {/* Subjects */}
            <div className="bg-white rounded-2xl border border-slate-100">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-slate-400" />
                        <span className="font-semibold text-slate-800">Subjects in this Course</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                            {course.subjects?.length ?? 0}
                        </span>
                    </div>
                    <button
                        data-testid="add-subject-to-course-btn"
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
                    >
                        <Plus size={15} /> Add Subject
                    </button>
                </div>

                {course.subjects?.length === 0 ? (
                    <div className="p-10 text-center">
                        <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No subjects added yet</p>
                        <p className="text-slate-400 text-sm mt-1">Click "Add Subject" to assign subjects to this course.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {course.subjects.map((subject: any, idx: number) => (
                            <div
                                key={subject.id}
                                data-testid={`course-subject-row-${subject.slug ?? subject.id}`}
                                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{subject.name}</p>
                                        {subject.bookName && (
                                            <p className="text-xs text-slate-400">📖 {subject.bookName}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/subject/${subject.slug}`)}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-lg transition opacity-0 group-hover:opacity-100 bg-white"
                                    >
                                        View Details
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(subject.id, subject.name)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseDetails;
