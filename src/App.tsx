import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SubjectHomePage from './Pages/Subject/SubjectHome.tsx';
import Subject from './Pages/Subject/Subject.tsx'; 
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import CourseHome from "./Pages/Course/CourseHome.tsx";
import CourseDetails from "./Pages/Course/CourseDetails.tsx";
import TeacherHome from './Pages/Teacher/Teacher-Home.tsx';
import TeacherDetails from './Pages/Teacher/Teacher_details.tsx';
import SectionHome from "./Pages/Section/SectionHome.tsx";
import ClassHome from "./Pages/Class/ClassHome.tsx";
import ClassDetails from "./Pages/Class/ClassDetails.tsx";
import StudentHome from "./Pages/Student/StudentHome.tsx";
import ApplicantsHome from "./Pages/Applicants/ApplicantsHome.tsx";
import StudentsHome from "./Pages/Students/StudentsHome.tsx";
import ApplicantDetails from "./Pages/Applicants/ApplicantDetails.tsx";
import StudentDetails from "./Pages/Students/StudentDetails.tsx";
import StudentAdmission from "./Pages/StudentAdmission.tsx";
import ExamHome from "./Pages/Exam/ExamHome.tsx";
import ExamDetails from "./Pages/Exam/ExamDetails.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/student-admission" element={<StudentAdmission />} />
            <Route path="/applicants-home" element={<ApplicantsHome />} />
            <Route path="/students-home" element={<StudentsHome />} />
            <Route path="/subject-Home" element={<SubjectHomePage />} />
             <Route path="/subject/:slug" element={<Subject />} /> 
            <Route path="/course-Home" element={<CourseHome />} />
            <Route path="/course/:courseId" element={<CourseDetails />} />
            <Route path="/exam-home" element={<ExamHome />} />
            <Route path="/exam/:examId" element={<ExamDetails />} />

            {/* Teacher Routes */}
            <Route path="/teacher-home" element={<TeacherHome />} />
            <Route path="/teacher/:id" element={<TeacherDetails />} />
            <Route path="/class-Home" element={<ClassHome />} />
            <Route path="/class/:classId" element={<ClassDetails />} />
            <Route path="/section-home" element={<SectionHome />} />
            <Route path="/student-home" element={<StudentHome />} />
            <Route path="/applicant/:applicantId" element={<ApplicantDetails />} />
            <Route path="/student/:id" element={<StudentDetails />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
