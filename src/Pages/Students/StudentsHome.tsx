import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import type { Student } from '../../api/types';
import AdmitStudentModal from '../../components/Student/AdmitStudentModal';

const StudentsHome: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAdmitModal, setShowAdmitModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.getStudents();
      setStudents(response);
    } catch (error) {
      console.error('Failed to fetch students', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async (formData: any) => {
    if (!selectedStudent) return;
    try {
      await api.admitStudent(selectedStudent.id, formData);
      fetchStudents(); // Refresh list
    } catch (error) {
      console.error('Failed to admit student', error);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Students</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {students.map((student) => (
            <div key={student.id} className="border p-4 rounded">
              <h2 className="text-lg font-semibold">
                {student.firstName} {student.middleName} {student.lastName}
              </h2>
              <p>Phone: {student.phone}</p>
              <p>Email: {student.email}</p>
              <p>Status: {student.status}</p>
              <div className="mt-2 flex gap-2">
                {student.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => openAdmitModal(student)}
                    className="bg-blue-500 text-white px-4 py-2"
                  >
                    Admit Student
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
