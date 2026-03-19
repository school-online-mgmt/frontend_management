export interface Applicant {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  gender: string;
  phone: string;
  address: string;
  email: string;
  disability: boolean;
  disabilityDescription?: string;
  comments?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface Student {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  gender: string;
  phone: string;
  address: string;
  email: string;
  disability: boolean;
  disabilityDescription?: string;
  comments?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface Academics {
  id: string;
  studentId: string;
  sessionId: string;
  classId?: string;
  sectionId?: string;
  courseId?: string;
  admissionId?: string;
  rollNo?: string;
  transportOpted: boolean;
  transportZoneId?: string;
  tenantId: string;
  admittedBy?: string;
  createdAt: string;
  updatedAt: string;
  sessionName?: string;
  className?: string;
  sectionName?: string;
  courseName?: string;
}

export interface StudentDetailsResponse {
  student: Student;
  academics: Academics[];
}
