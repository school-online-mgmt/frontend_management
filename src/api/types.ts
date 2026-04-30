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
  phone?: string;
  email?: string;
  address?: string;
  gender: string;
  age: number;
  qualification: string;
  isActive: boolean;
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
  type: string;
  teacherId?: string;
  teacherName?: string;
  isActive: boolean;
  sessionId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  tenantId: string;
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  classId: string;
  teacherId?: string;
  isActive: boolean;
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

export interface Course {
  id: string;
  slug: string;
  name: string;
  description?: string;
  classId: string;
  sessionId: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSubject {
  id: string;
  courseId: string;
  subjectId: string;
  course?: Course;
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
  attendanceStatus?: string;
  marks?: number;
  remarks?: string;
  submittedBy?: string;
  submittedAt?: string;
  isPublished: boolean;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  studentName?: string;
  studentRollNo?: string;
}

export interface CreateClassData {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateTeacherData {
  name?: string;
  gender?: string;
  age?: number;
  qualification?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
  password?: string;
}

export interface UpdateExamPayload {
  examTerm?: string;
  examName?: string;
  fullMarks?: number;
  examDate?: string;
  syllabus?: string;
  questionPaper?: string;
}

export interface UpdateSchoolEventData {
  title?: string;
  description?: string;
  type?: string;
  date?: string;
  endDate?: string;
}

export interface UpdateLibraryBookData {
  title?: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  genre?: string;
  description?: string;
  coverImageUrl?: string;
  rackNumber?: string;
  totalCopies?: number;
  isEnabled?: boolean;
  requiresApproval?: boolean;
  restrictedToClassIds?: string[];
}

// ── Admit Cards ──────────────────────────────────────────────────────────────

export type ExamTerm = "TERM1" | "TERM2" | "TERM3";

export interface AdmitCardRelease {
  id: string;
  tenantId: string;
  sessionId: string;
  examTerm: ExamTerm;
  examName: string | null;
  notes: string | null;
  publishedBy: string | null;
  publishedAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishAdmitCardPayload {
  sessionId: string;
  examTerm: ExamTerm;
  examName?: string;
  notes?: string;
}

// ── Invoice Generation Result (extended) ─────────────────────────────────────

export interface GenerateInvoicesResult {
  generated: number;
  skipped: number;
  total: number;
  lateFeesApplied: number;
  errors: number;
}

// ── Fee Structure ─────────────────────────────────────────────────────────────

export type FeeItemType = 'TUITION' | 'TRANSPORT' | 'LIBRARY' | 'LAB' | 'SPORTS' | 'COMPUTER' | 'DEVELOPMENT' | 'EXAM' | 'ADMISSION' | 'BOOKS' | 'UNIFORM' | 'ID_CARD' | 'MISC';
export type FeeScope     = 'GLOBAL' | 'CLASS' | 'COURSE';
export type FeeFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'ONE_TIME';

export interface FeeStructureItem {
  id: string;
  name: string;
  feeType: FeeItemType;
  scope: FeeScope;
  classId: string | null;
  className: string | null;
  courseId: string | null;
  courseName: string | null;
  amount: number;
  frequency: FeeFrequency;
  isOptional: boolean;
  description: string | null;
  sortOrder: number;
  createdAt: string;
}

// ── Teacher Application ───────────────────────────────────────────────────────

export interface TeacherApplication {
  id: string;
  name: string;
  gender: string;
  age: number | null;
  qualification: string;
  experienceYears: number | null;
  phone: string;
  email: string | null;
  address: string | null;
  subjectsInterested: string | null;
  message: string | null;
  status: 'APPLIED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';
  comments: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}
