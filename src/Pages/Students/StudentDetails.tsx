import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import api from '../../api/api';
import type { StudentDetailsResponse } from '../../api/types';
import AdmitStudentModal from '../../components/Student/AdmitStudentModal';

const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdmitModal, setShowAdmitModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStudent();
    }
  }, [id]);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const response = await api.getStudentById(id!);
      setStudent(response);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async (formData: unknown) => {
    if (!student) return;
    try {
      await api.admitStudent(student.student.id, formData);
      fetchStudent(); // Refresh
    } catch (error) {

    }
  };

  const openAdmitModal = () => {
    setShowAdmitModal(true);
  };

  const closeAdmitModal = () => {
    setShowAdmitModal(false);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!student) {
    return <div className="p-6">Student not found</div>;
  }

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <button
          onClick={() => navigate('/students-home')}
          className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Student Details
          </h1>
          <p className="text-slate-500 mt-2">
            View and manage student information
          </p>
        </div>
      </header>

      <main className="bg-white p-6 rounded-2xl shadow border border-slate-100">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600">First Name</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.firstName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Middle Name</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.middleName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Last Name</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.lastName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Father Name</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.fatherName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Mother Name</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.motherName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Gender</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.gender}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Phone</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.phone}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Email</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Address</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Disability</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.disability ? 'Yes' : 'No'}</p>
          </div>
          {student.student.disability && (
            <div>
              <label className="block text-sm font-medium text-slate-600">Disability Description</label>
              <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.disabilityDescription || 'N/A'}</p>
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600">Comments</label>
            <p className="mt-1 text-lg font-semibold text-slate-900">{student.student.comments || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Status</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              student.student.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
              student.student.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {student.student.status}
            </span>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={openAdmitModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <UserPlus size={16} className="mr-2" />
            Admission
          </button>
        </div>
      </main>

      {showAdmitModal && (
        <AdmitStudentModal
          student={student.student}
          onClose={closeAdmitModal}
          onAdmit={handleAdmit}
        />
      )}

      {/* Academics Section */}
      <section className="bg-white p-6 rounded-2xl shadow border border-slate-100">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Academic Records</h2>
        {student.academics.length === 0 ? (
          <p className="text-slate-500">No academic records found.</p>
        ) : (
          <div className="space-y-4">
            {student.academics.map((academic) => (
              <div key={academic.id} className="border border-slate-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Session</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.sessionName || academic.sessionId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Class</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.className || academic.classId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Section</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.sectionName || academic.sectionId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Course</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.courseName || academic.courseId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Admission ID</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.admissionId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Roll No</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.rollNo || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Transport Opted</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.transportOpted ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Transport Zone</label>
                    <p className="mt-1 text-sm text-slate-900">{academic.transportZoneId || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentDetails;
