import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, User, GraduationCap, BookOpen, Layers,
    Phone, ShieldCheck, ShieldOff, AlertTriangle, CheckCircle2,
    School, Trash2, RefreshCcw, Lock, Mail, MapPin,
    Hash, Briefcase, Award, Clock, KeyRound, Eye, EyeOff, X
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
                    <button data-testid="teacher-cancel-btn" onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
                    <button data-testid="teacher-confirm-btn" onClick={onConfirm} disabled={isSubmitting} className={`flex-1 py-3 rounded-xl font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${isActivating ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isActivating ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                        {isSubmitting ? 'Processing...' : isActivating ? 'Activate' : 'Deactivate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Reset Password Dialog ───────────────────────────────────────────────────────
interface ResetPasswordDialogProps { isOpen: boolean; teacherName: string; onConfirm: (password: string) => Promise<void>; onCancel: () => void; }
const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({ isOpen, teacherName, onConfirm, onCancel }) => {
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setIsSubmitting(true);
        setError(null);
        try { await onConfirm(password); setPassword(''); }
        catch (err: any) { setError(err?.response?.data?.message || 'Failed to reset password.'); }
        finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <KeyRound size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
                            <p className="text-xs text-slate-500 font-medium">For {teacherName}</p>
                        </div>
                    </div>
                    <button data-testid="teacher-cancel-btn-2" onClick={onCancel} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={18} /></button>
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                        <div className="relative">
                            <input data-testid="teacher-password-input"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                                className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                                required
                            />
                            <button data-testid="teacher-show-password-btn" type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">Teacher will use this password on next login.</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button data-testid="teacher-cancel-btn-3" type="button" onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting || password.length < 8} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Detail Card Component ──────────────────────────────────────────────────────
const DetailCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
                {icon}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

// ── Detail Item Component ──────────────────────────────────────────────────────
const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 group">
        <div className="mt-1 text-slate-400 group-hover:text-indigo-500 transition-colors">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <div className="text-sm font-medium text-slate-700 mt-0.5 break-words">
                {value || <span className="text-slate-300 italic">Not provided</span>}
            </div>
        </div>
    </div>
);

// ── Assignment Row ──────────────────────────────────────────────────────
const AssignmentRow: React.FC<{ icon: React.ReactNode; primary: string; secondary?: string; onRemove: () => void; removing: boolean }> = ({ icon, primary, secondary, onRemove, removing }) => (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">{icon}</div>
            <div>
                <p className="text-sm font-bold text-slate-800">{primary}</p>
                {secondary && <p className="text-xs text-slate-500 font-medium mt-0.5">{secondary}</p>}
            </div>
        </div>
        <button data-testid="teacher-remove-btn" onClick={onRemove} disabled={removing} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 hover:border-red-200 transition-all disabled:opacity-50">
            {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
    const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
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

    const handleResetPassword = async (password: string) => {
        await api.resetTeacherPassword(teacher!.id, password);
        showToast(`Password reset successfully for ${teacher!.name}.`, 'success');
        setShowResetPasswordDialog(false);
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
                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={42} />
                    <p className="text-slate-500 font-medium">Loading teacher profile...</p>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-sm px-6">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <AlertTriangle size={32} />
                    </div>
                    <p className="text-slate-800 font-bold text-lg mb-2">Something went wrong</p>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">{error}</p>
                    <button data-testid="teacher-fetch-teacher-details-btn" onClick={fetchTeacherDetails} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">Retry</button>
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
        <div className="min-h-full bg-slate-50 pb-20">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl text-white text-sm font-bold animate-in slide-in-from-right-8 duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
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

            <ResetPasswordDialog
                isOpen={showResetPasswordDialog}
                teacherName={teacher.name}
                onConfirm={handleResetPassword}
                onCancel={() => setShowResetPasswordDialog(false)}
            />

            {/* Header / Hero Section */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                    <button data-testid="teacher-navigate-btn" onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-sm font-bold mb-8 group w-fit">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </button>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-2xl flex-shrink-0 ${teacher.isActive ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 rotate-3' : 'bg-gradient-to-br from-slate-400 to-slate-600 rotate-3'}`}>
                                <span className="-rotate-3">{initials}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-2">
                                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{teacher.name}</h1>
                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${teacher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        <span className={`w-2 h-2 rounded-full ${teacher.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                        {teacher.isActive ? 'Active Member' : 'Deactivated'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-lg font-medium max-w-2xl">
                                    {teacher.qualification} · <span className="text-indigo-600">Faculty Member</span>
                                </p>
                                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                                        <Clock size={14} className="text-indigo-500" /> Member since {joinedDate}
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                                        <Hash size={14} className="text-indigo-500" /> ID: {teacher.id.split('-')[0].toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* "Edit Profile" used to live here, pointing at
                                /teacher-home/edit/:id — a route that has never
                                existed in App.tsx. It fell through to the
                                catch-all and dropped the user on the login
                                screen. Removed rather than repointed: there is
                                no teacher edit form anywhere in the portal to
                                send them to. */}
                            <button
                                onClick={() => setShowResetPasswordDialog(true)}
                                className="w-full sm:w-auto px-8 py-3.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl font-black text-sm hover:bg-amber-100 transition flex items-center justify-center gap-2"
                            >
                                <KeyRound size={16} /> Reset Password
                            </button>
                            {teacher.isActive && hasAssignments ? (
                                <div className="group relative">
                                    <button disabled className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2">
                                        <Lock size={16} /> Deactivate Account
                                    </button>
                                    <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 shadow-xl">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                                            <span>Cannot deactivate. Remove all {totalAssignments} active assignments first.</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowStatusDialog(true)}
                                    className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${teacher.isActive ? 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'}`}
                                >
                                    {teacher.isActive ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
                                    {teacher.isActive ? 'Deactivate Account' : 'Activate Account'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Info Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Assignment Section */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Academic Assignments</h2>
                                    <p className="text-sm text-slate-500 font-medium mt-1">Manage classes, sections and subjects assigned to this faculty</p>
                                </div>
                                <button onClick={() => fetchAssignments(teacher.id)} disabled={isLoadingAssignments} className="p-3 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 border border-slate-100">
                                    <RefreshCcw size={20} className={isLoadingAssignments ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {isLoadingAssignments ? (
                                <div className="p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-indigo-500/20" /></div>
                            ) : !hasAssignments ? (
                                <div className="p-20 text-center">
                                    <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <Award size={32} />
                                    </div>
                                    <p className="text-slate-500 font-bold">No Active Assignments</p>
                                    <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">This teacher is currently free and can be assigned to new academic responsibilities.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {/* Class Teacher */}
                                    {(assignments?.classTeacherOf.length ?? 0) > 0 && (
                                        <div>
                                            <div className="px-8 py-3 bg-slate-50/50">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2"><School size={14} /> Class Incharge</p>
                                            </div>
                                            {assignments!.classTeacherOf.map(cls => (
                                                <AssignmentRow
                                                    key={cls.id}
                                                    icon={<School size={18} className="text-indigo-500" />}
                                                    primary={`Class ${cls.name}`}
                                                    secondary={`System Slug: ${cls.slug}`}
                                                    onRemove={() => handleRemoveFromClass(cls)}
                                                    removing={removingId === `class-${cls.id}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Section Teacher */}
                                    {(assignments?.sectionTeacherOf.length ?? 0) > 0 && (
                                        <div>
                                            <div className="px-8 py-3 bg-slate-50/50">
                                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] flex items-center gap-2"><Layers size={14} /> Section In-Charge</p>
                                            </div>
                                            {assignments!.sectionTeacherOf.map(sec => (
                                                <AssignmentRow
                                                    key={sec.id}
                                                    icon={<Layers size={18} className="text-violet-500" />}
                                                    primary={`Section ${sec.name}`}
                                                    secondary={sec.class ? `Primary Class: ${sec.class.name}` : undefined}
                                                    onRemove={() => handleRemoveFromSection(sec)}
                                                    removing={removingId === `section-${sec.id}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Subject Teacher */}
                                    {(assignments?.subjectAssignments.length ?? 0) > 0 && (
                                        <div>
                                            <div className="px-8 py-3 bg-slate-50/50">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2"><BookOpen size={14} /> Subject Specialist</p>
                                            </div>
                                            {assignments!.subjectAssignments.map(sa => (
                                                <AssignmentRow
                                                    key={sa.subjectTeachers.id}
                                                    icon={<BookOpen size={18} className="text-emerald-500" />}
                                                    primary={sa.subjects?.name ?? 'Course Module'}
                                                    secondary={sa.sections ? `Active in Section: ${sa.sections.name}` : 'Core Subject'}
                                                    onRemove={() => handleRemoveFromSubject(sa)}
                                                    removing={removingId === `subject-${sa.subjectTeachers.id}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Recent Performance / Stats Placeholder */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {[
                                { label: 'Active Assignments', value: totalAssignments, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { label: 'Attendance (MTD)', value: '98%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Performance Score', value: '4.8/5', color: 'text-amber-600', bg: 'bg-amber-50' },
                            ].map((stat, i) => (
                                <div key={i} className={`${stat.bg} rounded-[2rem] p-6 border border-white shadow-sm`}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-2">{stat.label}</p>
                                    <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Info Column */}
                    <div className="space-y-8">
                        <DetailCard icon={<User size={20} />} title="Identity & Contact">
                            <DetailItem icon={<User size={16} />} label="Full Name" value={teacher.name} />
                            <DetailItem icon={<Phone size={16} />} label="Phone Number" value={teacher.phone} />
                            <DetailItem icon={<Mail size={16} />} label="Email Address" value={teacher.email} />
                            <DetailItem icon={<MapPin size={16} />} label="Residential Address" value={teacher.address} />
                        </DetailCard>

                        <DetailCard icon={<Briefcase size={20} />} title="Professional Profile">
                            <DetailItem icon={<GraduationCap size={16} />} label="Qualification" value={teacher.qualification} />
                            <DetailItem icon={<Hash size={16} />} label="Unique Identification" value={teacher.id} />
                            <DetailItem icon={<User size={16} />} label="Gender Identity" value={<span className="capitalize">{teacher.gender}</span>} />
                            <DetailItem icon={<Clock size={16} />} label="Chronological Age" value={`${teacher.age} Years`} />
                        </DetailCard>

                        {/* Faculty Portal Access */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors" />
                            <h3 className="text-lg font-black mb-4 relative z-10">Faculty Portal Access</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6 relative z-10">Teachers log in with their phone number. Default password is the phone number if not changed.</p>
                            <button
                                onClick={() => setShowResetPasswordDialog(true)}
                                className="w-full py-3 bg-amber-400/20 hover:bg-amber-400/30 transition-colors rounded-xl text-xs font-black uppercase tracking-widest relative z-10 border border-amber-400/20 text-amber-300 flex items-center justify-center gap-2"
                            >
                                <KeyRound size={14} /> Reset Portal Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDetails;
