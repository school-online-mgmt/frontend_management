import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";
import BackButton from "../../components/common/BackButton";

import UpdateExamModal from "../../components/Exam/UpdateExamModal";
import ScheduleExamModal from "../../components/Exam/ScheduleExamModal";
import AddSyllabusModal from "../../components/Exam/AddSyllabusModal";
import AddQuestionPaperModal from "../../components/Exam/AddQuestionPaperModal";

const ExamDetails = () => {

    const { examId } = useParams() as { examId: string };

    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [editOpen, setEditOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [syllabusOpen, setSyllabusOpen] = useState(false);
    const [qpOpen, setQpOpen] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

    const fetchExam = async () => {
        try {
            const data = await api.getExamById(examId);
            setExam(data);
        } catch {
            setExam(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExam();
    }, []);

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div className="p-8 space-y-6">

            {message && (
                <div className={`p-4 rounded-xl border ${
                    messageType === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                }`}>
                    {message}
                </div>
            )}

            <BackButton />

            <div className="flex justify-between">
                <h1 className="text-2xl font-bold">{exam.examName}</h1>

                <div className="flex gap-2">
                    <button onClick={() => setEditOpen(true)} className="border px-3 py-1 rounded">
                        Edit
                    </button>

                    <button onClick={() => setScheduleOpen(true)}
                            className="bg-emerald-600 text-white px-3 py-1 rounded">
                        Schedule
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="bg-white p-4 rounded-xl border grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <p>{exam.status}</p>
                </div>

                <div>
                    <p className="text-sm text-slate-500">Exam Date</p>
                    <p>{exam.examDate ? new Date(exam.examDate).toLocaleString() : "-"}</p>
                </div>

                <div>
                    <p className="text-sm text-slate-500">Full Marks</p>
                    <p>{exam.fullMarks}</p>
                </div>
            </div>

            {/* Syllabus */}
            <div className="bg-white p-4 rounded-xl border">
                <h2 className="font-semibold">Syllabus</h2>
                <p>{exam.syllabus || "Not added"}</p>

                <button onClick={() => setSyllabusOpen(true)} className="text-emerald-600 mt-2">
                    Add / Update
                </button>
            </div>

            {/* Question Paper */}
            <div className="bg-white p-4 rounded-xl border">
                <h2 className="font-semibold">Question Paper</h2>
                <p>{exam.questionPaper || "Not added"}</p>

                <button onClick={() => setQpOpen(true)} className="text-emerald-600 mt-2">
                    Add / Update
                </button>
            </div>

            {/* Modals */}
            {editOpen && (
                <UpdateExamModal exam={exam} onClose={() => setEditOpen(false)}
                                 onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType}/>
            )}

            {scheduleOpen && (
                <ScheduleExamModal examId={exam.id} onClose={() => setScheduleOpen(false)}
                                   onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType}/>
            )}

            {syllabusOpen && (
                <AddSyllabusModal examId={exam.id} onClose={() => setSyllabusOpen(false)}
                                  onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType}/>
            )}

            {qpOpen && (
                <AddQuestionPaperModal examId={exam.id} onClose={() => setQpOpen(false)}
                                       onRefresh={fetchExam} setMessage={setMessage} setMessageType={setMessageType}/>
            )}

        </div>
    );
};

export default ExamDetails;