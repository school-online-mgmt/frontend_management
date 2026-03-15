import axios from 'axios';

// Create an Axios instance with a base URL from environment variables
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_HOST,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sessions/cookies
});

// Add a response interceptor to handle global errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Optional: Redirect to login or clear local storage if you were storing tokens
      // window.location.href = '/login'; 
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

  // --- Subject APIs ---
  getSubjects = async () => {
    const response = await apiClient.get('/management/subject');
    return response.data;
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
    const response = await apiClient.delete(`/management/subject/${id}/delete`);
    return response.data;
  };

  // --------Course APIs-----------
  // Get all courses
  getCourses = async () => {
    const response = await apiClient.get("/management/course");
    return response.data;
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
    description?: string;
    classId?: string;
  }) => {
    const response = await apiClient.put(
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
    return response.data;
  };

  // Get Class By ID or Slug
  getClassById = async (id: string) => {
    const response = await apiClient.get(`/management/class/${id}`);
    return response.data;
  };

  // Create class
  createClass = async (data: any) => {
    const response = await apiClient.put("/management/class/create", data);
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

//Get all Teachers
getTeachers = async () => {
    const response = await apiClient.get('/management/teacher');
    return response.data;
  };

//Get Teacher by id
getTeacherById = async (id: string) => {
    const response = await apiClient.get(`/management/teacher/${id}`);
    return response.data;
  };

//Create Teacher
createTeacher = async (teacherData: {
    name: string;
    gender: string;
    age: number;
    qualification: string
  }) => {
    const response = await apiClient.post('/management/teacher/create', teacherData);
    return response.data;
  };

//get All Sessions
getSessions= async () => {
    const response = await apiClient.get("/management/session");
    return response.data.sessions;
};

addTeacherToSubject = async (subjectId: string, body: { teacherId: string, sectionId: string, sessionId: string }) => {
    const response = await apiClient.post(`/management/subject/${subjectId}/addTeacher`, body);
    return response.data;
};

removeTeacherFromSubject = async (subjectId: string, body: { teacherId: string }) => {
    const response = await apiClient.delete(`/management/subject/${subjectId}/removeTeacher`, { data: body });
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
}
export default new API();
