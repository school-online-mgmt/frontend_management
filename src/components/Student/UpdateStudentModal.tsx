import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import api from "../../api/api";

interface UpdateStudentModalProps {
    student: any;
    onClose: () => void;
    onRefresh: () => void;
}

const UpdateStudentModal = ({ student, onClose, onRefresh }: UpdateStudentModalProps) => {
    const [formData, setFormData] = useState({
        sessionId: student.sessionId || "",
        transportOpted: student.transportOpted || false,
        transportZoneId: student.transportZoneId || "",
        admissionId: student.admissionId || "",
        rollNo: student.rollNo || "",
        classId: student.classId || "",
        sectionId: student.sectionId || "",
        courseId: student.courseId || "",
    });
    const [sessions, setSessions] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionsData, classesData, sectionsData, coursesData] = await Promise.all([
                    api.getSessions(),
                    api.getClasses(),
                    api.getSections(),
                    api.getCourses(),
                ]);
                setSessions(sessionsData);
                setClasses(classesData);
                setSections(sectionsData);
                setCourses(coursesData);
            } catch (error) {

            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.updateStudent(student.id, formData);
            onRefresh();
            onClose();
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">
                            Update Student Details
                        </h2>
                        <button data-testid="update-student-modal-close-btn"
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Session
                            </label>
                            <select data-testid="update-student-modal-change-select"
                                name="sessionId"
                                value={formData.sessionId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Select Session</option>
                                {sessions.map(session => (
                                    <option key={session.id} value={session.id}>
                                        {session.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Admission ID
                            </label>
                            <input data-testid="update-student-modal-change-input"
                                type="text"
                                name="admissionId"
                                value={formData.admissionId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Roll Number
                            </label>
                            <input data-testid="update-student-modal-change-input-2"
                                type="text"
                                name="rollNo"
                                value={formData.rollNo}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Class
                            </label>
                            <select data-testid="update-student-modal-change-select-2"
                                name="classId"
                                value={formData.classId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Select Class</option>
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Section
                            </label>
                            <select data-testid="update-student-modal-change-select-3"
                                name="sectionId"
                                value={formData.sectionId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Select Section</option>
                                {sections.map(section => (
                                    <option key={section.id} value={section.id}>
                                        {section.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Course
                            </label>
                            <select data-testid="update-student-modal-change-select-4"
                                name="courseId"
                                value={formData.courseId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Select Course</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center">
                            <input data-testid="update-student-modal-change-checkbox"
                                type="checkbox"
                                name="transportOpted"
                                checked={formData.transportOpted}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-slate-700">
                                Opt for Transport
                            </label>
                        </div>

                        {formData.transportOpted && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Transport Zone
                                </label>
                                <input data-testid="update-student-modal-change-input-3"
                                    type="text"
                                    name="transportZoneId"
                                    value={formData.transportZoneId}
                                    onChange={handleChange}
                                    placeholder="Transport Zone ID"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button data-testid="update-student-modal-close-btn-2"
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save size={16} />
                            {isLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateStudentModal;
