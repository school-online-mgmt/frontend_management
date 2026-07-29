import axios from 'axios';
import type {
    CreateClassData,
    UpdateTeacherData,
    UpdateExamPayload,
    UpdateSchoolEventData,
    UpdateLibraryBookData,
    AdmitCardRelease,
    PublishAdmitCardPayload,
    GenerateInvoicesResult,
    TeacherApplication,
    FeeStructureItem,
} from './types';

// Create an Axios instance with a base URL from environment variables
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_HOST,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sessions/cookies
});

// Store the logout callback to be set by AuthProvider
let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (callback: () => void) => {
    logoutCallback = callback;
};

// Set by AuthProvider — fires when the backend reports the user must change
// their password before doing anything else (403 PASSWORD_CHANGE_REQUIRED).
let passwordChangeRequiredCallback: (() => void) | null = null;

export const setPasswordChangeRequiredCallback = (callback: () => void) => {
    passwordChangeRequiredCallback = callback;
};

// Add a response interceptor to handle global errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't trigger logout for verifyAuth — it's used to CHECK auth, not make real API calls.
    // A 401 there just means "not authenticated yet"; the AuthContext handles that state.
    const url: string = error.config?.url ?? '';
    const isAuthCheck = url.includes('/management/auth/verifyAuth');
    const status = error.response?.status;

    // A forced password change surfaces as a 403 on every gated route. Flip the
    // app into the change-password screen rather than logging the user out —
    // they are authenticated, just not yet allowed further.
    if (status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      passwordChangeRequiredCallback?.();
      return Promise.reject(error);
    }

    if (status === 401 && !isAuthCheck) {
      if (logoutCallback) {
          logoutCallback();
      }
    }
    return Promise.reject(error);
  }
);

/** Per-sub-activity email gates (#8) — one row per module, with its triggers. */
export interface EmailActivitySettingsResponse {
  serviceEnabled: boolean;
  modules: Array<{
    module: string;
    enabled: boolean;
    activities: Array<{ key: string; label: string; enabled: boolean; inherited: boolean }>;
  }>;
}

export interface StaffRoleDef {
  type: 'BUILTIN' | 'CUSTOM';
  key: string;
  name: string;
  description: string;
  permissions: Array<{ module: string; level: 'READ' | 'ADMIN' }>;
}

class API {
  // --- Authentication APIs ---
  login = async (phone: string, password: string) => {
    const response = await apiClient.post('/management/auth/login', {phone, password});
    return response.data;
  };
  // Platform-admin support access: a super-admin signs in with their own email +
  // password and is logged in AS this school's ADMIN. Tenant resolved by origin.
  superAdminLogin = async (email: string, password: string) => {
    const response = await apiClient.post('/management/auth/superadmin-login', { email, password });
    return response.data;
  };
  checkAuth = async () => {
    const response = await apiClient.get('/management/auth/verifyAuth');
    return response.data;
  };

  logout = async () => {
    const response = await apiClient.post('/management/auth/logout');
    return response.data;
  };

  refreshToken = async () => {
    const response = await apiClient.post('/management/auth/refresh');
    return response.data;
  };

  // --- Subject APIs ---
  getSubjects = async (payload?:{
      courseId?: string;
      classId?: string;
      sessionId?: string;
      active?: boolean;
      onlyWithTeacher?: boolean;
  }) => {
    const response = await apiClient.get('/management/subject',{
        params: payload
    });
    return response.data.subjects;
  };
  getSubjectById = async (id: string) => {
    const response = await apiClient.get(`/management/subject/${id}`);
    return response.data;
  };
  // Sections where this subject is taught (subject → its courses → their classes
  // → sections). Powers the teacher-onboarding section picker.
  getSubjectSections = async (id: string): Promise<{ sections: { id: string; name: string; classId: string; className: string }[] }> => {
    const response = await apiClient.get(`/management/subject/${id}/sections`);
    return response.data;
  };
  createSubject = async (subjectData: { name: string, slug: string, bookName: string, sessionId: string, type?: string, teacherId?: string }) => {
    const response = await apiClient.post('/management/subject/create', subjectData);
    return response.data;
};
 deleteSubject = async (id: string) => {
    const response = await apiClient.delete(`/management/subject/${id}`);
    return response.data;
};
  // --------Course APIs-----------
  // Get all courses
  getCourses = async (payload?:{
      sessionId?:string
  }) => {
      const response = await apiClient.get("/management/course", {
          params: payload
      });
    return response.data.courses;
  };

// Get course by id OR slug
  getCourseById = async (id_or_slug: string) => {
    const response = await apiClient.get(
        `/management/course/${id_or_slug}`
    );
    return response.data;
  };

// Create course
  createCourse = async (courseData: {
    slug: string;
    name: string;
    description: string;
    classId: string;
    sessionId: string;
  }) => {
    const response = await apiClient.post(
        "/management/course/create",
        courseData
    );
    return response.data;
  };

// Update course
  updateCourse = async (
      id: string,
      courseData: {
        slug?: string;
        name?: string;
        description?: string;
        classId?: string;
      }
  ) => {
    const response = await apiClient.patch(
        `/management/course/${id}/update`,
        courseData
    );
    return response.data;
  };

// Delete course
  deleteCourse = async (id: string) => {
    const response = await apiClient.delete(
        `/management/course/${id}/delete`
    );
    return response.data;
  };


// Add subject to course
  addSubjectToCourse = async (
      courseId: string,
      subjectId: string
  ) => {
    const response = await apiClient.post(
        `/management/course/${courseId}/addSubject`,
        { subjectId }
    );
    return response.data;
  };


// Remove subject from course
  removeSubjectFromCourse = async (
      courseId: string,
      subjectId: string
  ) => {
    const response = await apiClient.delete(
        `/management/course/${courseId}/removeSubject`,
        {
          data: { subjectId },
        }
    );
    return response.data;
  };

  // ----------Classes APIs----------

  // Get All Classes (optionally scoped to a session).
  getClasses = async (sessionId?: string) => {
    const params = sessionId ? { sessionId } : undefined;
    const response = await apiClient.get("/management/class", { params });
    return response.data.classes;
  };

  // Get Class By ID or Slug
  getClassById = async (id: string) => {
    const response = await apiClient.get(`/management/class/${id}`);
    return response.data;
  };

  // Create class
  createClass = async (data: CreateClassData) => {
    const response = await apiClient.post("/management/class/create", data);
    return response.data;
  };

  // Add section to class
  createSection = async (
    classId: string,
    sectionData :{
      name: string;
      slug: string;
      teacherId?: string;
}) => {
    const response = await apiClient.post(
        `/management/class/${classId}/createSection`, sectionData
    );
    return response.data;
  };


  // -----------Section APIs------------
  // Get all Sections
  getSections = async () => {
    const response = await apiClient.get("/management/section");
    return response.data.sections;
};

  // Get staff assignment gaps (classes/sections/subjects without teacher)
  getStaffGaps = async (): Promise<{
    classGaps: { id: string; name: string; slug: string }[];
    sectionGaps: { id: string; name: string; slug: string; classId: string; class: { id: string; name: string } }[];
    subjectGaps: { sectionId: string; sectionName: string; classId: string; className: string; subjectId: string; subjectName: string }[];
    totalSubjectSectionPairs: number;
  }> => {
    const response = await apiClient.get("/management/dashboard/staff-gaps");
    return response.data;
  };

  getSchoolStats = async () => {
    const response = await apiClient.get("/management/dashboard/school-stats");
    return response.data as {
      students: { total: number; active: number; withDisability: number; byGender: { gender: string; count: number }[]; byStatus: { status: string; count: number }[] };
      teachers: { total: number; active: number; byGender: { gender: string; count: number }[] };
      transport: { opted: number; notOpted: number; optedPercent: number; byZone: { zoneName: string; zonePrice: number; count: number }[] };
      ratios: { studentsPerTeacher: number };
      byClass: { className: string; count: number }[];
      currentSession: { id: string; name: string; startDate: string; endDate: string } | null;
    };
  };

//get All Sessions
getSessions= async () => {
    const response = await apiClient.get("/management/session");
    return response.data.sessions;
};

// Bulk insights for the sessions list page — one round trip returns
// counts of students / classes / sections / courses / subjects / exams
// plus calendar stats (elapsed days, weekends, holidays, attendance
// days), keyed by sessionId.
getSessionInsights = async (): Promise<{
    sessionId: string;
    students: number; activeStudents: number;
    classes: number; sections: number;
    courses: number; subjects: number;
    exams: number;
    attendanceDays: number;
    elapsedDays: number;
    weekendDays: number;
    holidayDays: number;
    workingDays: number;
}[]> => {
    const response = await apiClient.get("/management/session/insights");
    return response.data.insights ?? [];
};

// Create Session
createSession = async (body: {
    slug: string; name: string; startDate: string; endDate: string;
    description?: string; acceptAdmission?: boolean;
}) => {
    const response = await apiClient.post("/management/session/create", body);
    return response.data;
};

// Sessions are shared across every tenant on the platform. The session
// record itself (name, slug, dates) is superadmin-managed — so edit / delete
// / create stay as read-only stubs on the management side.
updateSession = async (_id: string, _body: unknown) => {
    throw new Error("Sessions are shared and read-only for management. Contact your EduPilots administrator.");
};
deleteSession = async (_id: string) => {
    throw new Error("Sessions are shared and read-only for management. Contact your EduPilots administrator.");
};

// Toggle acceptAdmission on this tenant's subscription for a given session.
// The only per-session setting management can flip themselves.
updateAcceptAdmission = async (id: string, acceptAdmission: boolean) => {
    const response = await apiClient.patch(`/management/session/${id}/accept-admission`, { acceptAdmission });
    return response.data;
};

// End-of-session lifecycle IS per-tenant: each school independently ends
// its participation. Backend flips the tenant's subscription row through
// ACTIVE → ENDING → ENDED. See Routes/Management/Session.ts.
initiateEndSession = async (id: string) => {
    const response = await apiClient.post(`/management/session/${id}/initiate-end`);
    return response.data as {
        message: string;
        sessionId: string;
        studentsToDecide: number;
    };
};
cancelEndSession = async (id: string) => {
    const response = await apiClient.post(`/management/session/${id}/cancel-end`);
    return response.data;
};

getEndSessionProgress = async (id: string) => {
    const response = await apiClient.get(`/management/session/${id}/end-progress`);
    return response.data as {
        session: { id: string; name: string; status: "ACTIVE" | "ENDING" | "ENDED"; endInitiatedAt: string | null; endedAt: string | null };
        totals: { pending: number; promote: number; holdBack: number; total: number };
        teachers: { teacherId: string | null; teacherName: string | null; total: number; pending: number; promote: number; holdBack: number }[];
        canEnd: boolean;
        insights: {
            perClass: { classId: string | null; className: string | null; total: number; promote: number; holdBack: number; pending: number; promoteRate: number }[];
            totalOutstanding: number;
            promotedBlockedByDues: number;
            avgHeldBackPct: number | null;
        };
    };
};

/** Management override of a single student's promotion decision (only while ENDING). */
overridePromotionDecision = async (sessionId: string, academicId: string, body: { decision: "PROMOTE" | "HOLD_BACK" | "PENDING"; note?: string }) => {
    const response = await apiClient.patch(`/management/session/${sessionId}/promotion/${academicId}`, body);
    return response.data as { message: string; academic: { id: string; promotionStatus: string } };
};

endSession = async (id: string) => {
    const response = await apiClient.post(`/management/session/${id}/end`);
    return response.data as {
        message: string;
        sessionId: string;
        promoted: number;
        heldBack: number;
    };
};

// Per-section review (acknowledgement is purely UI-side, no DB).
getEndSessionSections = async (id: string) => {
    const response = await apiClient.get(`/management/session/${id}/end-sections`);
    return response.data as {
        session: { id: string; name: string; status: "ACTIVE" | "ENDING" | "ENDED" };
        sections: {
            sectionId: string; sectionName: string | null;
            classId: string | null; className: string | null;
            teacherName: string | null;
            total: number; pending: number; promote: number; holdBack: number;
        }[];
    };
};

getEndSessionSectionDetail = async (id: string, sectionId: string) => {
    const response = await apiClient.get(`/management/session/${id}/end-sections/${sectionId}`);
    return response.data as {
        session: { id: string; name: string; status: "ACTIVE" | "ENDING" | "ENDED" };
        section: { id: string; name: string; className: string | null; teacherName: string | null };
        students: {
            academicId: string; studentId: string; rollNo: string | null;
            promotionStatus: "PENDING" | "PROMOTE" | "HOLD_BACK";
            decidedBy: string | null; decidedAt: string | null; decisionNote: string | null;
            decidedByName: string | null;
            firstName: string; lastName: string; gender: string | null;
        }[];
    };
};

bulkUpdateSectionDecisions = async (id: string, sectionId: string, body: {
    updates: { academicId: string; decision: "PROMOTE" | "HOLD_BACK" | "PENDING"; note?: string }[];
}) => {
    const response = await apiClient.patch(`/management/session/${id}/end-sections/${sectionId}/decisions`, body);
    return response.data;
};

addTeacherToSubject = async (subjectId: string, body: { teacherId: string, sectionId: string }) => {
    const response = await apiClient.post(`/management/subject/${subjectId}/teachers`, body);
    return response.data;
};

removeTeacherFromSubject = async (subjectId: string, body: { teacherId: string; sectionId?: string }) => {
    const response = await apiClient.delete(`/management/subject/${subjectId}/teachers`, { data: body });
    return response.data;
};

getSubjectTeachers = async (subjectId: string) => {
    const response = await apiClient.get(`/management/subject/${subjectId}/teachers`);
    return response.data;
};
getTeacherSubjects = async (teacherId: string) => {
    const response = await apiClient.get(`/management/teacher/${teacherId}/subjects`);
    return response.data;
};

updateSubject = async (id: string, data: { name?: string, slug?: string, bookName?: string, sessionId?: string, teacherId?: string | null, type?: string }) => {
    const response = await apiClient.patch(`/management/subject/${id}`, data);
    return response.data;
};

    // Get sections for a class
    getSectionsByClass = async (classId: string) => {
        const response = await apiClient.get(`/management/class/${classId}/sections`);
        return response.data.sections ?? response.data ?? [];
    };

    // Mid-term section transfer (P1-ACA-06) — move a student to another section
    // in the same class + session.
    transferStudentSection = async (studentId: string, data: { sessionId: string; toSectionId: string; rollNo?: string; reason?: string }) => {
        const res = await apiClient.post(`/management/student/${studentId}/transfer-section`, data);
        return res.data as { message: string; academics: any; fromSection: string; toSection: string };
    };

    // ── Notice Board APIs ─────────────────────────────────────────────────────

