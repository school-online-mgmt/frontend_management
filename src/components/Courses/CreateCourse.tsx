import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X, BookOpen } from "lucide-react";
import api from "../../api/api.ts";

// ── Helpers defined OUTSIDE parent component — prevents remount on every keystroke ──
const FieldLabel = ({ label, required }: { label: string; required?: boolean }) => (
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
    </label>
);

const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={11} /> {msg}
        </p>
    ) : null;

// ── Component ────────────────────────────────────────────────────────────────
const CreateCourse = ({ onClose, onRefresh, setMessage, setMessageType }: any) => {

    const [slug, setSlug]               = useState("");
    const [name, setName]               = useState("");
    const [description, setDescription] = useState("");
    const [classId, setClassId]         = useState("");
    const [classes, setClasses]         = useState<any[]>([]);
    const [sessionId, setSessionId]     = useState("");
    const [sessions, setSessions]       = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({});
    const [globalError, setGlobalError]   = useState("");

    useEffect(() => {
        api.getClasses().then((d: any) => setClasses(d || [])).catch(() => {});
        api.getSessions().then((d: any) => setSessions(d || [])).catch(() => {});
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
        if (!classId)            errs.classId     = "Please select a class.";
        if (!sessionId)          errs.sessionId   = "Please select an academic session.";
        if (!description.trim()) errs.description = "Description is required — briefly describe what this course covers.";
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        setGlobalError("");
        if (!validate()) {
            setGlobalError("Please fix the errors below before submitting.");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.createCourse({ slug, name, description: description.trim(), classId, sessionId });
            setMessage(`✅ Course "${name}" created successfully.`);
            setMessageType("success");
            onRefresh();
            onClose();
        } catch (error: any) {
            const msg = error?.response?.data?.message || "Failed to create course. Please try again.";
            setGlobalError(msg);
            setMessage(msg);
            setMessageType("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputCls = (key: string) =>
        `w-full border p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition
         ${fieldErrors[key] ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-slate-200 focus:ring-emerald-200 focus:border-emerald-400 bg-slate-50"}`;

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
                            <p className="text-white/70 text-xs">Fill in all required fields</p>
                        </div>
                    </div>
                    <button data-testid="create-course-close-btn" onClick={onClose} className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/20 transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {globalError && (
                        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
                            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-medium">{globalError}</p>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <FieldLabel label="Course Name" required />
                        <input data-testid="course-name-input" placeholder="e.g. Science Stream"
                            value={name} onChange={(e) => handleNameChange(e.target.value)}
                            className={inputCls("name")} />
                        <FieldError msg={fieldErrors.name} />
                    </div>

                    {/* Slug */}
                    <div>
                        <FieldLabel label="URL Slug" required />
                        <input data-testid="course-slug-input" placeholder="auto-generated from name"
                            value={slug} onChange={(e) => setSlug(e.target.value)}
                            className={inputCls("slug") + " font-mono"} />
                    </div>

                    {/* Session */}
                    <div>
                        <FieldLabel label="Academic Session" required />
                        <select data-testid="course-session-select" value={sessionId}
                            onChange={(e) => { setSessionId(e.target.value); setFieldErrors(f => ({ ...f, sessionId: "" })); }}
                            className={inputCls("sessionId")}>
                            <option value="">Select Session</option>
                            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <FieldError msg={fieldErrors.sessionId} />
                        {sessions.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle size={11} /> No sessions found — create an academic session first.
                            </p>
                        )}
                    </div>

                    {/* Class */}
                    <div>
                        <FieldLabel label="Class" required />
                        <select data-testid="course-class-select" value={classId}
                            onChange={(e) => { setClassId(e.target.value); setFieldErrors(f => ({ ...f, classId: "" })); }}
                            className={inputCls("classId")}>
                            <option value="">Select Class</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <FieldError msg={fieldErrors.classId} />
                    </div>

                    {/* Description — MANDATORY */}
                    <div>
                        <FieldLabel label="Description" required />
                        <textarea data-testid="course-description-input"
                            placeholder="Briefly describe what this course covers, its objectives and target students…"
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); if (fieldErrors.description) setFieldErrors(f => ({ ...f, description: "" })); }}
                            rows={3}
                            className={inputCls("description") + " resize-none"} />
                        <div className="flex justify-between mt-0.5">
                            <FieldError msg={fieldErrors.description} />
                            <p className="text-[10px] text-slate-400 ml-auto">{description.length} / 500</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button data-testid="create-course-close-btn-2" onClick={onClose} disabled={isSubmitting}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-50">
                            Cancel
                        </button>
                        <button data-testid="course-submit-btn" onClick={handleSubmit} disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
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

export default CreateCourse;

