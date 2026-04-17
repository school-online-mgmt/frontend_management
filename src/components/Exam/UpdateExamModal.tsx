import { useState } from "react";
import api from "../../api/api";

const UpdateExamModal = ({
     exam,
     onClose,
     onRefresh,
     setMessage,
     setMessageType
 }: any) => {

    const [name, setName] = useState(exam.name || "");
    const [fullMarks, setFullMarks] = useState(exam.fullMarks || "");
    const [markingSystem, setMarkingSystem] = useState(exam.markingSystem || "MARKS");
    const [examDate, setExamDate] = useState(
        exam.examDate ? new Date(exam.examDate).toISOString().slice(0, 16) : ""
    );
    const [syllabus, setSyllabus] = useState(exam.syllabus || null);
    const [questionPaper, setQuestionPaper] = useState(exam.questionPaper || null);

    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const payload: any = {};

        if (name !== exam.name) payload.name = name;
        if (Number(fullMarks) !== exam.fullMarks) payload.fullMarks = Number(fullMarks);
        if (markingSystem !== exam.markingSystem) payload.markingSystem = markingSystem;
        if (syllabus !== exam.syllabus) payload.syllabus = syllabus;
        if (questionPaper !== exam.questionPaper) payload.questionPaper = questionPaper;

        if (examDate) payload.examDate = new Date(examDate);

        if (Object.keys(payload).length === 0) {
            setMessage("No changes made");
            setMessageType("error");
            return;
        }

        try {
            setLoading(true);

            await api.updateExam(exam.id, payload);

            setMessage("Exam updated successfully");
            setMessageType("success");

            onRefresh();
            onClose();

        } catch (err: any) {
            setMessage(err?.response?.data?.message || "Update failed");
            setMessageType("error");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
            <div className="bg-white rounded-xl w-[520px] p-6 space-y-4">

                <h2 className="text-xl font-bold">Edit Exam</h2>

                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Exam Name"
                    className="w-full border p-2 rounded-lg"
                />

                <input
                    type="number"
                    value={fullMarks}
                    onChange={(e) => setFullMarks(Number(e.target.value))}
                    placeholder="Full Marks"
                    className="w-full border p-2 rounded-lg"
                />

                <select
                    value={markingSystem}
                    onChange={(e) => setMarkingSystem(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                >
                    <option value="MARKS">MARKS</option>
                    <option value="GRADE">GRADE</option>
                </select>

                <input
                    type="datetime-local"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                />

                <textarea
                    value={syllabus}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSyllabus(value.trim() === "" ? null : value);
                    }}
                    placeholder="Syllabus"
                    className="w-full border p-2 rounded-lg"
                />

                <textarea
                    value={questionPaper}
                    onChange={(e) => {
                        const value = e.target.value;
                        setQuestionPaper(value.trim() === "" ? null : value);
                    }}
                    placeholder="Question Paper"
                    className="w-full border p-2 rounded-lg"
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose}>Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
                    >
                        {loading ? "Updating..." : "Update"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default UpdateExamModal;