    /**
     * Pass a sessionId (positional shorthand) OR a params object. Most callers
     * use the shorthand to scope to the session selected on the page.
     */
    getNoticeBoards = async (
        sessionIdOrParams?: string | { sessionId?: string; visibility?: string; classId?: string },
    ) => {
        const params = typeof sessionIdOrParams === "string"
            ? { sessionId: sessionIdOrParams }
            : sessionIdOrParams;
        const res = await apiClient.get("/management/notice/boards", { params });
        return res.data;
    };

    createNoticeBoard = async (data: {
        sessionId: string;
        name: string; description?: string; visibility: string;
        classId?: string; sectionId?: string; approverId?: string;
    }) => {
        const res = await apiClient.post("/management/notice/boards/create", data);
        return res.data;
    };

    getNoticeBoardById = async (boardId: string) => {
        const res = await apiClient.get(`/management/notice/boards/${boardId}`);
        return res.data;
    };

    updateNoticeBoard = async (boardId: string, data: { name?: string; description?: string; approverId?: string; isActive?: boolean }) => {
        const res = await apiClient.patch(`/management/notice/boards/${boardId}/update`, data);
        return res.data;
    };

    deleteNoticeBoard = async (boardId: string) => {
        const res = await apiClient.delete(`/management/notice/boards/${boardId}`);
        return res.data;
    };

    getNoticeBoardNotices = async (boardId: string, params?: { status?: string }) => {
        const res = await apiClient.get(`/management/notice/boards/${boardId}/notices`, { params });
        return res.data;
    };

    createNotice = async (boardId: string, data: {
        title: string; body: string; startDateTime: string; endDateTime: string;
        priority?: string; publishDirectly?: boolean;
    }) => {
        const res = await apiClient.post(`/management/notice/boards/${boardId}/notices/create`, data);
        return res.data;
    };

    approveNotice = async (noticeId: string) => {
        const res = await apiClient.patch(`/management/notice/notices/${noticeId}/approve`);
        return res.data;
    };

    rejectNotice = async (noticeId: string, rejectionReason: string) => {
        const res = await apiClient.patch(`/management/notice/notices/${noticeId}/reject`, { rejectionReason });
        return res.data;
    };

    archiveNotice = async (noticeId: string) => {
        const res = await apiClient.patch(`/management/notice/notices/${noticeId}/archive`);
        return res.data;
    };

    updateNotice = async (noticeId: string, data: { title?: string; body?: string; startDateTime?: string; endDateTime?: string; priority?: string }) => {
        const res = await apiClient.patch(`/management/notice/notices/${noticeId}/update`, data);
        return res.data;
    };

    deleteNotice = async (noticeId: string) => {
        const res = await apiClient.delete(`/management/notice/notices/${noticeId}`);
        return res.data;
    };

    getPendingNotices = async () => {
        const res = await apiClient.get("/management/notice/notices/pending");
        return res.data;
    };

    getNoticeApproverOptions = async () => {
        const res = await apiClient.get("/management/notice/approver-options");
        return res.data;
    };

    // ── END Notice Board APIs ─────────────────────────────────────────────────

    // --- Student APIs ---
/**
 * Pass `sessionId` to filter applicants to a specific session, or "none" for
 * applicants with no session set (legacy rows pre-dating per-session admissions).
 * Omit to get all applicants for the tenant.
 */
getAppliedStudents = async (sessionId?: string) => {
    const params = sessionId ? { sessionId } : undefined;
    const response = await apiClient.get('/management/student/applied', { params });
    return response.data;
};

updateStudent = async (id: string, data: { sessionId: string, transportOpted: boolean, transportZoneId?: string, admissionId: string, rollNo: string, classId: string, sectionId: string, courseId: string }) => {
    const response = await apiClient.put(`/management/student/${id}`, data);
    return response.data;
};

confirmStudentAdmission = async (applicantId: string, data: { sessionId: string, classId: string, sectionId: string, courseId: string, admissionId: string, rollNo: string, transportOpted: boolean, transportZoneId?: string }) => {
    const response = await apiClient.post(`/management/student/confirm/${applicantId}`, data);
    return response.data;
};

// New methods for applicants and students  
getApplicantById = async (applicantId: string) => {
    const response = await apiClient.get(`/management/student/applied/${applicantId}`);
    return response.data;
};

searchApplicants = async (query: string) => {
    const response = await apiClient.get(`/management/student/search?query=${encodeURIComponent(query)}`);
    return response.data;
};

acceptApplication = async (applicantId: string) => {
    const response = await apiClient.post(`/management/student/accept/${applicantId}`);
    return response.data;
};

getStudents = async (subjectId?: string, sessionId?: string, bySession?: string) => {
    const response = await apiClient.get('/management/student/', {
        params: {
            ...(subjectId && { subjectId }),
            ...(sessionId && { sessionId }),
            ...(bySession && { bySession }),
        },
    });
    return response.data;
};

generateAdmissionInfo = async (sectionId?: string) => {
    const response = await apiClient.get('/management/student/generate-admission-info', {
        params: sectionId ? { sectionId } : {},
    });
    return response.data;
};

admitStudent = async (studentId: string, data: { sessionId: string, classId: string, sectionId: string, courseId: string, admissionId: string, rollNo: string, transportOpted: boolean, transportZoneId?: string }) => {
    const response = await apiClient.post(`/management/student/admit/${studentId}`, data);
    return response.data;
};

createStudent = async (data: {
    firstName: string; middleName?: string; lastName: string;
    fatherName: string; motherName: string; gender: string;
    phone: string; address: string; password: string;
    disability: boolean; disabilityDescription?: string;
    email: string; dateOfBirth: string; comments?: string;
    allergies?: string; medicalNotes?: string; bloodGroup?: string;
    emergencyContactName?: string; emergencyContactPhone?: string;
    // Parent login (P4-AC-12). When present, a parent account is created (or an
    // existing one linked) so the parent can sign into the student portal.
    parent?: {
        name: string; relation: "FATHER" | "MOTHER" | "GUARDIAN";
        phone: string; email?: string; occupation?: string; password: string;
    };
}) => {
    const response = await apiClient.post('/management/student/create', data);
    return response.data;
};

/**
 * Parent lookup by phone (P4-AC-12). Used by the admission form to reuse an
 * existing parent account for a 2nd/3rd child instead of creating a duplicate.
 */
lookupParent = async (phone: string): Promise<{
    found: boolean;
    parent: { id: string; name: string; relation: string; phone: string; email: string | null; occupation: string | null } | null;
    childCount?: number;
}> => {
    const response = await apiClient.get('/management/student/parent-lookup', { params: { phone } });
    return response.data;
};

    // Get school-wide exam overview (no classId required)
    getExamOverview = async (sessionId: string) => {
        const res = await apiClient.get("/management/exam/overview", { params: { sessionId } });
        return res.data;
    };

    // Get all exams
    getExams = async (payload: {
            sessionId: string,
            classId: string,
            courseId?: string,
            examTerm?: string
        }) => {
        const res = await apiClient.get("/management/exam",{
            params: payload});
        return res.data;
    };

    // Get Exam By ID
    getExamById = async (examId: string) => {
        const res = await apiClient.get(`/management/exam/${examId}`);
        return res.data;
    };

    // Create Exam
    createExam = async (payload: {
        examTerm: string;
        examName: string;
        sessionId: string;
        subjectIds: string[];
        fullMarks: number;
        /** In MARKS, not percent. Omit to inherit the platform default of 40%. */
        passMarks?: number;
    }) => {
        const res = await apiClient.post("/management/exam/create", payload);
        return res.data;
    };

    /**
     * The class teacher's overall comment for a child in one term. Written onto
     * every result row in that term so the report card finds it regardless of
     * which subjects are published. An empty string clears it.
     */
    setClassTeacherRemark = async (studentId: string, payload: {
        sessionId: string; examTerm: string; remark: string;
    }) => {
        const res = await apiClient.patch(`/management/exam/students/${studentId}/class-remark`, payload);
        return res.data as { message: string; updatedCount: number };
    };

    // Update Exam
    updateExam = async (examId: string, payload: UpdateExamPayload) => {
        const res = await apiClient.patch(`/management/exam/${examId}/update`, payload);
        return res.data;
    };
    // Schedule exam
    scheduleExam = async (
        examId: string,
        payload: { examDate: Date }
    ) => {
        const res = await apiClient.patch(
            `/management/exam/${examId}/scheduleExam`,
            payload
        );
        return res.data;
    };

    // Add syllabus (teacher/principal)
    addSyllabus = async (
        examId: string,
        payload: { syllabus: string }
    ) => {
        const res = await apiClient.patch(
            `/management/exam/${examId}/addSyllabus`,
            payload
        );
        return res.data;
    };

    // Add question paper (teacher/principal)
    addQuestionPaper = async (
        examId: string,
        payload: { questionPaper: string }
    ) => {
        const res = await apiClient.patch(
            `/management/exam/${examId}/addQuestionPaper`,
            payload
        );
        return res.data;
    };

    // Delete exam paper
    deleteExam = async (examId: string) => {
        const res = await apiClient.delete(`/management/exam/${examId}`);
        return res.data;
    };

    // Conduct exam - creates results for all students in subject section
    conductExam = async (examId: string, payload: { conductedDate: Date }) => {
        const res = await apiClient.patch(
            `/management/exam/${examId}/conduct`,
            payload
        );
        return res.data;
    };

    // Complete attendance marking - transition to AWAITING_RESULT
    completeAttendance = async (examId: string) => {
        const res = await apiClient.patch(`/management/exam/${examId}/complete-attendance`);
        return res.data;
    };

    // Get enrolled students eligible for an exam (READY_TO_CONDUCT onwards)
    getExamEnrolledStudents = async (examId: string) => {
        const res = await apiClient.get(`/management/exam/${examId}/enrolled-students`);
        return res.data;
    };

    // Get exam results
    getExamResults = async (examId: string) => {
        const res = await apiClient.get(`/management/exam/${examId}/results`);
        return res.data;
    };

    // Update result marks (teacher or principal)
    updateResultMarks = async (resultId: string, payload: { marks: number; remarks?: string }) => {
        const res = await apiClient.patch(
            `/management/exam/result/${resultId}/marks`,
            payload
        );
        return res.data;
    };

    // Authorised re-evaluation of a PUBLISHED result (P0-EXM-05). Requires a
    // reason; audited with old → new marks. PRINCIPAL / ADMIN only.
    reEvaluateResult = async (resultId: string, payload: { marks: number; reason: string; remarks?: string }) => {
        const res = await apiClient.patch(`/management/exam/result/${resultId}/re-evaluate`, payload);
        return res.data as { message: string; result: any; oldMarks: number | null; newMarks: number };
    };

    // Publish exam results (principal only)
    publishExamResults = async (examId: string) => {
        const res = await apiClient.post(`/management/exam/${examId}/publish`);
        return res.data;
    };

    // Get exam report/analytics (published exams)
    getExamReport = async (examId: string) => {
        const res = await apiClient.get(`/management/exam/${examId}/report`);
        return res.data;
    };

    /**
     * Term report card (P1-EXM-10). `preview` returns the computed JSON so the UI
     * can show the card on screen; otherwise the PDF blob is downloaded.
     * `weights` maps examName → weight (out of 100, P1-EXM-11); omit for an equal split.
     */
    getReportCardPreview = async (studentId: string, params: {
        sessionId: string; examTerm: string; termLabel?: string;
        weights?: Record<string, number>; passPercent?: number;
    }) => {
        const res = await apiClient.get(`/management/exam/report-card/${studentId}`, {
            params: {
                ...params,
                preview: 1,
                ...(params.weights ? { weights: JSON.stringify(params.weights) } : {}),
            },
        });
        return res.data;
    };

    downloadReportCard = async (studentId: string, params: {
        sessionId: string; examTerm: string; termLabel?: string;
        weights?: Record<string, number>; passPercent?: number;
    }) => {
        const res = await apiClient.get(`/management/exam/report-card/${studentId}`, {
            responseType: "blob",
            params: {
                ...params,
                ...(params.weights ? { weights: JSON.stringify(params.weights) } : {}),
            },
        });
        return res.data as Blob;
    };

    // Get school-wide performance dashboard data
    getPerformanceDashboard = async (params: { sessionId: string; classId?: string; sectionId?: string; term?: string; studentId?: string }) => {
        const res = await apiClient.get("/management/exam/performance", { params });
        return res.data;
    };

    // Consolidated term result (P1-EXM-11) — sum of marks over sum of full marks,
    // no weighting. Per subject + overall, ranked.
    getExamAggregate = async (params: { sessionId: string; classId?: string; sectionId?: string; term?: string }) => {
        const res = await apiClient.get("/management/exam/aggregate", { params });
        return res.data as { students: ExamAggregateRow[]; examCount: number };
    };

    // Publish exam (CREATED → PUBLISHED)
    publishExam = async (examId: string) => {
        const res = await apiClient.patch(`/management/exam/${examId}/publish-exam`);
        return res.data;
    };

    // Mark exam as conducted without payload (READY_TO_CONDUCT → CONDUCTED)
    markConducted = async (examId: string) => {
        const res = await apiClient.patch(`/management/exam/${examId}/conduct`);
        return res.data;
    };

    // Get per-section marks progress summary
    getExamSections = async (examId: string) => {
        const res = await apiClient.get(`/management/exam/${examId}/sections`);
        return res.data;
    };

    // ── Exam Lifecycle Stage Transitions ──────────────────────────────────────

    // CREATED → SYLLABUS_CONFIRMED
    confirmSyllabus = async (examId: string) => {
        const res = await apiClient.patch(`/management/exam/${examId}/confirm-syllabus`);
        return res.data;
    };

    // SYLLABUS_CONFIRMED → DATE_CONFIRMED
    confirmDate = async (examId: string) => {
        const res = await apiClient.patch(`/management/exam/${examId}/confirm-date`);
        return res.data;
    };

    // DATE_CONFIRMED → PAPER_SET
    setPaper = async (examId: string, payload?: { questionPaper?: string }) => {
        const res = await apiClient.patch(`/management/exam/${examId}/set-paper`, payload ?? {});
        return res.data;
    };

    // PAPER_SET → ADMIT_CARD_PUBLISHED
    examPublishAdmitCards = async (examId: string) => {
        const res = await apiClient.patch(`/management/exam/${examId}/publish-admit-cards`);
        return res.data;
    };

    // ADMIT_CARD_PUBLISHED → READY_TO_CONDUCT
    readyToConduct = async (examId: string, payload?: { readyToConductNotes?: string }) => {
        const res = await apiClient.patch(`/management/exam/${examId}/ready-to-conduct`, payload ?? {});
        return res.data;
    };

