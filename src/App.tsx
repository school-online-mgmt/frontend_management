import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { OnboardingProvider } from './context/OnboardingContext.tsx';
import OnboardingGate from './components/OnboardingGate.tsx';
import SubjectHomePage from './Pages/Subject/SubjectHome.tsx';
import SubjectDetails from './Pages/Subject/Subject.tsx';
import OrganisationHome from './Pages/Organisation/OrganisationHome.tsx';
import PermissionsHome from './Pages/Permissions/PermissionsHome.tsx';
import EntranceExamPage from './Pages/Entrance/EntranceExamPage.tsx';
import EntrancePapersHome from './Pages/Entrance/EntrancePapersHome.tsx';
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import CourseHome from "./Pages/Course/CourseHome.tsx";
import CourseDetails from "./Pages/Course/CourseDetails.tsx";
import TeacherHome from './Pages/Teacher/Teacher-Home.tsx';
import TeacherDetails from './Pages/Teacher/Teacher_details.tsx';
import AssignmentsPage from './Pages/Teacher/AssignmentsPage.tsx';
import ClassDetails from "./Pages/Class/ClassDetails.tsx";
import ApplicantsHome from "./Pages/Applicants/ApplicantsHome.tsx";
import StudentsHome from "./Pages/Students/StudentsHome.tsx";
import ApplicantDetails from "./Pages/Applicants/ApplicantDetails.tsx";
import StudentDetails from "./Pages/Students/StudentDetails.tsx";
import ExamHome from "./Pages/Exam/ExamHome.tsx";
import ExamDetails from "./Pages/Exam/ExamDetails.tsx";
import AdmitCardsPage from "./Pages/Exam/AdmitCardsPage.tsx";
import ResultsPerformancePage from "./Pages/Performance/ResultsPerformancePage.tsx";
import AggregatePage from "./Pages/Exam/AggregatePage.tsx";
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
import ActivityPage from "./Pages/Activity/ActivityPage.tsx";
import GrievancesPage from "./Pages/Grievances/GrievancesPage.tsx";
import PtmPage from "./Pages/Ptm/PtmPage.tsx";
import StructureOverviewPage from "./Pages/Structure/StructureOverview.tsx";
import ClassesSections from "./Pages/Structure/ClassesSections.tsx";
import QuickSetup from "./Pages/Structure/QuickSetup.tsx";
import FeedbackPage from "./Pages/Feedback/FeedbackPage.tsx";
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
          <Route path="/entrance-exam" element={<EntranceExamPage />} />

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
            <Route path="/permissions" element={<PermissionsHome />} />
            <Route element={<ModuleGate module="ENTRANCE_EXAM" />}>
              <Route path="/entrance-papers" element={<EntrancePapersHome />} />
            </Route>
            <Route element={<ModuleGate module="DOCUMENTS" />}>
              <Route path="/documents" element={<DocumentsPage />} />
            </Route>

            {/* TEACHERS — teacher onboarding & directory (always-on bundled default) */}
            <Route path="/teacher-home" element={<TeacherHome />} />
            <Route path="/teacher/:id" element={<TeacherDetails />} />

            {/* ACADEMICS — sessions, classes, sections, courses, subjects */}
            <Route element={<ModuleGate module="ACADEMICS" />}>
              <Route path="/subject-Home" element={<SubjectHomePage />} />
              <Route path="/organisation" element={<OrganisationHome />} />
              <Route path="/subject/:slug" element={<SubjectDetails />} />
              <Route path="/course-Home" element={<CourseHome />} />
              <Route path="/course/:courseId" element={<CourseDetails />} />
              {/* Academic Structure (FR-018) — overview, the merged
                  Classes & Sections page, and the bulk builder. */}
              <Route path="/structure" element={<StructureOverviewPage />} />
              <Route path="/structure/classes" element={<ClassesSections />} />
              <Route path="/structure/setup" element={<QuickSetup />} />
              {/* Kept so old links and bookmarks still resolve. */}
              <Route path="/class-Home" element={<ClassesSections />} />
              <Route path="/class/:classId" element={<ClassDetails />} />
              <Route path="/section/:sectionId" element={<SectionDetails />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
            </Route>

            {/* STUDIES — the exam cycle itself: papers, admit cards, marks */}
            <Route element={<ModuleGate module="STUDIES" />}>
              <Route path="/exam-home" element={<ExamHome />} />
              <Route path="/exam/:examId" element={<ExamDetails />} />
              <Route path="/exam/admit-cards" element={<AdmitCardsPage />} />
            </Route>

            {/* Extensions of STUDIES, each sold on its own. Kept OUTSIDE the
                STUDIES block so the 402 names the module actually missing —
                nesting would report "STUDIES" for a school that has it. */}
            <Route element={<ModuleGate module="ANALYTICS" />}>
              <Route path="/performance" element={<ResultsPerformancePage />} />
            </Route>
            <Route element={<ModuleGate module="REPORT_CARDS" />}>
              <Route path="/consolidated-results" element={<AggregatePage />} />
            </Route>

            {/* ATTENDANCE — daily STUDENT roll-call */}
            <Route element={<ModuleGate module="ATTENDANCE" />}>
              <Route path="/attendance" element={<AttendanceHome />} />
              <Route path="/attendance/jobs" element={<JobsPage />} />
            </Route>

            {/* STAFF_ATTENDANCE — the staff muster, split from ATTENDANCE */}
            <Route element={<ModuleGate module="STAFF_ATTENDANCE" />}>
              <Route path="/teacher-attendance" element={<TeacherAttendanceHome />} />
            </Route>

            {/* LEAVE — its own module since 0125/0126. Deliberately NOT nested
                inside ATTENDANCE: nesting would silently require both, and
                leave approval is a separate purchase. */}
            <Route element={<ModuleGate module="LEAVE" />}>
              <Route path="/leaves" element={<LeaveHome />} />
            </Route>

            {/* LIBRARY */}
            <Route element={<ModuleGate module="LIBRARY" />}>
              <Route path="/library" element={<LibraryHome />} />
              <Route path="/library/books/:bookId" element={<BookDetailsPage />} />
            </Route>

            {/* COMMUNICATION — notices and the school calendar */}
            <Route element={<ModuleGate module="COMMUNICATION" />}>
              <Route path="/notices" element={<NoticeBoardHome />} />
              <Route path="/notices/:boardId" element={<NoticeBoardDetails />} />
              <Route path="/events" element={<Navigate to="/calendar" replace />} />
              <Route path="/calendar" element={<CalendarPage />} />
            </Route>

            {/* BROADCAST — bulk email, split from COMMUNICATION in 0127/0128.
                A school can publish notices without buying email blasts. */}
            <Route element={<ModuleGate module="BROADCAST" />}>
              <Route path="/communication" element={<CommunicationPage />} />
            </Route>

            <Route element={<ModuleGate module="PUBLICATIONS" />}>
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

            {/* INVENTORY — item master, procurement, consumption ledger.
                `/hr` and `/pantry` used to be nested in here, which meant a
                school owning PANTRY but not INVENTORY could not reach its own
                canteen, and payroll was gated on the stock module. Both now
                gate on what they actually are. */}
            <Route element={<ModuleGate module="INVENTORY" />}>
              <Route path="/inventory" element={<InventoryHub />} />
            </Route>

            {/* HR_PAYROLL — split from core TEACHERS in 0127/0128 */}
            <Route element={<ModuleGate module="HR_PAYROLL" />}>
              <Route path="/hr" element={<PayrollHub />} />
            </Route>

            {/* PANTRY */}
            <Route element={<ModuleGate module="PANTRY" />}>
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
              <Route path="/activity" element={<ActivityPage />} />
            <Route element={<ModuleGate module="GRIEVANCE" />}>
              <Route path="/grievances" element={<GrievancesPage />} />
            </Route>
              <Route path="/ptm" element={<PtmPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
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
