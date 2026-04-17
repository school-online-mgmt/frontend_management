import { useState, useEffect } from "react";
import { RefreshCcw, CheckCircle, Edit, Users, Mail, Phone } from "lucide-react";
import api from "../../api/api";
import UpdateStudentModal from "../../components/Student/UpdateStudentModal";
import ConfirmAdmissionModal from "../../components/Student/ConfirmAdmissionModal";
import Button from "../../components/common/Button";
import { Card, CardContent, Badge, EmptyState } from "../../components/common/FormComponents";
import { PageWrapper, PageContent, PageHeader, Section } from "../../components/common/PageWrappers";

const StudentHome = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<unknown>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<unknown>(null);
    const [viewType, setViewType] = useState<'grid' | 'table'>('grid');

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const data = await api.getAppliedStudents();
            setStudents(Array.isArray(data) ? data : []);
        } catch (error) {

            setStudents([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleUpdate = (student: unknown) => {
        setSelectedStudent(student);
        setIsUpdateModalOpen(true);
    };

    const handleConfirm = (applicant: unknown) => {
        setSelectedApplicant(applicant);
        setIsConfirmModalOpen(true);
    };

    const handleAdmissionConfirm = async (data: unknown) => {
        if (!selectedApplicant) return;
        try {
            await api.confirmStudentAdmission(selectedApplicant.id, data);
            fetchStudents();
        } catch (error) {

        } finally {
            setIsConfirmModalOpen(false);
        }
    };

    return (
        <PageWrapper>
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

            <PageContent>
                <PageHeader
                    title="Student Admissions"
                    subtitle="Review and manage student applications"
                    actions={
                        <Button
                            variant="secondary"
                            icon={<RefreshCcw size={18} />}
                            isLoading={isLoading}
                            onClick={fetchStudents}
                        >
                            Refresh
                        </Button>
                    }
                />

                <Section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="text-sm text-slate-600">
                            Found <span className="font-bold text-slate-900">{students.length}</span> applications
                        </div>
                        <div className="flex gap-2 border border-slate-200 rounded-lg p-1">
                            <button
                                onClick={() => setViewType('grid')}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewType === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewType('table')}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewType === 'table' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Table
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
                        </div>
                    ) : students.length === 0 ? (
                        <EmptyState
                            icon={<Users size={48} />}
                            title="No Applications Yet"
                            description="No student applications have been submitted"
                        />
                    ) : viewType === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {students.map((student: unknown) => (
                                <Card key={student.id} hoverable bordered>
                                    <CardContent>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                                    {(student.firstName?.charAt(0) || 'S').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {student.firstName} {student.lastName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{student.middleName}</p>
                                                </div>
                                            </div>
                                            <Badge variant="info">Pending</Badge>
                                        </div>

                                        <div className="space-y-3 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Mail size={14} className="text-slate-400" />
                                                {student.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone size={14} className="text-slate-400" />
                                                {student.phone}
                                            </div>
                                        </div>

                                        <div className="text-sm mb-4">
                                            <span className="text-slate-600">Gender: </span>
                                            <span className="font-semibold text-slate-900">{student.gender}</span>
                                        </div>
                                    </CardContent>
                                    <div className="border-t border-slate-100 px-6 py-3 flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={<Edit size={14} />}
                                            onClick={() => handleUpdate(student)}
                                            fullWidth
                                        >
                                            Update
                                        </Button>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            icon={<CheckCircle size={14} />}
                                            onClick={() => handleConfirm(student)}
                                            fullWidth
                                        >
                                            Confirm
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card hoverable bordered>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Student</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Gender</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students.map((student: unknown) => (
                                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                            {(student.firstName?.charAt(0) || 'S').toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{student.firstName} {student.lastName}</p>
                                                            <p className="text-xs text-slate-500">{student.middleName}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{student.phone}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{student.gender}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => handleUpdate(student)}
                                                        >
                                                            <Edit size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            onClick={() => handleConfirm(student)}
                                                        >
                                                            <CheckCircle size={14} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </Section>
            </PageContent>
        </PageWrapper>
    );
};

export default StudentHome;