    // CONDUCTED → PAPER_EVALUATED
    evaluatePaper = async (examId: string) => {
        const res = await apiClient.patch(`/management/exam/${examId}/evaluate-paper`);
        return res.data;
    };

    // ── Student Management APIs ───────────────────────────────────────────────

    // Get all applicants. Pass `sessionId` to filter by session, "none" for
    // legacy applicants without a session set.
    getApplicants = async (sessionId?: string) => {
        const params = sessionId ? { sessionId } : undefined;
        const res = await apiClient.get("/management/student/applied", { params });
        return res.data;
    };

    // Get student details
    getStudentById = async (studentId: string) => {
        const res = await apiClient.get(`/management/student/${studentId}`);
        return res.data;
    };

    /**
     * The 360° student record — attendance, academics, fees, library, homework,
     * sports and derived insights, already redacted server-side for the calling
     * role (see Student360Service.resolveVisibility).
     */
    getStudent360 = async (studentId: string, sessionId?: string) => {
        const res = await apiClient.get(`/management/student/${studentId}/360`, {
            params: sessionId ? { sessionId } : undefined,
        });
        return res.data;
    };

    // Create admission for student
    createAdmission = async (studentId: string, admissionData: {
        sessionId: string;
        classId: string;
        sectionId: string;
        courseId: string;
        rollNo: string;
        transportOpted: boolean;
        transportZoneId?: string;
    }) => {
        const res = await apiClient.post(`/management/student/${studentId}/admission`, admissionData);
        return res.data;
    };

    // Reject application
    rejectApplication = async (applicantId: string) => {
        const res = await apiClient.patch(`/management/student/${applicantId}/reject`);
        return res.data;
    };

    // Search students
    searchStudents = async (query: string) => {
        const res = await apiClient.get("/management/student/search", {
            params: { query },
        });
        return res.data;
    };

    // ── Teacher Management APIs ──────────────────────────────────────────────
    // Get all teachers
    getTeachers = async () => {
        const res = await apiClient.get("/management/teacher");
        return res.data;
    };

    // Get teacher by ID
    getTeacherById = async (teacherId: string) => {
        const res = await apiClient.get(`/management/teacher/${teacherId}`);
        return res.data;
    };

    // Get teacher full assignments (classes, sections, subjects)
    getTeacherAssignments = async (teacherId: string) => {
        const res = await apiClient.get(`/management/teacher/${teacherId}/assignments`);
        return res.data;
    };

    // Create teacher
    createTeacherEntry = async (teacherData: {
        name: string;
        gender: string;
        age: number;
        qualification: string;
        phone: string;
        email?: string;
        address?: string;
        password?: string;
    }) => {
        const res = await apiClient.post("/management/teacher/create", teacherData);
        return res.data;
    };

    // Reset teacher password (principal action)
    resetTeacherPassword = async (teacherId: string, password: string) => {
        const res = await apiClient.patch(`/management/teacher/${teacherId}/setPassword`, { password });
        return res.data;
    };

    // Reset student password (management action)
    resetStudentPassword = async (studentId: string, password: string) => {
        const res = await apiClient.patch(`/management/student/${studentId}/reset-password`, { password });
        return res.data;
    };

    // Reset management user password (principal action)
    resetManagementUserPassword = async (userId: string, password: string) => {
        const res = await apiClient.patch(`/management/auth/users/${userId}/reset-password`, { password });
        return res.data;
    };

    // Change own password (management user — verifies current password)
    changeOwnPassword = async (currentPassword: string, newPassword: string) => {
        const res = await apiClient.patch("/management/auth/change-password", { currentPassword, newPassword });
        return res.data;
    };

    // Get all management users (principal action)
    getManagementUsers = async () => {
        const res = await apiClient.get("/management/auth/users");
        return res.data.users;
    };

    // Update teacher
    updateTeacher = async (teacherId: string, teacherData: UpdateTeacherData) => {
        const res = await apiClient.patch(`/management/teacher/${teacherId}`, teacherData);
        return res.data;
    };

    // Delete teacher
    deleteTeacher = async (teacherId: string) => {
        const res = await apiClient.delete(`/management/teacher/${teacherId}`);
        return res.data;
    };

    getTeacherApplications = async (status?: string): Promise<{ applications: TeacherApplication[] }> => {
        const res = await apiClient.get('/management/teacher/applications', { params: status ? { status } : {} });
        return res.data;
    };

    updateTeacherApplicationStatus = async (id: string, data: { status: string; comments?: string }) => {
        const res = await apiClient.patch(`/management/teacher/applications/${id}`, data);
        return res.data;
    };

    // DEPRECATED / DO NOT USE. This posts to `/management/teacher/:id/assign-subject`,
    // a route that does NOT exist in the backend — it 404s. A subject-teacher
    // assignment is per-section: use `addTeacherToSubject(subjectId, { teacherId,
    // sectionId })` above, which targets the real endpoint. Kept only so an old
    // build doesn't crash on a missing symbol; remove once nothing references it.
    assignSubjectToTeacher = async (teacherId: string, subjectId: string) => {
        const res = await apiClient.post(`/management/teacher/${teacherId}/assign-subject`, { subjectId });
        return res.data;
    };

    // Update section (e.g. remove teacher: pass teacherId: null)
    updateSection = async (sectionId: string, data: { name?: string; slug?: string; teacherId?: string | null }) => {
        const res = await apiClient.patch(`/management/section/${sectionId}`, data);
        return res.data;
    };

    // Get section by ID (rich details)
    getSectionById = async (sectionId: string) => {
        const res = await apiClient.get(`/management/section/${sectionId}`);
        return res.data;
    };

    // Update class (e.g. remove teacher: pass teacherId: null)
    updateClass = async (classId: string, data: { name?: string; slug?: string; teacherId?: string | null }) => {
        const res = await apiClient.patch(`/management/class/${classId}`, data);
        return res.data;
    };

    // Delete a class (guarded server-side: refused with CLASS_IN_USE if it still
    // has sections or courses).
    deleteClass = async (classId: string) => {
        const res = await apiClient.delete(`/management/class/${classId}`);
        return res.data;
    };

    // Delete a section (guarded server-side if it still has enrolled students).
    deleteSection = async (sectionId: string) => {
        const res = await apiClient.delete(`/management/section/${sectionId}`);
        return res.data;
    };

    // ── School Events ─────────────────────────────────────────────────────────
    getSchoolEvents = async (from?: string, to?: string) => {
        const res = await apiClient.get("/management/events", {
            params: { from, to },
        });
        return res.data;
    };

    createSchoolEvent = async (data: {
        title: string;
        description?: string;
        type: string;
        date: string;
        endDate?: string;
    }) => {
        const res = await apiClient.post("/management/events/create", data);
        return res.data;
    };

    updateSchoolEvent = async (eventId: string, data: UpdateSchoolEventData) => {
        const res = await apiClient.patch(`/management/events/${eventId}`, data);
        return res.data;
    };

    deleteSchoolEvent = async (eventId: string) => {
        const res = await apiClient.delete(`/management/events/${eventId}`);
        return res.data;
    };

    // ── Calendar (read-only view) ─────────────────────────────────────────────
    getCalendarEvents = async (from?: string, to?: string) => {
        const res = await apiClient.get("/management/calendar/events", {
            params: { from, to },
        });
        return res.data;
    };

    getCalendarSessions = async () => {
        const res = await apiClient.get("/management/calendar/sessions");
        return res.data;
    };

    // ── Fees Module ───────────────────────────────────────────────────────────

    // Course Fees
    getCourseFees = async () => {
        const res = await apiClient.get("/management/fees/course-fees");
        return res.data;
    };
    setCourseFee = async (courseId: string, tuitionFee: number) => {
        const res = await apiClient.post("/management/fees/course-fees", { courseId, tuitionFee });
        return res.data;
    };
    deleteCourseFee = async (id: string) => {
        const res = await apiClient.delete(`/management/fees/course-fees/${id}`);
        return res.data;
    };

    // Transport Zones
    getTransportZones = async () => {
        const res = await apiClient.get("/management/fees/transport-zones");
        return res.data;
    };
    createTransportZone = async (data: { name: string; description?: string; price: number }) => {
        const res = await apiClient.post("/management/fees/transport-zones", data);
        return res.data;
    };
    updateTransportZone = async (id: string, data: { name?: string; description?: string; price?: number }) => {
        const res = await apiClient.patch(`/management/fees/transport-zones/${id}`, data);
        return res.data;
    };
    deleteTransportZone = async (id: string) => {
        const res = await apiClient.delete(`/management/fees/transport-zones/${id}`);
        return res.data;
    };

    // Extra Charges
    getExtraCharges = async (params?: { studentId?: string; month?: number; year?: number }) => {
        const res = await apiClient.get("/management/fees/extra-charges", { params });
        return res.data;
    };
    addExtraCharge = async (data: { studentId: string; academicId: string; type: string; description?: string; amount: number; month: number; year: number }) => {
        const res = await apiClient.post("/management/fees/extra-charges", data);
        return res.data;
    };
    previewBulkExtraCharge = async (params: { sessionId: string; classId?: string; sectionId?: string; courseId?: string }) => {
        const res = await apiClient.get("/management/fees/extra-charges/bulk/preview", { params });
        return res.data as { students: Array<{ academicId: string; studentId: string; firstName: string; lastName: string; phone: string }>; total: number };
    };
    addBulkExtraCharge = async (data: { type: string; description?: string; amount: number; month: number; year: number; sessionId: string; classId?: string; sectionId?: string; courseId?: string; studentIds?: string[]; applyToAll?: boolean }) => {
        const res = await apiClient.post("/management/fees/extra-charges/bulk", data);
        return res.data as { message: string; created: number; total: number };
    };
    updateExtraCharge = async (id: string, data: Partial<{ type: string; description: string; amount: number; month: number; year: number }>) => {
        const res = await apiClient.patch(`/management/fees/extra-charges/${id}`, data);
        return res.data;
    };
    deleteExtraCharge = async (id: string) => {
        const res = await apiClient.delete(`/management/fees/extra-charges/${id}`);
        return res.data;
    };

    // Invoices
    getFeeInvoices = async (params?: { month?: number; year?: number; status?: string; studentId?: string }) => {
        const res = await apiClient.get("/management/fees/invoices", { params });
        return res.data;
    };
    generateInvoices = async (data: {
        month: number;
        year: number;
        sessionId: string;
        dueDate: string;
    }): Promise<GenerateInvoicesResult & { message?: string }> => {
        const res = await apiClient.post("/management/fees/invoices/generate", data);
        return res.data;
    };

    // ── Admit Cards ──────────────────────────────────────────────────────────
    getAdmitCardReleases = async (): Promise<{ success: boolean; data: AdmitCardRelease[] }> => {
        const res = await apiClient.get("/management/exam/admit-cards");
        return res.data;
    };

    publishAdmitCardRelease = async (
        payload: PublishAdmitCardPayload,
    ): Promise<{ success: boolean; data: AdmitCardRelease }> => {
        const res = await apiClient.post("/management/exam/admit-cards/publish", payload);
        return res.data;
    };

    revokeAdmitCardRelease = async (
        id: string,
    ): Promise<{ success: boolean; data: AdmitCardRelease }> => {
        const res = await apiClient.post(`/management/exam/admit-cards/${id}/revoke`);
        return res.data;
    };

    getFeeInvoiceById = async (id: string) => {
        const res = await apiClient.get(`/management/fees/invoices/${id}`);
        return res.data;
    };
    recordPayment = async (invoiceId: string, data: { amount: number; paymentMode: string; referenceNo?: string; paymentDate?: string; remarks?: string }) => {
        const res = await apiClient.post(`/management/fees/invoices/${invoiceId}/payment`, data);
        return res.data;
    };
    waiveInvoice = async (invoiceId: string, remarks?: string) => {
        const res = await apiClient.patch(`/management/fees/invoices/${invoiceId}/waive`, { remarks });
        return res.data;
    };
    cancelInvoice = async (invoiceId: string, remarks?: string) => {
        const res = await apiClient.patch(`/management/fees/invoices/${invoiceId}/cancel`, { remarks });
        return res.data;
    };
    markOverdueInvoices = async () => {
        const res = await apiClient.patch("/management/fees/invoices/mark-overdue");
        return res.data;
    };
    getFeeSummary = async (params?: {
        month?: number;
        year?: number;
        sessionId?: string;
        classId?: string;
        courseId?: string;
        sectionId?: string;
        status?: string;
        invoiceType?: string;
    }) => {
        const res = await apiClient.get("/management/fees/summary", { params });
        return res.data;
    };

    // ── Fee Structures ────────────────────────────────────────────────────────

    getFeeStructures = async (sessionId?: string) => {
        const res = await apiClient.get('/management/fees/structures', { params: sessionId ? { sessionId } : {} });
        return res.data as { structures: Array<{ id: string; name: string; sessionId: string; sessionName: string; isActive: boolean; itemCount: number; createdAt: string }> };
    };

    createFeeStructure = async (data: {
        sessionId: string; name: string; description?: string; isActive: boolean;
        lateFeeEnabled?: boolean; lateFeeGraceDays?: number;
        lateFeeFlatAmount?: number; lateFeePercent?: number;
        lateFeeMaxAmount?: number; lateFeeCompound?: boolean;
    }) => {
        const res = await apiClient.post('/management/fees/structures', data);
        return res.data as { structure: { id: string; name: string; sessionId: string; isActive: boolean } };
    };

    getFeeStructureById = async (id: string) => {
        const res = await apiClient.get(`/management/fees/structures/${id}`);
        return res.data as {
            structure: {
                id: string; name: string; sessionId: string; isActive: boolean;
                description?: string | null;
                lateFeeEnabled?: boolean;
                lateFeeGraceDays?: number;
                lateFeeFlatAmount?: number;
                lateFeePercent?: number;
                lateFeeMaxAmount?: number;
                lateFeeCompound?: boolean;
                items: FeeStructureItem[];
            };
        };
    };

    createFeeStructureItem = async (structureId: string, data: {
        name: string; feeType: string; scope: 'GLOBAL' | 'COURSE';
        amount: number; frequency: string;
        courseId?: string; description?: string;
    }) => {
        const res = await apiClient.post(`/management/fees/structures/${structureId}/items`, data);
        return res.data;
    };

    updateFeeStructureItem = async (structureId: string, itemId: string, data: Partial<{
        name: string; amount: number; frequency: string; description: string;
    }>) => {
        const res = await apiClient.patch(`/management/fees/structures/${structureId}/items/${itemId}`, data);
        return res.data;
    };

    deleteFeeStructureItem = async (structureId: string, itemId: string) => {
        const res = await apiClient.delete(`/management/fees/structures/${structureId}/items/${itemId}`);
        return res.data;
    };

    updateFeeStructure = async (structureId: string, data: {
        name?: string; description?: string; isActive?: boolean;
        lateFeeEnabled?: boolean; lateFeeGraceDays?: number;
        lateFeeFlatAmount?: number; lateFeePercent?: number;
        lateFeeMaxAmount?: number; lateFeeCompound?: boolean;
    }) => {
        const res = await apiClient.patch(`/management/fees/structures/${structureId}`, data);
        return res.data as { structure: { id: string; name: string; isActive: boolean } };
    };

    deleteFeeStructure = async (structureId: string) => {
        const res = await apiClient.delete(`/management/fees/structures/${structureId}`);
        return res.data;
    };

    // ── Attendance Module ─────────────────────────────────────────────────────
    getAttendanceSections = async (sessionId?: string) => {
        const params = sessionId ? { sessionId } : undefined;
        const res = await apiClient.get("/management/attendance/sections", { params });
        return res.data;
    };

    getAttendanceStudents = async (sectionId: string, date: string) => {
        const res = await apiClient.get(`/management/attendance/section/${sectionId}/students`, {
            params: { date },
        });
        return res.data;
    };

    markAttendanceManagement = async (sectionId: string, data: { date: string; records: Array<{ studentId: string; academicId: string; status: string; remarks?: string }> }) => {
        const res = await apiClient.post(`/management/attendance/section/${sectionId}/mark`, data);
        return res.data;
    };

    getAttendanceView = async (params?: { classId?: string; sectionId?: string; date?: string; from?: string; to?: string }) => {
        const res = await apiClient.get("/management/attendance/view", { params });
        return res.data;
    };

    getStudentAttendance = async (studentId: string, params?: { month?: number; year?: number }) => {
        const res = await apiClient.get(`/management/attendance/student/${studentId}`, { params });
        return res.data;
    };

    getAttendanceHolidays = async (year: number, month: number) => {
        const res = await apiClient.get("/management/attendance/holidays", {
            params: { year, month },
        });
        return res.data;
    };

