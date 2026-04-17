import { useState } from "react";
import api from "../../api/api";

const ScheduleExamModal = ({
                               examId,
                               onClose,
                               onRefresh,
                               setMessage,
                               setMessageType
                           }: any) => {

    const [examDate, setExamDate] = useState("");
    const [loading, setLoading] = useState(false);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().slice(0, 16);

    const handleSubmit = async () => {

        if (!examDate) {
            setMessage("Exam date is required");
            setMessageType("error");
            return;
        }

        try {
            setLoading(true);

            await api.scheduleExam(examId, {
                examDate: new Date(examDate),
            });

            setMessage("Exam scheduled successfully");
            setMessageType("success");

            onRefresh();
            onClose();

        } catch (err: unknown) {
            setMessage(err?.response?.data?.message || "Failed to schedule exam");
            setMessageType("error");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
            <div className="bg-white rounded-xl w-[400px] p-6 space-y-4">

                <h2 className="text-lg font-bold">Schedule Exam</h2>

                <input
                    type="datetime-local"
                    value={examDate}
                    min={minDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose}>Cancel</button>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
                    >
                        {loading ? "Scheduling..." : "Schedule"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ScheduleExamModal;