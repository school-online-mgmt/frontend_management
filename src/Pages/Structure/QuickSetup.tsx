import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
    Wand2, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, X, Plus, Info, Check,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSessionId } from "../../context/SessionContext";
import {
    CLASS_CATALOGUE, SECTION_LETTERS, MAX_SECTIONS,
    sectionNameFor, classSlugFor, slugify,
} from "../../config/classCatalogue";

/**
 * Quick Setup — build a whole year's class structure in one pass.
 *
 * The problem this solves: sections are created one at a time, nested under a
 * class. A school setting up Classes 1–10 with sections A–D therefore faced
 * 10 class modals and 40 section modals — 50 round trips, an afternoon of
 * clicking, for the very first thing they do in the product.
 *
 * The flow is generate → **review and edit** → create. The preview is not
 * decoration: it is the last point at which a mistake is cheap, and every row
 * is editable and removable there. Nothing is written until the preview is
 * confirmed, and then it all lands in one transaction.
 */

/**
 * Presets over the shared catalogue. Pre-primary is its own preset because
 * Nursery/LKG/UKG cannot be expressed as a numeric range — the reason this is a
 * catalogue picker rather than a from/to pair.
 */
const PRESETS: Array<{ key: string; label: string; hint: string; grades: string[] }> = [
    { key: "preprimary", label: "Pre-primary", hint: "Nursery, LKG, UKG", grades: ["Nursery", "LKG", "UKG"] },
    { key: "primary",    label: "Primary",     hint: "Classes 1–5",  grades: [1, 2, 3, 4, 5].map((n) => `Class ${n}`) },
    { key: "middle",     label: "Middle",      hint: "Classes 6–8",  grades: [6, 7, 8].map((n) => `Class ${n}`) },
    { key: "secondary",  label: "Secondary",   hint: "Classes 9–10", grades: [9, 10].map((n) => `Class ${n}`) },
    { key: "senior",     label: "Senior",      hint: "Classes 11–12", grades: [11, 12].map((n) => `Class ${n}`) },
    { key: "full",       label: "Whole school", hint: "Nursery to Class 12", grades: CLASS_CATALOGUE.map((c) => c.grade) },
];

interface PreviewSection { name: string; slug: string }
interface PreviewClass { name: string; slug: string; sections: PreviewSection[] }