    // Statutory monthly attendance register (P1-ATT-06).
    getAttendanceRegister = async (sectionId: string, year: number, month: number) => {
        const res = await apiClient.get("/management/attendance/register", { params: { sectionId, year, month } });
        return res.data;
    };
    // Downloads the register CSV; triggers a browser save.
    downloadAttendanceRegister = async (sectionId: string, year: number, month: number, filenameHint = "attendance-register") => {
        const res = await apiClient.get("/management/attendance/register", {
            params: { sectionId, year, month, format: "csv" },
            responseType: "blob",
        });
        const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filenameHint}-${year}-${String(month).padStart(2, "0")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    getAttendanceTodaySummary = async () => {
        const res = await apiClient.get("/management/attendance/today-summary");
        return res.data;
    };

    // ── Teacher Attendance Module ─────────────────────────────────────────────
    getTeacherAttendanceTeachers = async (date: string) => {
        const res = await apiClient.get("/management/teacher-attendance/teachers/date", {
            params: { date },
        });
        return res.data;
    };

    markTeacherAttendance = async (data: { date: string; records: Array<{ teacherId: string; status: string; remarks?: string }> }) => {
        const res = await apiClient.post("/management/teacher-attendance/mark", data);
        return res.data;
    };

    getTeacherAttendanceView = async (params?: { teacherId?: string; date?: string; from?: string; to?: string; sessionId?: string }) => {
        const res = await apiClient.get("/management/teacher-attendance/view", { params });
        return res.data;
    };

    getIndividualTeacherAttendance = async (teacherId: string, params?: { month?: number; year?: number }) => {
        const res = await apiClient.get(`/management/teacher-attendance/teacher/${teacherId}`, { params });
        return res.data;
    };

    getTeacherAttendanceTodaySummary = async () => {
        const res = await apiClient.get("/management/teacher-attendance/today-summary");
        return res.data;
    };

    getTeacherAttendanceHolidays = async (year: number, month: number) => {
        const res = await apiClient.get("/management/teacher-attendance/holidays", {
            params: { year, month },
        });
        return res.data;
    };

    // ── Leave Management ────────────────────────────────────────────────────
    getStudentLeaves = async (params?: { status?: string; classId?: string; sectionId?: string; from?: string; to?: string; sessionId?: string }) => {
        const res = await apiClient.get("/management/leave/student-leaves", { params });
        return res.data;
    };

    respondStudentLeaveApproval = async (approvalId: string, data: { action: string; remarks?: string }) => {
        const res = await apiClient.patch(`/management/leave/student-leaves/${approvalId}/respond`, data);
        return res.data;
    };

    getTeacherLeaves = async (params?: { status?: string; teacherId?: string; from?: string; to?: string; sessionId?: string }) => {
        const res = await apiClient.get("/management/leave/teacher-leaves", { params });
        return res.data;
    };

    respondTeacherLeave = async (leaveId: string, data: { action: string; remarks?: string }) => {
        const res = await apiClient.patch(`/management/leave/teacher-leaves/${leaveId}/respond`, data);
        return res.data;
    };

    getLeaveClasses = async () => {
        const res = await apiClient.get("/management/leave/classes");
        return res.data;
    };


    // Payments
    getFeePayments = async (params?: { from?: string; to?: string; paymentMode?: string; paymentStatus?: string }) => {
        const res = await apiClient.get("/management/fees/payments", { params });
        return res.data;
    };
    /** Daily collection day-book for cash reconciliation (P0-FEE-10). */
    getFeeDayBook = async (date?: string) => {
        const res = await apiClient.get("/management/fees/day-book", { params: date ? { date } : undefined });
        return res.data as {
            date: string;
            totals: { count: number; totalAmount: number };
            cashInHand: number;
            byMode: { mode: string; count: number; amount: number }[];
            byCollector: { receivedBy: string | null; collectorName: string; count: number; amount: number }[];
            payments: { id: string; receiptNo: string | null; time: string; studentName: string; invoiceNo: string; amount: number; paymentMode: string; referenceNo: string | null; collectorName: string }[];
        };
    };
    exportFeePayments = async (params?: { from?: string; to?: string; paymentMode?: string; paymentStatus?: string }) => {
        const res = await apiClient.get("/management/fees/payments/export", { params, responseType: 'blob' });
        const url = globalThis.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        globalThis.URL.revokeObjectURL(url);
    };
    refundPayment = async (paymentId: string) => {
        const res = await apiClient.post(`/management/fees/payments/${paymentId}/refund`);
        return res.data;
    };
    /** Reverse an offline payment that didn't clear — cheque bounce (P0-FEE-12). */
    reversePayment = async (paymentId: string, data: { reason: string; bounceFee?: number }) => {
        const res = await apiClient.post(`/management/fees/payments/${paymentId}/reverse`, data);
        return res.data as { message: string; invoice: unknown; bounceFeeInvoiceId: string | null };
    };

    // ── Library Module ────────────────────────────────────────────────────────
    getLibraryStats = async () => {
        const res = await apiClient.get("/management/library/stats");
        return res.data;
    };

    getLibraryBooks = async (params?: { genre?: string; enabled?: string; search?: string }) => {
        const res = await apiClient.get("/management/library/books", { params });
        return res.data;
    };

    getLibraryBookById = async (id: string) => {
        const res = await apiClient.get(`/management/library/books/${id}`);
        return res.data;
    };

    createLibraryBook = async (data: {
        title: string; author: string; isbn?: string; publisher?: string;
        publicationYear?: number; genre?: string; description?: string;
        coverImageUrl?: string; rackNumber?: string; totalCopies?: number;
        isEnabled?: boolean; requiresApproval?: boolean; restrictedToClassIds?: string[];
    }) => {
        const res = await apiClient.post("/management/library/books", data);
        return res.data;
    };

    updateLibraryBook = async (id: string, data: UpdateLibraryBookData) => {
        const res = await apiClient.patch(`/management/library/books/${id}`, data);
        return res.data;
    };

    toggleLibraryBook = async (id: string) => {
        const res = await apiClient.patch(`/management/library/books/${id}/toggle`);
        return res.data;
    };

    deleteLibraryBook = async (id: string) => {
        const res = await apiClient.delete(`/management/library/books/${id}`);
        return res.data;
    };

    getLibraryRequests = async (params?: { status?: string }) => {
        const res = await apiClient.get("/management/library/requests", { params });
        return res.data;
    };

    approveLibraryRequest = async (id: string) => {
        const res = await apiClient.patch(`/management/library/requests/${id}/approve`);
        return res.data;
    };

    rejectLibraryRequest = async (id: string, reason: string) => {
        const res = await apiClient.patch(`/management/library/requests/${id}/reject`, { reason });
        return res.data;
    };

    getLibraryIssues = async (params?: { status?: string; studentId?: string }) => {
        const res = await apiClient.get("/management/library/issues", { params });
        return res.data;
    };

    issueLibraryBook = async (data: { bookId: string; studentId: string; requestId?: string; remarks?: string }) => {
        const res = await apiClient.post("/management/library/issues", data);
        return res.data;
    };

    returnLibraryBook = async (issueId: string, data: { remarks?: string; markLost?: boolean; overrideFine?: number }) => {
        const res = await apiClient.patch(`/management/library/issues/${issueId}/return`, data);
        return res.data;
    };

    markLibraryFinePaid = async (issueId: string) => {
        const res = await apiClient.patch(`/management/library/issues/${issueId}/mark-fine-paid`);
        return res.data;
    };

    markLibraryOverdue = async () => {
        const res = await apiClient.post("/management/library/issues/mark-overdue");
        return res.data;
    };

    getLibraryRenewals = async (params?: { status?: string }) => {
        const res = await apiClient.get("/management/library/renewals", { params });
        return res.data;
    };

    respondLibraryRenewal = async (id: string, action: "APPROVED" | "REJECTED", remarks?: string) => {
        const res = await apiClient.patch(`/management/library/renewals/${id}/respond`, { action, remarks });
        return res.data;
    };

    // ── Transport Module ──────────────────────────────────────────────────────

    getTransportDashboard = async (params?: { sessionId?: string }) => {
        const res = await apiClient.get("/management/transport/dashboard", { params });
        return res.data;
    };

    getTransportStudents = async (params?: { sessionId?: string; zoneId?: string; opted?: string; page?: number; limit?: number; search?: string }) => {
        const res = await apiClient.get("/management/transport/students", { params });
        return res.data;
    };

    updateStudentTransport = async (academicId: string, data: { transportOpted: boolean; transportZoneId?: string | null }) => {
        const res = await apiClient.patch(`/management/transport/students/${academicId}`, data);
        return res.data;
    };

    getTransportBusDetails = async (params?: { zoneId?: string }) => {
        const res = await apiClient.get("/management/transport/bus-details", { params });
        return res.data;
    };

    createBusDetail = async (data: {
        zoneId: string; busNumber: string; driverName: string; driverPhone?: string;
        conductorName?: string; conductorPhone?: string; capacity?: number;
        routeDescription?: string; pickupTime?: string; dropTime?: string; vehicleType?: string;
        registrationNumber?: string; registrationExpiry?: string;
        insuranceProvider?: string; insurancePolicyNumber?: string; insuranceExpiry?: string;
        fitnessCertExpiry?: string; permitExpiry?: string; pollutionCertExpiry?: string;
        lastServicedOn?: string; driverLicenseNumber?: string; driverLicenseExpiry?: string;
    }) => {
        const res = await apiClient.post("/management/transport/bus-details", data);
        return res.data;
    };

    updateBusDetail = async (id: string, data: Partial<{
        busNumber: string; driverName: string; driverPhone: string;
        conductorName: string; conductorPhone: string; capacity: number;
        routeDescription: string; pickupTime: string; dropTime: string;
        vehicleType: string; isActive: boolean;
        registrationNumber: string; registrationExpiry: string | null;
        insuranceProvider: string; insurancePolicyNumber: string; insuranceExpiry: string | null;
        fitnessCertExpiry: string | null; permitExpiry: string | null; pollutionCertExpiry: string | null;
        lastServicedOn: string | null; driverLicenseNumber: string; driverLicenseExpiry: string | null;
    }>) => {
        const res = await apiClient.patch(`/management/transport/bus-details/${id}`, data);
        return res.data;
    };

    deleteBusDetail = async (id: string) => {
        const res = await apiClient.delete(`/management/transport/bus-details/${id}`);
        return res.data;
    };

    /** Bus document expiry insights (RC/insurance/fitness/permit/PUC/licence). */
    getTransportCompliance = async (within?: number) => {
        const res = await apiClient.get("/management/transport/compliance", {
            params: within ? { within } : undefined,
        });
        return res.data;
    };

    // ── Account & Support ────────────────────────────────────────────────────
    getAccount = async () => {
        const res = await apiClient.get('/management/support/account');
        return res.data;
    };

    // Activity / audit log (P0-AC-08)
    getActivity = async (params: { module?: string; q?: string; before?: string; limit?: number } = {}) => {
        const res = await apiClient.get('/management/activity', { params });
        return res.data as { activities: any[]; nextBefore: string | null };
    };
    getActivityModules = async () => {
        const res = await apiClient.get('/management/activity/modules');
        return res.data as { modules: string[] };
    };

    // ── Parent grievances / complaints (P1-COM-08) ──────────────────────────
    getGrievances = async (status?: string) => {
        const res = await apiClient.get('/management/grievances', { params: status ? { status } : undefined });
        return res.data as { grievances: any[]; summary: { open: number; inProgress: number } };
    };
    getGrievance = async (id: string) => {
        const res = await apiClient.get(`/management/grievances/${id}`);
        return res.data as { grievance: any; student: { name: string; phone: string | null; email: string | null } | null; replies: any[] };
    };
    replyGrievance = async (id: string, message: string, isInternal = false) => {
        const res = await apiClient.post(`/management/grievances/${id}/reply`, { message, isInternal });
        return res.data;
    };
    setGrievanceStatus = async (id: string, status: string, assignToSelf = false) => {
        const res = await apiClient.patch(`/management/grievances/${id}/status`, { status, assignToSelf });
        return res.data;
    };

    // ── Parent-Teacher Meetings (P1-COM-07) ─────────────────────────────────
    createPtmEvent = async (data: {
        title: string; description?: string | null;
        sessionId?: string | null; classId?: string | null; sectionId?: string | null;
        meetingDate: string; location?: string | null; slotDurationMins?: number;
        bookingOpensAt?: string | null; bookingClosesAt?: string | null;
    }) => {
        const res = await apiClient.post('/management/ptm/events', data);
        return res.data.data as PtmEvent;
    };
    getPtmEvents = async () => {
        const res = await apiClient.get('/management/ptm/events');
        return res.data.data as PtmEvent[];
    };
    getPtmEventSlots = async (eventId: string) => {
        const res = await apiClient.get(`/management/ptm/events/${eventId}/slots`);
        return res.data.data as PtmSlot[];
    };
    generatePtmSlots = async (eventId: string, data: {
        teacherIds: string[]; windowStart: string; windowEnd: string; slotDurationMins?: number;
    }) => {
        const res = await apiClient.post(`/management/ptm/events/${eventId}/generate-slots`, data);
        return res.data.data as { created: number };
    };
    publishPtmEvent = async (eventId: string) => {
        const res = await apiClient.post(`/management/ptm/events/${eventId}/publish`);
        return res.data.data as PtmEvent;
    };
    cancelPtmEvent = async (eventId: string) => {
        const res = await apiClient.post(`/management/ptm/events/${eventId}/cancel`);
        return res.data.data as PtmEvent;
    };
    markPtmAttendance = async (slotId: string, attendance: "PENDING" | "ATTENDED" | "NO_SHOW", teacherNotes?: string) => {
        const res = await apiClient.patch(`/management/ptm/slots/${slotId}/attendance`, { attendance, teacherNotes });
        return res.data.data as PtmSlot;
    };

    // Support Tickets
    getSupportTickets = async () => {
        const res = await apiClient.get('/management/support/tickets');
        return res.data;
    };
    createSupportTicket = async (data: { subject: string; description: string; type?: string; category?: string; priority?: string }) => {
        const res = await apiClient.post('/management/support/tickets', data);
        return res.data;
    };
    getSupportTicket = async (id: string) => {
        const res = await apiClient.get(`/management/support/tickets/${id}`);
        return res.data;
    };
    replyToTicket = async (id: string, message: string) => {
        const res = await apiClient.post(`/management/support/tickets/${id}/reply`, { message });
        return res.data;
    };
    closeTicket = async (id: string) => {
        const res = await apiClient.patch(`/management/support/tickets/${id}/close`);
        return res.data;
    };

    // Feature Requests
    getFeatureRequests = async () => {
        const res = await apiClient.get('/management/support/feature-requests');
        return res.data;
    };
    createFeatureRequest = async (data: { title: string; description: string; category?: string }) => {
        const res = await apiClient.post('/management/support/feature-requests', data);
        return res.data;
    };

    // Onboarding
    getOnboardingStatus = async (): Promise<{
        isComplete: boolean;
        tenantName: string | null;
        session: { id: string; name: string; slug: string; startDate: string; endDate: string } | null;
        steps: {
            schoolProfile: { complete: boolean; required: boolean; detail: string | null };
            classes:       { complete: boolean; required: boolean; count: number };
            sections:      { complete: boolean; required: boolean; count: number };
            subjects:      { complete: boolean; required: boolean; count: number };
            courses:       { complete: boolean; required: boolean; count: number };
            feeStructure:  { complete: boolean; required: boolean; count: number };
            transport:     { complete: boolean; required: boolean; count: number };
            library:       { complete: boolean; required: boolean; count: number };
            noticeBoard:   { complete: boolean; required: boolean; count: number };
        };
        progress: { completed: number; total: number; percent: number };
    }> => {
        const res = await apiClient.get('/management/onboarding/status');
        return res.data;
    };

    // Default class → subjects & courses catalogue for the onboarding wizard.
    getClassDefaults = async (): Promise<{ grades: Array<{
        grade: string; sectionCode: string;
        subjects: Array<{ name: string; bookName: string; type: 'core' | 'elective' }>;
        courses: Array<{ name: string; description: string; subjects: string[] }>;
    }> }> => {
        const res = await apiClient.get('/management/onboarding/class-defaults');
        return res.data;
    };

    // Recommended annual App Development Fee (platform module cost × 12 per seat).
    getAppDevFee = async (): Promise<{
        annualPerStudent: number; monthlyPerSeat: number;
        enabledModules: Array<{ module: string; label: string; pricePerSeat: number }>;
    }> => {
        const res = await apiClient.get('/management/onboarding/app-fee');
        return res.data;
    };

    // Onboarding wizard draft — save/resume progress across logins.
    getOnboardingDraft = async (): Promise<{ draft: { data: any; currentStep: number; updatedAt: string } | null }> => {
        const res = await apiClient.get('/management/onboarding/draft');
        return res.data;
    };
    saveOnboardingDraft = async (data: any, currentStep: number) => {
        const res = await apiClient.put('/management/onboarding/draft', { data, currentStep });
        return res.data;
    };

    // ── Staff Management ──────────────────────────────────────────────────────

    getStaff = async (): Promise<{ staff: Array<{
        id: string; firstName: string; middleName?: string; lastName: string;
        phone: string; email: string; role: string | null; createdAt: string;
        permissions: Array<{ module: string; level: 'READ' | 'ADMIN' }> | null;
        roles?: Array<{ type: string; key: string; name: string }>;
    }> }> => {
        const res = await apiClient.get('/management/staff');
        return res.data;
    };

    createStaff = async (data: {
        firstName: string; lastName: string; phone: string; email: string;
        password: string; role?: string;
        roles?: Array<{ type: 'BUILTIN' | 'CUSTOM'; key: string }>;
        permissions?: Array<{ module: string; level: 'READ' | 'ADMIN' }>;
    }) => {
        const res = await apiClient.post('/management/staff', data);
        return res.data;
    };

    // ── Staff role catalogue (built-in + school-defined) ──────────────────────
    getStaffRoles = async (): Promise<{
        builtIn: StaffRoleDef[];
        custom: StaffRoleDef[];
        modules: string[];
        alwaysOn: string[];
    }> => {
        const res = await apiClient.get('/management/staff/roles');
        return res.data;
    };
    createStaffRole = async (data: { name: string; description?: string; permissions: Array<{ module: string; level: 'READ' | 'ADMIN' }> }) => {
        const res = await apiClient.post('/management/staff/roles', data);
        return res.data;
    };
    updateStaffRole = async (roleId: string, data: { name?: string; description?: string; permissions?: Array<{ module: string; level: 'READ' | 'ADMIN' }> }) => {
        const res = await apiClient.patch(`/management/staff/roles/${roleId}`, data);
        return res.data;
    };
    deleteStaffRole = async (roleId: string) => {
        const res = await apiClient.delete(`/management/staff/roles/${roleId}`);
        return res.data;
    };
    updateStaffRoles = async (id: string, roles: Array<{ type: 'BUILTIN' | 'CUSTOM'; key: string }>, applyPermissions = false) => {
        const res = await apiClient.put(`/management/staff/${id}/roles`, { roles, applyPermissions });
        return res.data;
    };

    updateStaff = async (id: string, data: {
        firstName?: string; lastName?: string; phone?: string; email?: string;
        role?: string; password?: string;
    }) => {
        const res = await apiClient.patch(`/management/staff/${id}`, data);
        return res.data;
    };

    deleteStaff = async (id: string) => {
        const res = await apiClient.delete(`/management/staff/${id}`);
        return res.data;
    };

    updateStaffPermissions = async (id: string, permissions: Array<{ module: string; level: 'READ' | 'ADMIN' }>) => {
        const res = await apiClient.put(`/management/staff/${id}/permissions`, { permissions });
        return res.data;
    };

    /**
     * Returns which modules the tenant has subscribed to. The staff-editor
     * UI uses this to render subscription badges on the permission grid, so
     * admins see which grants will actually take effect right now vs. which
     * are dormant (awaiting a module subscription).
     */
    getStaffAllowedModules = async (): Promise<{
        all: string[];
        enabled: string[];
        alwaysOn: string[];
    }> => {
        const res = await apiClient.get('/management/staff/allowed-modules');
        return res.data;
    };

    // Tenant Config / School Settings
    getTenantConfig = async () => {
        const res = await apiClient.get("/management/settings/config");
        return res.data;
    };
    updateTenantConfig = async (data: {
        schoolName: string;
        tagline?: string | null;
        bio?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        pincode?: string | null;
        phone?: string | null;
        email?: string | null;
        website?: string | null;
        logoUrl?: string | null;
        footerText?: string | null;
        acceptingApplications?: boolean;
        acceptingOnlineFees?: boolean;
        establishedYear?: number | null;
        boardAffiliation?: string | null;
        schoolType?: string | null;
        emergencyContact?: string | null;
        principalName?: string | null;
        udiseCode?: string | null;
        affiliationNumber?: string | null;
        boardSchoolCode?: string | null;
    }) => {
        const res = await apiClient.patch("/management/settings/config", data);
        return res.data;
    };

    getPlatformCharge = async () => {
        const res = await apiClient.get("/management/settings/platform-charge");
        return res.data as { costPerStudent: number };
    };

    getMyAdmissionCharges = async () => {
        const res = await apiClient.get("/management/settings/admission-charges");
        return res.data as {
            charges: Array<{
                id: string; studentName: string; amount: number; status: string;
                paidAt: string | null; notes: string | null; createdAt: string;
            }>;
            summary: {
                total: number; pendingCount: number; paidCount: number;
                pendingAmount: number; paidAmount: number; totalAmount: number;
            } | null;
        };
    };

    // ── Settings: Razorpay payments (per-tenant credentials) ────────────────
    getPaymentSettings = async () => {
        const res = await apiClient.get("/management/settings/payments");
        return res.data as {
            payments: {
                enabled: boolean;
                isFullyConfigured: boolean;
                keyId: string | null;
                keyIdEnvironment: "live" | "test" | null;
                hasKeySecret: boolean;
                hasWebhookSecret: boolean;
                keySecretMask: string | null;
                webhookSecretMask: string | null;
                configuredAt: string | null;
                configuredBy: string | null;
                configuredByName: string | null;
                webhookUrl: string;
            };
        };
    };

    updatePaymentSettings = async (payload: {
        enabled?: boolean;
        keyId?: string;
        keySecret?: string;
        webhookSecret?: string;
        clearWebhookSecret?: boolean;
    }) => {
        const res = await apiClient.patch("/management/settings/payments", payload);
        return res.data as {
            message: string;
            payments: { enabled: boolean; keyId: string | null; configuredAt: string | null };
        };
    };

    // ── Settings: School operations (working week, timing, etc.) ────────────
    getSchoolOperations = async () => {
        const res = await apiClient.get("/management/settings/school-operations");
        return res.data as {
            weeklyOffDays: number[]; schoolStartTime: string | null; schoolEndTime: string | null;
            academicYearStartMonth: number; defaultPassPercentage: number; currency: string; timezone: string;
        };
    };
    updateSchoolOperations = async (payload: {
        weeklyOffDays?: number[]; schoolStartTime?: string | null; schoolEndTime?: string | null;
        academicYearStartMonth?: number; defaultPassPercentage?: number; currency?: string; timezone?: string;
    }) => {
        const res = await apiClient.patch("/management/settings/school-operations", payload);
        return res.data;
    };

    // ── Settings: Leave policy (P1-TT-05 per-role entitlement + encash) ─────
    getLeavePolicy = async () => {
        const res = await apiClient.get("/management/settings/leave-policy");
        return res.data as {
            policies: { staffType: "TEACHER" | "MANAGEMENT"; sickDays: number; personalDays: number; familyDays: number; otherDays: number; totalDays: number }[];
            leaveEncashPerDay: number;
        };
    };
    updateLeavePolicy = async (payload: {
        staffType?: "TEACHER" | "MANAGEMENT"; sickDays?: number; personalDays?: number; familyDays?: number; otherDays?: number; leaveEncashPerDay?: number;
    }) => {
        const res = await apiClient.patch("/management/settings/leave-policy", payload);
        return res.data;
    };

    // ── Settings: Fee-defaulter reminder ladder (P1-COM-06 per-tenant) ──────
    getFeeReminderSettings = async () => {
        const res = await apiClient.get("/management/settings/fee-reminders");
        return res.data as { enabled: boolean; gentleDays: number; firmDays: number; finalDays: number; note?: string };
    };
    updateFeeReminderSettings = async (payload: { enabled?: boolean; gentleDays?: number; firmDays?: number; finalDays?: number }) => {
        const res = await apiClient.patch("/management/settings/fee-reminders", payload);
        return res.data as { message: string; enabled: boolean; gentleDays: number; firmDays: number; finalDays: number };
    };

    // ── Settings: Email service (Zepto BYO or platform-shared) ─────────────
    getEmailSettings = async () => {
        const res = await apiClient.get("/management/settings/email");
        return res.data as {
            email: {
                enabled: boolean;
                useOwnCredentials: boolean;
                isFullyConfigured: boolean;
                byoComplete: boolean;
                platformAvailable: boolean;
                schoolEmailSlug: string | null;
                emailDomain: string | null;
                emailFromAddress: string | null;
                emailFromName: string | null;
                hasAuthKey: boolean;
                authKeyMask: string | null;
                pricingMessage: string;
                pricing: { usingShared: boolean; pricePerBlock: number; emailsPerBlock: number };
                configuredAt: string | null;
                configuredByName: string | null;
                moduleAddresses: Record<string, string>;
                modulePreview: Record<string, { localPart: string; email: string; isOverride: boolean }> | null;
                note: string;
            };
        };
    };

    /**
     * Self-service email setup. Management can:
     *   - Toggle service on/off (`enabled`)
     *   - Pick mode (`useOwnCredentials`: true=BYO, false=shared)
     *   - For BYO: provide `emailAuthKey` + `emailDomain`
     *   - Set the display `emailFromName`
     * In shared mode, the backend auto-fills `school_email_slug` from
     * `tenants.slug` when management first enables — no superadmin needed.
     */
    updateEmailSettings = async (payload: {
        enabled?: boolean;
        useOwnCredentials?: boolean;
        emailAuthKey?: string;
        emailDomain?: string;
        emailFromName?: string;
        clearAuthKey?: boolean;
    }) => {
        const res = await apiClient.patch("/management/settings/email", payload);
        return res.data as {
            message: string;
            email: {
                enabled: boolean;
                useOwnCredentials: boolean;
                schoolEmailSlug?: string | null;
                configuredAt: string | null;
            };
        };
    };

    getEmailModuleAddresses = async () => {
        const res = await apiClient.get("/management/settings/email/module-addresses");
        return res.data as {
            serviceEnabled: boolean;
            modules: Record<string, { localPart: string; isOverride: boolean }>;
            preview: Record<string, { localPart: string; email: string; isOverride: boolean }> | null;
            defaults: Record<string, string>;
        };
    };

    updateEmailModuleAddresses = async (addresses: Record<string, string>) => {
        const res = await apiClient.patch("/management/settings/email/module-addresses", { addresses });
        return res.data as {
            message: string;
            modules: Record<string, { localPart: string; isOverride: boolean }>;
            preview: Record<string, { localPart: string; email: string; isOverride: boolean }> | null;
        };
    };

    getEmailUsage = async () => {
        const res = await apiClient.get("/management/settings/email/usage");
        return res.data as {
            usage: {
                serviceEnabled: boolean;
                usingShared: boolean;
                pricingMessage: string;
                thisMonth: { totalSent: number; billableSent: number; failed: number; bounced: number; estimatedAmount: number };
                lastMonth: { totalSent: number; billableSent: number; failed: number; bounced: number; estimatedAmount: number };
                pricing: { pricePerBlock: number; emailsPerBlock: number };
            };
            bills: Array<{
                id: string; invoiceNumber: string;
                periodStart: string; periodEnd: string;
                emailCount: number; billableEmailCount: number;
                amount: number; status: string;
                generatedAt: string;
            }>;
        };
    };

    sendTestEmail = async (payload: { to: { email: string; name?: string }; subject?: string; body?: string }) => {
        const res = await apiClient.post("/management/settings/email/test", payload);
        return res.data as {
            message: string;
            result: { logId: string | null; providerMessageId: string | null; status: "SENT" | "FAILED"; usedSharedCredentials: boolean; billable: boolean };
        };
    };

    // ── Settings: Email module toggles ──────────────────────────────────────
    getEmailModules = async () => {
        const res = await apiClient.get("/management/settings/email-modules");
        return res.data as {
            serviceEnabled: boolean;
            modules: Record<string, boolean>;
            availableModules: string[];
        };
    };

    updateEmailModules = async (settings: Record<string, boolean | null>) => {
        const res = await apiClient.patch("/management/settings/email-modules", { settings });
        return res.data as {
            message: string;
            serviceEnabled: boolean;
            modules: Record<string, boolean>;
        };
    };

    // ── Settings: per-sub-activity email gates (#8) ─────────────────────────
    /** `inherited: true` = the trigger has no override and follows its module. */
    getEmailActivities = async () => {
        const res = await apiClient.get("/management/settings/email-activities");
        return res.data as EmailActivitySettingsResponse;
    };

    /** Keys are "MODULE:ACTIVITY"; pass null to drop an override. */
    updateEmailActivities = async (settings: Record<string, boolean | null>) => {
        const res = await apiClient.patch("/management/settings/email-activities", { settings });
        return res.data as EmailActivitySettingsResponse & { message: string };
    };

    // ── Platform bills (management → platform) ──────────────────────────────
    getPlatformBills = async () => {
        const res = await apiClient.get("/management/platform-bills");
        return res.data.data as {
            rows: Array<{
                source: "SUBSCRIPTION" | "EMAIL";
                id: string;
                cycleId: string | null;
                title: string;
                amount: number;
                status: string;
                dueDate: string | null;
                paidAt: string | null;
                paidVia: string | null;
                invoiceNumber: string;
                lineItems: unknown;
                isOverdue: boolean;
            }>;
            totals: { pendingCount: number; overdueCount: number; pendingAmountINR: number };
            activeCycle: {
                id: string;
                cycleNumber: number;
                startDate: string;
                endDate: string;
                installments: number;
                seatsSnapshot: number;
                totalINR: number;
                paidINR: number;
                status: string;
                discountPercent: number;
            } | null;
        };
    };

    getPlatformBillsOverdueSummary = async () => {
        const res = await apiClient.get("/management/platform-bills/overdue-summary");
        return res.data.data as {
            count: number;
            totalAmountINR: number;
            subscription: Array<{ id: string; invoiceNumber: string; amount: number; dueDate: string }>;
            email: Array<{ id: string; invoiceNumber: string; amount: number; periodEnd: string }>;
        };
    };

    createPlatformBillOrder = async (invoiceId: string) => {
        const res = await apiClient.post(`/management/platform-bills/${invoiceId}/create-order`);
        return res.data as {
            orderId: string;
            keyId: string;
            amountINR: number;
            invoiceNumber: string;
        };
    };

    verifyPlatformBillOrder = async (invoiceId: string, payload: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }) => {
        const res = await apiClient.post(`/management/platform-bills/${invoiceId}/verify`, payload);
        return res.data;
    };

