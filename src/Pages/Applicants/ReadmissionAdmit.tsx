import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Info,
    ShieldCheck, UserCheck, Wallet,
} from 'lucide-react';
import api from '../../api/api';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { useSession } from '../../context/SessionContext';
import { ErrorState, Skeleton, inr } from '../../components/ui';

/**
 * Readmit one returning student.
 *
 * Three things make this different from admitting a new applicant, and all
 * three are the reason it is a separate screen:
 *
 *  1. THE ENTRANCE EXAM IS SKIPPED. A year at this school is a better
 *     assessment than a two-hour paper. The override exists because many
 *     CBSE/ICSE schools genuinely do test Class 10 leavers before placing them
 *     into a Class 11 stream.
 *
 *  2. A HELD-BACK STUDENT GETS A DANGER BANNER AND NO SUGGESTED CLASS. Being
 *     held back is precisely when a helpful default would be wrong, so the
 *     office chooses deliberately (owner decision).
 *
 *  3. OUTSTANDING DUES ARE SHOWN UP FRONT. The admit endpoint hard-blocks on
 *     them, so discovering it at submit time would waste the whole form.
 */
const ReadmissionAdmit: React.FC = () => {
    const { applicantId } = useParams<{ applicantId: string }>();
    const { selectedSessionId } = useSession();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [courseId, setCourseId] = useState('');
    const [admissionId, setAdmissionId] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [transportOpted, setTransportOpted] = useState(false);
    const [requireEntrance, setRequireEntrance] = useState(false);

    const ctx = useQuery({
        queryKey: ['admit-context', applicantId],
        queryFn: () => api.getAdmitContext(applicantId!),
        enabled: !!applicantId,
    });

    const classes = useQuery({
        queryKey: ['classes', selectedSessionId],
        queryFn: () => api.getClasses(selectedSessionId!),
        enabled: !!selectedSessionId,
    });

    const sections = useQuery({
        queryKey: ['sections', classId],
        queryFn: () => api.getSectionsByClass(classId),
        enabled: !!classId,
    });

    const courses = useQuery({
        queryKey: ['courses', selectedSessionId],
        queryFn: () => api.getCourses({ sessionId: selectedSessionId! }),
        enabled: !!selectedSessionId,
    });

    // Course and transport carry over from last year — those are continuations,
    // not decisions. CLASS deliberately does not: see the header.
    useEffect(() => {
        if (ctx.data) {
            if (ctx.data.desiredCourseId) setCourseId(ctx.data.desiredCourseId);
            setTransportOpted(ctx.data.transportOpted);
        }
    }, [ctx.data]);

    const admit = useMutation({
        mutationFn: async () =>
            api.admitStudent(ctx.data!.studentId!, {
                sessionId: selectedSessionId!,
                classId, sectionId, courseId, admissionId, rollNo, transportOpted,
            }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['readmission'] });
            navigate('/readmission');
        },
    });

    if (ctx.isLoading) {
        return <div className="max-w-3xl mx-auto p-6"><Skeleton rows={8} /></div>;
    }
    if (ctx.error || !ctx.data) {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <ErrorState error={ctx.error} onRetry={() => void ctx.refetch()} />
            </div>
        );
    }

    const d = ctx.data;
    const blockedByDues = !!d.outstandingDues;
    const canSubmit = !!classId && !!sectionId && !!courseId && !!admissionId && !blockedByDues;

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                icon={UserCheck}
                title={`Readmit ${d.name}`}
                subtitle={d.previousClassName ? `Previously in ${d.previousClassName}` : 'Returning student'}
                gradient={MODULE_THEMES.people}
            />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                <button
                    onClick={() => navigate('/readmission')}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                >
                    <ArrowLeft size={15} /> Back to readmission
                </button>

                {/* The danger alert. Deliberately loud, and deliberately NOT
                    accompanied by a pre-filled class. */}
                {d.alert && (
                    <div
                        className="rounded-2xl border-2 border-red-200 bg-red-50 p-5"
                        data-testid="held-back-alert"
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                                <AlertTriangle className="text-red-600" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-red-900">{d.alert.title}</h3>
                                <p className="text-sm text-red-800/90 mt-1 leading-relaxed">{d.alert.message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dues hard-block. The admit endpoint refuses while anything is
                    outstanding, so it is stated before the form rather than
                    discovered on submit. */}
                {blockedByDues && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5" data-testid="dues-block">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                <Wallet className="text-amber-700" size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-900">
                                    {inr(d.outstandingDues!.amount)} outstanding
                                </h3>
                                <p className="text-sm text-amber-800/90 mt-1 leading-relaxed">
                                    Last session's fees must be settled or waived before this student can be
                                    admitted to a new session. {d.outstandingDues!.invoiceCount} invoice
                                    {d.outstandingDues!.invoiceCount === 1 ? '' : 's'} still open.
                                </p>
                                <button
                                    onClick={() => navigate(`/fees?studentId=${d.studentId}`)}
                                    className="mt-3 px-3.5 py-2 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
                                >
                                    Open their fees
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Entrance exemption — stated, with the override the office
                    occasionally needs. */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <ShieldCheck className="text-emerald-600" size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 text-sm">Entrance exam skipped</h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Reason:{' '}
                                <span className="font-medium text-slate-800">
                                    {d.entrance.reasonLabel ?? 'Existing student last session'}
                                </span>
                            </p>
                            {d.entrance.canOverride && (
                                <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={requireEntrance}
                                        onChange={(e) => setRequireEntrance(e.target.checked)}
                                        data-testid="require-entrance"
                                    />
                                    <span className="text-sm text-slate-600">
                                        Require an entrance exam anyway
                                        <span className="block text-xs text-slate-400 mt-0.5">
                                            Useful for Class 10 → 11 stream selection.
                                        </span>
                                    </span>
                                </label>
                            )}
                            {requireEntrance && (
                                <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                                    <Info size={13} className="mt-0.5 shrink-0" />
                                    <span>
                                        Admit them first, then set the entrance paper from the Entrance
                                        Exams screen — their placement can be adjusted after the result.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Placement */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                    <div className="flex items-center gap-2.5">
                        <ClipboardCheck className="text-indigo-600" size={18} />
                        <h2 className="font-semibold text-slate-900">Placement</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Class <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={classId}
                                onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                data-testid="admit-class"
                            >
                                <option value="">Select a class…</option>
                                {(classes.data ?? []).map((c: { id: string; name: string }) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {d.previousPromotionStatus === 'HOLD_BACK' && (
                                <p className="mt-1.5 text-xs text-red-600">
                                    They did not pass {d.previousClassName ?? 'their class'} — choose deliberately.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Section <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={sectionId}
                                onChange={(e) => setSectionId(e.target.value)}
                                disabled={!classId}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                data-testid="admit-section"
                            >
                                <option value="">{classId ? 'Select a section…' : 'Pick a class first'}</option>
                                {(sections.data ?? []).map((s: { id: string; name: string }) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Course <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={courseId}
                                onChange={(e) => setCourseId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                data-testid="admit-course"
                            >
                                <option value="">Select a course…</option>
                                {(courses.data ?? []).map((c: { id: string; name: string }) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Admission ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={admissionId}
                                onChange={(e) => setAdmissionId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                data-testid="admit-admission-id"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Roll no.</label>
                            <input
                                value={rollNo}
                                onChange={(e) => setRollNo(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                data-testid="admit-roll-no"
                            />
                        </div>

                        <div className="flex items-end">
                            <label className="flex items-center gap-2.5 cursor-pointer pb-2.5">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={transportOpted}
                                    onChange={(e) => setTransportOpted(e.target.checked)}
                                    data-testid="admit-transport"
                                />
                                <span className="text-sm text-slate-700">Uses school transport</span>
                            </label>
                        </div>
                    </div>
                </div>

                {admit.error && <ErrorState error={admit.error} />}

                <div className="flex items-center justify-end gap-3 pb-8">
                    <button
                        onClick={() => navigate('/readmission')}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => admit.mutate()}
                        disabled={!canSubmit || admit.isPending}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        data-testid="admit-submit"
                    >
                        <CheckCircle2 size={16} />
                        {admit.isPending ? 'Admitting…' : 'Readmit student'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReadmissionAdmit;
