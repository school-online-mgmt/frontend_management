import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertTriangle, User, Phone, Mail,
  MapPin, Users, Calendar, CheckCircle2, XCircle, RefreshCcw,
  AlertCircle, ClipboardList, MessageSquare, Shield,
} from 'lucide-react';
import api from '../../api/api';
import type { Applicant } from '../../api/types';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  APPLIED:   { label: 'Pending Review', dot: 'bg-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200'    },
  ACCEPTED:  { label: 'Accepted',       dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
  REJECTED:  { label: 'Rejected',       dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200'    },
  CANCELLED: { label: 'Cancelled',      dot: 'bg-slate-400',   bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200'  },
  ABANDONED: { label: 'Abandoned',      dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200'  },
};

const AVATAR_COLORS = [
  'from-indigo-400 to-indigo-600', 'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600', 'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',   'from-sky-400 to-sky-600',
];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── InfoRow ───────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
      <Icon size={13} className="text-slate-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5 break-words">{value ?? <span className="text-slate-300 font-normal italic">N/A</span>}</p>
    </div>
  </div>
);

// ── Confirm Modal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  type: 'accept' | 'reject';
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}
const ConfirmModal: React.FC<ConfirmModalProps> = ({ type, name, onConfirm, onCancel, loading }) => {
  const isAccept = type === 'accept';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${isAccept ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {isAccept ? <CheckCircle2 size={24} className="text-emerald-600" /> : <XCircle size={24} className="text-red-600" />}
        </div>
        <h3 className="text-center text-lg font-bold text-slate-900 mb-1">
          {isAccept ? 'Accept Application?' : 'Reject Application?'}
        </h3>
        <p className="text-center text-sm text-slate-500 mb-6">
          {isAccept
            ? <><span className="font-semibold text-slate-700">{name}</span> will be moved to the Students list for admission processing.</>
            : <>You are rejecting the application of <span className="font-semibold text-slate-700">{name}</span>. This cannot be undone.</>}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-50 ${isAccept ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading && <RefreshCcw size={13} className="animate-spin" />}
            {isAccept ? 'Yes, Accept' : 'Yes, Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ApplicantDetails: React.FC = () => {
  const { applicantId } = useParams<{ applicantId: string }>();
  const navigate = useNavigate();

  const [applicant, setApplicant]   = useState<Applicant | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [confirm, setConfirm]       = useState<'accept' | 'reject' | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApplicant = useCallback(async () => {
    if (!applicantId) { setError('No applicant ID provided.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getApplicantById(applicantId);
      setApplicant(data);
    } catch {
      setError('Failed to load applicant details.');
    } finally {
      setLoading(false);
    }
  }, [applicantId]);

  useEffect(() => { fetchApplicant(); }, [fetchApplicant]);

  const handleAccept = async () => {
    if (!applicant) return;
    setActionLoading(true);
    try {
      await api.acceptApplication(applicant.id);
      showToast('Application accepted. Student moved to admission queue.', true);
      await fetchApplicant();
    } catch {
      showToast('Failed to accept application.', false);
    } finally { setActionLoading(false); setConfirm(null); }
  };

  const handleReject = async () => {
    if (!applicant) return;
    setActionLoading(true);
    try {
      await api.rejectApplication(applicant.id);
      showToast('Application rejected.', true);
      await fetchApplicant();
    } catch {
      showToast('Failed to reject application.', false);
    } finally { setActionLoading(false); setConfirm(null); }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-500 mb-3" size={36} />
          <p className="text-slate-500 text-sm">Loading applicant details…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !applicant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <AlertTriangle className="mx-auto text-amber-500 mb-3" size={36} />
          <p className="text-slate-700 font-semibold mb-1">Could not load applicant</p>
          <p className="text-slate-500 text-sm mb-4">{error ?? 'Applicant not found.'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(-1)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              ← Back
            </button>
            <button onClick={fetchApplicant} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[applicant.status] ?? STATUS_CONFIG['APPLIED'];
  const color = avatarColor(applicant.firstName);
  const fullName = [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean).join(' ');
  const isPending = applicant.status === 'APPLIED';

  return (
    <div className="min-h-full bg-slate-50">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          type={confirm}
          name={fullName}
          loading={actionLoading}
          onConfirm={confirm === 'accept' ? handleAccept : handleReject}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 space-y-6">

        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className={`w-20 h-20 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0`}>
              {applicant.firstName.charAt(0)}{applicant.lastName.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
                {applicant.disability && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                    <Shield size={11} /> Disability Noted
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{applicant.phone}</span>
                <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" />{applicant.email}</span>
                <span className="flex items-center gap-1.5 capitalize"><User size={13} className="text-slate-400" />{applicant.gender}</span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <Calendar size={11} /> Applied on {formatDate(applicant.createdAt)}
                {applicant.updatedAt !== applicant.createdAt && (
                  <span className="ml-2">· Updated {formatDateTime(applicant.updatedAt)}</span>
                )}
              </p>
            </div>

            {/* Action buttons */}
            {isPending && (
              <div className="flex gap-3 shrink-0 w-full sm:w-auto">
                <button onClick={() => setConfirm('reject')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition">
                  <XCircle size={15} /> Reject
                </button>
                <button onClick={() => setConfirm('accept')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition shadow-sm">
                  <CheckCircle2 size={15} /> Accept
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Personal Information */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <User size={15} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Personal Information</h2>
            </div>
            <InfoRow icon={User}     label="First Name"  value={applicant.firstName} />
            <InfoRow icon={User}     label="Middle Name" value={applicant.middleName} />
            <InfoRow icon={User}     label="Last Name"   value={applicant.lastName} />
            <InfoRow icon={User}     label="Gender"      value={<span className="capitalize">{applicant.gender}</span>} />
            <InfoRow icon={MapPin}   label="Address"     value={applicant.address} />
          </div>

          {/* Contact & Family */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users size={15} className="text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Contact & Family</h2>
            </div>
            <InfoRow icon={Phone}  label="Phone Number"  value={applicant.phone} />
            <InfoRow icon={Mail}   label="Email Address" value={applicant.email} />
            <InfoRow icon={Users}  label="Father's Name" value={applicant.fatherName} />
            <InfoRow icon={Users}  label="Mother's Name" value={applicant.motherName} />
          </div>

          {/* Disability & Accessibility */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Shield size={15} className="text-amber-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Disability & Accessibility</h2>
            </div>
            <InfoRow icon={Shield} label="Disability Reported" value={
              applicant.disability
                ? <span className="text-amber-700 font-semibold">Yes</span>
                : <span className="text-slate-400">No</span>
            } />
            {applicant.disability && (
              <InfoRow icon={ClipboardList} label="Description" value={applicant.disabilityDescription} />
            )}
          </div>

          {/* Application Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <ClipboardList size={15} className="text-slate-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Application Info</h2>
            </div>
            <InfoRow icon={Calendar} label="Applied On"    value={formatDate(applicant.createdAt)} />
            <InfoRow icon={Calendar} label="Last Updated"  value={formatDateTime(applicant.updatedAt)} />
            <InfoRow icon={ClipboardList} label="Application Status" value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            } />
            {applicant.comments && (
              <InfoRow icon={MessageSquare} label="Comments" value={applicant.comments} />
            )}
          </div>
        </div>

        {/* Action footer for pending */}
        {isPending && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-1">Review Decision</h3>
            <p className="text-sm text-slate-500 mb-5">
              Accepting this application will create a student record and move them to the admission queue.
              Rejecting will permanently close this application.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setConfirm('reject')}
                className="flex items-center justify-center gap-2 px-5 py-3 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition">
                <XCircle size={16} /> Reject Application
              </button>
              <button onClick={() => setConfirm('accept')}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition shadow-sm">
                <CheckCircle2 size={16} /> Accept Application
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantDetails;
