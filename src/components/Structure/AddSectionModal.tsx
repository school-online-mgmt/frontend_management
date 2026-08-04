import { useMemo, useState } from "react";
import { Plus, X, Loader2, UserX, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";

/**
 * Add one or several sections to a class.
 *
 * Three deliberate differences from the single-field modal this replaces:
 *
 * 1. **Several at once.** Schools think "Class 5 has A, B, C and D", not "add
 *    section A… now add section B". One row per section, add as many as needed.
 *
 * 2. **The teacher is set here.** A section with no class teacher cannot have
 *    attendance marked, feedback recorded, or a promotion decided — it was the
 *    single most common gap in the structure, precisely because assigning one
 *    meant a second trip through a different screen.
 *
 * 3. **The slug is derived, not typed.** It only ever has to be URL-safe and
 *    unique within the class; making a human invent one was a way to fail
 *    validation, not a feature. It stays editable for the rare case that
 *    matters.
 */

interface Props {
    classId: string;
    className: string;
    /** Slugs already on this class — checked here so the clash is caught before submit. */
    existingSlugs: string[];
    onClose: () => void;
    onSuccess: (createdCount: number) => void;
}

interface Row { name: string; slug: string; slugTouched: boolean; teacherId: string }

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const blankRow = (): Row => ({ name: "", slug: "", slugTouched: false, teacherId: "" });

const AddSectionModal = ({ classId, className, existingSlugs, onClose, onSuccess }: Props) => {
    const [rows, setRows] = useState<Row[]>([blankRow()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const teachersQuery = useQuery({
        queryKey: ["teachers", "list"],
        queryFn: () => api.getTeachers(),
    });
    const teachers: Array<{ id: string; name: string }> = useMemo(() => {
        const d = teachersQuery.data as any;
        const list = Array.isArray(d) ? d : (d?.teachers ?? []);
        return list.map((t: any) => ({ id: t.id, name: t.name }));
    }, [teachersQuery.data]);

    const update = (i: number, patch: Partial<Row>) =>
        setRows((prev) => prev.map((r, idx) => {
            if (idx !== i) return r;
            const next = { ...r, ...patch };
            // Keep the slug tracking the name until someone edits it directly.
            if (patch.name !== undefined && !next.slugTouched) next.slug = slugify(patch.name);
            return next;
        }));

    const filled = rows.filter((r) => r.name.trim() !== "");

    /** Clashes, both against the class and within this form. */
    const problems = useMemo(() => {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const r of filled) {
            const slug = r.slug || slugify(r.name);
            if (!slug) { out.push(`"${r.name}" produces an empty slug — add a letter or number.`); continue; }
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
                out.push(`"${slug}" is not URL-safe — lowercase letters, numbers and hyphens only.`);
            }
            if (existingSlugs.includes(slug)) out.push(`${className} already has a section "${slug}".`);
            if (seen.has(slug)) out.push(`"${slug}" appears twice in this form.`);
            seen.add(slug);
        }
        return out;
    }, [filled, existingSlugs, className]);

    const canSave = filled.length > 0 && problems.length === 0 && !saving;

    const save = async () => {
        setSaving(true);
        setError(null);
        let created = 0;
        try {
            // Sequential on purpose: the per-class unique index means a parallel
            // burst can produce a confusing partial failure, and a handful of
            // sections is not worth the risk of an unclear error.
            for (const r of filled) {
                await api.createSection(classId, {
                    name: r.name.trim(),
                    slug: r.slug || slugify(r.name),
                    ...(r.teacherId ? { teacherId: r.teacherId } : {}),
                });
                created++;
            }
            onSuccess(created);
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? "Could not add the section.";
            // Be honest about a partial success — silently reporting failure
            // after three of four were created would leave the user guessing.
            setError(created > 0
                ? `${created} section${created === 1 ? "" : "s"} added, then it stopped: ${msg}`
                : msg);
            if (created > 0) onSuccess(created);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-[9998] flex items-center justify-center p-4" data-testid="add-section-modal">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-xl">
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 sticky top-0 bg-white rounded-t-2xl">
                    <div>
                        <h2 className="font-bold text-slate-900">Add sections to {className}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Add as many as you need. Assigning the teacher now saves a second trip.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-2.5">
                    <div className="hidden sm:grid grid-cols-[1fr_140px_1fr_32px] gap-2 px-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Section name</span>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Slug</span>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Class teacher</span>
                        <span />
                    </div>

                    {rows.map((r, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr_32px] gap-2 items-center">
                            <input
                                data-testid="section-name-input"
                                value={r.name}
                                onChange={(e) => update(i, { name: e.target.value })}
                                placeholder={i === 0 ? "e.g. A" : "Section name"}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                            />
                            <input
                                data-testid="section-slug-input"
                                value={r.slug}
                                onChange={(e) => update(i, { slug: e.target.value, slugTouched: true })}
                                placeholder="auto"
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-500 focus:ring-2 focus:ring-indigo-400"
                            />
                            <select
                                data-testid="section-teacher-select"
                                value={r.teacherId}
                                onChange={(e) => update(i, { teacherId: e.target.value })}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">No teacher yet</option>
                                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            {rows.length > 1 ? (
                                <button
                                    onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg justify-self-center"
                                    aria-label="Remove this row"
                                >
                                    <X size={15} />
                                </button>
                            ) : <span />}
                        </div>
                    ))}

                    <button
                        onClick={() => setRows((p) => [...p, blankRow()])}
                        data-testid="add-section-row-btn"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 pt-1"
                    >
                        <Plus size={13} /> Add another section
                    </button>

                    {filled.some((r) => !r.teacherId) && problems.length === 0 && (
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                            <UserX size={13} className="shrink-0 mt-0.5" />
                            <span>
                                A section with no class teacher cannot have attendance marked. You can add one later
                                from Classes &amp; Sections.
                            </span>
                        </p>
                    )}

                    {problems.length > 0 && (
                        <div data-testid="section-problems" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 space-y-1">
                            {problems.map((p, i) => (
                                <p key={i} className="flex items-start gap-1.5">
                                    <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {p}
                                </p>
                            ))}
                        </div>
                    )}

                    {error && (
                        <p data-testid="section-error" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-slate-100 flex gap-2 sticky bottom-0 bg-white rounded-b-2xl">
                    <button
                        onClick={save}
                        disabled={!canSave}
                        data-testid="section-save-btn"
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 size={15} className="animate-spin" />}
                        {saving ? "Adding…" : `Add ${filled.length || ""} section${filled.length === 1 ? "" : "s"}`.trim()}
                    </button>
                    <button onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSectionModal;
