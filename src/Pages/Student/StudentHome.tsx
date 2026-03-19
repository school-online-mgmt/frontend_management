import { useState, useEffect } from "react";
import { RefreshCcw, User, CheckCircle, Edit } from "lucide-react";
import api from "../../api/api";
import UpdateStudentModal from "../../components/Student/UpdateStudentModal";
import ConfirmAdmissionModal from "../../components/Student/ConfirmAdmissionModal";

const StudentHome = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<any>(null);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const data = await api.getAppliedStudents();
            setStudents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching applied students", error);
            setStudents([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleUpdate = (student: any) => {
        setSelectedStudent(student);
        setIsUpdateModalOpen(true);
    };

    const handleConfirm = (applicant: any) => {
        setSelectedApplicant(applicant);
        setIsConfirmModalOpen(true);
    };

    const handleAdmissionConfirm = async (data: any) => {
        if (!selectedApplicant) return;
        try {
            await api.confirmStudentAdmission(selectedApplicant.id, data);
            fetchStudents(); // Refresh list
        } catch (error) {
            console.error("Error confirming admission", error);
        } finally {
            setIsConfirmModalOpen(false);
        }
    };

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
            {isUpdateModalOpen && selectedStudent && (
                <UpdateStudentModal
                    student={selectedStudent}
                    onClose={() => setIsUpdateModalOpen(false)}
                    onRefresh={fetchStudents}
                />
            )}

            {isConfirmModalOpen && selectedApplicant && (
                <ConfirmAdmissionModal
                    applicant={selectedApplicant}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleAdmissionConfirm}
                />
            )}

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Student Admissions
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Review and manage student applications
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchStudents}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </header>

            <main>
                <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <User size={20} className="text-slate-400" />
                            Applied Students
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500">Student Name</th>
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500">Email</th>
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500">Phone</th>
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500">Gender</th>
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center p-16 text-slate-500">
                                            <RefreshCcw size={18} className="animate-spin inline mr-2" />
                                            Loading students...
                                        </td>
                                    </tr>
                                ) : students.length > 0 ? (
                                    students.map((student: any) => (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-slate-50 transition"
                                        >
                                            <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                    <User size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{student.firstName} {student.middleName} {student.lastName}</span>
                                                    <span className="text-xs font-mono text-slate-400 font-normal">
                                                        {student.id.split('-')[0]}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {student.email}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {student.phone}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {student.gender}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleUpdate(student)}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                                                    >
                                                        <Edit size={14} />
                                                        Update
                                                    </button>
                                                    <button
                                                        onClick={() => handleConfirm(student)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                                                    >
                                                        <CheckCircle size={14} />
                                                        Confirm
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center p-16 text-slate-500">
                                            No applied students
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentHome;
