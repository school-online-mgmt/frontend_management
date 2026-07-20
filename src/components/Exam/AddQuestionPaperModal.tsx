import { useState } from "react";
import api from "../../api/api";

interface Props {
    examId: string;
    onClose: () => void;
    onRefresh: () => void;
    setMessage: (m: string) => void;
    setMessageType: (t: "success" | "error") => void;
    /** If provided, called instead of api.addQuestionPaper (e.g., for set-paper lifecycle step) */
    apiFn?: (examId: string, payload: { questionPaper: string }) => Promise<any>;
    title?: string;
    successMessage?: string;
}

const AddQuestionPaperModal = ({
    examId, onClose, onRefresh, setMessage, setMessageType,
    apiFn, title = "Add / Update Question Paper", successMessage = "Question paper updated successfully",
}: Props) => {
    const [questionPaper, setQuestionPaper] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!questionPaper.trim()) {
            setMessage("Question paper is required");
            setMessageType("error");
            return;
        }
        try {
            setLoading(true);
            const fn = apiFn ?? ((id: string, p: any) => api.addQuestionPaper(id, p));
            await fn(examId, { questionPaper });
            setMessage(successMessage);
            setMessageType("success");
            onRefresh();
            onClose();
        } catch (err: any) {
            setMessage(err?.response?.data?.message || "Failed");
            setMessageType("error");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[9999]">
            <div className="bg-white rounded-xl w-[480px] p-6 space-y-4 shadow-2xl">
                <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                <textarea data-testid="add-question-paper-modal-question-paper-input"
                    value={questionPaper}
                    onChange={(e) => setQuestionPaper(e.target.value)}
                    placeholder="Enter the question paper content here (minimum 10 characters)..."
                    rows={8}
                    className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <div className="flex justify-end gap-3">
                    <button data-testid="add-question-paper-modal-close-btn" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg border">
                        Cancel
                    </button>
                    <button data-testid="add-question-paper-modal-submit-btn"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionPaperModal;
