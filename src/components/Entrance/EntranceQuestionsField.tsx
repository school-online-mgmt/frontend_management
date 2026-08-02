import { useState } from 'react';
import type { EntranceQuestionInput, EntranceQuestionType } from '../../api/api';
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Authors an entrance question bank inside a course form (FR-012).
 *
 * A course cannot be created without a paper of at least five questions, so the
 * questions are collected HERE rather than sending the user to another screen
 * and back. Shared by both course-creation forms and the onboarding wizard so
 * the rule is stated once.
 *
 * Renders nothing but the bank — the parent owns the submit button, and reads
 * `questions.length >= MIN_QUESTIONS` to decide whether it can be pressed.
 */

export const MIN_QUESTIONS = 5;

interface Props {
    questions: EntranceQuestionInput[];
    onChange: (next: EntranceQuestionInput[]) => void;
    /** Hidden when a paper already exists — the second year onward. */
    existingPaperName?: string | null;
}

const blank = (): EntranceQuestionInput => ({
    type: 'MCQ_SINGLE',
    text: '',
    marks: 1,
    options: [{ id: 'a', text: '' }, { id: 'b', text: '' }],
    correctOptionIds: [],
    numericAnswer: null,
    numericTolerance: 0,
});

export default function EntranceQuestionsField({ questions, onChange, existingPaperName }: Props) {
    const [draft, setDraft] = useState<EntranceQuestionInput | null>(null);

    if (existingPaperName) {
        return (
            <div data-testid="entrance-existing-paper" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span>
                    This course already has an entrance paper (<strong>{existingPaperName}</strong>) —
                    it carries over from a previous year, so there is nothing to write.
                </span>
            </div>
        );
    }

    const remaining = Math.max(0, MIN_QUESTIONS - questions.length);

    // A multi-correct question where every option is correct can't be answered
    // wrongly, so the server refuses it. Catch it here rather than on submit.
    const draftValid = (() => {
        if (!draft || draft.text.trim().length < 3) return false;
        if (draft.type === 'NUMERIC') return draft.numericAnswer !== null && draft.numericAnswer !== undefined;
        if (draft.options.filter(o => o.text.trim()).length < 2) return false;
        if (draft.correctOptionIds.length === 0) return false;
        if (draft.type === 'MCQ_SINGLE' && draft.correctOptionIds.length !== 1) return false;
        if (draft.type === 'MCQ_MULTI' && draft.correctOptionIds.length === draft.options.length) return false;
        return true;
    })();

    const commit = () => {
        if (!draft || !draftValid) return;
        const cleaned: EntranceQuestionInput = draft.type === 'NUMERIC'
            ? { ...draft, options: [], correctOptionIds: [] }
            : { ...draft, options: draft.options.filter(o => o.text.trim()), numericAnswer: null, numericTolerance: 0 };
        onChange([...questions, cleaned]);
        setDraft(null);
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

    return (
        <div data-testid="entrance-questions-field">
            <div className={`mb-2 p-2.5 rounded-xl text-xs flex items-start gap-2 ${remaining > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                {remaining > 0 ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
                <span data-testid="entrance-questions-status">
                    {remaining > 0
                        ? `Entrance exam: ${questions.length} of ${MIN_QUESTIONS} questions — ${remaining} more needed before this course can be created.`
                        : `Entrance exam ready — ${questions.length} questions.`}
                </span>
            </div>

            {questions.length > 0 && (
                <div className="space-y-1.5 mb-2">
                    {questions.map((q, i) => (
                        <div key={i} data-testid={`entrance-draft-q-${i}`} className="p-2 bg-slate-50 rounded-lg flex items-start gap-2">
                            <span className="text-[11px] text-slate-400 mt-0.5">Q{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-800 truncate">{q.text}</p>
                                <p className="text-[11px] text-slate-400">{q.type} · {q.marks} mark(s)</p>
                            </div>
                            <button
                                type="button"
                                data-testid={`entrance-draft-remove-${i}`}
                                onClick={() => onChange(questions.filter((_, j) => j !== i))}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                aria-label={`Remove question ${i + 1}`}
                            ><Trash2 size={13} /></button>
                        </div>
                    ))}
                </div>
            )}

            {draft ? (
                <div className="p-3 border border-slate-200 rounded-xl">
                    <select
                        data-testid="entrance-draft-type" value={draft.type}
                        onChange={e => setDraft({ ...draft, type: e.target.value as EntranceQuestionType, correctOptionIds: [] })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2"
                    >
                        <option value="MCQ_SINGLE">Multiple choice — one correct</option>
                        <option value="MCQ_MULTI">Multiple choice — several correct</option>
                        <option value="NUMERIC">Numeric answer</option>
                    </select>

                    <input
                        data-testid="entrance-draft-text" value={draft.text}
                        onChange={e => setDraft({ ...draft, text: e.target.value })}
                        placeholder="Question"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-2"
                    />

                    {draft.type === 'NUMERIC' ? (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                                data-testid="entrance-draft-numeric" type="number" placeholder="Correct answer"
                                value={draft.numericAnswer ?? ''}
                                onChange={e => setDraft({ ...draft, numericAnswer: e.target.value === '' ? null : Number(e.target.value) })}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                            <input
                                data-testid="entrance-draft-tolerance" type="number" step="0.01" placeholder="Tolerance ±"
                                value={draft.numericTolerance ?? 0}
                                onChange={e => setDraft({ ...draft, numericTolerance: Number(e.target.value) })}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                        </div>
                    ) : (
                        <div className="mb-2">
                            {draft.options.map((o, i) => (
                                <div key={o.id} className="flex items-center gap-2 mb-1.5">
                                    <button
                                        type="button"
                                        data-testid={`entrance-draft-correct-${o.id}`}
                                        data-selected={draft.correctOptionIds.includes(o.id)}
                                        onClick={() => toggleCorrect(o.id)}
                                        className={`w-7 h-7 rounded-lg border text-[11px] shrink-0 ${draft.correctOptionIds.includes(o.id) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200'}`}
                                        title="Mark correct"
                                    >✓</button>
                                    <input
                                        data-testid={`entrance-draft-option-${o.id}`} value={o.text}
                                        onChange={e => {
                                            const options = [...draft.options];
                                            options[i] = { ...o, text: e.target.value };
                                            setDraft({ ...draft, options });
                                        }}
                                        placeholder={`Option ${o.id.toUpperCase()}`}
                                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>
                            ))}
                            <button
                                type="button" data-testid="entrance-draft-add-option"
                                onClick={() => setDraft({
                                    ...draft,
                                    options: [...draft.options, { id: String.fromCharCode(97 + draft.options.length), text: '' }],
                                })}
                                className="text-[11px] text-emerald-600 hover:underline"
                            >+ Add option</button>
                            {draft.type === 'MCQ_MULTI' && draft.correctOptionIds.length === draft.options.length && draft.options.length > 0 && (
                                <p className="text-[11px] text-amber-700 mt-1">
                                    Leave at least one option incorrect — otherwise the question can't be answered wrongly.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setDraft(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs">Cancel</button>
                        <button
                            type="button" data-testid="entrance-draft-save" disabled={!draftValid} onClick={commit}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-50"
                        >Add question</button>
                    </div>
                </div>
            ) : (
                <button
                    type="button" data-testid="entrance-draft-new"
                    onClick={() => setDraft(blank())}
                    className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 hover:border-slate-400 flex items-center justify-center gap-1"
                ><Plus size={13} /> Add an entrance exam question</button>
            )}
        </div>
    );
}