    // ── Communication broadcast ─────────────────────────────────────────────
    previewEmailBroadcast = async (audience: {
        type: "ALL" | "SESSION" | "CLASS" | "SECTION" | "COURSE" | "SUBJECT" | "TRANSPORT_ZONE" | "INDIVIDUAL";
        recipientType?: "STUDENTS" | "TEACHERS" | "BOTH";
        ids?: string[];
    }) => {
        const res = await apiClient.post("/management/communication/email-broadcast/preview", audience);
        return res.data as {
            audience: typeof audience;
            recipientCount: number;
            sample: Array<{ name: string; email: string; role: string }>;
        };
    };

    sendEmailBroadcast = async (payload: {
        subject: string;
        body: string;
        audience: {
            type: "ALL" | "SESSION" | "CLASS" | "SECTION" | "COURSE" | "SUBJECT" | "TRANSPORT_ZONE" | "INDIVIDUAL";
            recipientType?: "STUDENTS" | "TEACHERS" | "BOTH";
            ids?: string[];
        };
        dryRun?: boolean;
    }) => {
        const res = await apiClient.post("/management/communication/email-broadcast", payload);
        return res.data as {
            message: string;
            skipped: boolean;
            attempted: number;
            sent: number;
            failed: number;
            recipientCount: number;
            reasons?: string[];
        };
    };

    // ─── SPORTS ──────────────────────────────────────────────────────────────
    listSports = async () => {
        const res = await apiClient.get("/management/sports/sports");
        return res.data.data as Array<{ id: string; name: string; slug: string; category: string; description: string | null; isActive: boolean }>;
    };
    createSport = async (payload: { name: string; category?: string; description?: string }) => {
        const res = await apiClient.post("/management/sports/sports", payload);
        return res.data.data;
    };
    updateSport = async (id: string, payload: Partial<{ name: string; category: string; description: string }>) => {
        const res = await apiClient.patch(`/management/sports/sports/${id}`, payload);
        return res.data.data;
    };
    deleteSport = async (id: string) => {
        const res = await apiClient.delete(`/management/sports/sports/${id}`);
        return res.data.data;
    };
    listSportsEvents = async (filters: { sessionId?: string; sportId?: string; status?: string } = {}) => {
        const res = await apiClient.get("/management/sports/events", { params: filters });
        return res.data.data as Array<any>;
    };
    getSportsEvent = async (id: string) => {
        const res = await apiClient.get(`/management/sports/events/${id}`);
        return res.data.data;
    };
    createSportsEvent = async (payload: any) => {
        const res = await apiClient.post("/management/sports/events", payload);
        return res.data.data;
    };
    updateSportsEvent = async (id: string, payload: any) => {
        const res = await apiClient.patch(`/management/sports/events/${id}`, payload);
        return res.data.data;
    };
    publishSportsEvent = async (id: string) => {
        const res = await apiClient.post(`/management/sports/events/${id}/publish`);
        return res.data.data;
    };
    openSportsEnrollment = async (id: string) => {
        const res = await apiClient.post(`/management/sports/events/${id}/open-enrollment`);
        return res.data.data;
    };
    closeSportsEnrollment = async (id: string) => {
        const res = await apiClient.post(`/management/sports/events/${id}/close-enrollment`);
        return res.data.data;
    };
    completeSportsEvent = async (id: string) => {
        const res = await apiClient.post(`/management/sports/events/${id}/complete`);
        return res.data.data;
    };
    cancelSportsEvent = async (id: string, reason?: string) => {
        const res = await apiClient.delete(`/management/sports/events/${id}`, { data: { reason } });
        return res.data.data;
    };
    addSportsCoach = async (eventId: string, payload: { teacherId: string; role?: "HEAD" | "ASSISTANT" }) => {
        const res = await apiClient.post(`/management/sports/events/${eventId}/coaches`, payload);
        return res.data.data;
    };
    removeSportsCoach = async (eventId: string, coachId: string) => {
        const res = await apiClient.delete(`/management/sports/events/${eventId}/coaches/${coachId}`);
        return res.data.data;
    };
    listSportsEnrollments = async (eventId: string, status?: string) => {
        const res = await apiClient.get(`/management/sports/events/${eventId}/enrollments`, { params: { status } });
        return res.data.data as Array<any>;
    };
    decideSportsEnrollment = async (enrollmentId: string, decision: "ACCEPT" | "REJECT" | "WAITLIST", rejectionReason?: string) => {
        const res = await apiClient.patch(`/management/sports/enrollments/${enrollmentId}/decide`, { decision, rejectionReason });
        return res.data.data;
    };
    getStudentSportsProfile = async (studentId: string) => {
        const res = await apiClient.get(`/management/sports/students/${studentId}/sports-profile`);
        return res.data.data;
    };
    updateStudentSportsProfile = async (studentId: string, payload: any) => {
        const res = await apiClient.put(`/management/sports/students/${studentId}/sports-profile`, payload);
        return res.data.data;
    };
    listSportsIncidents = async (eventId: string) => {
        const res = await apiClient.get(`/management/sports/events/${eventId}/incidents`);
        return res.data.data as Array<any>;
    };
    createSportsIncident = async (eventId: string, payload: any) => {
        const res = await apiClient.post(`/management/sports/events/${eventId}/incidents`, payload);
        return res.data.data;
    };
    listSportsAchievements = async (eventId: string) => {
        const res = await apiClient.get(`/management/sports/events/${eventId}/achievements`);
        return res.data.data as Array<any>;
    };
    createSportsAchievement = async (eventId: string, payload: any) => {
        const res = await apiClient.post(`/management/sports/events/${eventId}/achievements`, payload);
        return res.data.data;
    };
    getSportsAttendanceSummary = async (eventId: string, from?: string, to?: string) => {
        const res = await apiClient.get(`/management/sports/events/${eventId}/attendance-summary`, { params: { from, to } });
        return res.data.data as Array<any>;
    };

    // ── Jobs ─────────────────────────────────────────────────────────────
    /**
     * Trigger the monthly attendance-report job for this tenant. If month/year
     * are omitted, the backend defaults to the month just ended. Returns the
     * full run summary (studentsProcessed, emailsSent, emailsFailed, per-tenant
     * breakdown). ATTENDANCE module must be enabled.
     */
    runAttendanceReportJob = async (payload?: { month?: number; year?: number }) => {
        const res = await apiClient.post('/management/jobs/attendance-report/run', payload ?? {});
        return res.data as {
            success: boolean;
            message: string;
            result: {
                period: { monthLabel: string; periodStart: string; periodEnd: string; month: number; year: number };
                tenantsProcessed: number;
                studentsProcessed: number;
                emailsSent: number;
                emailsFailed: number;
                errors: number;
                startedAt: string;
                finishedAt: string;
            };
        };
    };

    /**
     * Trigger the overdue late-fee sweep for this tenant. Flips PENDING → OVERDUE
     * and idempotently issues one LATE_FEE invoice per (parent, delinquent month),
     * capped at `maxPeriodsPerParent` (default 12). Gated on the FINANCE module.
     */
    runLateFeeSweepJob = async (payload?: { maxPeriodsPerParent?: number }) => {
        const res = await apiClient.post('/management/jobs/late-fee-sweep/run', payload ?? {});
        return res.data as {
            success: boolean;
            message: string;
            result: {
                tenantsProcessed: number;
                overdueMarked: number;
                lateFeesIssued: number;
                totalLateFeeINR: number;
                parentsProcessed: number;
                parentsSkipped: number;
                errors: number;
                startedAt: string;
                finishedAt: string;
            };
        };
    };

    /** Fetch late-fee sweep job run history for this tenant. */
    getLateFeeSweepJobRuns = async (limit = 20) => {
        const res = await apiClient.get('/management/jobs/late-fee-sweep/runs', { params: { limit } });
        return res.data.data as Array<{
            id: string;
            jobName: string;
            status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
            startedAt: string;
            finishedAt: string | null;
            triggeredBy: string | null;
            tenantId: string | null;
            error: string | null;
            summary: any;
            tenantSlice: null | {
                tenantId: string; tenantName: string;
                status: 'SWEPT' | 'ERROR';
                overdueMarked: number;
                lateFeesIssued: number;
                totalLateFeeINR: number;
                parentsProcessed: number;
                parentsSkipped: number;
                error?: string;
            };
        }>;
    };

    /** Fetch attendance-report job run history for this tenant. */
    getAttendanceReportJobRuns = async (limit = 20) => {
        const res = await apiClient.get('/management/jobs/attendance-report/runs', { params: { limit } });
        return res.data.data as Array<{
            id: string;
            jobName: string;
            status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
            startedAt: string;
            finishedAt: string | null;
            triggeredBy: string | null;
            tenantId: string | null;
            error: string | null;
            summary: any;
            /** This tenant's slice of a multi-tenant scheduled run (null for tenant-scoped runs). */
            tenantSlice: null | {
                tenantId: string; tenantName: string;
                status: 'SENT' | 'SKIPPED_MODULE_DISABLED' | 'SKIPPED_NO_STUDENTS' | 'ERROR';
                studentsProcessed: number;
                emailsSent: number;
                emailsFailed: number;
                error?: string;
            };
        }>;
    };

    // ── Inventory ─────────────────────────────────────────────────────────────
    listInventoryItems = async (params: {
        search?: string;
        category?: string;
        unit?: string;
        active?: 'true' | 'false' | 'all';
        lowStock?: 'true';
    } = {}) => {
        const res = await apiClient.get('/management/inventory/items', { params });
        return res.data as {
            success: true;
            items: Array<{
                id: string;
                name: string;
                sku: string | null;
                category: string;
                unit: string;
                currentStock: number;
                reorderLevel: number;
                unitCost: number | null;
                stockValue: number;
                description: string | null;
                storageLocation: string | null;
                isActive: boolean;
                lowStock: boolean;
                createdAt: string;
                updatedAt: string;
            }>;
        };
    };

    getInventoryItem = async (id: string) => {
        const res = await apiClient.get(`/management/inventory/items/${id}`);
        return res.data as {
            success: true;
            item: {
                id: string; name: string; sku: string | null; category: string; unit: string;
                currentStock: number; reorderLevel: number; unitCost: number | null;
                stockValue: number; description: string | null; storageLocation: string | null;
                isActive: boolean; lowStock: boolean;
                createdAt: string; updatedAt: string;
            };
            transactions: Array<{
                id: string; type: string; quantity: number; balanceAfter: number;
                unitCost: number | null; totalCost: number | null;
                deltaDirection: "INCREASE" | "DECREASE" | null;
                supplier: string | null; invoiceRef: string | null; purchasedAt: string | null;
                consumerType: string | null; consumerName: string | null; consumerLabel: string | null;
                notes: string | null; performedByName: string | null; performedAt: string;
            }>;
            consumers: Array<{ key: string; type: string; label: string; totalQty: number; txnCount: number }>;
            suppliers: Array<{ supplier: string; totalQty: number; totalSpend: number; txnCount: number; lastPurchasedAt: string | null }>;
            totals: { procured: number; consumed: number; spend: number; txnCount: number };
        };
    };

