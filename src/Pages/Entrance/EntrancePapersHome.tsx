import { useEffect, useState, useCallback } from 'react';
import api, {
    type EntrancePaper, type EntranceQuestion, type EntranceQuestionInput, type EntranceQuestionType,
} from '../../api/api';
import { FileQuestion, Plus, Trash2, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Entrance paper authoring (FR-012).
 *
 * A paper belongs to a (class, course) SLUG pair rather than to a course row,
 * because course rows are recreated every academic year — keying on slugs means
 * a paper written once keeps working every admission season.
 *
 * A course cannot be created until its paper holds five questions, so the
 * readiness banner is the first thing shown: it is the list a school works
 * through before admissions open.
 */

const MIN_QUESTIONS = 5;

const blankQuestion = (): EntranceQuestionInput => ({
    type: 'MCQ_SINGLE',
    text: '',
    marks: 1,
    options: [{ id: 'a', text: '' }, { id: 'b', text: '' }],
    correctOptionIds: [],
    numericAnswer: null,
    numericTolerance: 0,
});

export default function EntrancePapersHome() {
    const [papers, setPapers] = useState<EntrancePaper[]>([]);
    const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof api.getEntranceReadiness>> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [openPaper, setOpenPaper] = useState<EntrancePaper | null>(null);
    const [questions, setQuestions] = useState<EntranceQuestion[]>([]);
    const [busy, setBusy] = useState(false);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        classSlug: '', courseSlug: '', name: '',
        passPercentage: 40, durationMinutes: 30, questionsToDraw: 10,
    });

    const [draft, setDraft] = useState<EntranceQuestionInput | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [p, r] = await Promise.all([
                api.getEntrancePapers(),
                api.getEntranceReadiness().catch(() => null),
            ]);
            setPapers(p.papers ?? []);
            setReadiness(r);
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not load entrance papers.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const openPaperDetail = async (paper: EntrancePaper) => {
        setBusy(true); setError(null);
        try {
            const data = await api.getEntrancePaper(paper.id);
            setOpenPaper(data.paper);
            setQuestions((data.questions ?? []).filter(q => q.isActive));
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not open that paper.');
        } finally { setBusy(false); }
    };

    const createPaper = async () => {
        setBusy(true); setError(null);
        try {
            const res = await api.createEntrancePaper(form);
            setNotice(res.warning ?? 'Paper created. Add questions to make it usable.');
            setCreating(false);
            setForm({ classSlug: '', courseSlug: '', name: '', passPercentage: 40, durationMinutes: 30, questionsToDraw: 10 });
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not create that paper.');
        } finally { setBusy(false); }
    };

    const saveQuestion = async () => {
        if (!openPaper || !draft) return;
        setBusy(true); setError(null);
        try {
            const payload: EntranceQuestionInput = draft.type === 'NUMERIC'
                ? { ...draft, options: [], correctOptionIds: [] }
                : { ...draft, numericAnswer: null, numericTolerance: 0 };

            const res = await api.addEntranceQuestion(openPaper.id, payload);
            setNotice(res.ready ? 'Question added. This paper is ready to use.' : 'Question added.');
            setDraft(null);
            await openPaperDetail(openPaper);
            await load();
        } catch (e: any) {
            const errs = e?.response?.data?.errors?.fieldErrors;
            const first = errs ? Object.values(errs).flat()[0] : null;
            setError((first as string) ?? e?.response?.data?.message ?? 'Could not save that question.');
        } finally { setBusy(false); }
    };

    const removeQuestion = async (q: EntranceQuestion) => {
        if (!window.confirm('Remove this question? Past results are unaffected — they keep the paper they were sat against.')) return;
        setError(null);
        try {
            const res = await api.deleteEntranceQuestion(q.id);
            if (res.warning) setNotice(res.warning); else setNotice('Question removed.');
            if (openPaper) await openPaperDetail(openPaper);
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not remove that question.');
        }
    };

    const toggleCorrect = (optionId: string) => {
        if (!draft) return;
        const next = draft.type === 'MCQ_SINGLE'
            ? [optionId]
            : draft.correctOptionIds.includes(optionId)
                ? draft.correctOptionIds.filter(id => id !== optionId)
                : [...draft.correctOptionIds, optionId];
        setDraft({ ...draft, correctOptionIds: next });
    };

    const addOption = () => {
        if (!draft) return;
        const nextId = String.fromCharCode(97 + draft.options.length);
        setDraft({ ...draft, options: [...draft.options, { id: nextId, text: '' }] });
    };

    return (
        <div className="p-6 max-w-5xl mx-auto" data-testid="entrance-papers-page">
            <header className="mb-6 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                        <FileQuestion size={22} /> Entrance papers
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Each course needs a paper with at least {MIN_QUESTIONS} questions before it can
                        accept admissions. Papers carry over between academic years.
                    </p>
                </div>
                <button
                    data-testid="entrance-paper-create-btn" onClick={() => setCreating(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium flex items-center gap-2"
                ><Plus size={16} /> New paper</button>
            </header>

            {error && <div data-testid="entrance-papers-error" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
            {notice && <div data-testid="entrance-papers-notice" className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{notice}</div>}

            {/* The list a school works through before admissions open. */}
            {readiness && readiness.notReady > 0 && (
                <div data-testid="entrance-readiness" className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <p className="text-sm font-medium text-amber-900 flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} />
                        {readiness.notReady} course{readiness.notReady === 1 ? '' : 's'} can't accept admissions yet
                    </p>
                    <ul className="text-sm text-amber-800 space-y-1">
                        {readiness.courses.filter(c => !c.ready).map(c => (
                            <li key={c.courseId} data-testid={`entrance-notready-${c.courseSlug}`}>
                                <strong>{c.courseName}</strong> — {c.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {loading ? (
                <p className="text-slate-500 text-sm">Loading…</p>
            ) : papers.length === 0 ? (
                <div data-testid="entrance-papers-empty" className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-500 text-sm">
                        No entrance papers yet. Create one per course before setting up courses.
                    </p>
                </div>
            ) : (
                <div data-testid="entrance-papers-list" className="space-y-2">
                    {papers.map(p => (
                        <button
                            key={p.id}
                            data-testid={`entrance-paper-${p.classSlug}-${p.courseSlug}`}
                            data-ready={p.ready}
                            onClick={() => void openPaperDetail(p)}
                            className="w-full text-left p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 transition"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800">{p.name}</p>
                                    <p className="text-xs text-slate-400">{p.classSlug} · {p.courseSlug}</p>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {p.passPercentage}% to pass · {p.durationMinutes} min · draws {p.questionsToDraw}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${p.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                                    {p.ready ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                    {p.questionCount} question{p.questionCount === 1 ? '' : 's'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* New paper */}
            {creating && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div data-testid="entrance-paper-modal" className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">New entrance paper</h2>
                            <button onClick={() => setCreating(false)} className="p-2 text-slate-400"><X size={18} /></button>
                        </div>

                        <p className="text-xs text-slate-500 mb-3">
                            Use the same slugs as the class and course — that's how the paper is matched
                            when a course is created, and why it survives the yearly rebuild.
                        </p>

                        <input
                            data-testid="entrance-paper-classslug" value={form.classSlug}
                            onChange={e => setForm(f => ({ ...f, classSlug: e.target.value }))}
                            placeholder="Class slug (e.g. class-5)"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />
                        <input
                            data-testid="entrance-paper-courseslug" value={form.courseSlug}
                            onChange={e => setForm(f => ({ ...f, courseSlug: e.target.value }))}
                            placeholder="Course slug (e.g. science)"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />
                        <input
                            data-testid="entrance-paper-name" value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Paper name"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <label className="text-xs text-slate-500">
                                Pass %
                                <input
                                    data-testid="entrance-paper-pass" type="number" value={form.passPercentage}
                                    onChange={e => setForm(f => ({ ...f, passPercentage: Number(e.target.value) }))}
                                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                />
                            </label>
                            <label className="text-xs text-slate-500">
                                Minutes
                                <input
                                    data-testid="entrance-paper-duration" type="number" value={form.durationMinutes}
                                    onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                />
                            </label>
                            <label className="text-xs text-slate-500">
                                Questions drawn
                                <input
                                    data-testid="entrance-paper-draw" type="number" value={form.questionsToDraw}
                                    onChange={e => setForm(f => ({ ...f, questionsToDraw: Number(e.target.value) }))}
                                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                />
                            </label>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">Cancel</button>
                            <button
                                data-testid="entrance-paper-save-btn"
                                disabled={busy || !form.classSlug || !form.courseSlug || form.name.trim().length < 3}
                                onClick={() => void createPaper()}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
                            >{busy ? 'Saving…' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Paper detail + question bank */}
            {openPaper && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div data-testid="entrance-bank-modal" className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-lg font-semibold text-slate-800">{openPaper.name}</h2>
                            <button data-testid="entrance-bank-close" onClick={() => { setOpenPaper(null); setDraft(null); }} className="p-2 text-slate-400">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            {questions.length} question{questions.length === 1 ? '' : 's'}
                            {questions.length < MIN_QUESTIONS
                                ? ` — ${MIN_QUESTIONS - questions.length} more needed before this paper can be used`
                                : ' — ready to use'}
                        </p>

                        <div className="space-y-2 mb-4">
                            {questions.map((q, i) => (
                                <div key={q.id} data-testid={`entrance-q-${q.id}`} className="p-3 bg-slate-50 rounded-xl flex items-start gap-2">
                                    <span className="text-xs text-slate-400 mt-0.5">Q{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-800">{q.text}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{q.type} · {q.marks} mark(s)</p>
                                    </div>
                                    <button
                                        data-testid={`entrance-q-delete-${q.id}`}
                                        onClick={() => void removeQuestion(q)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                                        aria-label="Remove question"
                                    ><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>

                        {draft ? (
                            <div className="p-4 border border-slate-200 rounded-2xl">
                                <select
                                    data-testid="entrance-q-type" value={draft.type}
                                    onChange={e => {
                                        const type = e.target.value as EntranceQuestionType;
                                        setDraft({ ...draft, type, correctOptionIds: [] });
                                    }}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                                >
                                    <option value="MCQ_SINGLE">Multiple choice — one correct</option>
                                    <option value="MCQ_MULTI">Multiple choice — several correct</option>
                                    <option value="NUMERIC">Numeric answer</option>
                                </select>

                                <textarea
                                    data-testid="entrance-q-text" value={draft.text} rows={2}
                                    onChange={e => setDraft({ ...draft, text: e.target.value })}
                                    placeholder="Question"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                                />

                                <label className="text-xs text-slate-500 block mb-3">
                                    Marks
                                    <input
                                        data-testid="entrance-q-marks" type="number" step="0.5" min="0.5" value={draft.marks}
                                        onChange={e => setDraft({ ...draft, marks: Number(e.target.value) })}
                                        className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                    />
                                </label>

                                {draft.type === 'NUMERIC' ? (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <label className="text-xs text-slate-500">
                                            Correct answer
                                            <input
                                                data-testid="entrance-q-numeric" type="number"
                                                value={draft.numericAnswer ?? ''}
                                                onChange={e => setDraft({ ...draft, numericAnswer: e.target.value === '' ? null : Number(e.target.value) })}
                                                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </label>
                                        <label className="text-xs text-slate-500">
                                            Tolerance (±)
                                            <input
                                                data-testid="entrance-q-tolerance" type="number" step="0.01"
                                                value={draft.numericTolerance ?? 0}
                                                onChange={e => setDraft({ ...draft, numericTolerance: Number(e.target.value) })}
                                                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="mb-3">
                                        <p className="text-xs text-slate-500 mb-2">
                                            Options — tick the correct one{draft.type === 'MCQ_MULTI' ? 's' : ''}.
                                            {draft.type === 'MCQ_MULTI' && ' Leave at least one wrong, or the question can\'t be answered incorrectly.'}
                                        </p>
                                        {draft.options.map((o, i) => (
                                            <div key={o.id} className="flex items-center gap-2 mb-2">
                                                <button
                                                    data-testid={`entrance-q-correct-${o.id}`}
                                                    data-selected={draft.correctOptionIds.includes(o.id)}
                                                    onClick={() => toggleCorrect(o.id)}
                                                    className={`w-8 h-8 rounded-lg border text-xs shrink-0 ${draft.correctOptionIds.includes(o.id)
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'bg-white border-slate-200'}`}
                                                >✓</button>
                                                <input
                                                    data-testid={`entrance-q-option-${o.id}`}
                                                    value={o.text}
                                                    onChange={e => {
                                                        const options = [...draft.options];
                                                        options[i] = { ...o, text: e.target.value };
                                                        setDraft({ ...draft, options });
                                                    }}
                                                    placeholder={`Option ${o.id.toUpperCase()}`}
                                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                                />
                                            </div>
                                        ))}
                                        <button
                                            data-testid="entrance-q-add-option" onClick={addOption}
                                            className="text-xs text-emerald-600 hover:underline"
                                        >+ Add option</button>
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setDraft(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">Cancel</button>
                                    <button
                                        data-testid="entrance-q-save-btn" disabled={busy || draft.text.trim().length < 3}
                                        onClick={() => void saveQuestion()}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
                                    >{busy ? <Loader2 className="animate-spin" size={14} /> : 'Add question'}</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                data-testid="entrance-q-new-btn" onClick={() => setDraft(blankQuestion())}
                                className="w-full p-3 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 hover:border-slate-400"
                            >+ Add a question</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
