import { useEffect, useState } from "react";
import api from "../../api/api.ts";

interface Props {
    classId: string;
    className: string;
    onClose: () => void;
    onSuccess: (msg: string) => void;
}

const CreateCourseInClassModal = ({ classId, className, onClose, onSuccess }: Props) => {
    const [slug, setSlug] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [sessions, setSessions] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getSessions().then((data) => setSessions(data || [])).catch(() => {});
    }, []);

    // Auto-generate slug from name
    const handleNameChange = (value: string) => {
        setName(value);
        setSlug(value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    };

    const handleSubmit = async () => {
        if (!slug || !name || !sessionId) {
            setError("Name, slug, and session are required");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.createCourse({ slug, name, description, classId, sessionId });
            onSuccess(`Course "${name}" created successfully`);
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to create course");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-[480px] p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Create Course</h2>
                        <p className="text-sm text-slate-500">For class: <span className="font-semibold text-slate-700">{className}</span></p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
                )}

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Course Name *</label>
                        <input
                            data-testid="course-name-input"
                            placeholder="e.g. Science Stream"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Slug *</label>
                        <input
                            data-testid="course-slug-input"
                            placeholder="auto-generated from name"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm font-mono"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Academic Session *</label>
                        <select
                            data-testid="course-session-select"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm"
                        >
                            <option value="">Select Session</option>
                            {sessions.map((session) => (
                                <option key={session.id} value={session.id}>{session.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                        <textarea
                            data-testid="course-description-input"
                            placeholder="Optional description…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg text-sm">Cancel</button>
                    <button
                        data-testid="course-submit-btn"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {isSubmitting ? "Creating…" : "Create Course"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateCourseInClassModal;