    createInventoryItem = async (data: {
        name: string;
        sku?: string;
        category?: string;
        unit?: string;
        reorderLevel?: number;
        unitCost?: number;
        description?: string;
        storageLocation?: string;
        openingStock?: number;
    }) => {
        const res = await apiClient.post('/management/inventory/items', data);
        return res.data;
    };

    updateInventoryItem = async (id: string, data: Partial<{
        name: string;
        sku: string | null;
        category: string;
        unit: string;
        reorderLevel: number;
        unitCost: number | null;
        description: string | null;
        storageLocation: string | null;
        isActive: boolean;
    }>) => {
        const res = await apiClient.patch(`/management/inventory/items/${id}`, data);
        return res.data;
    };

    deactivateInventoryItem = async (id: string) => {
        const res = await apiClient.delete(`/management/inventory/items/${id}`);
        return res.data;
    };

    procureInventoryItem = async (id: string, data: {
        quantity: number;
        unitCost?: number;
        supplier?: string;
        invoiceRef?: string;
        purchasedAt?: string;
        notes?: string;
    }) => {
        const res = await apiClient.post(`/management/inventory/items/${id}/procure`, data);
        return res.data;
    };

    consumeInventoryItem = async (id: string, data: {
        quantity: number;
        consumerType: 'SCHOOL' | 'CLASS' | 'SECTION' | 'STUDENT' | 'TEACHER' | 'STAFF' | 'OTHER';
        consumerClassId?: string;
        consumerSectionId?: string;
        consumerStudentId?: string;
        consumerTeacherId?: string;
        consumerStaffId?: string;
        consumerLabel?: string;
        notes?: string;
    }) => {
        const res = await apiClient.post(`/management/inventory/items/${id}/consume`, data);
        return res.data;
    };

    adjustInventoryItem = async (id: string, data: {
        newStock: number;
        notes?: string;
    }) => {
        const res = await apiClient.post(`/management/inventory/items/${id}/adjust`, data);
        return res.data;
    };

    listInventoryTransactions = async (params: {
        itemId?: string;
        type?: string;
        consumerType?: string;
        classId?: string;
        sectionId?: string;
        studentId?: string;
        teacherId?: string;
        fromDate?: string;
        toDate?: string;
        limit?: number;
    } = {}) => {
        const res = await apiClient.get('/management/inventory/transactions', { params });
        return res.data as {
            success: true;
            transactions: Array<{
                id: string;
                itemId: string;
                itemName: string;
                itemUnit: string;
                type: string;
                quantity: number;
                balanceAfter: number;
                unitCost: number | null;
                totalCost: number | null;
                deltaDirection: 'INCREASE' | 'DECREASE' | null;
                supplier: string | null;
                invoiceRef: string | null;
                purchasedAt: string | null;
                consumerType: string | null;
                consumerName: string | null;
                consumerLabel: string | null;
                notes: string | null;
                performedBy: string | null;
                performedByName: string | null;
                performedAt: string;
            }>;
        };
    };

    getInventorySummary = async () => {
        const res = await apiClient.get('/management/inventory/summary');
        return res.data as {
            success: true;
            summary: {
                totals: {
                    items: number;
                    activeItems: number;
                    stockValue: number;
                    lowStockCount: number;
                };
                movement: {
                    thisMonth: { procured: number; consumed: number; procuredSpend: number; totalTxns: number };
                    lastMonth: { procured: number; consumed: number; procuredSpend: number };
                    deltas: { procuredPct: number | null; consumedPct: number | null; procuredSpendPct: number | null };
                };
                lowStock: Array<{
                    id: string; name: string; unit: string; category: string;
                    currentStock: number; reorderLevel: number;
                }>;
                byCategory: Array<{
                    category: string; itemCount: number; totalStock: number; stockValue: number;
                }>;
                topConsumingClasses: Array<{
                    classId: string; className: string; txnCount: number; totalUnits: number;
                }>;
                recentActivity: Array<{
                    id: string; itemId: string; itemName: string;
                    type: string; quantity: number; balanceAfter: number;
                    unitCost: number | null; totalCost: number | null;
                    performedAt: string;
                }>;
            };
        };
    };

    listInventoryConsumers = async (type: string, search?: string) => {
        const res = await apiClient.get('/management/inventory/consumers', { params: { type, search } });
        return res.data as {
            success: true;
            options: Array<{ id: string; label: string }>;
        };
    };

    // ── Homework (management oversight) ───────────────────────────────────────
    getHomeworkList = async (params: { sessionId?: string; classId?: string; sectionId?: string; subjectId?: string; status?: string }) => {
        const res = await apiClient.get('/management/homework', { params });
        return res.data as { count: number; homework: any[] };
    };
    getHomeworkInsights = async (sessionId?: string) => {
        const res = await apiClient.get('/management/homework/insights', { params: sessionId ? { sessionId } : undefined });
        return res.data as { summary: any; byClass: any[] };
    };
    getHomeworkDetail = async (id: string) => {
        const res = await apiClient.get(`/management/homework/${id}`);
        return res.data as { homework: any; submissionsByStatus: Array<{ status: string; cnt: number }> };
    };

    // ── Timetable (management edit) ───────────────────────────────────────────
    getSectionTimetable = async (sectionId: string, sessionId?: string) => {
        const res = await apiClient.get(`/management/timetable/section/${sectionId}`, { params: sessionId ? { sessionId } : undefined });
        return res.data as { sectionId: string; count: number; entries: any[] };
    };
    createTimetableEntry = async (data: {
        sessionId: string; sectionId: string; classId?: string; dayOfWeek: number; periodNumber: number;
        startTime: string; endTime: string; type?: string; subjectId?: string | null; teacherId?: string | null; room?: string | null; note?: string | null;
    }) => {
        const res = await apiClient.post('/management/timetable/entry', data);
        return res.data as { message: string; entry: any };
    };
    updateTimetableEntry = async (id: string, data: Partial<{ startTime: string; endTime: string; type: string; subjectId: string | null; teacherId: string | null; room: string | null; note: string | null }>) => {
        const res = await apiClient.patch(`/management/timetable/entry/${id}`, data);
        return res.data as { message: string; entry: any };
    };
    deleteTimetableEntry = async (id: string) => {
        const res = await apiClient.delete(`/management/timetable/entry/${id}`);
        return res.data as { message: string };
    };
    getTimetableConflicts = async (sessionId?: string) => {
        const res = await apiClient.get('/management/timetable/conflicts', { params: sessionId ? { sessionId } : undefined });
        return res.data as { conflictCount: number; conflicts: any[] };
    };
    // Bell schedule (period start/end times) — same across all classes/sections.
    getTimetablePeriodConfig = async (sessionId: string) => {
        const res = await apiClient.get('/management/timetable/period-config', { params: { sessionId } });
        return res.data as { slots: Array<{ periodNumber: number; startTime: string; endTime: string; label: string | null; isBreak: boolean }> };
    };
    saveTimetablePeriodConfig = async (sessionId: string, slots: Array<{ periodNumber: number; startTime: string; endTime: string; label?: string | null; isBreak?: boolean }>) => {
        const res = await apiClient.put('/management/timetable/period-config', { sessionId, slots });
        return res.data as { message: string; count: number };
    };

    // ── Documents & Certificates (under People) ───────────────────────────────
    getCertificateCatalogue = async () => {
        const res = await apiClient.get('/management/documents/catalogue');
        return res.data as { catalogue: any[] };
    };
    getCertificates = async (params?: { status?: string; studentId?: string }) => {
        const res = await apiClient.get('/management/documents/certificates', { params });
        return res.data as { count: number; certificates: any[] };
    };
    /** Serial Transfer-Certificate register (P0-SAF-07). */
    getTcRegister = async (year?: string) => {
        const res = await apiClient.get('/management/documents/tc-register', { params: year ? { year } : undefined });
        return res.data as {
            total: number;
            entries: { id: string; serialNo: string | null; studentName: string; issueDate: string | null; publishedAt: string | null; fileName: string | null }[];
        };
    };
    getCertificatePrefill = async (id: string) => {
        const res = await apiClient.get(`/management/documents/certificates/${id}/prefill`);
        return res.data as { certType: string; fields: any[]; prefill: any; defaultExpiryDate: string; infinityDate: string };
    };

