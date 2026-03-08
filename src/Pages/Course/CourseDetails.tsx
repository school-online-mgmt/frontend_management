import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import api from "../../api/api";
import AddSubjectToCourseModal from "../../components/Courses/AddSubjectToCourseModal";
import ConfirmModal from "../../components/common/ConfirmModal.tsx";

const CourseDetails = () => {

    const { courseId } = useParams() as { courseId: string };
    const navigate = useNavigate();

    const [course, setCourse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<{ id: string; name: string; } | null>(null);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const fetchCourse = async () => {
        try {
            const data = await api.getCourseById(courseId);
            setCourse(data);
        } catch {
            alert("Failed to load course");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourse();
    }, []);

    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({ type, text });

        setTimeout(() => {
            setMessage(null);
        }, 2500);
    };

    const openDeleteModal = (subjectId: string, subjectName: string) => {
        setSelectedSubject({
            id: subjectId,
            name: subjectName
        });
        setIsConfirmOpen(true);
    };

    const confirmRemoveSubject = async () => {
        if (!selectedSubject)
            return;

        try {
            await api.removeSubjectFromCourse(course.id, selectedSubject.id);

            setIsConfirmOpen(false);
            setSelectedSubject(null);
            showMessage(
                "success",
                `${selectedSubject.name} removed from ${course.name}`
            );
            fetchCourse();
        } catch {
            showMessage("error", "Failed to remove subject");
        }
    };

    if (isLoading) return <div className="p-10">Loading...</div>;

    return (
        <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">

            {/* Add Subject To Course Modal */}
            {isAddModalOpen && (
                <AddSubjectToCourseModal
                    course={course}
                    onClose={() => setIsAddModalOpen(false)}
                    onRefresh={fetchCourse}
                    showMessage={showMessage}
                />
            )}

            {/* Delete Confirmation Modal */}
            {isConfirmOpen && selectedSubject && (
                <ConfirmModal
                    title="Remove Subject"
                    message={`Are you sure you want to remove ${selectedSubject.name} from ${course.name}?`}
                    confirmText="Remove"
                    cancelText="Cancel"
                    onConfirm={confirmRemoveSubject}
                    onCancel={() => setIsConfirmOpen(false)}
                />
            )}

            {/* Back Navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate("/course-home")}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Courses</span>
                </button>
            </div>

            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-bold">{course.name}</h1>
                <p className="text-slate-500"> Course details and configuration </p>
            </div>

            {message && (
                <div
                    className={`px-4 py-3 rounded-lg border text-sm font-medium
                    ${
                        message.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-red-50 border-red-200 text-red-700"
                    }`}
                >
                    {message.text}
                </div>
            )}

            {/* Course Information */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">
                    Course Information
                </h2>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-slate-500">Name</p>
                        <p className="font-medium">{course.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Slug</p>
                        <p className="font-mono text-slate-700">{course.slug}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Class</p>
                        <p className="font-medium">{course.className || "-"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Total Subjects in Course</p>
                        <p className="font-medium"> {course.courseSubjects?.length || 0} </p>
                    </div>
                </div>

                {course.description && (
                    <div>
                        <p className="text-sm text-slate-500 mb-1"> Description </p>
                        <p className="text-slate-700"> {course.description} </p>
                    </div>
                )}
            </div>

            {/* Subjects Section */}

            <div className="bg-white rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="font-semibold"> Subjects in Course </h2>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Subject
                    </button>
                </div>

                <div className="divide-y">

                    {course.courseSubjects.length === 0 ? (
                        <p className="p-6 text-slate-500">
                            No subjects added yet
                        </p>
                    ) : (
                        course.courseSubjects.map((cs: any) => (
                            <div
                                key={cs.subject.id}
                                className="flex justify-between items-center p-4"
                            >
                                <span className="font-medium"> {cs.subject.name} </span>
                                <button
                                    onClick={() => openDeleteModal(cs.subject.id, cs.subject.name)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseDetails;