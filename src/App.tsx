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
import ReadmissionHome from "./Pages/Applicants/ReadmissionHome.tsx";
import ReadmissionAdmit from "./Pages/Applicants/ReadmissionAdmit.tsx";
import AlumniHome from "./Pages/Alumni/AlumniHome.tsx";
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
import LegacyRedirect from "./components/LegacyRedirect.tsx";
import { ROUTES, PATTERNS, LEGACY_REDIRECTS } from "./config/routes.ts";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OnboardingProvider>
        <Routes>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.teacherApply} element={<TeacherApply />} />
          <Route path={ROUTES.entranceExam} element={<EntranceExamPage />} />

          {/* Retired paths, generated from the one table in config/routes.ts.
              Mounted OUTSIDE ProtectedRoute so the forward happens before the
              auth check — otherwise an expired session on an old bookmark
              lands on /login and loses the destination entirely. */}
          {LEGACY_REDIRECTS.map(([from, to]) => (
            <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
          ))}

        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingGate />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />
            <Route path={ROUTES.dashboard} element={<Dashboard />} />

            {/* ── Admissions ────────────────────────────────────────────── */}
            {/* PEOPLE is a bundled default, so applicants and readmission are
                ungated. Readmission especially: getting your own students back
                after finalising a year is how a school runs, not a feature it
                buys. Only the alumni DIRECTORY and certificates are paid. */}
            <Route path={ROUTES.admissions.applicants} element={<ApplicantsHome />} />
            <Route path={PATTERNS.applicantDetail} element={<ApplicantDetails />} />
            <Route path={ROUTES.admissions.readmission} element={<ReadmissionHome />} />
            <Route path={PATTERNS.readmissionAdmit} element={<ReadmissionAdmit />} />
            <Route element={<ModuleGate module="ENTRANCE_EXAM" />}>
              <Route path={ROUTES.admissions.entrancePapers} element={<EntrancePapersHome />} />
            </Route>

            {/* ── Students ──────────────────────────────────────────────── */}
            <Route path={ROUTES.students.root} element={<StudentsHome />} />
            <Route element={<ModuleGate module="DOCUMENTS" />}>
              <Route path={ROUTES.students.documents} element={<DocumentsPage />} />
            </Route>
            <Route element={<ModuleGate module="ALUMNI" />}>
              <Route path={ROUTES.students.alumni} element={<AlumniHome />} />
            </Route>
            {/* Last in the group: static siblings above outrank this under v6
                path ranking, so /students/documents is not read as an id. */}
            <Route path={PATTERNS.studentDetail} element={<StudentDetails />} />

            {/* ── Staff ─────────────────────────────────────────────────── */}
            <Route path={ROUTES.staff.teachers} element={<TeacherHome />} />
            <Route path={PATTERNS.teacherDetail} element={<TeacherDetails />} />
            <Route path={ROUTES.staff.accounts} element={<StaffHome />} />
            <Route path={ROUTES.staff.permissions} element={<PermissionsHome />} />
            {/* Class assignments moved to the Staff domain to match the nav,
                but keeps its ACADEMICS gate — this is a routing change, not a
                change to what a school must own to reach the page. */}
            <Route element={<ModuleGate module="ACADEMICS" />}>
              <Route path={ROUTES.staff.assignments} element={<AssignmentsPage />} />
            </Route>
            <Route element={<ModuleGate module="STAFF_ATTENDANCE" />}>
              <Route path={ROUTES.staff.attendance} element={<TeacherAttendanceHome />} />
            </Route>
            <Route element={<ModuleGate module="HR_PAYROLL" />}>
              <Route path={ROUTES.staff.payroll} element={<PayrollHub />} />
            </Route>

            {/* ── Academics ─────────────────────────────────────────────── */}
            <Route element={<ModuleGate module="ACADEMICS" />}>
              <Route path={ROUTES.academics.root} element={<StructureOverviewPage />} />
              <Route path={ROUTES.academics.classes} element={<ClassesSections />} />
              <Route path={ROUTES.academics.setup} element={<QuickSetup />} />
              <Route path={PATTERNS.classDetail} element={<ClassDetails />} />
              <Route path={PATTERNS.sectionDetail} element={<SectionDetails />} />
              <Route path={ROUTES.academics.subjects} element={<SubjectHomePage />} />
              <Route path={PATTERNS.subjectDetail} element={<SubjectDetails />} />
              <Route path={ROUTES.academics.courses} element={<CourseHome />} />
              <Route path={PATTERNS.courseDetail} element={<CourseDetails />} />
              <Route path={ROUTES.academics.sessions} element={<SessionsPage />} />
              <Route path={ROUTES.academics.organisation} element={<OrganisationHome />} />
            </Route>
            <Route element={<ModuleGate module="TIMETABLE" />}>
              <Route path={ROUTES.academics.timetable} element={<TimetablePage />} />
            </Route>
            <Route element={<ModuleGate module="HOMEWORK" />}>
              <Route path={ROUTES.academics.homework} element={<HomeworkPage />} />
            </Route>

            {/* ── Assessment ────────────────────────────────────────────── */}
            <Route element={<ModuleGate module="STUDIES" />}>
              <Route path={ROUTES.assessment.exams} element={<ExamHome />} />
              <Route path={PATTERNS.examDetail} element={<ExamDetails />} />
              {/* Lifted out of /exam/:examId, where it only resolved because
                  static segments outrank dynamic ones. */}
              <Route path={ROUTES.assessment.admitCards} element={<AdmitCardsPage />} />
            </Route>

            {/* Extensions of STUDIES, each sold on its own. Kept OUTSIDE the
                STUDIES block so the 402 names the module actually missing —
                nesting would report "STUDIES" for a school that has it. */}
            <Route element={<ModuleGate module="ANALYTICS" />}>
              <Route path={ROUTES.assessment.performance} element={<ResultsPerformancePage />} />
            </Route>
            <Route element={<ModuleGate module="REPORT_CARDS" />}>
              <Route path={ROUTES.assessment.consolidatedResults} element={<AggregatePage />} />
            </Route>

            {/* ── Attendance ────────────────────────────────────────────── */}
            <Route element={<ModuleGate module="ATTENDANCE" />}>
              <Route path={ROUTES.attendance.root} element={<AttendanceHome />} />
              <Route path={ROUTES.attendance.jobs} element={<JobsPage />} />
            </Route>
            {/* LEAVE is deliberately NOT nested inside ATTENDANCE: nesting
                would silently require both, and leave approval is a separate
                purchase. */}
            <Route element={<ModuleGate module="LEAVE" />}>
              <Route path={ROUTES.attendance.leaves} element={<LeaveHome />} />
            </Route>

            {/* ── Finance ───────────────────────────────────────────────── */}
            <Route element={<ModuleGate module="FINANCE" />}>
              <Route path={ROUTES.finance.fees} element={<FeesHub />} />
              <Route path={PATTERNS.feeInvoice} element={<FeeInvoiceDetails />} />
              <Route path={ROUTES.finance.jobs} element={<JobsPage />} />
            </Route>

            {/* ── Communication ─────────────────────────────────────────── */}
            <Route element={<ModuleGate module="COMMUNICATION" />}>
              <Route path={ROUTES.communication.notices} element={<NoticeBoardHome />} />
              <Route path={PATTERNS.noticeBoard} element={<NoticeBoardDetails />} />
              <Route path={ROUTES.communication.calendar} element={<CalendarPage />} />
            </Route>
            {/* BROADCAST split from COMMUNICATION in 0127/0128 — a school can
                publish notices without buying email blasts. */}
            <Route element={<ModuleGate module="BROADCAST" />}>
              <Route path={ROUTES.communication.broadcast} element={<CommunicationPage />} />
            </Route>
            <Route element={<ModuleGate module="PUBLICATIONS" />}>
              <Route path={ROUTES.communication.publications} element={<PublicationsPage />} />
            </Route>

            {/* ── Campus ────────────────────────────────────────────────── */}
            <Route element={<ModuleGate module="LIBRARY" />}>
              <Route path={ROUTES.campus.library} element={<LibraryHome />} />
              <Route path={PATTERNS.libraryBook} element={<BookDetailsPage />} />
            </Route>
            <Route element={<ModuleGate module="SPORTS" />}>
              <Route path={ROUTES.campus.sports} element={<SportsHome />} />
              <Route path={PATTERNS.sportsEvent} element={<SportsEventDetail />} />
            </Route>
            <Route element={<ModuleGate module="TRANSPORT" />}>
              <Route path={ROUTES.campus.transport} element={<TransportHub />} />
            </Route>
            <Route element={<ModuleGate module="PANTRY" />}>
              <Route path={ROUTES.campus.pantry} element={<PantryHub />} />
            </Route>
            {/* /staff/payroll and /campus/pantry used to be nested in here,
                which meant a school owning PANTRY but not INVENTORY could not
                reach its own canteen, and payroll was gated on the stock
                module. Both now gate on what they actually are. */}
            <Route element={<ModuleGate module="INVENTORY" />}>
              <Route path={ROUTES.campus.inventory} element={<InventoryHub />} />
            </Route>

            {/* ── Parent relations & administration — ADMIN-only ────────── */}
            <Route element={<AdminRoute />}>
              <Route path={ROUTES.parents.ptm} element={<PtmPage />} />
              <Route path={ROUTES.parents.feedback} element={<FeedbackPage />} />
              <Route element={<ModuleGate module="GRIEVANCE" />}>
                <Route path={ROUTES.parents.grievances} element={<GrievancesPage />} />
              </Route>

              <Route path={ROUTES.admin.settings} element={<AccountPage />} />
              <Route path={ROUTES.finance.platformBills} element={<PlatformBillsPage />} />
              <Route path={ROUTES.admin.support} element={<SupportCenter />} />
              <Route path={ROUTES.admin.activity} element={<ActivityPage />} />
              {/* The standalone jobs hub is ADMIN-only; the module-scoped views
                  (/attendance/jobs, /finance/jobs) stay open to those modules'
                  users above. */}
              <Route path={ROUTES.admin.jobs} element={<JobsPage />} />
            </Route>

            <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.login} />} />
        </Routes>
        </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
