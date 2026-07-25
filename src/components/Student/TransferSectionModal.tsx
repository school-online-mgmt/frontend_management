import { useEffect, useState } from "react";
import { X, Loader2, ArrowRightLeft, Check } from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";

interface Props {
    studentId: string;
    studentName: string;
    sessionId: string;
    classId: string;
    currentSectionId: string;
    currentSectionName?: string;
    onClose: () => void;
    onDone: () => void;
}

interface Section { id: string; name: string }

/**
 * Mid-term section transfer (P1-ACA-06). Moves a student to another section
 * within their current class. Only same-class sections are offered — the
 * backend rejects a cross-class move.
 */
const TransferSectionModal: React.FC<Props> = ({
    studentId, studentName, sessionId, classId, currentSectionId, currentSectionName, onClose, onDone,
}) => {
    const { addToast } = useToast();
    const [sections, setSections] = useState<Section[]>([]);
    const [toSectionId, setToSectionId] = useState("");
    const [rollNo, setRollNo] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.getSectionsByClass(classId)
            .then((rows: any) => setSections((Array.isArray(rows) ? rows : []).map((s: any) => ({ id: s.id, name: s.name ?? s.sectionName }))))
            .catch(() => setSections([]))
            .finally(() => setLoading(false));
    }, [classId]);

    const options = sections.filter((s) => s.id !== currentSectionId);

    const submit = async () => {
        if (!toSectionId) { addToast("Pick a section to move to", "error"); return; }
        setSaving(true);
        try {
            const res = await api.transferStudentSection(studentId, {
                sessionId, toSectionId,
                ...(rollNo.trim() ? { rollNo: rollNo.trim() } : {}),
                ...(reason.trim() ? { reason: reason.trim() } : {}),
            });
            addToast(`Moved ${studentName} from ${res.fromSection} to ${res.toSection}`, "success");
            onDone();
        } catch (e: any) {
            addToast(e?.response?.data?.message || "Transfer failed", "error");
        } finally { setSaving(false); }
    };

    const input = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><ArrowRightLeft size={16} className="text-indigo-500" /> Transfer section</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <p className="text-sm text-slate-600">
                        Move <span className="font-semibold text-slate-800">{studentName}</span>
                        {currentSectionName ? <> out of section <span className="font-semibold">{currentSectionName}</span></> : null} to another section in the same class.
                    </p>
                    {loading ? (
                        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : options.length === 0 ? (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">There's no other section in this class to move to.</p>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Move to section *</label>
                                <select data-testid="transfer-section-select" className={input} value={toSectionId} onChange={(e) => setToSectionId(e.target.value)}>
                                    <option value="">Select a section…</option>
                                    {options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">New roll no. (optional)</label>
                                    <input className={input} value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="Keep existing" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600">Reason (optional)</label>
                                    <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. balance sections" />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400">Past attendance and marks stay under the old section; only future records follow the new one. This is recorded on the Activity log.</p>
                        </>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button data-testid="transfer-section-submit" onClick={submit} disabled={saving || loading || options.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Transfer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferSectionModal;
