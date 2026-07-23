import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, User, Phone, Mail, MapPin, AlertTriangle,
  CheckCircle2, Loader2, KeyRound, Eye, EyeOff, X,
  GraduationCap, BookOpen, Layers, School, Hash, Clock, Info
} from 'lucide-react';
import api from '../../api/api';
import type { StudentDetailsResponse } from '../../api/types';
import AdmitStudentModal from '../../components/Student/AdmitStudentModal';
import Student360Panel from '../../components/Student/Student360Panel';

// ── Reset Password Dialog ─────────────────────────────────────────────────────
const ResetPasswordDialog: React.FC<{
  isOpen: boolean; studentName: string;
  onConfirm: (password: string) => Promise<void>; onCancel: () => void;
}> = ({ isOpen, studentName, onConfirm, onCancel }) => {
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setIsSubmitting(true); setError(null);
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
              <p className="text-xs text-slate-500 font-medium">For {studentName}</p>
            </div>
          </div>
          <button data-testid="students-cancel-btn" onClick={onCancel} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <input data-testid="students-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                required
              />
              <button data-testid="students-show-password-btn" type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button data-testid="students-cancel-btn-2" type="button" onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
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

// ── Info Item ─────────────────────────────────────────────────────────────────
const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 group">
    <div className="mt-0.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="text-sm font-semibold text-slate-700 mt-0.5 break-words">
        {value || <span className="text-slate-300 italic font-normal">Not provided</span>}
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStudent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getStudentById(id!);
      setData(res);
    } catch (err: any) {
      if (err?.response?.status !== 404) setLoadError(true);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) fetchStudent(); }, [id, fetchStudent]);

  const handleAdmit = async (formData: any) => {
    if (!data) return;
    try {
      await api.admitStudent(data.student.id, formData);
      showToast('Student admitted successfully.', 'success');
      fetchStudent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to admit student.', 'error');
    }
  };

  const handleResetPassword = async (password: string) => {
    await api.resetStudentPassword(data!.student.id, password);
    showToast(`Password reset successfully for ${data!.student.firstName}.`, 'success');
    setShowResetPassword(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Loading student profile...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={36} />
        <p className="text-slate-700 font-bold">{loadError ? "Failed to load student profile" : "Student not found"}</p>
        <p className="text-slate-500 text-sm mt-1">{loadError ? "Please check your connection and try again." : "The student may have been removed."}</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          {loadError && <button onClick={() => { setLoadError(false); fetchStudent(); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition">Try Again</button>}
          <button data-testid="students-navigate-btn" onClick={() => navigate(-1)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition">Go Back</button>
        </div>
      </div>
    </div>
  );

  const { student, academics } = data;
  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const initials = [student.firstName[0], student.lastName[0]].join('').toUpperCase();
  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    IN_PROGRESS: { label: 'Application Pending', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    ACTIVE: { label: 'Enrolled & Active', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500 animate-pulse' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    INACTIVE: { label: 'Inactive', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  };
  const status = statusConfig[student.status] ?? { label: student.status, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      <ResetPasswordDialog
        isOpen={showResetPassword}
        studentName={fullName}
        onConfirm={handleResetPassword}
        onCancel={() => setShowResetPassword(false)}
      />

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <button data-testid="students-navigate-btn-2" onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-sm font-bold mb-8 group w-fit">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Students
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl flex-shrink-0 rotate-3 ${student.status === 'ACTIVE' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                <span className="-rotate-3">{initials}</span>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{fullName}</h1>
                  <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${status.color}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />{status.label}
                  </span>
                </div>
                <p className="text-slate-500 font-medium">{student.email}</p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3">
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                    <Hash size={12} className="text-indigo-500" /> {student.id.split('-')[0].toUpperCase()}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                    <Clock size={12} className="text-indigo-500" /> Applied {new Date(student.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {student.status !== 'ACTIVE' && (
                <button data-testid="students-show-admit-modal-btn" onClick={() => setShowAdmitModal(true)} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                  <UserPlus size={16} /> Admit Student
                </button>
              )}
              <button data-testid="students-show-reset-password-btn" onClick={() => setShowResetPassword(true)} className="px-8 py-3.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl font-black text-sm hover:bg-amber-100 transition flex items-center justify-center gap-2">
                <KeyRound size={16} /> Reset Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* 360° record (FR-006) — attendance, academics, fees, library,
            homework, sports and insights, redacted server-side for this role.
            Full width above the split so the office reads the whole child
            first and the raw record second. */}
        <div className="mb-8">
          <Student360Panel studentId={student.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column — Academics */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <GraduationCap size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900">Academic Records</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{academics.length} session{academics.length !== 1 ? 's' : ''} on record</p>
                </div>
              </div>
              {academics.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                    <BookOpen size={28} />
                  </div>
                  <p className="text-slate-500 font-bold">No Academic Records</p>
                  <p className="text-sm text-slate-400 mt-1">Admit the student to assign them to a class and session.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {academics.map((a) => (
                    <div key={a.id} className="px-6 py-5">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider">{a.sessionName || 'Session'}</span>
                        {a.admissionId && <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold border border-slate-100">Adm: {a.admissionId}</span>}
                        {a.rollNo && <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold border border-slate-100">Roll: {a.rollNo}</span>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <InfoItem icon={<School size={15} />} label="Class" value={a.className || a.classId || '—'} />
                        <InfoItem icon={<Layers size={15} />} label="Section" value={a.sectionName || a.sectionId || '—'} />
                        <InfoItem icon={<BookOpen size={15} />} label="Course" value={a.courseName || a.courseId || '—'} />
                        <InfoItem icon={<Info size={15} />} label="Transport" value={a.transportOpted ? 'Opted In' : 'Not Opted'} />
                        {a.transportOpted && a.transportZoneId && (
                          <InfoItem icon={<MapPin size={15} />} label="Zone" value={a.transportZoneId} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <User size={16} className="text-indigo-600" />
                </div>
                <h2 className="font-bold text-slate-800">Personal Info</h2>
              </div>
              <div className="space-y-4">
                <InfoItem icon={<User size={15} />} label="Full Name" value={fullName} />
                <InfoItem icon={<User size={15} />} label="Father's Name" value={student.fatherName} />
                <InfoItem icon={<User size={15} />} label="Mother's Name" value={student.motherName} />
                <InfoItem icon={<User size={15} />} label="Gender" value={<span className="capitalize">{student.gender}</span>} />
                <InfoItem icon={<Phone size={15} />} label="Phone" value={student.phone} />
                <InfoItem icon={<Mail size={15} />} label="Email" value={student.email} />
                <InfoItem icon={<MapPin size={15} />} label="Address" value={student.address} />
                {student.disability && (
                  <InfoItem icon={<Info size={15} />} label="Disability" value={student.disabilityDescription || 'Yes'} />
                )}
                {student.comments && (
                  <InfoItem icon={<Info size={15} />} label="Comments" value={student.comments} />
                )}
              </div>
            </div>

            {/* Access panel */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white">
              <h3 className="font-black mb-2 flex items-center gap-2"><KeyRound size={16} className="text-amber-400" /> Student Portal Access</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">Students log in with their registered email and the password set during admission.</p>
              <button data-testid="students-show-reset-password-btn-2" onClick={() => setShowResetPassword(true)} className="w-full py-2.5 bg-amber-400/20 hover:bg-amber-400/30 transition rounded-xl text-xs font-black uppercase tracking-widest text-amber-300 border border-amber-400/20 flex items-center justify-center gap-2">
                <KeyRound size={13} /> Reset Portal Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAdmitModal && (
        <AdmitStudentModal student={student} onClose={() => setShowAdmitModal(false)} onAdmit={handleAdmit} />
      )}
    </div>
  );
};

export default StudentDetails;
