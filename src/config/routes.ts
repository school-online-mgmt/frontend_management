/**
 * Canonical route table for the management portal.
 *
 * Every path in the app is `/{domain}/{page}`, where the domain is one of the
 * eleven sidebar groups in `components/Layout.tsx` plus `/admin` for the
 * back-office items that live in the profile menu.
 *
 * Two rules make this file worth having:
 *
 *  1. **One definition per path.** `Layout.tsx` links to these constants and
 *     `App.tsx` mounts them, so a renamed route cannot leave a dead nav entry
 *     behind — the type error finds it.
 *  2. **Redirects are derived, not hand-written.** `LEGACY_REDIRECTS` below is
 *     the complete old→new map. `App.tsx` generates a `<Navigate replace>` for
 *     each entry, so adding a route without its redirect is a visible omission
 *     in one table rather than a missing line among sixty.
 *
 * Paths containing `:params` appear twice: a PATTERN constant for `<Route>`,
 * and a builder function for `navigate()`. Never interpolate a pattern by hand.
 */

/* ── Static paths ──────────────────────────────────────────────────────── */

export const ROUTES = {
    /* Public — outside ProtectedRoute. Deliberately un-prefixed: these are
       reached by people who are not logged in and have no domain context.
       `/entrance-exam` is the CANDIDATE's exam page, not the school's admin
       screen for it, which is why it is not under /admissions. */
    login: "/login",
    teacherApply: "/teacher-apply",
    entranceExam: "/entrance-exam",
    onboarding: "/onboarding",

    dashboard: "/dashboard",

    admissions: {
        applicants: "/admissions/applicants",
        readmission: "/admissions/readmission",
        entrancePapers: "/admissions/entrance-papers",
    },

    students: {
        root: "/students",
        documents: "/students/documents",
        alumni: "/students/alumni",
    },

    staff: {
        teachers: "/staff/teachers",
        accounts: "/staff/accounts",
        assignments: "/staff/assignments",
        attendance: "/staff/attendance",
        payroll: "/staff/payroll",
        permissions: "/staff/permissions",
    },

    academics: {
        root: "/academics",
        classes: "/academics/classes",
        setup: "/academics/setup",
        subjects: "/academics/subjects",
        courses: "/academics/courses",
        sessions: "/academics/sessions",
        organisation: "/academics/organisation",
        timetable: "/academics/timetable",
        homework: "/academics/homework",
    },

    assessment: {
        exams: "/assessment/exams",
        admitCards: "/assessment/admit-cards",
        consolidatedResults: "/assessment/consolidated-results",
        performance: "/assessment/performance",
    },

    attendance: {
        root: "/attendance",
        leaves: "/attendance/leaves",
        jobs: "/attendance/jobs",
    },

    finance: {
        fees: "/finance/fees",
        platformBills: "/finance/platform-bills",
        jobs: "/finance/jobs",
    },

    communication: {
        notices: "/communication/notices",
        broadcast: "/communication/broadcast",
        calendar: "/communication/calendar",
        publications: "/communication/publications",
    },

    parents: {
        ptm: "/parents/ptm",
        feedback: "/parents/feedback",
        grievances: "/parents/grievances",
    },

    campus: {
        library: "/campus/library",
        sports: "/campus/sports",
        transport: "/campus/transport",
        pantry: "/campus/pantry",
        inventory: "/campus/inventory",
    },

    admin: {
        settings: "/admin/settings",
        jobs: "/admin/jobs",
        activity: "/admin/activity",
        support: "/admin/support",
    },
} as const;

/* ── Parameterised paths ───────────────────────────────────────────────── */

/**
 * `<Route path={...}>` patterns. Static siblings (e.g. `/students/documents`)
 * outrank these under React Router v6's ranking, so the two can coexist.
 */
export const PATTERNS = {
    applicantDetail: "/admissions/applicants/:applicantId",
    readmissionAdmit: "/admissions/readmission/:applicantId/admit",
    studentDetail: "/students/:id",
    teacherDetail: "/staff/teachers/:id",
    classDetail: "/academics/classes/:classId",
    sectionDetail: "/academics/sections/:sectionId",
    subjectDetail: "/academics/subjects/:slug",
    courseDetail: "/academics/courses/:courseId",
    examDetail: "/assessment/exams/:examId",
    feeInvoice: "/finance/fees/invoice/:id",
    noticeBoard: "/communication/notices/:boardId",
    libraryBook: "/campus/library/books/:bookId",
    sportsEvent: "/campus/sports/events/:eventId",
} as const;

type Id = string | number;

export const toApplicant = (id: Id) => `/admissions/applicants/${id}`;
export const toReadmissionAdmit = (id: Id) => `/admissions/readmission/${id}/admit`;
export const toStudent = (id: Id) => `/students/${id}`;
export const toTeacher = (id: Id) => `/staff/teachers/${id}`;
export const toClass = (id: Id) => `/academics/classes/${id}`;
export const toSection = (id: Id) => `/academics/sections/${id}`;
export const toSubject = (slug: string) => `/academics/subjects/${slug}`;
export const toCourse = (id: Id) => `/academics/courses/${id}`;
export const toExam = (id: Id) => `/assessment/exams/${id}`;
export const toFeeInvoice = (id: Id) => `/finance/fees/invoice/${id}`;
export const toNoticeBoard = (id: Id) => `/communication/notices/${id}`;
export const toLibraryBook = (id: Id) => `/campus/library/books/${id}`;
export const toSportsEvent = (id: Id) => `/campus/sports/events/${id}`;

