import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, User, GraduationCap, BookOpen, Layers,
    Phone, ShieldCheck, ShieldOff, AlertTriangle, CheckCircle2,
    Calendar, School, Trash2, RefreshCcw, Lock,
} from 'lucide-react';
import api from '../../api/api.ts';
import type { Teacher } from '../../api/types.ts';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ClassAssignment { id: string; name: string; slug: string; }
interface SectionAssignment { id: string; name: string; slug: string; classId: string; class?: { id: string; name: string }; }
interface SubjectAssignment { subjectTeachers: { id: string; subjectId: string; sectionId: string }; subjects: { id: string; name: string; slug: string } | null; sections: { id: string; name: string } | null; }
interface Assignments { hasAssignments: boolean; classTeacherOf: ClassAssignment[]; sectionTeacherOf: SectionAssignment[]; subjectAssignments: SubjectAssignment[]; }

// ── Confirmation Dialog ────────────────────────────────────────────────────────
interface ConfirmDialogProps {
    isOpen: boolean; isActivating: boolean; teacherName: string;
    isSubmitting: boolean; onConfirm: () => void; onCancel: () => void;
}
const ConfirmStatusDialog: React.FC<ConfirmDialogProps> = ({ isOpen, isActivating, teacherName, isSubmitting, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8" onClick={e => e.stopPropagation()}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${isActivating ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {isActivating ? <CheckCircle2 size={28} className="text-emerald-600" /> : <AlertTriangle size={28} className="text-red-600" />}
                </div>
                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                    {isActivating ? 'Activate Teacher Account' : 'Deactivate Teacher Account'}
                </h3>
                <p className="text-slate-500 text-center text-sm mb-6">
                    {isActivating
                        ? <span>The account for <strong className="text-slate-700">{teacherName}</strong> will be <strong className="text-slate-700">activated</strong>. They can log in to the teacher portal.</span>
                        : <span>The account for <strong className="text-slate-700">{teacherName}</strong> will be <strong className="text-slate-700">deactivated</strong>. They will immediately lose portal access.</span>
                    }
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
                    <button onClick={onConfirm} disabled={isSubmitting} className={`flex-1 py-3 rounded-xl font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${isActivating ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isActivating ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                        {isSubmitting ? 'Processing...' : isActivating ? 'Activate' : 'Deactivate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Info Row ───────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4">
        <span className="text-xs text-slate-500 font-medium min-w-[120px] pt-0.5">{label}</span>
        <span className="text-sm text-slate-800 font-medium text-right flex-1">{value}</span>
    </div>
);

// ── Assignment Remove Row ──────────────────────────────────────────────────────
const AssignmentRow: React.FC<{ icon: React.ReactNode; primary: string; secondary?: string; onRemove: () => void; removing: boolean }> = ({ icon, primary, secondary, onRemove, removing }) => (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">{icon}</div>
            <div>
                <p className="text-sm font-semibold text-slate-800">{primary}</p>
                {secondary && <p className="text-xs text-slate-400">{secondary}</p>}
            </div>
        </div>
        <button onClick={onRemove} disabled={removing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
            {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove
        </button>
    </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const TeacherDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [assignments, setAssignments] = useState<Assignments | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchAssignments = useCallback(async (teacherId: string) => {
        setIsLoadingAssignments(true);
        try {
            const data = await api.getTeacherAssignments(teacherId);
            setAssignments(data);
        } catch {
            // non-critical
        } finally {
            setIsLoadingAssignments(false);
        }
    }, []);

    const fetchTeacherDetails = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getTeacherById(id!);
            const t = data?.teacher || data;
            setTeacher(t);
            await fetchAssignments(t.id);
        } catch {
            setError('Failed to load teacher details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [id, fetchAssignments]);

    const handleToggleStatus = async () => {
        if (!teacher) return;
        setIsTogglingStatus(true);
        try {
            await api.updateTeacher(teacher.id, { isActive: !teacher.isActive });
            setTeacher(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
            showToast(teacher.isActive ? `${teacher.name}'s account has been deactivated.` : `${teacher.name}'s account has been activated.`, 'success');
        } catch {
            showToast('Failed to update teacher status. Please try again.', 'error');
        } finally {
            setIsTogglingStatus(false);
            setShowStatusDialog(false);
        }
    };

    const handleRemoveFromClass = async (cls: ClassAssignment) => {
        setRemovingId(`class-${cls.id}`);
        try {
            await api.updateClass(cls.id, { teacherId: null });
            showToast(`Removed from class ${cls.name}.`, 'success');
            await fetchAssignments(teacher!.id);
        } catch {
            showToast('Failed to remove class assignment.', 'error');
        } finally {
            setRemovingId(null);
        }
    };

    const handleRemoveFromSection = async (sec: SectionAssignment) => {
        setRemovingId(`section-${sec.id}`);
        try {
            await api.updateSection(sec.id, { teacherId: null });
            showToast(`Removed from section ${sec.name}.`, 'success');
            await fetchAssignments(teacher!.id);
        } catch {
            showToast('Failed to remove section assignment.', 'error');
        } finally {
            setRemovingId(null);
        }
    };

    const handleRemoveFromSubject = async (sa: SubjectAssignment) => {
        const stId = sa.subjectTeachers.subjectId;
        setRemovingId(`subject-${sa.subjectTeachers.id}`);
        try {
            await api.removeTeacherFromSubject(stId, { teacherId: teacher!.id });
            showToast(`Removed from subject ${sa.subjects?.name}.`, 'success');
            await fetchAssignments(teacher!.id);
        } catch {
            showToast('Failed to remove subject assignment.', 'error');
        } finally {
            setRemovingId(null);
        }
    };

    useEffect(() => {
        if (id) fetchTeacherDetails();
    }, [id, fetchTeacherDetails]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-emerald-600 mb-3" size={36} />
                    <p className="text-slate-500 text-sm">Loading teacher profile...</p>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-sm">
                    <AlertTriangle className="mx-auto text-amber-500 mb-3" size={36} />
                    <p className="text-slate-700 font-semibold mb-1">Something went wrong</p>
                    <p className="text-slate-500 text-sm mb-4">{error}</p>
                    <button onClick={fetchTeacherDetails} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">Retry</button>
                </div>
            </div>
        );
    }
    if (!teacher) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-slate-500">Teacher not found.</p></div>;

    const initials = teacher.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const joinedDate = teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
    const hasAssignments = assignments?.hasAssignments ?? false;
    const totalAssignments = (assignments?.classTeacherOf.length ?? 0) + (assignments?.sectionTeacherOf.length ?? 0) + (assignments?.subjectAssignments.length ?? 0);

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {toast.message}
                </div>
            )}

            <ConfirmStatusDialog
                isOpen={showStatusDialog}
                isActivating={!teacher.isActive}
                teacherName={teacher.name}
                isSubmitting={isTogglingStatus}
                onConfirm={handleToggleStatus}
                onCancel={() => setShowStatusDialog(false)}
            />

            <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
                {/* Back */}
                <button onClick={() => navigate('/teacher-home')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
                    <ArrowLeft size={18} /> Back to Teachers
                </button>

                {/* Hero Card */}
                <div className={`rounded-2xl border-2 p-6 lg:p-8 ${teacher.isActive ? 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30' : 'border-red-100 bg-gradient-to-br from-white to-red-50/30'}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0 ${teacher.isActive ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                                {initials}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl font-bold text-slate-900">{teacher.name}</h1>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${teacher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        {teacher.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mt-1">{teacher.qualification} · Faculty Member</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1"><Calendar size={12} />Joined {joinedDate}</div>
                            </div>
                        </div>

                        {/* Deactivate/Activate — locked if has assignments */}
                        <div className="flex flex-col items-end gap-2">
                            {teacher.isActive && hasAssignments ? (
                                <div className="flex flex-col items-end gap-1">
                                    <button disabled className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                                        <Lock size={15} /> Deactivate Account
                                    </button>
                                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                        <AlertTriangle size={11} /> Remove all assignments first
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowStatusDialog(true)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex-shrink-0 ${teacher.isActive ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}
                                >
                                    {teacher.isActive ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                                    {teacher.isActive ? 'Deactivate Account' : 'Activate Account'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Inactive warning */}
                    {!teacher.isActive && (
                        <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-800">Account Deactivated</p>
                                <p className="text-xs text-red-600 mt-0.5">This teacher cannot log in to the teacher portal. Activate the account to restore access.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><User size={16} className="text-slate-600" /></div>
                            <h2 className="text-base font-bold text-slate-800">Personal Information</h2>
                        </div>
                        <div className="space-y-4">
                            <InfoRow label="Full Name" value={teacher.name} />
                            <InfoRow label="Gender" value={<span className="capitalize">{teacher.gender}</span>} />
                            <InfoRow label="Age" value={`${teacher.age} Years`} />
                            <InfoRow label="Phone" value={teacher.phone ? <span className="flex items-center gap-1.5 justify-end"><Phone size={13} className="text-slate-400" />{teacher.phone}</span> : <span className="text-slate-400 italic">Not provided</span>} />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><GraduationCap size={16} className="text-slate-600" /></div>
                            <h2 className="text-base font-bold text-slate-800">Professional Details</h2>
                        </div>
                        <div className="space-y-4">
                            <InfoRow label="Qualification" value={teacher.qualification} />
                            <InfoRow label="Account Status" value={
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${teacher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    {teacher.isActive ? 'Active – Can log in' : 'Inactive – Login blocked'}
                                </span>
                            } />
                            <InfoRow label="Total Assignments" value={
                                <span className={`font-semibold ${hasAssignments ? 'text-amber-600' : 'text-slate-800'}`}>
                                    {totalAssignments} active assignment{totalAssignments !== 1 ? 's' : ''}
                                </span>
                            } />
                            <InfoRow label="Date Joined" value={joinedDate} />
                        </div>
                    </div>
                </div>

                {/* ── Assignments Panel ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Assignments & Responsibilities</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {hasAssignments
                                    ? 'Remove all assignments before deactivating the account'
                                    : 'No active assignments – account can be deactivated'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {hasAssignments && (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full flex items-center gap-1">
                                    <AlertTriangle size={11} /> {totalAssignments} pending
                                </span>
                            )}
                            <button onClick={() => fetchAssignments(teacher.id)} disabled={isLoadingAssignments} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition">
                                <RefreshCcw size={15} className={isLoadingAssignments ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {isLoadingAssignments ? (
                        <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-400" /></div>
                    ) : !hasAssignments ? (
                        <div className="p-10 text-center">
                            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
                            <p className="text-slate-500 font-medium">No assignments</p>
                            <p className="text-xs text-slate-400 mt-1">This teacher has no class, section, or subject assignments.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Class Teacher assignments */}
                            {(assignments?.classTeacherOf.length ?? 0) > 0 && (
                                <div>
                                    <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><School size={12} />Class Teacher ({assignments!.classTeacherOf.length})</p>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {assignments!.classTeacherOf.map(cls => (
                                            <AssignmentRow
                                                key={cls.id}
                                                icon={<School size={15} className="text-indigo-500" />}
                                                primary={cls.name}
                                                secondary={`#${cls.slug}`}
                                                onRemove={() => handleRemoveFromClass(cls)}
                                                removing={removingId === `class-${cls.id}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section Teacher assignments */}
                            {(assignments?.sectionTeacherOf.length ?? 0) > 0 && (
                                <div>
                                    <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><Layers size={12} />Section Teacher ({assignments!.sectionTeacherOf.length})</p>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {assignments!.sectionTeacherOf.map(sec => (
                                            <AssignmentRow
                                                key={sec.id}
                                                icon={<Layers size={15} className="text-violet-500" />}
                                                primary={sec.name}
                                                secondary={sec.class ? `${sec.class.name} · #${sec.slug}` : `#${sec.slug}`}
                                                onRemove={() => handleRemoveFromSection(sec)}
                                                removing={removingId === `section-${sec.id}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Subject assignments */}
                            {(assignments?.subjectAssignments.length ?? 0) > 0 && (
                                <div>
                                    <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><BookOpen size={12} />Subject Teacher ({assignments!.subjectAssignments.length})</p>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {assignments!.subjectAssignments.map(sa => (
                                            <AssignmentRow
                                                key={sa.subjectTeachers.id}
                                                icon={<BookOpen size={15} className="text-emerald-500" />}
                                                primary={sa.subjects?.name ?? 'Unknown Subject'}
                                                secondary={sa.sections ? `Section: ${sa.sections.name}` : undefined}
                                                onRemove={() => handleRemoveFromSubject(sa)}
                                                removing={removingId === `subject-${sa.subjectTeachers.id}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TeacherDetails;
