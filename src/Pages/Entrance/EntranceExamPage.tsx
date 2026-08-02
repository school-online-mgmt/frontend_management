import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { Clock, ShieldAlert, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

/**
 * The candidate-facing entrance exam (FR-012).
 *
 * UNAUTHENTICATED by design. Staff sign in, open this page, click Start, and are
 * signed out of the browser before handing the device over. From that moment the
 * only credential in play is the scoped attempt cookie, which the browser sends
 * to `/entrance-exam/*` and nowhere else.
 *
 * Because there is no login here, this component deliberately uses its own axios
 * instance rather than the app's `api` client — the shared client carries logout
 * and password-change interceptors that make no sense mid-exam and would bounce
 * a candidate to a login screen at the worst possible moment.
 */

const examClient = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_HOST,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

interface Question {
    id: string;
    type: 'MCQ_SINGLE' | 'MCQ_MULTI' | 'NUMERIC';
    text: string;
    marks: number;
    options: Array<{ id: string; text: string }>;
}

type AnswerMap = Record<string, string[] | number | null>;

const fmtClock = (total: number): string => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function EntranceExamPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fatal, setFatal] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [candidate, setCandidate] = useState<{ name: string; applicationNumber: string | null } | null>(null);
    const [paperName, setPaperName] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [seconds, setSeconds] = useState(0);
    const [extraTime, setExtraTime] = useState(false);

    // A ref as well as state: the countdown's auto-submit reads it from inside an
    // interval closure, where the state value would be stale.
    const submittedRef = useRef(false);

    const answeredCount = useMemo(
        () => questions.filter(q => {
            const a = answers[q.id];
            // MCQ answers are arrays; numeric answers are numbers. A cleared
            // numeric input is stored as null, which is what "unanswered" means.
            if (Array.isArray(a)) return a.length > 0;
            return typeof a === 'number' && Number.isFinite(a);
        }).length,
        [questions, answers],
    );

    const submit = useCallback(async (auto = false) => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);
        try {
            await examClient.post('/entrance-exam/submit');
            setSubmitted(true);
        } catch (e: any) {
            // A 409 means it was already submitted — which is the outcome we
            // wanted anyway, so show the confirmation rather than an error.
            if (e?.response?.status === 409) setSubmitted(true);
            else {
                submittedRef.current = false;
                setError(auto
                    ? 'Time is up, but the paper could not be submitted. Please call the invigilator.'
                    : 'Could not submit. Please try again, or call the invigilator.');
            }
        } finally {
            setSubmitting(false);
        }
    }, []);

    // ── Load / resume ────────────────────────────────────────────────────────
    useEffect(() => {
        void (async () => {
            try {
                const { data } = await examClient.get('/entrance-exam/session');
                setCandidate(data.candidate);
                setPaperName(data.paper?.name ?? 'Entrance exam');
                setQuestions(data.questions ?? []);
                setAnswers(data.answers ?? {});
                setSeconds(data.secondsRemaining ?? 0);
                setExtraTime(!!data.extraTimeApplied);
            } catch (e: any) {
                const code = e?.response?.data?.code;
                if (code === 'ATTEMPT_EXPIRED') { setSubmitted(true); submittedRef.current = true; }
                else setFatal(e?.response?.data?.message
                    ?? 'This exam session is not available. Please contact the school office.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ── Countdown ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (loading || submitted || fatal) return;
        const id = window.setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) {
                    window.clearInterval(id);
                    void submit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(id);
    }, [loading, submitted, fatal, submit]);

    // ── Kiosk lockdown ───────────────────────────────────────────────────────
    // Fullscreen, no copy/paste, no context menu, no back navigation, and every
    // focus loss reported. None of this can FAIL the candidate — it is an
    // invigilation signal staff see afterwards, not an automatic penalty.
    useEffect(() => {
        if (loading || submitted || fatal) return;

        const block = (e: Event) => e.preventDefault();
        document.addEventListener('contextmenu', block);
        document.addEventListener('copy', block);
        document.addEventListener('cut', block);
        document.addEventListener('paste', block);

        // Trap Back: push a state and re-push whenever the candidate pops it.
        window.history.pushState(null, '', window.location.href);
        const onPop = () => window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', onPop);

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                void examClient.post('/entrance-exam/focus-loss').catch(() => { /* never interrupt the exam */ });
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        // Warn on refresh/close so nobody loses their place by accident.
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBeforeUnload);

        return () => {
            document.removeEventListener('contextmenu', block);
            document.removeEventListener('copy', block);
            document.removeEventListener('cut', block);
            document.removeEventListener('paste', block);
            window.removeEventListener('popstate', onPop);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [loading, submitted, fatal]);

    const goFullscreen = () => {
        document.documentElement.requestFullscreen?.().catch(() => { /* refused; not fatal */ });
    };

    /** Persist one answer as it is chosen — a lost tab costs at most this question. */
    const saveAnswer = async (questionId: string, answer: string[] | number | null) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        try {
            await examClient.patch('/entrance-exam/answer', { questionId, answer });
            setError(null);
        } catch {
            setError('That answer may not have saved. Check your connection — your other answers are safe.');
        }
    };

    const toggleOption = (q: Question, optionId: string) => {
        const current = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
        const next = q.type === 'MCQ_SINGLE'
            ? [optionId]
            : current.includes(optionId)
                ? current.filter(id => id !== optionId)
                : [...current, optionId];
        void saveAnswer(q.id, next);
    };

    // ── Screens ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    if (fatal) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="entrance-fatal">
                <div className="max-w-md text-center bg-white p-8 rounded-2xl border border-slate-200">
                    <AlertTriangle className="mx-auto text-amber-500 mb-3" size={36} />
                    <h1 className="text-lg font-semibold text-slate-800 mb-2">This exam isn't available</h1>
                    <p className="text-sm text-slate-500">{fatal}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="entrance-submitted">
                <div className="max-w-lg text-center bg-white p-10 rounded-2xl border border-slate-200">
                    <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={44} />
                    <h1 className="text-xl font-semibold text-slate-800 mb-2">Your exam has been submitted</h1>
                    <p className="text-sm text-slate-600 mb-6">
                        Thank you{candidate?.name ? `, ${candidate.name}` : ''}. Please return the device to the
                        school office — they will take you through your result and the next steps.
                    </p>
                    {candidate?.applicationNumber && (
                        <p className="text-xs text-slate-400 mb-6">Application {candidate.applicationNumber}</p>
                    )}
                    <button
                        data-testid="entrance-close-btn"
                        onClick={() => { window.location.href = '/'; }}
                        className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium"
                    >Close</button>
                </div>
            </div>
        );
    }

    const lowTime = seconds <= 120;

    return (
        <div className="min-h-screen bg-slate-50" data-testid="entrance-exam-page">
            <header className="sticky top-0 bg-white border-b border-slate-200 z-10">
                <div className="max-w-3xl mx-auto p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{paperName}</p>
                        <p className="text-xs text-slate-400">
                            {candidate?.name}
                            {candidate?.applicationNumber ? ` · ${candidate.applicationNumber}` : ''}
                        </p>
                    </div>
                    <div
                        data-testid="entrance-timer"
                        data-low={lowTime}
                        className={`px-3 py-1.5 rounded-xl text-sm font-mono flex items-center gap-2 ${lowTime ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                    >
                        <Clock size={14} /> {fmtClock(seconds)}
                    </div>
                    <button
                        data-testid="entrance-fullscreen-btn" onClick={goFullscreen}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-sm"
                    >Fullscreen</button>
                </div>
                {extraTime && (
                    <div className="max-w-3xl mx-auto px-4 pb-3">
                        <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                            Extra time has been added to your paper.
                        </p>
                    </div>
                )}
            </header>

            <main className="max-w-3xl mx-auto p-4 pb-32">
                {error && (
                    <div data-testid="entrance-error" className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
                        <ShieldAlert size={16} className="mt-0.5 shrink-0" /> {error}
                    </div>
                )}

                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <div
                            key={q.id}
                            data-testid={`entrance-question-${q.id}`}
                            className="bg-white border border-slate-200 rounded-2xl p-5"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <span className="text-xs font-semibold text-slate-400 mt-0.5">Q{index + 1}</span>
                                <p className="flex-1 text-slate-800">{q.text}</p>
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {q.marks} mark{q.marks === 1 ? '' : 's'}
                                </span>
                            </div>

                            {q.type === 'NUMERIC' ? (
                                <input
                                    data-testid={`entrance-numeric-${q.id}`}
                                    type="number"
                                    value={typeof answers[q.id] === 'number' ? String(answers[q.id]) : ''}
                                    onChange={e => {
                                        const v = e.target.value;
                                        void saveAnswer(q.id, v === '' ? null : Number(v));
                                    }}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                    placeholder="Your answer"
                                />
                            ) : (
                                <div className="space-y-2">
                                    {q.type === 'MCQ_MULTI' && (
                                        <p className="text-xs text-slate-400 mb-1">Select all that apply.</p>
                                    )}
                                    {q.options.map(o => {
                                        const chosen = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(o.id);
                                        return (
                                            <button
                                                key={o.id}
                                                data-testid={`entrance-option-${q.id}-${o.id}`}
                                                data-selected={chosen}
                                                onClick={() => toggleOption(q, o.id)}
                                                className={`w-full text-left p-3 rounded-xl border transition ${chosen
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                                    : 'bg-white border-slate-200 hover:border-slate-400'}`}
                                            >{o.text}</button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200">
                <div className="max-w-3xl mx-auto p-4 flex items-center gap-4">
                    <p data-testid="entrance-progress" className="text-sm text-slate-500 flex-1">
                        {answeredCount} of {questions.length} answered
                    </p>
                    <button
                        data-testid="entrance-submit-btn"
                        disabled={submitting}
                        onClick={() => {
                            const unanswered = questions.length - answeredCount;
                            const warn = unanswered > 0
                                ? `You have ${unanswered} unanswered question(s). Submit anyway?`
                                : 'Submit your exam? You cannot change your answers afterwards.';
                            if (window.confirm(warn)) void submit(false);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                    >{submitting ? 'Submitting…' : 'Submit exam'}</button>
                </div>
            </footer>
        </div>
    );
}
