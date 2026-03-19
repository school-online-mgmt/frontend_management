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
  sessionId?: string;
  transportOpted: boolean;
  transportZoneId?: string;
  admissionId?: string;
  rollNo?: string;
  classId?: string;
  sectionId?: string;
  courseId?: string;
}
