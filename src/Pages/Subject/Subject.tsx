import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Trash2, Loader2, X, Pencil, BookOpen, Users,
    GraduationCap, Hash, Calendar, Layers, AlertTriangle,
    CheckCircle2, ChevronRight, UserX, School, ShieldCheck,
} from 'lucide-react';
import api from '../../api/api.ts';
import ConfirmModal from '../../components/common/ConfirmModal.tsx';
import type { Subject, CourseSubject } from '../../api/types';

/* ── Sub-components ─────────────────────────────────────────────────────── */
const StatPill = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color}`}>
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">{label}</p>
            <p className="font-bold text-slate-800 text-sm truncate">{value || '—'}</p>
        </div>
    </div>
);

/* ── Main Page ──────────────────────────────────────────────────────────── */
const SubjectDetailsPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [teacherToRemove, setTeacherToRemove] = useState<any | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState({ name: '', slug: '', bookName: '', sessionId: '', teacherId: '' });
    const [editInitialized, setEditInitialized] = useState(false);

    const { data: subjectData, isLoading: subjectLoading } = useQuery({
        queryKey: ['subject', slug],
        queryFn: () => api.getSubjectById(slug!),
        enabled: !!slug,
    });

    const subject = (subjectData?.subject || subjectData) as (Subject & { courseSubjects?: CourseSubject[] }) | null;

    const { data: sessionsList = [] } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            const data = await api.getSessions();
            return Array.isArray(data) ? data : data?.sessions || [];
        },
    });

    // All teachers — the edit modal's incharge picker (FR-005: previously the
    // incharge was display-only; a school could never reassign a subject head).
    const { data: allTeachersList = [] } = useQuery({
        queryKey: ['teachers', 'for-incharge'],
        queryFn: async () => {
            const data: any = await api.getTeachers();
            return Array.isArray(data) ? data : data?.teachers || data?.data || [];
        },
    });

    const { data: assignedTeachersData } = useQuery({
        queryKey: ['assignedTeachers', subject?.id],
        queryFn: () => api.getSubjectTeachers(subject!.id),
        enabled: !!subject?.id,
    });

    // Fetch incharge teacher
    const { data: inchargeTeacherData } = useQuery({
        queryKey: ['teacher', subject?.teacherId],
        queryFn: () => api.getTeacherById(subject!.teacherId!),
        enabled: !!subject?.teacherId,
    });
    const inchargeTeacher = (inchargeTeacherData?.teacher || inchargeTeacherData) as any;

    // Drizzle join response shape: [{ subjectTeachers: {...}, teachers: {...}, sections: {...} }]
    // Backend returns: { message, teachers: [...joinRows] }
    const assignedTeachers: any[] = Array.isArray(assignedTeachersData)
        ? assignedTeachersData
        : (assignedTeachersData?.teachers ?? []);

    // Normalise each row — Drizzle join uses JS variable name as key (subjectTeachers)
    const rows = assignedTeachers.map((st: any) => ({
        id:         st.subjectTeachers?.id       ?? st.subject_teachers?.id       ?? `${st.teachers?.id}-${st.sections?.id}`,
        teacherId:  st.subjectTeachers?.teacherId ?? st.subject_teachers?.teacherId ?? st.teachers?.id,
        sectionId:  st.subjectTeachers?.sectionId ?? st.subject_teachers?.sectionId ?? st.sections?.id ?? 'unassigned',
        teacher:    st.teachers,
        section:    st.sections,
        raw:        st,
    }));

    // Unique teachers
    const uniqueTeachersMap = new Map<string, any>();
    rows.forEach(r => { if (r.teacher?.id) uniqueTeachersMap.set(r.teacher.id, r.teacher); });
    const uniqueTeachers = Array.from(uniqueTeachersMap.values());

    // Flat section→teacher rows (one per assignment)
    const sectionAssignments = rows.map(r => ({
        id:          r.id,
        sectionId:   r.sectionId,
        sectionName: r.section?.name ?? 'Unknown Section',
        teacher:     r.teacher,
        raw:         r.raw,
    }));

    /* ── Mutations ──────────────────────────────────────────────────────── */
    const updateSubjectMutation = useMutation({
        mutationFn: (data: any) => api.updateSubject(subject!.id, data),
        onSuccess: () => {
            showMessage('success', 'Subject updated successfully');
            setIsEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ['subject', slug] });
        },
        onError: (error: any) => showMessage('error', error?.response?.data?.message || 'Failed to update subject'),
    });

    const removeTeacherMutation = useMutation({
        mutationFn: (teacherId: string) => api.removeTeacherFromSubject(subject!.id, { teacherId }),
        onSuccess: () => {
            showMessage('success', 'Teacher removed successfully');
            setTeacherToRemove(null);
            queryClient.invalidateQueries({ queryKey: ['assignedTeachers', subject?.id] });
        },
        onError: () => { showMessage('error', 'Failed to remove teacher'); setTeacherToRemove(null); },
    });

    const deleteSubjectMutation = useMutation({
        mutationFn: () => api.deleteSubject(subject!.id),
        onSuccess: () => {
            setIsConfirmOpen(false);
            showMessage('success', `${subject?.name} deleted`);
            setTimeout(() => navigate(-1), 600);
        },
        onError: () => { showMessage('error', 'Failed to delete subject'); setIsConfirmOpen(false); },
    });

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // Initialize edit form once subject loads
    if (subject && !editInitialized) {
        setEditData({ name: subject.name || '', slug: subject.slug || '', bookName: subject.bookName || '', sessionId: subject.sessionId || '', teacherId: (subject as any).teacherId || '' });
        setEditInitialized(true);
    }

    const currentSession = sessionsList.find((s: any) => s.id === subject?.sessionId);
    const isUsedInCourses = (subject?.courseSubjects?.length ?? 0) > 0 || assignedTeachers.length > 0;

    /* ── Loading / error states ─────────────────────────────────────────── */
    if (subjectLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
    );
    if (!subject) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Subject not found</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-full bg-slate-50 pb-16">

            {/* ── Modals ────────────────────────────────────────────────── */}
            {isConfirmOpen && (
                <ConfirmModal
                    title="Delete Subject"
                    message={`Are you sure you want to delete "${subject?.name}"? This action cannot be undone.`}
                    confirmText="Delete" cancelText="Cancel"
                    onConfirm={() => deleteSubjectMutation.mutate()}
                    onCancel={() => setIsConfirmOpen(false)}
                />
            )}
            {teacherToRemove && (
                <ConfirmModal
                    title="Remove Teacher"
                    message={`Remove ${teacherToRemove.teachers?.name ?? 'this teacher'} from this subject?`}
                    confirmText="Remove" cancelText="Cancel"
                    onConfirm={() => {
                        const teacherId = teacherToRemove.subjectTeachers?.teacherId
                            ?? teacherToRemove.subject_teachers?.teacherId
                            ?? teacherToRemove.teachers?.id;
                        removeTeacherMutation.mutate(teacherId);
                    }}
                    onCancel={() => setTeacherToRemove(null)}
                />
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4"
                    onClick={() => setIsEditOpen(false)}>
                    <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Edit Subject</h3>
                            <button data-testid="subject-is-edit-open-btn" onClick={() => setIsEditOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"><X size={18} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject Name</label>
                                <input data-testid="subject-name-input" className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    placeholder="Name" value={editData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Slug</label>
                                    <input data-testid="subject-slug-input" className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        placeholder="slug" value={editData.slug}
                                        onChange={e => setEditData({ ...editData, slug: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Book Name</label>
                                    <input data-testid="subject-book-name-input" className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        placeholder="Book Name" value={editData.bookName}
                                        onChange={e => setEditData({ ...editData, bookName: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Session</label>
                                <select data-testid="subject-session-id-select" className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={editData.sessionId}
                                    onChange={e => setEditData({ ...editData, sessionId: e.target.value })}>
                                    <option value="" disabled>Select a Session</option>
                                    {sessionsList.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Incharge Teacher</label>
                                <select data-testid="subject-incharge-teacher-select" className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    value={editData.teacherId}
                                    onChange={e => setEditData({ ...editData, teacherId: e.target.value })}>
                                    <option value="">No incharge assigned</option>
                                    {allTeachersList.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-[11px] text-slate-400">The incharge owns this subject's exam papers and syllabus.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button data-testid="subject-is-edit-open-btn-2" onClick={() => setIsEditOpen(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition text-sm">
                                Cancel
                            </button>
                            <button data-testid="subject-edit-save-btn"
                                onClick={() => updateSubjectMutation.mutate({ ...editData, teacherId: editData.teacherId || null })}
                                disabled={updateSubjectMutation.isPending}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2">
                                {updateSubjectMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                                {updateSubjectMutation.isPending ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Hero Header ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 lg:px-10 pt-8 pb-10">
                <button data-testid="subject-navigate-btn" onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-emerald-100 hover:text-white transition text-sm font-medium mb-6">
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                            <BookOpen size={26} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">{subject.name}</h1>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs font-mono bg-white/10 text-emerald-100 px-2.5 py-0.5 rounded-lg border border-white/20">#{subject.slug}</span>
                                {currentSession && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-100 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/20">
                                        <Calendar size={11} /> {currentSession.name}
                                    </span>
                                )}
                                {subject.bookName && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-100 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/20">
                                        📖 {subject.bookName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button data-testid="subject-is-edit-open-btn-3" onClick={() => setIsEditOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition backdrop-blur-sm">
                            <Pencil size={14} /> Edit
                        </button>
                        <button data-testid="subject-is-confirm-open-btn" data-in-use={isUsedInCourses ? "true" : "false"} onClick={() => setIsConfirmOpen(true)}
                            disabled={isUsedInCourses || deleteSubjectMutation.isPending}
                            title={isUsedInCourses ? 'Subject is in use' : 'Delete subject'}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-300/30 text-red-100 text-sm font-semibold rounded-xl hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition backdrop-blur-sm">
                            <Trash2 size={14} />
                            {isUsedInCourses ? 'In Use' : 'Delete'}
                        </button>
                    </div>
                </div>

                {/* Quick stats row */}
                <div className="flex items-center gap-6 mt-6 flex-wrap">
                    {[
                        { icon: <Layers size={14} />, label: `${subject.courseSubjects?.length ?? 0} course${(subject.courseSubjects?.length ?? 0) !== 1 ? 's' : ''}` },
                        { icon: <GraduationCap size={14} />, label: `${uniqueTeachers.length} teacher${uniqueTeachers.length !== 1 ? 's' : ''}` },
                        { icon: <Users size={14} />, label: `${sectionAssignments.length} section assignment${sectionAssignments.length !== 1 ? 's' : ''}` },
                    ].map(s => (
                        <div key={s.label} className="flex items-center gap-1.5 text-sm text-emerald-100">
                            {s.icon} {s.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Content ───────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-6 lg:px-10 -mt-4 space-y-5">

                {/* Toast */}
                {message && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-sm ${
                        message.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {message.text}
                    </div>
                )}

                {/* Info pills */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatPill icon={<Hash size={15} className="text-slate-400" />} label="Book" value={subject.bookName || '—'} color="bg-white border-slate-100" />
                    <StatPill icon={<Calendar size={15} className="text-slate-400" />} label="Session" value={currentSession?.name || '—'} color="bg-white border-slate-100" />
                    <StatPill icon={<Layers size={15} className="text-indigo-400" />} label="In Courses" value={subject.courseSubjects?.length ?? 0} color="bg-white border-slate-100" />
                    <StatPill icon={<GraduationCap size={15} className="text-emerald-500" />} label="Teachers" value={uniqueTeachers.length} color="bg-white border-slate-100" />
                </div>

                {/* ── Incharge Teacher ─────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
                                <ShieldCheck size={15} className="text-violet-600" />
                            </div>
                            <h2 className="font-bold text-slate-800">Subject Incharge</h2>
                        </div>
                        <span className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-semibold border border-violet-100">Owner</span>
                    </div>
                    {!subject.teacherId ? (
                        <div className="px-6 py-4 flex items-center gap-3">
                            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                            <p className="text-sm text-amber-700 font-medium">No incharge teacher assigned to this subject.</p>
                        </div>
                    ) : inchargeTeacher ? (
                        <div className="flex items-center gap-4 px-6 py-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                                {inchargeTeacher.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-sm">{inchargeTeacher.name}</p>
                                <p className="text-xs text-slate-400">{inchargeTeacher.qualification || 'Teacher'}{inchargeTeacher.phone ? ` · ${inchargeTeacher.phone}` : ''}</p>
                            </div>
                            <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-lg font-medium">Incharge</span>
                            <button data-testid="subject-navigate-btn-2" onClick={() => navigate(`/teacher/${inchargeTeacher.id}`)}
                                className="p-2 text-slate-300 group-hover:text-violet-500 rounded-lg hover:bg-violet-50 transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="px-6 py-3">
                            <div className="h-4 bg-slate-100 rounded animate-pulse w-48" />
                        </div>
                    )}
                </div>

                {/* ── Teachers (Owners) ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <GraduationCap size={15} className="text-emerald-600" />
                            </div>
                            <h2 className="font-bold text-slate-800">Subject Incharges</h2>
                        </div>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold">
                            {uniqueTeachers.length} teacher{uniqueTeachers.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {uniqueTeachers.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                                <UserX size={24} className="text-amber-400" />
                            </div>
                            <p className="font-semibold text-slate-700">No teachers assigned yet</p>
                            <p className="text-sm text-slate-400 mt-1">Assign teachers to this subject from the <button data-testid="subject-navigate-btn-3" onClick={() => navigate('/assignments')} className="text-emerald-600 hover:underline font-medium">Assignments page</button>.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {uniqueTeachers.map((t: any) => {
                                const teacherSections = rows
                                    .filter(r => r.teacher?.id === t.id)
                                    .map(r => r.section?.name)
                                    .filter(Boolean);
                                return (
                                    <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-bold text-white text-base shrink-0 shadow-sm">
                                            {t.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900">{t.name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{t.qualification || 'Teacher'}</p>
                                        </div>
                                        {teacherSections.length > 0 && (
                                            <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end max-w-xs">
                                                {teacherSections.map((sn: string) => (
                                                    <span key={sn} className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg font-medium">
                                                        <Layers size={9} /> {sn}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <button data-testid="subject-navigate-btn-4" onClick={() => navigate(`/teacher/${t.id}`)}
                                            className="p-2 text-slate-300 group-hover:text-emerald-500 rounded-lg hover:bg-emerald-50 transition-colors">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Courses ───────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                <School size={15} className="text-blue-600" />
                            </div>
                            <h2 className="font-bold text-slate-800">Courses Using This Subject</h2>
                        </div>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold">
                            {subject.courseSubjects?.length ?? 0}
                        </span>
                    </div>

                    {(subject.courseSubjects?.length ?? 0) === 0 ? (
                        <div className="p-10 text-center">
                            <School size={28} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium text-sm">Not assigned to any courses yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {subject.courseSubjects?.map((cs: any) => (
                                <button data-testid="subject-navigate-btn-5" key={cs.course.id}
                                    onClick={() => navigate(`/course/${cs.course.id}`)}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group text-left">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                        <BookOpen size={15} className="text-blue-500" />
                                    </div>
                                    <span className="flex-1 font-medium text-slate-800 text-sm">{cs.course.name}</span>
                                    <ChevronRight size={15} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Description */}
                {subject?.description && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</p>
                        <p className="text-slate-700 leading-relaxed text-sm">{subject.description}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectDetailsPage;

