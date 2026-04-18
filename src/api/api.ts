import axios from 'axios';
import type { CreateClassData, UpdateTeacherData, UpdateExamPayload, UpdateSchoolEventData, UpdateLibraryBookData } from './types';

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

// Add a response interceptor to handle global errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (logoutCallback) {
          logoutCallback();
      }
    }
    return Promise.reject(error);
  }
);
class API {
  // --- Authentication APIs ---
  login = async (phone: string, password: string) => {
    const response = await apiClient.post('/management/auth/login', {phone, password});
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

  // Get All Classes
  getClasses = async () => {
    const response = await apiClient.get("/management/class");
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

//get All Sessions
getSessions= async () => {
    const response = await apiClient.get("/management/session");
    return response.data.sessions;
};

addTeacherToSubject = async (subjectId: string, body: { teacherId: string, sectionId: string }) => {
    const response = await apiClient.post(`/management/subject/${subjectId}/teachers`, body);
    return response.data;
};

removeTeacherFromSubject = async (subjectId: string, body: { teacherId: string }) => {
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

    // ── Notice Board APIs ─────────────────────────────────────────────────────

    getNoticeBoards = async (params?: { visibility?: string; classId?: string }) => {
        const res = await apiClient.get("/management/notice/boards", { params });
        return res.data;
    };

    createNoticeBoard = async (data: {
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
getAppliedStudents = async () => {
    const response = await apiClient.get('/management/student/applied');
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

getStudents = async (subjectId?: string, sessionId?: string) => {
    const response = await apiClient.get('/management/student/', {
        params: {
            ...(subjectId && { subjectId }),
            ...(sessionId && { sessionId }),
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
    email: string; comments?: string;
}) => {
    const response = await apiClient.post('/management/student/create', data);
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
    }) => {
        const res = await apiClient.post("/management/exam/create", payload);
        return res.data;
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

    // Get school-wide performance dashboard data
    getPerformanceDashboard = async (params: { sessionId: string; classId?: string; sectionId?: string; term?: string; studentId?: string }) => {
        const res = await apiClient.get("/management/exam/performance", { params });
        return res.data;
    };

    // ── Student Management APIs ───────────────────────────────────────────────

    // Get all applicants
    getApplicants = async () => {
        const res = await apiClient.get("/management/student/applied");
        return res.data;
    };

    // Get student details
    getStudentById = async (studentId: string) => {
        const res = await apiClient.get(`/management/student/${studentId}`);
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

    // Assign subject to teacher
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
    generateInvoices = async (data: { month: number; year: number; sessionId: string; dueDate: string }) => {
        const res = await apiClient.post("/management/fees/invoices/generate", data);
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
    getFeeSummary = async (params?: { month?: number; year?: number }) => {
        const res = await apiClient.get("/management/fees/summary", { params });
        return res.data;
    };

    // ── Attendance Module ─────────────────────────────────────────────────────
    getAttendanceSections = async () => {
        const res = await apiClient.get("/management/attendance/sections");
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

    getTeacherAttendanceView = async (params?: { teacherId?: string; date?: string; from?: string; to?: string }) => {
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
    getStudentLeaves = async (params?: { status?: string; classId?: string; sectionId?: string; from?: string; to?: string }) => {
        const res = await apiClient.get("/management/leave/student-leaves", { params });
        return res.data;
    };

    respondStudentLeaveApproval = async (approvalId: string, data: { action: string; remarks?: string }) => {
        const res = await apiClient.patch(`/management/leave/student-leaves/${approvalId}/respond`, data);
        return res.data;
    };

    getTeacherLeaves = async (params?: { status?: string; teacherId?: string; from?: string; to?: string }) => {
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
}
export default new API();
