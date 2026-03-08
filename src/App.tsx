import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SubjectHomePage from './Pages/Subject/SubjectHome.tsx';
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import CourseHome from "./Pages/Course/CourseHome.tsx";
import CourseDetails from "./Pages/Course/CourseDetails.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subject-Home" element={<SubjectHomePage />} />
            <Route path="/course-Home" element={<CourseHome />} />
            <Route path="/course/:courseId" element={<CourseDetails />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
