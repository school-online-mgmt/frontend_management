import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { OnboardingProvider } from './context/OnboardingContext.tsx';
import OnboardingGate from './components/OnboardingGate.tsx';
import SubjectHomePage from './Pages/Subject/SubjectHome.tsx';
import SubjectDetails from './Pages/Subject/Subject.tsx';
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import CourseHome from "./Pages/Course/CourseHome.tsx";
import CourseDetails from "./Pages/Course/CourseDetails.tsx";
import TeacherHome from './Pages/Teacher/Teacher-Home.tsx';
import TeacherDetails from './Pages/Teacher/Teacher_details.tsx';
import AssignmentsPage from './Pages/Teacher/AssignmentsPage.tsx';
import ClassHome from "./Pages/Class/ClassHome.tsx";
import ClassDetails from "./Pages/Class/ClassDetails.tsx";
import ApplicantsHome from "./Pages/Applicants/ApplicantsHome.tsx";
import StudentsHome from "./Pages/Students/StudentsHome.tsx";
import ApplicantDetails from "./Pages/Applicants/ApplicantDetails.tsx";
import StudentDetails from "./Pages/Students/StudentDetails.tsx";
import ExamHome from "./Pages/Exam/ExamHome.tsx";
import ExamDetails from "./Pages/Exam/ExamDetails.tsx";
import AdmitCardsPage from "./Pages/Exam/AdmitCardsPage.tsx";
import ResultsPerformancePage from "./Pages/Performance/ResultsPerformancePage.tsx";
import NoticeBoardHome from "./Pages/Notice/NoticeBoardHome.tsx";
import NoticeBoardDetails from "./Pages/Notice/NoticeBoardDetails.tsx";
import CalendarPage from "./Pages/Events/CalendarPage.tsx";
import FeesHub from "./Pages/Fees/FeesHub.tsx";
import FeeInvoiceDetails from "./Pages/Fees/FeeInvoiceDetails.tsx";
import AttendanceHome from "./Pages/Attendance/AttendanceHome.tsx";
import JobsPage from "./Pages/Jobs/JobsPage.tsx";
import TeacherAttendanceHome from "./Pages/Attendance/TeacherAttendanceHome.tsx";
import LeaveHome from "./Pages/Leave/LeaveHome.tsx";
import LibraryHome from "./Pages/Library/LibraryHome.tsx";
import BookDetailsPage from "./Pages/Library/BookDetails.tsx";
import SectionDetails from "./Pages/Section/SectionDetails.tsx";
import StaffHome from "./Pages/Staff/StaffHome.tsx";
import TransportHub from "./Pages/Transport/TransportHub.tsx";
import SessionsPage from "./Pages/Sessions/SessionsPage.tsx";
import AccountPage from "./Pages/Account/AccountPage.tsx";
import PlatformBillsPage from "./Pages/Account/PlatformBillsPage.tsx";
import CommunicationPage from "./Pages/Communication/CommunicationPage.tsx";
import PublicationsPage from "./Pages/Communication/PublicationsPage.tsx";
import SupportCenter from "./Pages/Support/SupportCenter.tsx";
import TeacherApply from "./Pages/TeacherApply.tsx";
import OnboardingPage from "./Pages/Onboarding/OnboardingPage.tsx";
import SportsHome from "./Pages/Sports/SportsHome.tsx";
import SportsEventDetail from "./Pages/Sports/SportsEventDetail.tsx";
import InventoryHub from "./Pages/Inventory/InventoryHub.tsx";
import HomeworkPage from "./Pages/Homework/HomeworkPage.tsx";
import DocumentsPage from "./Pages/Documents/DocumentsPage.tsx";
import TimetablePage from "./Pages/Timetable/TimetablePage.tsx";
import PayrollHub from "./Pages/HR/PayrollHub.tsx";
import PantryHub from "./Pages/Pantry/PantryHub.tsx";
import ModuleGate from "./components/ModuleGate.tsx";
import AdminRoute from "./components/AdminRoute.tsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OnboardingProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/teacher-apply" element={<TeacherApply />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingGate />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* PEOPLE — students, applicants, staff (always-on bundled default) */}
            <Route path="/applicants-home" element={<ApplicantsHome />} />
            <Route path="/students-home" element={<StudentsHome />} />
            <Route path="/applicant/:applicantId" element={<ApplicantDetails />} />
            <Route path="/student/:id" element={<StudentDetails />} />
            <Route path="/staff" element={<StaffHome />} />
            <Route path="/documents" element={<DocumentsPage />} />

            {/* TEACHERS — teacher onboarding & directory (always-on bundled default) */}
            <Route path="/teacher-home" element={<TeacherHome />} />
            <Route path="/teacher/:id" element={<TeacherDetails />} />

            {/* ACADEMICS — sessions, classes, sections, courses, subjects */}
            <Route element={<ModuleGate module="ACADEMICS" />}>
              <Route path="/subject-Home" element={<SubjectHomePage />} />
              <Route path="/subject/:slug" element={<SubjectDetails />} />
              <Route path="/course-Home" element={<CourseHome />} />
              <Route path="/course/:courseId" element={<CourseDetails />} />
              <Route path="/class-Home" element={<ClassHome />} />
              <Route path="/class/:classId" element={<ClassDetails />} />
              <Route path="/section/:sectionId" element={<SectionDetails />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
            </Route>

            {/* STUDIES — exam workflow + performance */}
            <Route element={<ModuleGate module="STUDIES" />}>
              <Route path="/exam-home" element={<ExamHome />} />
              <Route path="/exam/:examId" element={<ExamDetails />} />
              <Route path="/exam/admit-cards" element={<AdmitCardsPage />} />
              <Route path="/performance" element={<ResultsPerformancePage />} />
            </Route>

            {/* ATTENDANCE — daily student & teacher attendance + leaves + reports */}
            <Route element={<ModuleGate module="ATTENDANCE" />}>
              <Route path="/attendance" element={<AttendanceHome />} />
              <Route path="/attendance/jobs" element={<JobsPage />} />
              <Route path="/teacher-attendance" element={<TeacherAttendanceHome />} />
              <Route path="/leaves" element={<LeaveHome />} />
            </Route>

            {/* LIBRARY */}
            <Route element={<ModuleGate module="LIBRARY" />}>
              <Route path="/library" element={<LibraryHome />} />
              <Route path="/library/books/:bookId" element={<BookDetailsPage />} />
            </Route>

            {/* COMMUNICATION — notices, broadcasts, calendar */}
            <Route element={<ModuleGate module="COMMUNICATION" />}>
              <Route path="/notices" element={<NoticeBoardHome />} />
              <Route path="/notices/:boardId" element={<NoticeBoardDetails />} />
              <Route path="/events" element={<Navigate to="/calendar" replace />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/communication" element={<CommunicationPage />} />
              <Route path="/publications" element={<PublicationsPage />} />
            </Route>

            {/* FINANCE — fees & invoices */}
            <Route element={<ModuleGate module="FINANCE" />}>
              <Route path="/fees" element={<FeesHub />} />
              <Route path="/fees/invoice/:id" element={<FeeInvoiceDetails />} />
              <Route path="/fees/jobs" element={<JobsPage />} />
            </Route>

            {/* Automated jobs — the standalone /jobs hub is ADMIN-only.
                Module-scoped job views (/attendance/jobs, /fees/jobs) stay open
                to those module's users above. */}
            <Route element={<AdminRoute />}>
              <Route path="/jobs" element={<JobsPage />} />
            </Route>

            {/* TRANSPORT */}
            <Route element={<ModuleGate module="TRANSPORT" />}>
              <Route path="/transport" element={<TransportHub />} />
            </Route>

            {/* SPORTS */}
            <Route element={<ModuleGate module="SPORTS" />}>
              <Route path="/sports" element={<SportsHome />} />
              <Route path="/sports/events/:eventId" element={<SportsEventDetail />} />
            </Route>

            {/* INVENTORY — item master, procurement, consumption ledger */}
            <Route element={<ModuleGate module="INVENTORY" />}>
              <Route path="/inventory" element={<InventoryHub />} />
              <Route path="/hr" element={<PayrollHub />} />
              <Route path="/pantry" element={<PantryHub />} />
            </Route>

            {/* HOMEWORK — school-wide oversight */}
            <Route element={<ModuleGate module="HOMEWORK" />}>
              <Route path="/homework" element={<HomeworkPage />} />
            </Route>

            {/* TIMETABLE — weekly class timetable editor */}
            <Route element={<ModuleGate module="TIMETABLE" />}>
              <Route path="/timetable" element={<TimetablePage />} />
            </Route>

            {/* Account / billing / support — ADMIN-only (not module-gated). */}
            <Route element={<AdminRoute />}>
              <Route path="/account" element={<AccountPage />} />
              <Route path="/platform-bills" element={<PlatformBillsPage />} />
              <Route path="/support" element={<SupportCenter />} />
            </Route>
            <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