/* ── Legacy redirects ──────────────────────────────────────────────────── */

/**
 * Every path this portal has ever served, pointing at where it lives now.
 *
 * These exist for bookmarks, emailed links and browser history — NOT for
 * in-app navigation, which should target the canonical path directly rather
 * than bounce through a redirect.
 *
 * `:params` in a target are substituted from the matched source pattern, so
 * the two sides must use the same parameter names.
 *
 * This table only grows. A school that bookmarked `/students-home` in 2026
 * should still land somewhere sensible years later; the cost of keeping a
 * one-line redirect forever is far below the cost of a dead link in a
 * principal's browser.
 */
export const LEGACY_REDIRECTS: ReadonlyArray<readonly [from: string, to: string]> = [
    // Admissions
    ["/applicants-home", ROUTES.admissions.applicants],
    ["/applicant/:applicantId", PATTERNS.applicantDetail],
    ["/readmission", ROUTES.admissions.readmission],
    ["/readmission/:applicantId/admit", PATTERNS.readmissionAdmit],
    ["/entrance-papers", ROUTES.admissions.entrancePapers],

    // Students
    ["/students-home", ROUTES.students.root],
    ["/student/:id", PATTERNS.studentDetail],
    ["/documents", ROUTES.students.documents],
    ["/alumni", ROUTES.students.alumni],

    // Staff
    ["/teacher-home", ROUTES.staff.teachers],
    ["/teacher/:id", PATTERNS.teacherDetail],
    ["/staff", ROUTES.staff.accounts],
    // Never a real route — the E2E suite navigated here for months and silently
    // landed on the catch-all. Redirecting it costs one line and ends the class
    // of bug where a spec passes against the wrong page.
    ["/staff-home", ROUTES.staff.accounts],
    ["/assignments", ROUTES.staff.assignments],
    ["/teacher-attendance", ROUTES.staff.attendance],
    ["/hr", ROUTES.staff.payroll],
    ["/permissions", ROUTES.staff.permissions],

    // Academics
    ["/structure", ROUTES.academics.root],
    ["/structure/classes", ROUTES.academics.classes],
    ["/structure/setup", ROUTES.academics.setup],
    // `/class-Home` rendered the same component as `/structure/classes` — an
    // FR-018 leftover. Now a redirect rather than a second mount point.
    ["/class-Home", ROUTES.academics.classes],
    ["/class/:classId", PATTERNS.classDetail],
    ["/section/:sectionId", PATTERNS.sectionDetail],
    ["/subject-Home", ROUTES.academics.subjects],
    ["/subject/:slug", PATTERNS.subjectDetail],
    ["/course-Home", ROUTES.academics.courses],
    ["/course/:courseId", PATTERNS.courseDetail],
    ["/sessions", ROUTES.academics.sessions],
    ["/organisation", ROUTES.academics.organisation],
    ["/timetable", ROUTES.academics.timetable],
    ["/homework", ROUTES.academics.homework],

    // Assessment
    ["/exam-home", ROUTES.assessment.exams],
    // Order matters against `/exam/:examId` below: the static segment wins
    // under v6 ranking, which is exactly the collision this move removes.
    ["/exam/admit-cards", ROUTES.assessment.admitCards],
    ["/exam/:examId", PATTERNS.examDetail],
    ["/consolidated-results", ROUTES.assessment.consolidatedResults],
    ["/performance", ROUTES.assessment.performance],

    // Attendance — `/attendance` and `/attendance/jobs` did not move.
    ["/leaves", ROUTES.attendance.leaves],

    // Finance
    ["/fees", ROUTES.finance.fees],
    ["/fees/invoice/:id", PATTERNS.feeInvoice],
    ["/fees/jobs", ROUTES.finance.jobs],
    ["/platform-bills", ROUTES.finance.platformBills],

    // Communication
    ["/notices", ROUTES.communication.notices],
    ["/notices/:boardId", PATTERNS.noticeBoard],
    ["/communication", ROUTES.communication.broadcast],
    ["/calendar", ROUTES.communication.calendar],
    // `/events` was already a redirect to `/calendar`; it now points at the
    // final destination rather than hopping twice.
    ["/events", ROUTES.communication.calendar],
    ["/publications", ROUTES.communication.publications],

    // Parent relations
    ["/ptm", ROUTES.parents.ptm],
    ["/feedback", ROUTES.parents.feedback],
    ["/grievances", ROUTES.parents.grievances],

    // Campus
    ["/library", ROUTES.campus.library],
    ["/library/books/:bookId", PATTERNS.libraryBook],
    ["/sports", ROUTES.campus.sports],
    ["/sports/events/:eventId", PATTERNS.sportsEvent],
    ["/transport", ROUTES.campus.transport],
    ["/pantry", ROUTES.campus.pantry],
    ["/inventory", ROUTES.campus.inventory],

    // Administration
    ["/account", ROUTES.admin.settings],
    ["/jobs", ROUTES.admin.jobs],
    ["/activity", ROUTES.admin.activity],
    ["/support", ROUTES.admin.support],
];
