import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, BookOpen, GraduationCap, Calendar, Clock, Activity,
  CreditCard, AlertTriangle, CheckCircle2, UserPlus, Layers,
  ClipboardCheck, Library, Bell, Loader2, RefreshCw,
  ChevronRight, Sparkles, BookMarked, Wallet, CalendarDays,
  School, UserCog, CalendarRange, Bus, BarChart3, TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import useAuth from "../hooks/useAuth";

/* ── helpers ─────────────────────────────────────────────────────────── */
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/* ── Attendance Ring ───────────────────────────────────────────────────── */
const Ring = ({ value, size = 56, stroke = 5, color }: { value: number; size?: number; stroke?: number; color: string }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center" fontSize={size * 0.22} fontWeight="800" fill={color}>
        {value}%
      </text>
    </svg>
  );
};

/* ── Main Dashboard ────────────────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();

      const [
        studentsRes, teachersRes, subjectsRes, classesRes,
        studentAttRes, teacherAttRes,
        feeSumRes, libraryRes, leavesRes, pendingNoticesRes,
      ] = await Promise.allSettled([
        api.getStudents(),
        api.getTeachers(),
        api.getSubjects(),
        api.getClasses(),
        api.getAttendanceTodaySummary(),
        api.getTeacherAttendanceTodaySummary(),
        api.getFeeSummary({ year }),
        api.getLibraryStats(),
        api.getStudentLeaves({ status: "PENDING" }),
        api.getPendingNotices(),
      ]);

      const val = (r: any) => r.status === "fulfilled" ? r.value : null;

      const students = val(studentsRes);
      const teachers = val(teachersRes);
      const subjects = val(subjectsRes);
      const classes = val(classesRes);
      const studentAtt = val(studentAttRes);
      const teacherAtt = val(teacherAttRes);
      const feeSum = val(feeSumRes);
      const library = val(libraryRes);
      const leaves = val(leavesRes);
      const pendingNotices = val(pendingNoticesRes);

      const studentList = Array.isArray(students) ? students : students?.students ?? [];
      const teacherList = Array.isArray(teachers) ? teachers : teachers?.teachers ?? [];
      const subjectList = Array.isArray(subjects) ? subjects : subjects?.subjects ?? [];
      const classList = Array.isArray(classes) ? classes : classes?.classes ?? [];

      setD({
        students: studentList,
        teachers: teacherList,
        subjects: subjectList,
        classes: classList,
        studentAtt: studentAtt?.summary ?? studentAtt ?? null,
        teacherAtt: teacherAtt?.summary ?? teacherAtt ?? null,
        feeSummary: feeSum?.summary ?? null,
        library: library ?? null,
        pendingLeaves: Array.isArray(leaves) ? leaves : leaves?.leaves ?? [],
        pendingNotices: Array.isArray(pendingNotices) ? pendingNotices : pendingNotices?.notices ?? [],
      });
    } catch (err) {

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { data: schoolStats } = useQuery({
    queryKey: ["management-school-stats"],
    queryFn: () => api.getSchoolStats(),
  });

  const firstName = user?.firstName ?? "Admin";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const {
    students = [], teachers = [], subjects = [], classes = [],
    studentAtt, teacherAtt, feeSummary, library,
    pendingLeaves = [], pendingNotices = [],
  } = d;

  const activeTeachers = teachers.filter((t: any) => t.isActive !== false).length;
  const studentAttPct = studentAtt ? pct(studentAtt.present + (studentAtt.late ?? 0), studentAtt.total) : null;
  const teacherAttPct = teacherAtt ? pct(teacherAtt.present + (teacherAtt.late ?? 0), teacherAtt.total) : null;
  const totalPendingActions = pendingLeaves.length + pendingNotices.length;

  const QUICK_LINKS = [
    { to: "/sessions",       label: "Sessions",   icon: CalendarRange, bg: "bg-violet-50", text: "text-violet-700", desc: "Academic year setup" },
    { to: "/applicants-home", label: "Applicants", icon: UserPlus, bg: "bg-blue-50", text: "text-blue-700", desc: "Review applications" },
    { to: "/students-home", label: "Students", icon: Users, bg: "bg-indigo-50", text: "text-indigo-700", desc: "Manage students" },
    { to: "/teacher-home", label: "Teachers", icon: GraduationCap, bg: "bg-purple-50", text: "text-purple-700", desc: "Staff management" },
    { to: "/exam-home", label: "Exams", icon: BookMarked, bg: "bg-violet-50", text: "text-violet-700", desc: "Papers & results" },
    { to: "/attendance", label: "Attendance", icon: ClipboardCheck, bg: "bg-teal-50", text: "text-teal-700", desc: "Mark attendance" },
    { to: "/fees", label: "Fees", icon: Wallet, bg: "bg-amber-50", text: "text-amber-700", desc: "Fee management" },
    { to: "/library", label: "Library", icon: Library, bg: "bg-rose-50", text: "text-rose-700", desc: "Books & issues" },
    { to: "/notices", label: "Notices", icon: Bell, bg: "bg-pink-50", text: "text-pink-700", desc: "Announcements" },
    { to: "/calendar", label: "Calendar", icon: Calendar, bg: "bg-cyan-50", text: "text-cyan-700", desc: "Events & schedule" },
    { to: "/leaves", label: "Leaves", icon: CalendarDays, bg: "bg-orange-50", text: "text-orange-700", desc: "Leave requests" },
  ];

  return (
    <div className="p-3 md:p-5 space-y-5 max-w-6xl mx-auto">

      {/* ── Hero Welcome ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10" />
        <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-emerald-400" />
                <span className="text-emerald-300 text-xs font-medium">Management Portal</span>
              </div>
              <h1 className="text-white text-xl font-bold">{greeting}, {firstName} 👋</h1>
              <p className="text-slate-400 text-xs mt-1">Here's your school overview for today</p>
            </div>
            <button onClick={load} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Hero stat pills */}
          <div className="flex flex-wrap gap-2.5 mt-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
              <Users size={14} className="text-blue-400" />
              <div>
                <p className="text-[10px] text-slate-400">Students</p>
                <p className="text-white text-xs font-bold">{students.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
              <GraduationCap size={14} className="text-purple-400" />
              <div>
                <p className="text-[10px] text-slate-400">Teachers</p>
                <p className="text-white text-xs font-bold">{activeTeachers}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
              <Layers size={14} className="text-teal-400" />
              <div>
                <p className="text-[10px] text-slate-400">Classes</p>
                <p className="text-white text-xs font-bold">{classes.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
              <BookOpen size={14} className="text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-400">Subjects</p>
                <p className="text-white text-xs font-bold">{subjects.length}</p>
              </div>
            </div>
            {totalPendingActions > 0 && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-3 py-2">
                <AlertTriangle size={14} className="text-red-400" />
                <div>
                  <p className="text-[10px] text-red-300">Pending</p>
                  <p className="text-red-300 text-xs font-bold">{totalPendingActions} action{totalPendingActions > 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pending Actions Alert ────────────────────────────────────────────── */}
      {totalPendingActions > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
          <h3 className="text-xs font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle size={13} /> Action Required
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {pendingLeaves.length > 0 && (
              <button onClick={() => navigate("/leaves")}
                className="flex items-center gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2 text-left hover:bg-amber-50 transition-colors">
                <CalendarDays size={14} className="text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800">{pendingLeaves.length}</p>
                  <p className="text-[9px] text-amber-600">Leave Requests</p>
                </div>
              </button>
            )}
            {pendingNotices.length > 0 && (
              <button onClick={() => navigate("/notices")}
                className="flex items-center gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2 text-left hover:bg-amber-50 transition-colors">
                <Bell size={14} className="text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800">{pendingNotices.length}</p>
                  <p className="text-[9px] text-amber-600">Pending Notices</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Staff Coverage Teaser ─────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/assignments")}
        className="w-full text-left bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3.5 flex items-center justify-between gap-4 hover:shadow-md hover:border-slate-200 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <UserCog size={15} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Staff Coverage Overview</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              View teacher assignments for classes, sections &amp; subjects
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500">
            <School size={11} className="text-indigo-400" />{classes.length} classes
            <Layers size={11} className="text-violet-400 ml-1" />{classes.reduce((a: number, c: any) => a + (c.sections?.length ?? 0), 0)} sections
          </div>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
        </div>
      </button>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button onClick={() => navigate("/students-home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-blue-700 bg-blue-50 border-blue-100">
          <Users size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{students.length}</p>
          <p className="text-[10px] font-medium opacity-70">Students</p>
        </button>
        <button onClick={() => navigate("/teacher-home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-purple-700 bg-purple-50 border-purple-100">
          <GraduationCap size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{activeTeachers}</p>
          <p className="text-[10px] font-medium opacity-70">Active Teachers</p>
        </button>
        <button onClick={() => navigate("/subject-Home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-emerald-700 bg-emerald-50 border-emerald-100">
          <BookOpen size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{subjects.length}</p>
          <p className="text-[10px] font-medium opacity-70">Subjects</p>
        </button>
        <button onClick={() => navigate("/class-Home")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-teal-700 bg-teal-50 border-teal-100">
          <Layers size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{classes.length}</p>
          <p className="text-[10px] font-medium opacity-70">Classes</p>
        </button>
        <button onClick={() => navigate("/library")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-rose-700 bg-rose-50 border-rose-100">
          <Library size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{library?.totalBooks ?? 0}</p>
          <p className="text-[10px] font-medium opacity-70">Library Books</p>
        </button>
        <button onClick={() => navigate("/fees")}
          className="text-left border rounded-xl p-3 transition-all hover:shadow-md cursor-pointer text-amber-700 bg-amber-50 border-amber-100">
          <CreditCard size={14} className="mb-1.5 opacity-70" />
          <p className="text-xl font-bold">{feeSummary?.totalInvoices ?? 0}</p>
          <p className="text-[10px] font-medium opacity-70">Invoices</p>
        </button>
      </div>

      {/* â"€â"€ Main Content Grid â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* â"€â"€ Today's Attendance â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardCheck size={13} className="text-emerald-500" /> Today's Attendance
            </h3>
            <button onClick={() => navigate("/attendance")}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5">
              View <ChevronRight size={10} />
            </button>
          </div>
          <div className="p-4">
            {studentAtt && studentAtt.total > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Student Attendance */}
                <div className="flex items-center gap-3">
                  <Ring value={studentAttPct ?? 0} color={studentAttPct! >= 80 ? "#10b981" : studentAttPct! >= 60 ? "#f59e0b" : "#ef4444"} />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Students</p>
                    <div className="space-y-1 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-slate-500">Present: <strong className="text-slate-700">{studentAtt.present}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-[10px] text-slate-500">Absent: <strong className="text-slate-700">{studentAtt.absent}</strong></span>
                      </div>
                      {studentAtt.late > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-[10px] text-slate-500">Late: <strong className="text-slate-700">{studentAtt.late}</strong></span>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">of {studentAtt.total} students</p>
                  </div>
                </div>

                {/* Teacher Attendance */}
                <div className="flex items-center gap-3">
                  {teacherAtt && teacherAtt.total > 0 ? (
                    <>
                      <Ring value={teacherAttPct ?? 0} color={teacherAttPct! >= 90 ? "#6366f1" : teacherAttPct! >= 70 ? "#f59e0b" : "#ef4444"} />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Teachers</p>
                        <div className="space-y-1 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span className="text-[10px] text-slate-500">Present: <strong className="text-slate-700">{teacherAtt.present}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-[10px] text-slate-500">Absent: <strong className="text-slate-700">{teacherAtt.absent}</strong></span>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">of {teacherAtt.total} teachers</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 w-full">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <p className="text-[10px] text-slate-500">Teacher attendance not marked yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-3">
                <Clock size={14} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700">Attendance not marked today</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Go to the attendance section to mark today's records</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Fee Overview ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <CreditCard size={13} className="text-amber-500" /> Fee Collection — {new Date().getFullYear()}
            </h3>
            <button onClick={() => navigate("/fees")}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5">
              View <ChevronRight size={10} />
            </button>
          </div>
          <div className="p-4">
            {feeSummary ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-blue-600 font-medium">Total Demand</p>
                    <p className="text-sm font-bold text-blue-800 mt-0.5">{fmt(feeSummary.totalDemand)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-emerald-600 font-medium">Collected</p>
                    <p className="text-sm font-bold text-emerald-800 mt-0.5">{fmt(feeSummary.totalCollected)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-orange-600 font-medium">Outstanding</p>
                    <p className="text-sm font-bold text-orange-800 mt-0.5">{fmt(feeSummary.outstanding)}</p>
                  </div>
                </div>
                {/* Collection progress bar */}
                {feeSummary.totalDemand > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">Collection Rate</span>
                      <span className="text-[10px] font-bold text-emerald-700">{pct(feeSummary.totalCollected, feeSummary.totalDemand)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct(feeSummary.totalCollected, feeSummary.totalDemand)}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Paid: <strong>{feeSummary.paid}</strong></span>
                  <span className="flex items-center gap-1"><Clock size={10} className="text-amber-500" /> Pending: <strong>{feeSummary.pending}</strong></span>
                  <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-red-500" /> Overdue: <strong>{feeSummary.overdue}</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard size={20} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">No fee data available</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Library Overview ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Library size={13} className="text-rose-500" /> Library
            </h3>
            <button onClick={() => navigate("/library")}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5">
              View <ChevronRight size={10} />
            </button>
          </div>
          <div className="p-4">
            {library ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-slate-800">{library.totalBooks ?? 0}</p>
                  <p className="text-[9px] text-slate-500">Total Books</p>
                </div>
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-blue-700">{library.activeIssues ?? 0}</p>
                  <p className="text-[9px] text-blue-600">Issued</p>
                </div>
                <div className="bg-red-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-red-700">{library.overdueIssues ?? 0}</p>
                  <p className="text-[9px] text-red-600">Overdue</p>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-amber-700">{library.pendingRequests ?? 0}</p>
                  <p className="text-[9px] text-amber-600">Requests</p>
                </div>
                <div className="bg-purple-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-purple-700">{library.pendingRenewals ?? 0}</p>
                  <p className="text-[9px] text-purple-600">Renewals</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Library size={20} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400">Library data unavailable</p>
              </div>
            )}
          </div>
        </div>

        {/* ── School Summary ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Activity size={13} className="text-indigo-500" /> School Summary
            </h3>
          </div>
          <div data-testid="dashboard-school-summary" className="p-4 space-y-2.5">
            {[{
              label: "Total Enrollments", value: students.length, icon: Users, color: "text-blue-600", testId: "dashboard-kpi-students" },
              { label: "Active Teachers", value: activeTeachers, icon: GraduationCap, color: "text-purple-600", testId: "dashboard-kpi-teachers" },
              { label: "Classes Running", value: classes.length, icon: Layers, color: "text-teal-600", testId: "dashboard-kpi-classes" },
              { label: "Subjects Offered", value: subjects.length, icon: BookOpen, color: "text-emerald-600", testId: "dashboard-kpi-subjects" },
              { label: "Pending Leave Requests", value: pendingLeaves.length, icon: CalendarDays, color: pendingLeaves.length > 0 ? "text-amber-600" : "text-slate-400", testId: "dashboard-kpi-pending-leaves" },
            ].map((row) => (
              <div key={row.label} data-testid={row.testId} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <row.icon size={13} className={`${row.color} opacity-70`} />
                  <span className="text-xs text-slate-600">{row.label}</span>
                </div>
                <span className={`text-xs font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── School Demographics & Insights ──────────────────────────────────── */}
      {schoolStats && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={13} className="text-emerald-500" /> School Demographics &amp; Insights
          </h2>

          {/* Top row: gender + teacher stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Student Gender */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Users size={13} className="text-blue-500" /> Student Gender Split
              </h3>
              <div className="space-y-2">
                {schoolStats.students.byGender.map(g => {
                  const pct = schoolStats.students.total > 0 ? Math.round((g.count / schoolStats.students.total) * 100) : 0;
                  const color = g.gender === "MALE" ? "bg-blue-500" : g.gender === "FEMALE" ? "bg-pink-500" : "bg-slate-400";
                  const textColor = g.gender === "MALE" ? "text-blue-700" : g.gender === "FEMALE" ? "text-pink-700" : "text-slate-600";
                  return (
                    <div key={g.gender}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-[10px] font-semibold capitalize ${textColor}`}>{g.gender.toLowerCase()}</span>
                        <span className="text-[10px] text-slate-500">{g.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Total Students</span>
                  <span className="text-xs font-bold text-slate-700">{schoolStats.students.total}</span>
                </div>
                {schoolStats.students.withDisability > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">With Disability</span>
                    <span className="text-xs font-bold text-amber-600">{schoolStats.students.withDisability}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Teacher Stats */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <GraduationCap size={13} className="text-purple-500" /> Teacher Gender Split
              </h3>
              <div className="space-y-2">
                {schoolStats.teachers.byGender.map(g => {
                  const pct = schoolStats.teachers.total > 0 ? Math.round((g.count / schoolStats.teachers.total) * 100) : 0;
                  const color = g.gender === "MALE" ? "bg-blue-500" : g.gender === "FEMALE" ? "bg-pink-500" : "bg-slate-400";
                  const textColor = g.gender === "MALE" ? "text-blue-700" : g.gender === "FEMALE" ? "text-pink-700" : "text-slate-600";
                  return (
                    <div key={g.gender}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-[10px] font-semibold capitalize ${textColor}`}>{g.gender.toLowerCase()}</span>
                        <span className="text-[10px] text-slate-500">{g.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Total Teachers</span>
                  <span className="text-xs font-bold text-slate-700">{schoolStats.teachers.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Active</span>
                  <span className="text-xs font-bold text-emerald-600">{schoolStats.teachers.active}</span>
                </div>
              </div>
            </div>

            {/* Ratios */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <TrendingUp size={13} className="text-emerald-500" /> Key Ratios
              </h3>
              <div className="space-y-3">
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-emerald-600 font-medium">Students per Teacher</p>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{schoolStats.ratios.studentsPerTeacher}</p>
                </div>
                <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-blue-600 font-medium">Active Students</p>
                  <p className="text-xl font-extrabold text-blue-700 mt-0.5">{schoolStats.students.active}</p>
                  <p className="text-[9px] text-blue-500 mt-0.5">of {schoolStats.students.total} enrolled</p>
                </div>
                {schoolStats.currentSession && (
                  <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-indigo-600 font-medium">Current Session</p>
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">{schoolStats.currentSession.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: transport + class enrollment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Transport */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Bus size={13} className="text-teal-500" /> Transport Opt-in
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Opted</span>
                    <span className="text-[10px] font-bold text-teal-700">{schoolStats.transport.opted} ({schoolStats.transport.optedPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${schoolStats.transport.optedPercent}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-slate-400">Not opted: {schoolStats.transport.notOpted}</span>
                    <span className="text-[9px] text-slate-400">Total: {schoolStats.students.total}</span>
                  </div>
                </div>
              </div>
              {schoolStats.transport.byZone.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Zone Distribution</p>
                  {schoolStats.transport.byZone.map(z => (
                    <div key={z.zoneName} className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] font-medium text-teal-700">{z.zoneName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">₹{z.zonePrice.toLocaleString("en-IN")}/mo</span>
                        <span className="text-[10px] font-bold text-teal-800">{z.count} students</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrollment by Class */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Layers size={13} className="text-indigo-500" /> Enrollment by Class
              </h3>
              {schoolStats.byClass.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {schoolStats.byClass.map(c => {
                    const max = Math.max(...schoolStats.byClass.map(x => x.count), 1);
                    const pct = Math.round((c.count / max) * 100);
                    return (
                      <div key={c.className}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[10px] font-medium text-slate-600">{c.className}</span>
                          <span className="text-[10px] text-slate-400">{c.count} students</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No enrollment data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Access Grid ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {QUICK_LINKS.map((link) => (
            <button key={link.to} onClick={() => navigate(link.to)}
              className="group text-left bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-slate-200 transition-all relative">
              <div className={`w-8 h-8 ${link.bg} rounded-lg flex items-center justify-center mb-2`}>
                <link.icon size={15} className={link.text} />
              </div>
              <p className="text-slate-800 text-xs font-semibold">{link.label}</p>
              <p className="text-slate-400 text-[9px] mt-0.5 leading-snug">{link.desc}</p>
              <div className={`flex items-center gap-1 mt-1.5 text-[9px] font-medium ${link.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Open <ChevronRight size={9} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
