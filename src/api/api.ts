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
  createSubject = async (subjectData: { name: string, slug: string, bookName: string }) => {
    const response = await apiClient.post('/management/subject/create', subjectData);
    return response.data;
  };
  deleteSubject = async (id: string) => {
    const response = await apiClient.delete(`/management/subject/${id}/delete`);
    return response.data;
  };

  // Course APIs-----------
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
    className?: string;
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
        className?: string;
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
}
export default new API();
