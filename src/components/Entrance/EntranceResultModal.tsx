import { useEffect, useState } from 'react';
import api, { type EntranceResult } from '../../api/api';
import { X, CheckCircle2, XCircle, Eye, Loader2, AlertTriangle } from 'lucide-react';

/**
 * The enrolment moment (FR-012).
 *
 * Opened from an applicant. Shows the entrance result, then either confirms the
 * admission (PASS) or requires a reason before allowing it (FAIL). The class and
 * course come from the application and are shown locked — the family chose them,
 * and enrolment is not the place to quietly change them.
 */

const CATEGORY_LABELS: Record<string, string> = {
    MANAGEMENT_QUOTA: 'Management quota',
    SIBLING: 'Sibling already enrolled',
    STAFF_WARD: 'Staff ward',
    SPORTS_ARTS: 'Sports / arts merit',
    RTE: 'RTE / statutory quota',
    OTHER: 'Other',
};

interface Props {
    applicantId: string;
    applicantName: string;
    desiredClassName?: string | null;
    desiredCourseName?: string | null;
    onClose: () => void;
    /** Called with the override, when one was needed. */
    onConfirm: (override?: { category: string; note: string }) => Promise<void>;
}

export default function EntranceResultModal({
    applicantId, applicantName, desiredClassName, desiredCourseName, onClose, onConfirm,
}: Props) {
    const [result, setResult] = useState<EntranceResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        void (async () => {
            try {
                setResult(await api.getEntranceResult(applicantId));
            } catch (e: any) {
                setError(e?.response?.data?.message ?? 'Could not load the entrance result.');
            } finally {
                setLoading(false);
            }
        })();
    }, [applicantId]);

    const failed = result?.attempted && result.verdict === 'FAIL';
    const passed = result?.attempted && result.verdict === 'PASS';

    // A FAIL needs BOTH halves of the reason — a category alone explains nothing
    // to whoever reads the audit trail next year.
    const overrideReady = !!category && note.trim().length >= 10;
    const canConfirm = passed || (failed && overrideReady);

    const confirm = async () => {
        setBusy(true); setError(null);
        try {
            await onConfirm(failed ? { category, note: note.trim() } : undefined);
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not complete the admission.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div data-testid="entrance-result-modal" className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Enrol {applicantName}</h2>
                    <button data-testid="entrance-result-close" onClick={onClose} className="p-2 text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" size={28} /></div>
                ) : !result?.attempted ? (
                    <div data-testid="entrance-result-none" className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>
                            This candidate hasn't sat the entrance exam yet. Conduct it first, or record a paper
                            they sat offline — an admission can't be confirmed without a result.
                        </span>
                    </div>
                ) : result.inProgress ? (
                    <div data-testid="entrance-result-inprogress" className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">
                        This candidate is part-way through their exam. Wait for it to be submitted.
                    </div>
                ) : (
                    <>
                        <div
                            data-testid="entrance-result-verdict"
                            data-verdict={result.verdict}
                            className={`p-4 rounded-xl mb-4 ${passed ? 'bg-emerald-50' : 'bg-red-50'}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {passed
                                    ? <CheckCircle2 className="text-emerald-600" size={20} />
                                    : <XCircle className="text-red-600" size={20} />}
                                <p className={`font-semibold ${passed ? 'text-emerald-800' : 'text-red-800'}`}>
                                    {passed ? 'Passed' : 'Did not pass'}
                                </p>
                            </div>
                            <p className={`text-sm ${passed ? 'text-emerald-700' : 'text-red-700'}`}>
                                Scored {result.score} of {result.maxScore} — {result.percentage}%
                                {result.passPercentage !== null ? ` against a pass mark of ${result.passPercentage}%` : ''}.
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                {result.mode === 'OFFLINE' ? 'Recorded from a paper sat offline' : 'Sat online'}
                                {result.attemptNumber > 1 ? ` · attempt ${result.attemptNumber}` : ''}
                                {/* Invigilation signal, shown alongside the score — never an automatic penalty. */}
                                {result.focusLossCount > 0 ? ` · left the exam screen ${result.focusLossCount}×` : ''}
                            </p>
                        </div>

                        <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                <Eye size={12} /> From the application — not editable here
                            </p>
                            <p className="text-sm text-slate-800">
                                <strong>Class:</strong> {desiredClassName ?? '—'}
                            </p>
                            <p className="text-sm text-slate-800">
                                <strong>Course:</strong> {desiredCourseName ?? '—'}
                            </p>
                        </div>

                        {failed && (
                            <div data-testid="entrance-override-block" className="mb-4">
                                <p className="text-sm text-slate-700 mb-2">
                                    To admit anyway, record why. This is kept in the audit trail and
                                    notified to the principal.
                                </p>
                                <select
                                    data-testid="entrance-override-category"
                                    value={category} onChange={e => setCategory(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-2"
                                >
                                    <option value="">Choose a reason…</option>
                                    {(result.overrideCategories ?? Object.keys(CATEGORY_LABELS)).map(c => (
                                        <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                                    ))}
                                </select>
                                <textarea
                                    data-testid="entrance-override-note"
                                    value={note} onChange={e => setNote(e.target.value)}
                                    rows={3}
                                    placeholder="Explain briefly — at least a sentence."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                                {note.trim().length > 0 && note.trim().length < 10 && (
                                    <p className="text-xs text-amber-700 mt-1">A little more detail, please.</p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {error && <div data-testid="entrance-result-error" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">Cancel</button>
                    <button
                        data-testid="entrance-confirm-btn"
                        disabled={!canConfirm || busy || loading}
                        onClick={() => void confirm()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                    >
                        {busy ? 'Confirming…' : failed ? 'Admit with override' : 'Confirm admission'}
                    </button>
                </div>
            </div>
        </div>
    );
}
