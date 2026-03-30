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

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  qualification: string;
  specialization: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  bookName: string;
  description?: string;
  sessionId?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  name: string;
  slug: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  classId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectTeacher {
  id: string;
  subjectId: string;
  teacherId: string;
  subject?: Subject;
  teachers?: Teacher;
}

export interface CourseSubject {
  id: string;
  courseId: string;
  subjectId: string;
  course?: any;
  subject?: Subject;
}

export type ExamStatus = 'AWAITING_SYLLABUS' | 'AWAITING_EXAM_DATE' | 'EXAM_CONDUCTED' | 'AWAITING_RESULT' | 'PUBLISHED' | 'AWAITING_DATE_SCHEDULING';

export interface ExamPaper {
  id: string;
  name: string;
  examTerm: string;
  examName: string;
  sessionId: string;
  subjectId: string;
  teacherId: string;
  examDate?: Date;
  status: ExamStatus;
  syllabus?: string;
  fullMarks: number;
  markingSystem: 'MARKS' | 'GRADE';
  questionPaper?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface ExamResult {
  id: string;
  examPaperId: string;
  studentId: string;
  academicId: string;
  marks?: number;
  remarks?: string;
  submittedBy?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  studentName?: string;
  studentRollNo?: string;
}
