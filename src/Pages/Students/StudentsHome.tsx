import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, UserPlus, GraduationCap } from 'lucide-react';
import api from '../../api/api';
import type { Student } from '../../api/types';
import AdmitStudentModal from '../../components/Student/AdmitStudentModal';

const StudentsHome: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.getStudents();
      setStudents(response);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async (formData: unknown) => {
    if (!selectedStudent) return;
    try {
      await api.admitStudent(selectedStudent.id, formData);
      fetchStudents(); // Refresh list
    } catch (error) {

    }
  };

  const openAdmitModal = (student: Student) => {
    setSelectedStudent(student);
    setShowAdmitModal(true);
  };

  const closeAdmitModal = () => {
    setShowAdmitModal(false);
    setSelectedStudent(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'ALUMNI': return 'bg-blue-100 text-blue-800';
      case 'GRADUATED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Student Management
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Manage enrolled students and their academic details
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main>
        <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-700">
              All Students ({students.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-sm font-semibold uppercase">Name</th>
                  <th className="p-4 text-sm font-semibold uppercase">Phone</th>
                  <th className="p-4 text-sm font-semibold uppercase">Email</th>
                  <th className="p-4 text-sm font-semibold uppercase">Status</th>
                  <th className="p-4 text-sm font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-16 text-slate-500">
                      <RefreshCcw size={18} className="animate-spin inline mr-2" />
                      Loading students...
                    </td>
                  </tr>
                ) : students.length > 0 ? (
                  students.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => navigate(`/student/${student.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <GraduationCap size={20} />
                        </div>
                        {student.firstName} {student.middleName} {student.lastName}
                      </td>
                      <td className="p-4 text-slate-600">{student.phone}</td>
                      <td className="p-4 text-slate-600">{student.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {student.status === 'IN_PROGRESS' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAdmitModal(student);
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                          >
                            <UserPlus size={14} className="mr-1" />
                            Admission
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-16 text-slate-500">
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showAdmitModal && selectedStudent && (
        <AdmitStudentModal
          student={selectedStudent}
          onClose={closeAdmitModal}
          onAdmit={handleAdmit}
        />
      )}
    </div>
  );
};

export default StudentsHome;
