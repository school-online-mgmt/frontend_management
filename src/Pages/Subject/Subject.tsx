import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, Plus, X, UserPlus, Pencil } from 'lucide-react';
import api from '../../api/api.ts';
import ConfirmModal from '../../components/common/ConfirmModal.tsx';

const Subject = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [subject, setSubject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [sessionsList, setSessionsList] = useState<any[]>([]);
    const [assignedTeachers, setAssignedTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [isAddingTeacher, setIsAddingTeacher] = useState(false);
    const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
    const [teacherToRemove, setTeacherToRemove] = useState<any>(null);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState({ name: '', slug: '', bookName: '', sessionId: '' });
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    const isUsedInCourses = subject?.courseSubjects?.length > 0 || assignedTeachers.length > 0;

    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 2500);
    };

    const fetchAssignedTeachers = async (subjectId: string) => {
        try {
            const data = await api.getSubjectTeachers(subjectId);
            setAssignedTeachers(Array.isArray(data) ? data : data?.teachers || []);
        } catch (error) {
            console.error("Error fetching assigned teachers", error);
        }
    };

    const fetchSubjectDetails = async () => {
        setIsLoading(true);
        try {
            const data = await api.getSubjectById(slug!);
            const subject = data?.subject || data;
            setSubject(subject);
            setEditData({
                name: subject.name || '',
                slug: subject.slug || '',
                bookName: subject.bookName || '',
                sessionId: subject.sessionId || '',
            });
            await fetchAssignedTeachers(subject.id);
        } catch (error) {
            showMessage("error", "Failed to load subject details");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const data = await api.getTeachers();
            setTeachers(Array.isArray(data) ? data : data?.teachers || []);
        } catch (error) {
            console.error("Error fetching teachers", error);
        }
    };

    const fetchSections = async () => {
        try {
            const data = await api.getSections();
            setSections(Array.isArray(data) ? data : data?.sections || []);
        } catch (error) {
            console.error("Error fetching sections", error);
        }
    };

    const fetchSessions = async () => {
        try {
            const data = await api.getSessions();
            setSessionsList(Array.isArray(data) ? data : data?.sessions || []);
        } catch (error) {
            console.error("Error fetching sessions", error);
        }
    };

    useEffect(() => {
        if (slug) fetchSubjectDetails();
        fetchTeachers();
        fetchSections();
        fetchSessions();
    }, [slug]);

    const handleEditSubmit = async () => {
        setIsSubmittingEdit(true);
        try {
            await api.updateSubject(subject.id, editData);
            setIsEditOpen(false);
            navigate('/subject-Home');
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Failed to update subject");
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleAddTeacher = async () => {
        if (!selectedTeacherId || !selectedSectionId) return;
        setIsSubmittingTeacher(true);
        try {
            await api.addTeacherToSubject(subject.id, {
                teacherId: selectedTeacherId,
                sectionId: selectedSectionId,
            });
            showMessage("success", "Teacher assigned successfully");
            setSelectedTeacherId('');
            setSelectedSectionId('');
            setIsAddingTeacher(false);
            fetchSubjectDetails();
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Failed to assign teacher");
        } finally {
            setIsSubmittingTeacher(false);
        }
    };

    const handleRemoveTeacher = async () => {
        if (!teacherToRemove) return;
        try {
            await api.removeTeacherFromSubject(subject.id, {
                teacherId: teacherToRemove.subjectTeachers?.teacherId,
            });
            showMessage("success", "Teacher removed successfully");
            setTeacherToRemove(null);
            fetchSubjectDetails();
        } catch (error) {
            showMessage("error", "Failed to remove teacher");
            setTeacherToRemove(null);
        }
    };

    const confirmDelete = async () => {
        if (!subject) return;
        try {
            await api.deleteSubject(subject.id);
            setIsConfirmOpen(false);
            showMessage("success", `${subject.name} deleted successfully`);
            navigate('/subject-Home');
        } catch (error) {
            showMessage("error", "Failed to delete subject");
            setIsConfirmOpen(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" size={32} /></div>;

    return (
        <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
            {isConfirmOpen && (
                <ConfirmModal
                    title="Delete Subject"
                    message={`Are you sure you want to delete ${subject?.name}? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={confirmDelete}
                    onCancel={() => setIsConfirmOpen(false)}
                />
            )}

            {teacherToRemove && (
                <ConfirmModal
                    title="Remove Teacher"
                    message={`Are you sure you want to remove ${teacherToRemove.teachers?.name} from this subject?`}
                    confirmText="Remove"
                    cancelText="Cancel"
                    onConfirm={handleRemoveTeacher}
                    onCancel={() => setTeacherToRemove(null)}
                />
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]" onClick={() => setIsEditOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white text-2xl font-bold mb-6 text-center">Edit Subject</h3>
                        <div className="space-y-4">
                            <input
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Name"
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            />
                            <div className="flex gap-4">
                                <input
                                    className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    placeholder="Slug"
                                    value={editData.slug}
                                    onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                                />
                                <input
                                    className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    placeholder="Book Name"
                                    value={editData.bookName}
                                    onChange={(e) => setEditData({ ...editData, bookName: e.target.value })}
                                />
                            </div>
                            <select
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                value={editData.sessionId}
                                onChange={(e) => setEditData({ ...editData, sessionId: e.target.value })}
                            >
                                <option value="" disabled>Select a Session</option>
                                {sessionsList.map((session: any) => (
                                    <option key={session.id} value={session.id}>
                                        {session.name}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    className="flex-1 py-3 bg-slate-800 text-white rounded-lg"
                                    onClick={() => setIsEditOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50"
                                    onClick={handleEditSubmit}
                                    disabled={isSubmittingEdit}
                                >
                                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-end">
                <div>
                    <button onClick={() => navigate("/subject-Home")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition">
                        <ArrowLeft size={20} /> <span className="font-medium">Back to Subjects</span>
                    </button>
                    <h1 className="text-3xl font-bold mt-4">{subject?.name}</h1>
                    <p className="text-slate-500">Subject details and configuration</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditOpen(true)}
                        className="px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition"
                    >
                        <Pencil size={16} />
                        Edit Subject
                    </button>
                    <button
                        onClick={() => setIsConfirmOpen(true)}
                        disabled={isUsedInCourses}
                        className={`px-3 py-1.5 border rounded-xl flex items-center gap-2 transition ${
                            isUsedInCourses
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                        }`}
                    >
                        <Trash2 size={16} />
                        {isUsedInCourses ? "Subject in use" : "Delete Subject"}
                    </button>
                </div>
            </header>

            {message && (
                <div className={`px-4 py-3 rounded-lg border text-sm font-medium ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Subject Information</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-slate-500">Name</p>
                        <p className="font-medium">{subject.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Slug</p>
                        <p className="font-mono text-slate-700">{subject.slug}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-sm text-slate-500">Description</p>
                        <p className="text-slate-700">{subject.description || "No description provided."}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100">
                <div className="p-4 border-b font-semibold">Courses containing this subject</div>
                <div className="divide-y">
                    {subject.courseSubjects?.length === 0 ? (
                        <p className="p-6 text-slate-500">Not assigned to any courses.</p>
                    ) : (
                        subject.courseSubjects?.map((cs: any) => (
                            <div key={cs.course.id} className="flex justify-between items-center p-4">
                                <span
                                    onClick={() => navigate(`/course/${cs.course.id}`)}
                                    className="font-medium hover:underline cursor-pointer"
                                >{cs.course.name}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Teachers Section */}
            <div className="bg-white rounded-2xl border border-slate-100">
                <div className="p-4 border-b flex items-center justify-between">
                    <span className="font-semibold">Assigned Teachers</span>
                    <button
                        onClick={() => {
                            setIsAddingTeacher(!isAddingTeacher);
                            setSelectedTeacherId('');
                            setSelectedSectionId('');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition text-sm"
                    >
                        {isAddingTeacher ? <X size={16} /> : <UserPlus size={16} />}
                        {isAddingTeacher ? "Cancel" : "Add Teacher"}
                    </button>
                </div>

                {isAddingTeacher && (
                    <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
                        <select
                            className="flex-1 p-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={selectedTeacherId}
                            onChange={(e) => setSelectedTeacherId(e.target.value)}
                        >
                            <option value="" disabled>Select a Teacher</option>
                            {teachers.map((teacher: any) => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                </option>
                            ))}
                        </select>

                        <select
                            className="flex-1 p-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={selectedSectionId}
                            onChange={(e) => setSelectedSectionId(e.target.value)}
                        >
                            <option value="" disabled>Select a Section</option>
                            {sections.map((section: any) => (
                                <option key={section.id} value={section.id}>
                                    {section.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleAddTeacher}
                            disabled={!selectedTeacherId || !selectedSectionId || isSubmittingTeacher}
                            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmittingTeacher ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Assign
                        </button>
                    </div>
                )}

                <div className="divide-y">
                    {assignedTeachers.length === 0 ? (
                        <p className="p-6 text-slate-500">No teachers assigned yet.</p>
                    ) : (
                        assignedTeachers.map((st: any) => (
                            <div key={st.subjectTeachers?.id} className="flex justify-between items-center p-4">
                                <div>
                                    <p className="font-medium">{st.teachers?.name}</p>
                                    <p className="text-sm text-slate-500">{st.teachers?.qualification}</p>
                                </div>
                                <button
                                    onClick={() => setTeacherToRemove(st)}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 flex items-center gap-2 text-sm transition"
                                >
                                    <X size={14} /> Remove
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Subject;