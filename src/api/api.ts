import axios from 'axios';

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
  createSubject = async (subjectData: { name: string, slug: string, bookName: string, sessionId: string }) => {
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
  createClass = async (data: any) => {
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

updateSubject = async (id: string, data: { name: string, slug: string, bookName: string, sessionId: string }) => {
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

admitStudent = async (studentId: string, data: { sessionId: string, classId: string, sectionId: string, courseId: string, admissionId: string, rollNo: string, transportOpted: boolean, transportZoneId?: string }) => {
    const response = await apiClient.post(`/management/student/admit/${studentId}`, data);
    return response.data;
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
    updateExam = async (examId: string, payload: any) => {
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

    // Create teacher (note: different signature than below)
    createTeacherEntry = async (teacherData: {
        name: string;
        gender: string;
        age: number;
        qualification: string;
        phone?: string;
    }) => {
        const res = await apiClient.post("/management/teacher/create", teacherData);
        return res.data;
    };

    // Update teacher
    updateTeacher = async (teacherId: string, teacherData: any) => {
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

    updateSchoolEvent = async (eventId: string, data: any) => {
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
}
export default new API();