    // Board / UDISE+ return for a session (P0-SAF-08).
    getBoardReturns = async (sessionId: string) => {
        const res = await apiClient.get('/management/reports/board-returns', { params: { sessionId } });
        return res.data as {
            school: { name: string; udiseCode: string | null; affiliationNumber: string | null; boardAffiliation: string | null };
            sessionName: string;
            enrolment: { classes: { classId: string; className: string; male: number; female: number; other: number; total: number; cwsn: number }[]; totals: { male: number; female: number; other: number; total: number; cwsn: number } };
            staff: { total: number; male: number; female: number; other: number };
        };
    };
    downloadBoardReturns = async (sessionId: string, sessionName = "session") => {
        const res = await apiClient.get('/management/reports/board-returns', { params: { sessionId, format: "csv" }, responseType: "blob" });
        const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `board-returns-${sessionName.replace(/\s+/g, "-")}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    };
    publishCertificate = async (id: string, data: { fields: Record<string, any>; expiryDate: string; issueDate?: string }) => {
        const res = await apiClient.post(`/management/documents/certificates/${id}/publish`, data);
        return res.data;
    };
    rejectCertificate = async (id: string, reason: string) => {
        const res = await apiClient.post(`/management/documents/certificates/${id}/reject`, { reason });
        return res.data;
    };
    downloadCertificate = async (id: string) => {
        const res = await apiClient.get(`/management/documents/certificates/${id}/download`);
        return res.data as { url: string; fileName: string };
    };
    getStudentUploads = async (params?: { status?: string; studentId?: string }) => {
        const res = await apiClient.get('/management/documents/uploads', { params });
        return res.data as { count: number; uploads: any[] };
    };
    viewStudentUpload = async (id: string) => {
        const res = await apiClient.get(`/management/documents/uploads/${id}/view`);
        return res.data as { url: string; fileName: string };
    };
    verifyStudentUpload = async (id: string, action: 'VERIFY' | 'REJECT', reason?: string) => {
        const res = await apiClient.patch(`/management/documents/uploads/${id}/verify`, { action, ...(reason ? { reason } : {}) });
        return res.data;
    };

    // ── Teacher documents & certificates (mirror of the student set) ──────────
    getTeacherCertificates = async (params?: { status?: string; teacherId?: string }) => {
        const res = await apiClient.get('/management/teacher-documents/certificates', { params });
        return res.data as { count: number; certificates: any[] };
    };
    getTeacherCertificatePrefill = async (id: string) => {
        const res = await apiClient.get(`/management/teacher-documents/certificates/${id}/prefill`);
        return res.data as { certType: string; fields: any[]; prefill: any; defaultExpiryDate: string; infinityDate: string };
    };
    publishTeacherCertificate = async (id: string, data: { fields: Record<string, any>; expiryDate: string; issueDate?: string }) => {
        const res = await apiClient.post(`/management/teacher-documents/certificates/${id}/publish`, data);
        return res.data;
    };
    rejectTeacherCertificate = async (id: string, reason: string) => {
        const res = await apiClient.post(`/management/teacher-documents/certificates/${id}/reject`, { reason });
        return res.data;
    };
    downloadTeacherCertificate = async (id: string) => {
        const res = await apiClient.get(`/management/teacher-documents/certificates/${id}/download`);
        return res.data as { url: string; fileName: string };
    };
    getTeacherUploads = async (params?: { status?: string; teacherId?: string }) => {
        const res = await apiClient.get('/management/teacher-documents/uploads', { params });
        return res.data as { count: number; uploads: any[] };
    };
    viewTeacherUpload = async (id: string) => {
        const res = await apiClient.get(`/management/teacher-documents/uploads/${id}/view`);
        return res.data as { url: string; fileName: string };
    };
    verifyTeacherUpload = async (id: string, action: 'VERIFY' | 'REJECT', reason?: string) => {
        const res = await apiClient.patch(`/management/teacher-documents/uploads/${id}/verify`, { action, ...(reason ? { reason } : {}) });
        return res.data;
    };

    // ── HR & Payroll ──────────────────────────────────────────────────────────
    listHrStaff = async () => {
        const res = await apiClient.get('/management/hr/staff');
        return res.data as { staff: HrStaffRow[] };
    };
    getHrStaff = async (staffType: string, staffId: string) => {
        const res = await apiClient.get(`/management/hr/staff/${staffType}/${staffId}`);
        return res.data as { identity: HrStaffIdentity; profile: HrProfile | null; salary: HrSalary | null };
    };
    saveHrProfile = async (staffType: string, staffId: string, data: Partial<HrProfile>) => {
        const res = await apiClient.put(`/management/hr/staff/${staffType}/${staffId}/profile`, data);
        return res.data as { message: string; profile: HrProfile };
    };
    saveHrSalary = async (staffType: string, staffId: string, data: { basicSalary: number; effectiveFrom: string; components: HrComponent[] }) => {
        const res = await apiClient.put(`/management/hr/staff/${staffType}/${staffId}/salary`, data);
        return res.data as { message: string; structureId: string; preview: ComputedPayslip };
    };
    listPayrollRuns = async () => {
        const res = await apiClient.get('/management/hr/payroll/runs');
        return res.data as { runs: PayrollRun[] };
    };
    // Per-teacher leave balance + encashment preview for a session (P1-TT-05).
    getHrLeaveBalances = async (sessionId: string) => {
        const res = await apiClient.get('/management/hr/leave-balances', { params: { sessionId } });
        return res.data as {
            entitlement: number; encashPerDay: number; totalEncash: number;
            teachers: { teacherId: string; teacherName: string; entitlement: number; taken: number; balance: number; encashAmount: number }[];
        };
    };
    generatePayrollRun = async (month: number, year: number) => {
        const res = await apiClient.post('/management/hr/payroll/runs', { month, year });
        return res.data as { message: string; runId: string; created: number; skipped: number; totalNet: number };
    };

    // ── Teacher appraisals (P3-HR-07, HR-4) ────────────────────────────────
    listAppraisals = async (sessionId: string) => {
        const res = await apiClient.get('/management/hr/appraisals', { params: { sessionId } });
        return res.data as {
            appraisals: {
                id: string; teacherId: string; teacherName: string; status: 'IN_PROGRESS' | 'CLOSED';
                q1Notes: string | null; q2Notes: string | null; q3Notes: string | null; q4Notes: string | null;
                summaryNotes: string | null; salaryChange: 'NONE' | 'BONUS' | 'INCREMENT';
                bonusAmount: number; incrementPercent: number; nextSessionId: string | null; closedAt: string | null;
            }[];
        };
    };
    createAppraisal = async (teacherId: string, sessionId: string) => {
        const res = await apiClient.post('/management/hr/appraisals', { teacherId, sessionId });
        return res.data as { appraisal: { id: string } };
    };
    setAppraisalQuarter = async (id: string, quarter: 1 | 2 | 3 | 4, notes: string) => {
        const res = await apiClient.patch(`/management/hr/appraisals/${id}/quarter`, { quarter, notes });
        return res.data;
    };
    closeAppraisal = async (id: string, payload: {
        summaryNotes: string; nextSessionId?: string | null;
        salaryChange: 'NONE' | 'BONUS' | 'INCREMENT'; bonusAmount?: number; incrementPercent?: number;
    }) => {
        const res = await apiClient.post(`/management/hr/appraisals/${id}/close`, payload);
        return res.data;
    };
    // AI-draft the appraisal summary from the quarter notes (charges the tenant AI rate).
    generateAppraisalSummary = async (id: string) => {
        const res = await apiClient.post(`/management/hr/appraisals/${id}/generate-summary`);
        return res.data as { draft: string; charged: number };
    };
    // AI-draft a student report-card / promotion feedback from their 360 data.
    generateStudentReport = async (studentId: string, kind: 'REPORT_CARD' | 'PROMOTION_FEEDBACK', sessionId?: string) => {
        const res = await apiClient.post(`/management/student/${studentId}/generate-report`, { kind, ...(sessionId ? { sessionId } : {}) });
        return res.data as { draft: string; charged: number };
    };
    getPayrollRun = async (runId: string) => {
        const res = await apiClient.get(`/management/hr/payroll/runs/${runId}`);
        return res.data as { run: PayrollRun; payslips: Payslip[] };
    };
    finalizePayrollRun = async (runId: string) => {
        const res = await apiClient.post(`/management/hr/payroll/runs/${runId}/finalize`);
        return res.data as { message: string; run: PayrollRun };
    };
    getPayslip = async (payslipId: string) => {
        const res = await apiClient.get(`/management/hr/payslips/${payslipId}`);
        return res.data as { payslip: Payslip; payments: SalaryPayment[] };
    };
    recordSalaryPayment = async (payslipId: string, data: { amount: number; method: string; paidAt: string; reference?: string; notes?: string }) => {
        const res = await apiClient.post(`/management/hr/payslips/${payslipId}/payments`, data);
        return res.data as { message: string; paidAmount: number; status: string };
    };
    payslipPdfUrl = (payslipId: string) => `${apiClient.defaults.baseURL}/management/hr/payslips/${payslipId}/pdf`;
    cancelPayrollRun = async (runId: string) => {
        const res = await apiClient.post(`/management/hr/payroll/runs/${runId}/cancel`);
        return res.data as { message: string; status: string };
    };
    cancelPayslip = async (payslipId: string) => {
        const res = await apiClient.post(`/management/hr/payslips/${payslipId}/cancel`);
        return res.data as { message: string; status: string };
    };

    // ── School documents / publications (authoring) ─────────────────────────
    listPublications = async () => {
        const res = await apiClient.get('/management/publications');
        return res.data as { documents: ManagedPublication[] };
    };
    getPublication = async (id: string) => {
        const res = await apiClient.get(`/management/publications/${id}`);
        return res.data as { document: ManagedPublication };
    };
    createPublication = async (data: { title: string; category?: string; audience?: string; visibility?: string; summary?: string | null; content?: string | null }) => {
        const res = await apiClient.post('/management/publications', data);
        return res.data as { message: string; document: ManagedPublication };
    };
    updatePublication = async (id: string, data: Partial<{ title: string; category: string; audience: string; visibility: string; summary: string | null; content: string }>) => {
        const res = await apiClient.patch(`/management/publications/${id}`, data);
        return res.data as { message: string; document: ManagedPublication };
    };
    publishPublication = async (id: string) => {
        const res = await apiClient.post(`/management/publications/${id}/publish`);
        return res.data as { message: string; document: ManagedPublication };
    };
    unpublishPublication = async (id: string) => {
        const res = await apiClient.post(`/management/publications/${id}/unpublish`);
        return res.data as { message: string; document: ManagedPublication };
    };
    deletePublication = async (id: string) => {
        const res = await apiClient.delete(`/management/publications/${id}`);
        return res.data as { message: string };
    };
    seedPublications = async () => {
        const res = await apiClient.post('/management/publications/seed');
        return res.data as { message: string; created: number };
    };
    getPublicationAcks = async (id: string) => {
        const res = await apiClient.get(`/management/publications/${id}/acknowledgements`);
        return res.data as PublicationAckStats;
    };

    // ── Pantry ─────────────────────────────────────────────────────────────────
    listPantryItems = async () => {
        const res = await apiClient.get('/management/pantry/items');
        return res.data as { items: PantryItem[] };
    };
    createPantryItem = async (data: Partial<PantryItem> & { name: string; price: number }) => {
        const res = await apiClient.post('/management/pantry/items', data);
        return res.data as { message: string; item: PantryItem };
    };
    updatePantryItem = async (id: string, data: Partial<PantryItem>) => {
        const res = await apiClient.patch(`/management/pantry/items/${id}`, data);
        return res.data as { message: string; item: PantryItem };
    };
    deletePantryItem = async (id: string) => {
        const res = await apiClient.delete(`/management/pantry/items/${id}`);
        return res.data as { message: string };
    };
    restockPantryItem = async (id: string, quantity: number) => {
        const res = await apiClient.post(`/management/pantry/items/${id}/restock`, { quantity });
        return res.data as { message: string; item: PantryItem };
    };
    searchPantryHolders = async (q: string) => {
        const res = await apiClient.get('/management/pantry/holders', { params: { q } });
        return res.data as { holders: { userType: 'STUDENT' | 'TEACHER'; userId: string; name: string }[] };
    };
    listPantryWallets = async (q?: string) => {
        const res = await apiClient.get('/management/pantry/wallets', { params: q ? { q } : {} });
        return res.data as { wallets: PantryWalletRow[] };
    };
    getPantryWalletDetail = async (userType: string, userId: string) => {
        const res = await apiClient.get(`/management/pantry/wallets/${userType}/${userId}`);
        return res.data as { wallet: PantryWalletRow; transactions: PantryLedgerRow[]; spentToday: number };
    };
    pantryOfflineTopup = async (userType: string, userId: string, data: { amount: number; reference?: string; notes?: string }) => {
        const res = await apiClient.post(`/management/pantry/wallets/${userType}/${userId}/topup`, data);
        return res.data as { message: string; balance: number };
    };
    pantryAdjustWallet = async (userType: string, userId: string, data: { direction: 'CREDIT' | 'DEBIT'; amount: number; notes: string }) => {
        const res = await apiClient.post(`/management/pantry/wallets/${userType}/${userId}/adjust`, data);
        return res.data as { message: string; balance: number };
    };
    pantryPatchWallet = async (userType: string, userId: string, data: { dailyLimit?: number | null; isActive?: boolean }) => {
        const res = await apiClient.patch(`/management/pantry/wallets/${userType}/${userId}`, data);
        return res.data as { message: string; wallet: PantryWalletRow };
    };
    pantryPosSale = async (data: {
        items: { itemId: string; quantity: number }[];
        paymentMethod: 'WALLET' | 'CASH';
        userType?: string | null; userId?: string | null; notes?: string | null;
    }) => {
        const res = await apiClient.post('/management/pantry/pos/sale', data);
        return res.data as { message: string; order: PantryOrderRow };
    };
    listPantryOrders = async (filters: { status?: string; channel?: string; date?: string } = {}) => {
        const res = await apiClient.get('/management/pantry/orders', { params: filters });
        return res.data as { orders: PantryOrderRow[] };
    };
    getPantryOrder = async (id: string) => {
        const res = await apiClient.get(`/management/pantry/orders/${id}`);
        return res.data as { order: PantryOrderRow; items: PantryOrderLineRow[] };
    };
    pantryOrderReady = async (id: string) => (await apiClient.post(`/management/pantry/orders/${id}/ready`)).data as { message: string; order: PantryOrderRow };
    pantryOrderCollect = async (id: string) => (await apiClient.post(`/management/pantry/orders/${id}/collect`)).data as { message: string; order: PantryOrderRow };
    pantryOrderAbandon = async (id: string) => (await apiClient.post(`/management/pantry/orders/${id}/abandon`)).data as { message: string; status: string; refunded: number };
    pantryOrderRefund = async (id: string, notes?: string) => (await apiClient.post(`/management/pantry/orders/${id}/refund`, { notes })).data as { message: string; status: string; refunded: number };
    getPantryInsights = async (from?: string, to?: string) => {
        const res = await apiClient.get('/management/pantry/insights', { params: { ...(from ? { from } : {}), ...(to ? { to } : {}) } });
        return res.data as PantryInsights;
    };
}
export default new API();

// ── Pantry types ──────────────────────────────────────────────────────────────
export interface PantryItem {
    id: string; name: string; category: string; description: string | null;
    price: number; isVeg: boolean | null; isAvailable: boolean;
    stockCount: number | null; lowStockThreshold: number | null;
}
export interface PantryWalletRow {
    id: string; userType: 'STUDENT' | 'TEACHER'; userId: string;
    balance: number; dailyLimit: number | null; isActive: boolean;
    holderName?: string;
    // Safety flags carried to the counter (P0-SAF-01 / P2-PAN-06).
    allergies?: string | null;
    dietaryPreference?: string | null;
}
export interface PantryLedgerRow {
    id: string; type: 'CREDIT' | 'DEBIT';
    source: 'ONLINE_TOPUP' | 'OFFLINE_TOPUP' | 'PURCHASE' | 'REFUND' | 'ADJUSTMENT';
    amount: number; balanceAfter: number; reference: string | null; notes: string | null; createdAt: string;
}
export interface PantryOrderRow {
    id: string; channel: 'POS' | 'SELF';
    status: 'PLACED' | 'READY' | 'COLLECTED' | 'CANCELLED' | 'REFUNDED' | 'ABANDONED';
    userType: 'STUDENT' | 'TEACHER' | null; userName: string | null;
    paymentMethod: 'WALLET' | 'CASH'; totalAmount: number; itemCount: number; createdAt: string;
}
export interface PantryOrderLineRow {
    id: string; nameSnapshot: string; priceSnapshot: number; quantity: number; lineTotal: number;
}
export interface PantryInsights {
    period: { from: string; to: string };
    totals: { orders: number; grossRevenue: number; reversed: number };
    byMethod: { method: string; orders: number; revenue: number }[];
    byChannel: { channel: string; orders: number; revenue: number }[];
    topItems: { name: string; quantity: number; revenue: number }[];
    walletLiability: number;
    topUps: { online: number; offline: number };
    lowStock: { id: string; name: string; stockCount: number | null; lowStockThreshold: number | null }[];
}

// ── School documents / publications types ────────────────────────────────────
export interface ManagedPublication {
    id: string; slug: string; title: string; category: string;
    audience: 'STUDENT' | 'TEACHER' | 'BOTH'; visibility: 'PUBLIC' | 'PRIVATE';
    summary: string | null; content: string; version: number;
    status: 'DRAFT' | 'PUBLISHED';
    publishedByName: string | null; publishedAt: string | null;
    acknowledgementCount?: number;
    createdAt: string; updatedAt: string;
}
export interface PublicationAckStats {
    document: { id: string; title: string; version: number; visibility: string; audience: string; status: string };
    expectedCount: number; acknowledgedCount: number; pendingCount: number;
    acknowledgements: { userType: string; userId: string; userName: string | null; version: number; acknowledgedAt: string }[];
}

// ── HR & Payroll types ────────────────────────────────────────────────────────
export type StaffType = 'TEACHER' | 'MANAGEMENT';
export interface HrStaffIdentity { staffType: StaffType; staffId: string; name: string; email: string | null; phone: string | null; }
export interface HrProfile {
    id?: string; employeeCode?: string | null; designation?: string | null; department?: string | null;
    joiningDate?: string | null; employmentType?: string; employmentStatus?: string;
    bankAccountName?: string | null; bankAccountNumber?: string | null; bankIfsc?: string | null;
    bankName?: string | null; panNumber?: string | null; notes?: string | null;
}
export interface HrComponent { type: 'EARNING' | 'DEDUCTION'; label: string; calc: 'FIXED' | 'PERCENT_OF_BASIC'; value: number; }
export interface HrSalary { structure: { id: string; basicSalary: number; effectiveFrom: string }; components: (HrComponent & { id: string })[]; }
export interface HrStaffRow extends HrStaffIdentity {
    profile: (HrProfile & { employmentStatus: string; employmentType: string }) | null;
    hasSalary: boolean; basicSalary: number | null;
}
export interface ComputedPayslip { basicSalary: number; grossEarnings: number; totalDeductions: number; netPay: number; breakdown: { type: string; label: string; amount: number }[]; }
export interface PayrollRun { id: string; periodMonth: number; periodYear: number; status: string; totalNet: number; payslipCount: number; finalizedAt: string | null; createdAt: string; }
export interface Payslip {
    id: string; staffName: string; staffType: StaffType; periodMonth: number; periodYear: number;
    basicSalary: number; grossEarnings: number; totalDeductions: number; netPay: number; paidAmount: number;
    status: string; breakdown: { type: string; label: string; amount: number }[];
}
export interface SalaryPayment { id: string; amount: number; method: string; paidAt: string; reference: string | null; notes: string | null; }

// Consolidated term result (P1-EXM-11)
export interface ExamSubjectAggregate { subjectId: string; subjectName: string; achieved: number; total: number; pct: number; grade: string; examCount: number; }
export interface ExamAggregateRow {
    studentId: string; studentName: string; rollNo: string;
    classId: string; className: string; sectionId: string; sectionName: string;
    subjects: ExamSubjectAggregate[];
    achieved: number; total: number; pct: number; grade: string; examCount: number; rank: number;
}

// ── Parent-Teacher Meetings (P1-COM-07) ─────────────────────────────────────
export type PtmEventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
export type PtmSlotStatus = "OPEN" | "BOOKED" | "BLOCKED";
export type PtmAttendance = "PENDING" | "ATTENDED" | "NO_SHOW";
export interface PtmEvent {
    id: string; title: string; description: string | null;
    sessionId: string | null; classId: string | null; sectionId: string | null;
    meetingDate: string; location: string | null; slotDurationMins: number;
    status: PtmEventStatus; bookingOpensAt: string | null; bookingClosesAt: string | null;
    publishedAt: string | null; createdAt: string;
}
export interface PtmSlot {
    id: string; teacherId?: string; teacherName?: string;
    startTime: string; endTime: string; status: PtmSlotStatus;
    studentId: string | null; studentName?: string | null;
    attendance: PtmAttendance; teacherNotes?: string | null;
}
