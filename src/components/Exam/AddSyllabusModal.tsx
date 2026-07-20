import { useState } from "react";
import api from "../../api/api";

const AddSyllabusModal = ({
  examId,
  onClose,
  onRefresh,
  setMessage,
  setMessageType
}: any) => {

    const [syllabus, setSyllabus] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {

        if (!syllabus.trim()) {
            setMessage("Syllabus is required");
            setMessageType("error");
            return;
        }

        try {
            setLoading(true);

            await api.addSyllabus(examId, { syllabus });

            setMessage("Syllabus updated successfully");
            setMessageType("success");

            onRefresh();
            onClose();

        } catch (err: any) {
            const fieldErr = err?.response?.data?.errors?.fieldErrors?.syllabus?.[0];
            setMessage(fieldErr || err?.response?.data?.message || "Failed to save syllabus");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
            <div className="bg-white rounded-xl w-[400px] p-6 space-y-4">

                <h2 className="text-lg font-bold">Add / Update Syllabus</h2>

                <textarea data-testid="add-syllabus-modal-syllabus-input"
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                />

                <div className="flex justify-end gap-3">
                    <button data-testid="add-syllabus-modal-close-btn" onClick={onClose}>Cancel</button>
                    <button data-testid="add-syllabus-modal-submit-btn"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AddSyllabusModal;