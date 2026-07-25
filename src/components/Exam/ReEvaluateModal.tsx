import { useState } from "react";
import { X, Loader2, Scale, ArrowRight } from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";

interface Props {
    resultId: string;
    studentName: string;
    currentMarks: number | null;
    fullMarks: number;
    onClose: () => void;
    onDone: () => void;
}

/**
 * Authorised re-evaluation of a published result (P0-EXM-05). A recheck can
 * change a published mark, but it's deliberately friction-ful: a reason is
 * mandatory and the change is audited (old → new) on the Activity log.
 */
const ReEvaluateModal: React.FC<Props> = ({ resultId, studentName, currentMarks, fullMarks, onClose, onDone }) => {
    const { addToast } = useToast();
    const [marks, setMarks] = useState(currentMarks != null ? String(currentMarks) : "");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        const m = parseFloat(marks);
        if (isNaN(m) || m < 0) { addToast("Enter valid marks", "error"); return; }
        if (m > fullMarks) { addToast(`Marks can't exceed ${fullMarks}`, "error"); return; }
        if (reason.trim().length < 3) { addToast("A re-evaluation reason is required", "error"); return; }
        setSaving(true);
        try {
            const res = await api.reEvaluateResult(resultId, { marks: m, reason: reason.trim() });
            addToast(`Re-evaluated ${studentName}: ${res.oldMarks ?? "—"} → ${res.newMarks}`, "success");
            onDone();
        } catch (e: any) {
            addToast(e?.response?.data?.message || "Re-evaluation failed", "error");
        } finally { setSaving(false); }
    };

    const input = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><Scale size={16} className="text-indigo-500" /> Re-evaluate result</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <p className="text-sm text-slate-600">
                        Change <span className="font-semibold text-slate-800">{studentName}</span>'s published mark. This is recorded on the Activity log.
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Current</p>
                            <p className="text-lg font-bold text-slate-500 tabular-nums">{currentMarks ?? "—"}</p>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 mt-4" />
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-600">New marks (out of {fullMarks}) *</label>
                            <input data-testid="reeval-marks" type="number" min={0} max={fullMarks} className={input} value={marks} onChange={(e) => setMarks(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Reason *</label>
                        <textarea data-testid="reeval-reason" rows={2} className={`${input} resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Recheck: page 3 total was mis-added" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button data-testid="reeval-submit" onClick={submit} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Scale size={14} />} Re-evaluate
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReEvaluateModal;
