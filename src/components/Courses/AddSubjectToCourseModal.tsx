import { useEffect, useState } from "react";
import api from "../../api/api";

const AddSubjectToCourseModal = ({ course, onClose, onRefresh, showMessage }: any) => {

    const [subjects, setSubjects] = useState<any[]>([]);
    const [subjectId, setSubjectId] = useState("");

    useEffect(() => {
        const loadSubjects = async () => {
            const data = await api.getSubjects();
            setSubjects(data.subjects || []);
        };

        loadSubjects();
    }, []);

    const existingIds =
        course.subjects?.map((subject: any) => subject.id) || [];

    const availableSubjects = subjects.filter(
        (s: any) => s.sessionId === course.sessionId && !existingIds.includes(s.id)
    );

    const handleAdd = async () => {
        try {
            const response = await api.addSubjectToCourse(course.id, subjectId);
            if (response?.courseSubject) {
                showMessage(
                    "success",
                    "Subject added successfully"
                );
            onRefresh();
            onClose();
            } else {
                showMessage(
                    "error",
                    "Failed to add subject"
                );
            }
        } catch {
            alert("Failed to add subject");
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 flex justify-center items-center"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl p-6 w-[450px]"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-4">
                    Add Subject to {course.name}
                </h2>
                <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full border p-2 rounded-lg mb-4"
                >
                    <option value="">Select Subject</option>

                    {availableSubjects.map((s: any) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-3 py-2 bg-gray-100 rounded-lg"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleAdd}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg"
                    >
                        Add Subject
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSubjectToCourseModal;