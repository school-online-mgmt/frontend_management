import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X, BookOpen } from "lucide-react";
import api from "../../api/api.ts";

interface Props {
    classId: string;
    className: string;
    onClose: () => void;
    onSuccess: (msg: string) => void;
}

// ── Helpers defined OUTSIDE the modal so they are stable across re-renders ──
const Field = ({
    label, required, error, children,
}: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
    <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {error && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={11} /> {error}
            </p>
        )}
    </div>
);

// ── Modal ────────────────────────────────────────────────────────────────────
const CreateCourseInClassModal = ({ classId, className, onClose, onSuccess }: Props) => {
    const [slug, setSlug] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [sessions, setSessions] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        api.getSessions().then((data) => {
            const list = data || [];
            setSessions(list);
            // Preselect the current/active session so a fast submit before the
            // dropdown resolves doesn't fail validation on an empty field (BUG-004).
            if (list.length) {
                const preferred = list.find((s: any) => s.isCurrent || s.isActive || s.status === "ACTIVE") ?? list[0];
                setSessionId(prev => prev || preferred.id);
            }
        }).catch(() => {});
    }, []);

    const handleNameChange = (value: string) => {
        setName(value);
        setSlug(
            value.toLowerCase()
                .replaceAll(/\s+/g, "-")
                .replaceAll(/[^a-z0-9-]/g, "")
                .replaceAll(/-+/g, "-")
                .replace(/^-|-$/g, "")
        );
        if (fieldErrors.name) setFieldErrors(f => ({ ...f, name: "" }));
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim())        errs.name        = "Course name is required.";
        if (!sessionId)          errs.sessionId   = "Please select an academic session.";
        if (!description.trim()) errs.description = "Description is required — briefly describe what this course covers.";
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            setError("Please fix the errors below before submitting.");
            return;
        }
        setIsSubmitting(true);
        setError("");
        try {
            await api.createCourse({ slug, name, description: description.trim(), classId, sessionId });
            onSuccess(`✅ Course "${name}" created successfully for ${className}.`);
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to create course. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Create Course"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                            <BookOpen size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm">Create Course</h2>
                            <p className="text-white/70 text-xs">Class: <span className="font-semibold">{className}</span></p>
                        </div>
                    </div>
                    <button data-testid="create-course-in-class-modal-close-btn" onClick={onClose} className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/20 transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
                            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    <Field label="Course Name" required error={fieldErrors.name}>
                        <input
                            data-testid="course-name-input"
                            placeholder="e.g. Science Stream"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className={`w-full border p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition
                                ${fieldErrors.name ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-slate-200 focus:ring-emerald-200 focus:border-emerald-400 bg-slate-50"}`}
                        />
                    </Field>

                    <Field label="URL Slug" required>
                        <input
                            data-testid="course-slug-input"
                            placeholder="auto-generated from name"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 bg-slate-50 transition"
                        />
                    </Field>

                    <Field label="Academic Session" required error={fieldErrors.sessionId}>
                        <select
                            data-testid="course-session-select"
                            value={sessionId}
                            onChange={(e) => { setSessionId(e.target.value); setFieldErrors(f => ({ ...f, sessionId: "" })); }}
                            className={`w-full border p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition
                                ${fieldErrors.sessionId ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-slate-200 focus:ring-emerald-200 focus:border-emerald-400 bg-slate-50"}`}
                        >
                            <option value="">Select Session</option>
                            {sessions.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {sessions.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle size={11} /> No sessions found — create an academic session first.
                            </p>
                        )}
                    </Field>

                    <Field label="Description" required error={fieldErrors.description}>
                        <textarea
                            data-testid="course-description-input"
                            placeholder="Briefly describe what this course covers, its objectives and target students…"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                if (fieldErrors.description) setFieldErrors(f => ({ ...f, description: "" }));
                            }}
                            rows={3}
                            className={`w-full border p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition resize-none
                                ${fieldErrors.description ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-slate-200 focus:ring-emerald-200 focus:border-emerald-400 bg-slate-50"}`}
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">{description.length} / 500 characters</p>
                    </Field>

                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} disabled={isSubmitting}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-50">
                            Cancel
                        </button>
                        <button
                            data-testid="course-submit-btn"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !sessionId}
                            className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting
                                ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                                : <><CheckCircle2 size={15} /> Create Course</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCourseInClassModal;

