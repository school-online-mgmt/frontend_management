import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Loader2, Plus, X, UserPlus, Pencil } from 'lucide-react';
import api from '../../api/api.ts';
import ConfirmModal from '../../components/common/ConfirmModal.tsx';
import type { Subject, SubjectTeacher, CourseSubject } from '../../api/types';

const SubjectDetailsPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Local state for UI
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [isAddingTeacher, setIsAddingTeacher] = useState(false);
    const [teacherToRemove, setTeacherToRemove] = useState<SubjectTeacher | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState({ name: '', slug: '', bookName: '', sessionId: '' });

    // React Query - Subject Details
    const { data: subjectData, isLoading: subjectLoading } = useQuery({
        queryKey: ['subject', slug],
        queryFn: () => api.getSubjectById(slug!),
        enabled: !!slug,
    });

    const subject = (subjectData?.subject || subjectData) as (Subject & { courseSubjects?: CourseSubject[] }) | null;

    // React Query - Teachers
    const { data: teachers = [] } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const data = await api.getTeachers();
            return Array.isArray(data) ? data : data?.teachers || [];
        },
    });

    // React Query - Sections
    const { data: sections = [] } = useQuery({
        queryKey: ['sections'],
        queryFn: async () => {
            const data = await api.getSections();
            return Array.isArray(data) ? data : data?.sections || [];
        },
    });

    // React Query - Sessions
    const { data: sessionsList = [] } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            const data = await api.getSessions();
            return Array.isArray(data) ? data : data?.sessions || [];
        },
    });

    // React Query - Assigned Teachers
    const { data: assignedTeachersData } = useQuery({
        queryKey: ['assignedTeachers', subject?.id],
        queryFn: () => api.getSubjectTeachers(subject!.id),
        enabled: !!subject?.id,
    });

    const assignedTeachers = Array.isArray(assignedTeachersData) 
        ? assignedTeachersData 
        : (assignedTeachersData?.subjectTeachers || assignedTeachersData?.teachers || []);

    // Mutations
    const updateSubjectMutation = useMutation({
        mutationFn: (data: unknown) => api.updateSubject(subject!.id, data),
        onSuccess: () => {
            showMessage("success", "Subject updated successfully");
            setIsEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ['subject', slug] });
        },
        onError: (error: unknown) => {
            showMessage("error", error?.response?.data?.message || "Failed to update subject");
        },
    });

    const addTeacherMutation = useMutation({
        mutationFn: (data: unknown) => api.addTeacherToSubject(subject!.id, data),
        onSuccess: () => {
            showMessage("success", "Teacher assigned successfully");
            setSelectedTeacherId('');
            setSelectedSectionId('');
            setIsAddingTeacher(false);
            queryClient.invalidateQueries({ queryKey: ['assignedTeachers', subject?.id] });
        },
        onError: (error: unknown) => {
            showMessage("error", error?.response?.data?.message || "Failed to assign teacher");
        },
    });

    const removeTeacherMutation = useMutation({
        mutationFn: (data: unknown) => api.removeTeacherFromSubject(subject!.id, data),
        onSuccess: () => {
            showMessage("success", "Teacher removed successfully");
            setTeacherToRemove(null);
            queryClient.invalidateQueries({ queryKey: ['assignedTeachers', subject?.id] });
        },
        onError: () => {
            showMessage("error", "Failed to remove teacher");
            setTeacherToRemove(null);
        },
    });

    const deleteSubjectMutation = useMutation({
        mutationFn: () => api.deleteSubject(subject!.id),
        onSuccess: () => {
            setIsConfirmOpen(false);
            showMessage("success", `${subject?.name} deleted successfully`);
            setTimeout(() => navigate('/subject-Home'), 500);
        },
        onError: () => {
            showMessage("error", "Failed to delete subject");
            setIsConfirmOpen(false);
        },
    });

    // Handlers
    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 2500);
    };

    const handleEditSubmit = () => {
        updateSubjectMutation.mutate(editData);
    };

    const handleAddTeacher = () => {
        if (!selectedTeacherId || !selectedSectionId) return;
        addTeacherMutation.mutate({
            teacherId: selectedTeacherId,
            sectionId: selectedSectionId,
        });
    };

    const handleRemoveTeacher = () => {
        if (!teacherToRemove) return;
        removeTeacherMutation.mutate({
            teacherId: teacherToRemove.teacherId,
        });
    };

    const confirmDelete = () => {
        deleteSubjectMutation.mutate();
    };

    // Update edit data when subject loads
    if (subject && !editData.name) {
        setEditData({
            name: subject.name || '',
            slug: subject.slug || '',
            bookName: subject.bookName || '',
            sessionId: subject.sessionId || '',
        });
    }

    const isUsedInCourses = (subject?.courseSubjects?.length ?? 0) > 0 || assignedTeachers.length > 0;

    if (subjectLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" size={32} /></div>;
    if (!subject) return <div className="p-10 text-center text-slate-600">Subject not found</div>;

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
                                {sessionsList.map((session: unknown) => (
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
                                    disabled={updateSubjectMutation.isPending}
                                >
                                    {updateSubjectMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                        disabled={isUsedInCourses || deleteSubjectMutation.isPending}
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
                        <p className="text-slate-700">{subject?.description || "No description provided."}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100">
                <div className="p-4 border-b font-semibold">Courses containing this subject</div>
                {subject.courseSubjects?.length === 0 ? (
                    <div className="p-6 text-slate-500">Not assigned to any courses.</div>
                ) : (
                    <div className="divide-y">
                        {subject.courseSubjects?.map((cs: unknown) => (
                            <div key={cs.course.id} className="flex justify-between items-center p-4">
                                <span
                                    onClick={() => navigate(`/course/${cs.course.id}`)}
                                    className="font-medium hover:underline cursor-pointer"
                                >{cs.course.name}</span>
                            </div>
                        ))}
                    </div>
                )}
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
                            {teachers.map((teacher: unknown) => (
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
                            {sections.map((section: unknown) => (
                                <option key={section.id} value={section.id}>
                                    {section.name}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleAddTeacher}
                            disabled={!selectedTeacherId || !selectedSectionId || addTeacherMutation.isPending}
                            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {addTeacherMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Assign
                        </button>
                    </div>
                )}

                {assignedTeachers.length === 0 ? (
                    <div className="p-6 text-slate-500">No teachers assigned yet.</div>
                ) : (
                    <div className="divide-y">
                        {assignedTeachers.map((st: unknown) => (
                            <div key={st.id} className="flex justify-between items-center p-4">
                                <div>
                                    <p className="font-medium">{st.teachers?.name}</p>
                                    <p className="text-sm text-slate-500">{st.teachers?.qualification}</p>
                                </div>
                                <button
                                    onClick={() => setTeacherToRemove(st)}
                                    disabled={removeTeacherMutation.isPending}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 flex items-center gap-2 text-sm transition disabled:opacity-50"
                                >
                                    <X size={14} /> Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectDetailsPage;