const QuickSetup = () => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const sessionId = useSessionId();

    const [picked, setPicked] = useState<string[]>([]);
    const [sectionCount, setSectionCount] = useState(4);
    const [preview, setPreview] = useState<PreviewClass[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{
        message: string;
        summary: { classesCreated: number; classesSkipped: number; sectionsCreated: number; sectionsSkipped: number };
        skipped: Array<{ class: string; reason: string }>;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    /** Catalogue order, whatever order they were clicked in. */
    const orderedPicked = useMemo(
        () => CLASS_CATALOGUE.filter((c) => picked.includes(c.grade)).map((c) => c.grade),
        [picked],
    );

    const generate = () => {
        setError(null);
        setResult(null);
        if (orderedPicked.length === 0) { setError("Pick at least one class."); return; }
        const letters = SECTION_LETTERS.slice(0, sectionCount);
        setPreview(orderedPicked.map((grade) => ({
            name: grade,
            slug: classSlugFor(grade),
            sections: letters.map((l) => {
                const name = sectionNameFor(grade, l);
                return { name, slug: slugify(name) };
            }),
        })));
    };

    const togglePick = (grade: string) => {
        setPreview(null); setResult(null);
        setPicked((p) => (p.includes(grade) ? p.filter((g) => g !== grade) : [...p, grade]));
    };

    const applyPreset = (p: typeof PRESETS[number]) => {
        setPreview(null); setResult(null);
        // Toggle: clicking an already-applied preset clears it, so a mis-click
        // is undone by the same button rather than by hunting for a reset.
        const already = p.grades.every((g) => picked.includes(g));
        setPicked((prev) => already
            ? prev.filter((g) => !p.grades.includes(g))
            : [...new Set([...prev, ...p.grades])]);
    };

    const totalSections = preview?.reduce((s, c) => s + c.sections.length, 0) ?? 0;

    const create = async () => {
        if (!preview || !sessionId) return;
        setSaving(true);
        setError(null);
        try {
            const res = await api.createStructureBulk({ sessionId, classes: preview });
            setResult(res);
            setPreview(null);
            qc.invalidateQueries({ queryKey: ["structure", "overview", sessionId] });
            qc.invalidateQueries({ queryKey: ["classes"] });
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "Could not create the structure. Nothing was saved.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader
                icon={Wand2}
                title="Quick Setup"
                subtitle="Create your classes and sections for the whole year in one go"
                gradient={MODULE_THEMES.classes}
                primaryActions={
                    <button
                        onClick={() => navigate("/structure")}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition backdrop-blur-sm"
                    >
                        <ArrowLeft size={15} /> Back to Structure
                    </button>
                }
            />

            <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">
                {!sessionId ? (
                    <EmptySessionState entityPlural="classes" />
                ) : result ? (
                    /* ── Done ─────────────────────────────────────────────── */
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center" data-testid="quick-setup-result">
                        <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
                        <h2 className="text-lg font-bold text-slate-900">{result.message}</h2>
                        <div className="flex justify-center gap-6 mt-4 text-sm">
                            <div>
                                <p className="text-2xl font-bold text-emerald-600">{result.summary.classesCreated}</p>
                                <p className="text-xs text-slate-500">classes created</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-600">{result.summary.sectionsCreated}</p>
                                <p className="text-xs text-slate-500">sections created</p>
                            </div>
                            {(result.summary.classesSkipped > 0 || result.summary.sectionsSkipped > 0) && (
                                <div>
                                    <p className="text-2xl font-bold text-slate-400">
                                        {result.summary.classesSkipped + result.summary.sectionsSkipped}
                                    </p>
                                    <p className="text-xs text-slate-500">already existed</p>
                                </div>
                            )}
                        </div>

                        {result.skipped.length > 0 && (
                            <div className="mt-4 text-left bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <p className="text-xs font-semibold text-slate-600 mb-1">Skipped, because they already exist:</p>
                                {result.skipped.slice(0, 8).map((s, i) => (
                                    <p key={i} className="text-xs text-slate-500">{s.class}</p>
                                ))}
                                {result.skipped.length > 8 && (
                                    <p className="text-xs text-slate-400">and {result.skipped.length - 8} more</p>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex gap-2 justify-center">
                            <button
                                onClick={() => navigate("/structure/classes")}
                                data-testid="quick-setup-view-btn"
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
                            >
                                View Classes &amp; Sections
                            </button>
                            <button
                                onClick={() => { setResult(null); setPreview(null); }}
                                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:border-slate-300"
                            >
                                Add more
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">
                            Next: assign a class teacher to each section, then set up courses and subjects.
                        </p>
                    </div>
                ) : !preview ? (
                    /* ── Build the pattern ─────────────────────────────────── */
                    <>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                                Quick pick
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map((p) => {
                                    const on = p.grades.every((g) => picked.includes(g));
                                    return (
                                        <button
                                            key={p.key}
                                            onClick={() => applyPreset(p)}
                                            data-testid={`preset-${p.key}`}
                                            className={`px-3 py-2 rounded-xl border text-left transition ${
                                                on ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                                            }`}
                                        >
                                            <span className="block text-sm font-semibold text-slate-800">{p.label}</span>
                                            <span className="block text-[11px] text-slate-500">{p.hint}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                            {/* The same catalogue the onboarding wizard uses, so a school
                                that set up through the wizard sees the names it already
                                chose — and so pre-primary grades are reachable at all. */}
                            <Field label="Which classes does your school have?" hint="Click to add or remove.">
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {CLASS_CATALOGUE.map((c) => {
                                        const on = picked.includes(c.grade);
                                        return (
                                            <button
                                                key={c.grade}
                                                onClick={() => togglePick(c.grade)}
                                                data-testid={`qs-pick-${c.code}`}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                    on
                                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                                                }`}
                                            >
                                                {on && <Check size={11} className="inline mr-1 -mt-0.5" />}{c.grade}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            <Field
                                label={`Sections per class — ${sectionCount === 0 ? "none" : SECTION_LETTERS.slice(0, sectionCount).join(", ")}`}
                                hint="Every class gets the same sections. You can add or remove per class in the next step."
                            >
                                <input
                                    data-testid="qs-section-count"
                                    type="range" min={0} max={MAX_SECTIONS} step={1}
                                    value={sectionCount}
                                    onChange={(e) => { setSectionCount(Number(e.target.value)); setPreview(null); }}
                                    className="w-full accent-indigo-600"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>none</span><span>{MAX_SECTIONS}</span>
                                </div>
                            </Field>

                            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                                <Info size={13} className="shrink-0 mt-0.5" />
                                <span>
                                    This creates <strong>{orderedPicked.length}</strong> class{orderedPicked.length === 1 ? "" : "es"}
                                    {sectionCount > 0 && <> and <strong>{orderedPicked.length * sectionCount}</strong> sections</>}.
                                    You will see the full list and can edit it before anything is saved.
                                </span>
                            </p>

                            {error && (
                                <p data-testid="qs-error" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                                    {error}
                                </p>
                            )}

                            <button
                                onClick={generate}
                                disabled={orderedPicked.length === 0}
                                data-testid="qs-generate-btn"
                                className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 inline-flex items-center justify-center gap-2"
                            >
                                <Wand2 size={15} /> Preview what will be created
                            </button>
                        </div>
                    </>
                ) : (
                    /* ── Review before committing ──────────────────────────── */
                    <>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="qs-preview">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">
                                        {preview.length} classes · {totalSections} sections
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Edit or remove anything here. Nothing is saved yet.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPreview(null)}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                >
                                    Change the pattern
                                </button>
                            </div>

                            <div className="max-h-[52vh] overflow-y-auto divide-y divide-slate-50">
                                {preview.map((c, ci) => (
                                    <div key={ci} className="px-5 py-3" data-testid="qs-preview-class">
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={c.name}
                                                onChange={(e) => setPreview((p) => p!.map((x, i) =>
                                                    i === ci ? { ...x, name: e.target.value, slug: slugify(e.target.value) } : x))}
                                                className="font-semibold text-slate-800 text-sm px-2 py-1 border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded-lg focus:outline-none"
                                            />
                                            <span className="text-[11px] font-mono text-slate-400">#{c.slug}</span>
                                            <button
                                                onClick={() => setPreview((p) => p!.filter((_, i) => i !== ci))}
                                                data-testid="qs-remove-class"
                                                className="ml-auto p-1 text-slate-300 hover:text-rose-500 rounded"
                                                aria-label={`Remove ${c.name}`}
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                        {c.sections.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2 pl-2">
                                                {c.sections.map((s, si) => (
                                                    <span
                                                        key={si}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-medium rounded-lg border border-violet-100"
                                                    >
                                                        {s.name}
                                                        <button
                                                            onClick={() => setPreview((p) => p!.map((x, i) =>
                                                                i === ci ? { ...x, sections: x.sections.filter((_, j) => j !== si) } : x))}
                                                            className="text-violet-400 hover:text-rose-500"
                                                            aria-label={`Remove section ${s.name}`}
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {c.sections.length === 0 && (
                                            <p className="text-[11px] text-amber-700 mt-1.5 pl-2 inline-flex items-center gap-1">
                                                <AlertTriangle size={11} /> no sections — students cannot be admitted into this class
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <p data-testid="qs-error" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={create}
                                disabled={saving || preview.length === 0}
                                data-testid="qs-create-btn"
                                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 inline-flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                {saving ? "Creating…" : `Create ${preview.length} classes and ${totalSections} sections`}
                            </button>
                            <button
                                onClick={() => setPreview(null)}
                                disabled={saving}
                                className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:border-slate-300 disabled:opacity-40"
                            >
                                Back
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 text-center">
                            Anything that already exists is skipped, not duplicated — it is safe to run this again.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
        {children}
        {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
);

export default QuickSetup;
