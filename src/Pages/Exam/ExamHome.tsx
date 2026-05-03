import { useEffect, useMemo, useState } from "react";
import {
    Plus, RefreshCcw, BookOpen, BarChart3, ClipboardList,
    CheckCircle, Clock, Calendar, Users,
    ChevronDown, ChevronRight, AlertCircle, Search,
    ArrowUpRight, X, Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import CreateExamModal from "../../components/Exam/CreateExamModal";
import useAuth from "../../hooks/useAuth";
import PageHeader from "../../components/PageHeader";

// --- Status config ------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string; text: string; icon: typeof Clock }> = {
    CREATED:          { label: "Setup Required",    bg: "bg-amber-50",   dot: "bg-amber-500",   text: "text-amber-700",   icon: AlertCircle   },
    PUBLISHED:        { label: "Published",         bg: "bg-blue-50",    dot: "bg-blue-500",    text: "text-blue-700",    icon: BookOpen      },
    READY_TO_CONDUCT: { label: "Attendance Needed", bg: "bg-orange-50",  dot: "bg-orange-500",  text: "text-orange-700",  icon: Users         },
    CONDUCTED:        { label: "Marks Entry",       bg: "bg-purple-50",  dot: "bg-purple-500",  text: "text-purple-700",  icon: ClipboardList },
    RESULT_PUBLISHED: { label: "Results Published", bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700", icon: CheckCircle   },
};

const STATUS_ORDER = ["CREATED", "PUBLISHED", "READY_TO_CONDUCT", "CONDUCTED", "RESULT_PUBLISHED"];
const TERMS = ["TERM1", "TERM2", "TERM3"];

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "bg-slate-50", dot: "bg-slate-400", text: "text-slate-600", icon: Clock };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// --- Stat card ------------------------------------------------------------
const StatCard = ({ label, value, sub, color, Icon }: { label: string; value: number | string; sub?: string; color: string; Icon: typeof Clock }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={20} className="text-white" />
            </div>
        </div>
    </div>
);

// --- Lifecycle Pipeline -------------------------------------------------------
const LifecyclePipeline = ({ byStatus, total }: { byStatus: Record<string, number>; total: number }) => {
    const activeStatuses = STATUS_ORDER.filter(s => (byStatus[s] ?? 0) > 0);
    const displayStatuses = activeStatuses.length > 0 ? activeStatuses : STATUS_ORDER.slice(0, 6);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Target size={16} className="text-emerald-600" /> Exam Lifecycle Pipeline
            </h2>
            <div className="flex items-center gap-1">
                {displayStatuses.map((status, i) => {
                    const cfg = STATUS_CONFIG[status];
                    const count = byStatus[status] ?? 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                        <div key={status} className="flex-1 group relative">
                            <div className={`h-12 ${cfg.bg} ${i === 0 ? "rounded-l-xl" : ""} ${i === displayStatuses.length - 1 ? "rounded-r-xl" : ""} flex items-center justify-center transition-all hover:scale-y-110 cursor-default`}
                                style={{ flex: Math.max(pct, 5) }}>
                                <span className={`text-xs font-bold ${cfg.text}`}>{count}</span>
                            </div>
                            <div className="text-center mt-2">
                                <p className="text-[10px] font-semibold text-slate-500 leading-tight">{cfg.label}</p>
                                <p className="text-[10px] text-slate-400">{pct.toFixed(0)}%</p>
                            </div>
                            {i < displayStatuses.length - 1 && (
                                <ChevronRight size={12} className="absolute right-[-8px] top-3 text-slate-300 z-10" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Main Component -----------------------------------------------------------
const ExamHome = () => {
    const { hasModuleAdmin } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState<"dashboard" | "exams">("dashboard");

    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState("");

    const [filterClass, setFilterClass] = useState("");
    const [filterCourse, setFilterCourse] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterTerm, setFilterTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [allExams, setAllExams] = useState<any[]>([]);
    const [filterOptions, setFilterOptions] = useState<any>({ classes: [], courses: [], subjects: [], terms: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(null);


    const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({ TERM1: true, TERM2: true, TERM3: true });

    const canCreate = hasModuleAdmin('ACADEMICS');

    useEffect(() => {
        api.getSessions().then((s: any) => {
            const arr = Array.isArray(s) ? s : [];
            setSessions(arr);
            if (arr.length > 0) setSelectedSession(arr[0].id);
        });
    }, []);

    const fetchOverview = async () => {
        if (!selectedSession) return;
        setIsLoading(true);
        try {
            const data = await api.getExamOverview(selectedSession);
            setAllExams(data.exams || []);
            setFilterOptions(data.filters || { classes: [], courses: [], subjects: [], terms: [] });
        } catch (err: any) {
            setAllExams([]);
            setMessage(err?.response?.data?.message || "Failed to fetch exams");
            setMessageType("error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSession) {
            setFilterClass(""); setFilterCourse(""); setFilterSubject(""); setFilterTerm(""); setFilterStatus("");
            setSearchQuery("");
            fetchOverview();
        }
    }, [selectedSession]);

    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 5000);
        return () => clearTimeout(t);
    }, [message]);

    const filteredExams = useMemo(() => {
        let exams = allExams;
        if (filterClass) exams = exams.filter(e => e.classId === filterClass);
        if (filterCourse) exams = exams.filter(e => e.courseId === filterCourse);
        if (filterSubject) exams = exams.filter(e => e.subjectId === filterSubject);
        if (filterTerm) exams = exams.filter(e => e.examTerm === filterTerm);
        if (filterStatus) exams = exams.filter(e => e.status === filterStatus);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            exams = exams.filter(e =>
                (e.examName ?? "").toLowerCase().includes(q) ||
                (e.subjectName ?? "").toLowerCase().includes(q) ||
                (e.teacherName ?? "").toLowerCase().includes(q)
            );
        }
        return exams;
    }, [allExams, filterClass, filterCourse, filterSubject, filterTerm, filterStatus, searchQuery]);

    const stats = useMemo(() => {
        const total = filteredExams.length;
        const byStatus: Record<string, number> = {};
        const byTerm: Record<string, any[]> = {};
        const bySubject: { name: string; count: number; published: number }[] = [];
        const subjMap: Record<string, { name: string; count: number; published: number }> = {};
        for (const e of filteredExams) {
            byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
            if (!byTerm[e.examTerm]) byTerm[e.examTerm] = [];
            byTerm[e.examTerm].push(e);
            if (e.subjectId) {
                if (!subjMap[e.subjectId]) subjMap[e.subjectId] = { name: e.subjectName ?? "—", count: 0, published: 0 };
                subjMap[e.subjectId].count++;
                if (e.status === "RESULT_PUBLISHED") subjMap[e.subjectId].published++;
            }
        }
        Object.values(subjMap).forEach(v => bySubject.push(v));
        const published = byStatus["RESULT_PUBLISHED"] ?? 0;
        const completionRate = total > 0 ? Math.round((published / total) * 100) : 0;
        return { total, byStatus, byTerm, bySubject, published, completionRate };
    }, [filteredExams]);

    const activeFilters = [filterClass, filterCourse, filterSubject, filterTerm, filterStatus, searchQuery].filter(Boolean).length;

    const clearFilters = () => {
        setFilterClass(""); setFilterCourse(""); setFilterSubject(""); setFilterTerm(""); setFilterStatus("");
        setSearchQuery("");
    };

    return (
        <div className="min-h-full bg-slate-50 pb-12">
            <PageHeader
                icon={BookOpen}
                title="Exam Management"
                gradient="from-sky-600 via-blue-600 to-indigo-600"
                subtitle="Monitor, manage and analyse all exam activity across the school"
                actions={
                    <div className="flex gap-2">
                        <button onClick={fetchOverview} disabled={!selectedSession || isLoading}
                            className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl flex gap-2 items-center text-sm hover:bg-white/20 disabled:opacity-40 transition-all backdrop-blur-sm">
                            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                        {canCreate && (
                            <button onClick={() => setIsCreateOpen(true)}
                                data-testid="create-exam-btn"
                                className="px-4 py-2 bg-white/15 border border-white/25 text-white rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-white/25 transition-all backdrop-blur-sm">
                                <Plus size={16} /> Create Exam
                            </button>
                        )}
                    </div>
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {isCreateOpen && (
                    <CreateExamModal onClose={() => setIsCreateOpen(false)} onRefresh={fetchOverview}
                        setMessage={setMessage} setMessageType={setMessageType} />
                )}

                {message && (
                    <div className={`p-4 rounded-xl border text-sm mb-4 ${messageType === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                        {message}
                    </div>
                )}

                {/* Session + Filters */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session</label>
                            <select value={selectedSession}
                                onChange={e => setSelectedSession(e.target.value)}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px] font-medium">
                                <option value="">Select Session</option>
                                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="w-px h-8 bg-slate-200 hidden sm:block" />

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</label>
                            <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterCourse(""); }}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[130px]">
                                <option value="">All Classes</option>
                                {filterOptions.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course</label>
                            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[130px]">
                                <option value="">All Courses</option>
                                {filterOptions.courses?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[130px]">
                                <option value="">All Subjects</option>
                                {filterOptions.subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Term</label>
                            <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[110px]">
                                <option value="">All Terms</option>
                                {filterOptions.terms?.map((t: string) => <option key={t} value={t}>{t.replace("TERM", "Term ")}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]">
                                <option value="">All Statuses</option>
                                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input type="text" placeholder="Exam, subject, teacher..."
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                        </div>

                        {activeFilters > 0 && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors self-end">
                                <X size={12} /> Clear ({activeFilters})
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
                    {([
                        { key: "dashboard",   label: "Dashboard",    icon: BarChart3     },
                        { key: "exams",       label: "All Exams",    icon: ClipboardList },
                    ] as const).map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                                ${tab === key ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                            <Icon size={15} />{label}
                            {key === "exams" && filteredExams.length > 0 && (
                                <span className="ml-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{filteredExams.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Dashboard TAB */}
                {tab === "dashboard" && (
                    <div className="space-y-6">
                        {!selectedSession ? (
                            <EmptyState icon={BarChart3} title="Select a session" sub="Choose a session above to view the school-wide exam dashboard" />
                        ) : isLoading ? (
                            <LoadingSkeleton />
                        ) : allExams.length === 0 ? (
                            <EmptyState icon={BookOpen} title="No exams found" sub="No exam papers have been created for this session yet" />
                        ) : (
                            <>
                                {/* Action Required — Setup Required */}
                                {(stats.byStatus["CREATED"] ?? 0) > 0 && (
                                    <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl shadow-md shadow-amber-100 p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                                <AlertCircle size={17} className="animate-pulse" />
                                                Action Required — Setup Required
                                                <span className="ml-1 bg-white/30 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                    {stats.byStatus["CREATED"]}
                                                </span>
                                            </h2>
                                            <button
                                                onClick={() => { setFilterStatus("CREATED"); setTab("exams"); }}
                                                className="text-[11px] font-semibold text-amber-800 bg-white/30 hover:bg-white/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                                View All <ArrowUpRight size={12} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-amber-50 mb-3">
                                            {stats.byStatus["CREATED"]} exam{stats.byStatus["CREATED"] !== 1 ? "s need" : " needs"} syllabus and exam date set before they can be published.
                                        </p>
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {filteredExams.filter(e => e.status === "CREATED").slice(0, 6).map(e => (
                                                <div key={e.id} onClick={() => navigate(`/exam/${e.id}`)}
                                                    className="flex items-center gap-3 bg-white/20 hover:bg-white/35 backdrop-blur-sm rounded-xl p-3 cursor-pointer transition-all group border border-white/25">
                                                    <div className="w-8 h-8 bg-white/25 rounded-lg flex items-center justify-center shrink-0">
                                                        <AlertCircle size={14} className="text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-white truncate">{e.examName}</p>
                                                        <p className="text-[11px] text-amber-100 truncate">{e.subjectName} · {e.teacherName ?? "No teacher assigned"}</p>
                                                    </div>
                                                    <ArrowUpRight size={13} className="text-white/50 group-hover:text-white transition-colors shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                        {filteredExams.filter(e => e.status === "CREATED").length > 6 && (
                                            <p className="text-[11px] text-amber-100 mt-2 text-center">
                                                +{filteredExams.filter(e => e.status === "CREATED").length - 6} more — click "View All" to see them
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Attendance Needed — READY_TO_CONDUCT */}
                                {(stats.byStatus["READY_TO_CONDUCT"] ?? 0) > 0 && (
                                    <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl shadow-md shadow-orange-100 p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                                <Users size={17} className="animate-pulse" />
                                                Attendance Needed
                                                <span className="ml-1 bg-white/30 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                    {stats.byStatus["READY_TO_CONDUCT"]}
                                                </span>
                                            </h2>
                                            <button
                                                onClick={() => { setFilterStatus("READY_TO_CONDUCT"); setTab("exams"); }}
                                                className="text-[11px] font-semibold text-orange-900 bg-white/30 hover:bg-white/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                                View All <ArrowUpRight size={12} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-orange-50 mb-3">
                                            {stats.byStatus["READY_TO_CONDUCT"]} exam{stats.byStatus["READY_TO_CONDUCT"] !== 1 ? "s are" : " is"} ready to conduct. Teachers must mark attendance before the exam can be marked as conducted.
                                        </p>
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {filteredExams.filter(e => e.status === "READY_TO_CONDUCT").slice(0, 6).map(e => (
                                                <div key={e.id} onClick={() => navigate(`/exam/${e.id}`)}
                                                    className="flex items-center gap-3 bg-white/20 hover:bg-white/35 backdrop-blur-sm rounded-xl p-3 cursor-pointer transition-all group border border-white/25">
                                                    <div className="w-8 h-8 bg-white/25 rounded-lg flex items-center justify-center shrink-0">
                                                        <Users size={14} className="text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-white truncate">{e.examName}</p>
                                                        <p className="text-[11px] text-orange-100 truncate">{e.subjectName} · {e.teacherName ?? "No teacher assigned"}</p>
                                                    </div>
                                                    <ArrowUpRight size={13} className="text-white/50 group-hover:text-white transition-colors shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                        {filteredExams.filter(e => e.status === "READY_TO_CONDUCT").length > 6 && (
                                            <p className="text-[11px] text-orange-100 mt-2 text-center">
                                                +{filteredExams.filter(e => e.status === "READY_TO_CONDUCT").length - 6} more — click "View All" to see them
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Stat cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    <StatCard label="Total Exams" value={stats.total} color="bg-slate-700" Icon={ClipboardList} />
                                    <StatCard label="Completed" value={stats.published} sub={`${stats.completionRate}% complete`} color="bg-emerald-600" Icon={CheckCircle} />
                                    <StatCard label="Setup Required" value={stats.byStatus["CREATED"] ?? 0} color="bg-amber-500" Icon={AlertCircle} />
                                    <StatCard label="Attendance Needed" value={stats.byStatus["READY_TO_CONDUCT"] ?? 0} color="bg-orange-500" Icon={Users} />
                                    <StatCard label="Marks Entry" value={stats.byStatus["CONDUCTED"] ?? 0} color="bg-purple-600" Icon={ClipboardList} />
                                </div>

                                {/* Lifecycle Pipeline */}
                                <LifecyclePipeline byStatus={stats.byStatus} total={stats.total} />

                                {/* Two-column: Term Pipeline + Subject Breakdown */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Term Pipeline */}
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                                            <Calendar size={16} className="text-blue-600" /> Term-wise Progress
                                        </h2>
                                        <div className="space-y-4">
                                            {TERMS.map(term => {
                                                const termExams = stats.byTerm[term] ?? [];
                                                const published = termExams.filter((e: any) => e.status === "RESULT_PUBLISHED").length;
                                                const total = termExams.length;
                                                const pct = total > 0 ? Math.round((published / total) * 100) : 0;
                                                return (
                                                    <div key={term}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-sm font-semibold text-slate-700">{term.replace("TERM", "Term ")}</span>
                                                            <span className="text-xs text-slate-400">{published}/{total} published</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                                                                style={{ width: `${pct}%` }} />
                                                        </div>
                                                        {total > 0 && (
                                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                                {STATUS_ORDER.map(status => {
                                                                    const n = termExams.filter((e: any) => e.status === status).length;
                                                                    if (!n) return null;
                                                                    const cfg = STATUS_CONFIG[status];
                                                                    return (
                                                                        <span key={status} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                                                                            {cfg.label}: {n}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Subject Breakdown */}
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                                            <BookOpen size={16} className="text-indigo-600" /> Subject-wise Breakdown
                                        </h2>
                                        {stats.bySubject.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-8">No subject data available</p>
                                        ) : (
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                                {[...stats.bySubject].sort((a, b) => b.count - a.count).map((subj, i) => {
                                                    const pct = subj.count > 0 ? Math.round((subj.published / subj.count) * 100) : 0;
                                                    return (
                                                        <div key={i} className="flex items-center gap-3 group">
                                                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                                                                {subj.name?.charAt(0) ?? "?"}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-sm font-medium text-slate-700 truncate">{subj.name}</p>
                                                                    <span className="text-xs text-slate-400 ml-2 shrink-0">{subj.count} exams</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                                        style={{ width: `${pct}%` }} />
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-semibold text-emerald-600 shrink-0 w-10 text-right">{pct}%</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Distribution Bar */}
                                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                    <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
                                        <BarChart3 size={16} className="text-slate-500" /> Status Distribution
                                    </h2>
                                    <div className="space-y-3">
                                        {STATUS_ORDER.map(key => {
                                            const cfg = STATUS_CONFIG[key];
                                            const count = stats.byStatus[key] ?? 0;
                                            const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                                            return (
                                                <div key={key} className="flex items-center gap-4">
                                                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg min-w-[160px] ${cfg.bg} ${cfg.text}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-700 ${cfg.dot}`}
                                                            style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700 w-16 text-right">
                                                        {count} <span className="text-slate-400 font-normal text-[10px]">({pct}%)</span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Scheduled Exams */}
                                {filteredExams.filter(e => e.examDate && e.status !== "PUBLISHED").length > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Calendar size={16} className="text-blue-500" /> Scheduled Exams
                                        </h2>
                                        <div className="divide-y divide-slate-50">
                                            {filteredExams
                                                .filter(e => e.examDate && e.status !== "PUBLISHED")
                                                .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
                                                .slice(0, 8)
                                                .map(e => (
                                                    <div key={e.id} onClick={() => navigate(`/exam/${e.id}`)}
                                                        className="flex items-center gap-4 py-3 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors group">
                                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-slate-800 text-sm truncate">{e.examName}</p>
                                                            <p className="text-xs text-slate-400">{e.subjectName} · {e.className ?? "—"} · {e.examTerm?.replace("TERM", "T")}</p>
                                                        </div>
                                                        <StatusBadge status={e.status} />
                                                        <div className="text-right text-xs shrink-0">
                                                            <p className="font-semibold text-blue-600">{fmt(e.examDate)}</p>
                                                        </div>
                                                        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}


                            </>
                        )}
                    </div>
                )}

                {/* Exams TAB */}
                {tab === "exams" && (
                    <div className="space-y-6">
                        {!selectedSession ? (
                            <EmptyState icon={ClipboardList} title="Select a session" sub="Choose a session above to view exam papers" />
                        ) : isLoading ? (
                            <LoadingSkeleton />
                        ) : filteredExams.length === 0 ? (
                            <EmptyState icon={BookOpen} title="No exams found" sub="No exam papers match your current filters" />
                        ) : (
                            <>
                                {/* Summary bar */}
                                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap items-center gap-4">
                                    <span className="text-sm font-bold text-slate-700">
                                        {filteredExams.length} exam{filteredExams.length !== 1 ? "s" : ""}
                                    </span>
                                    <div className="flex gap-2 flex-wrap">
                                        {STATUS_ORDER.map(s => {
                                            const n = filteredExams.filter(e => e.status === s).length;
                                            if (!n) return null;
                                            const cfg = STATUS_CONFIG[s];
                                            return (
                                                <span key={s} className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                                                    {cfg.label}: {n}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Group by term */}
                                {TERMS.concat(Object.keys(stats.byTerm).filter(t => !TERMS.includes(t))).map(term => {
                                    const termExams = filteredExams.filter(e => e.examTerm === term);
                                    if (termExams.length === 0) return null;
                                    const expanded = expandedTerms[term] ?? true;
                                    const published = termExams.filter(e => e.status === "PUBLISHED").length;
                                    return (
                                        <div key={term} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                            <button
                                                onClick={() => setExpandedTerms(p => ({ ...p, [term]: !expanded }))}
                                                className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-800">{term.replace("TERM", "Term ")}</span>
                                                    <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                                        {termExams.length} exams
                                                    </span>
                                                    <span className="text-xs text-emerald-600 font-semibold">{published} published</span>
                                                </div>
                                                {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                            </button>

                                            {expanded && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-slate-50/50 border-b border-slate-100">
                                                            <tr>
                                                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Exam / Subject</th>
                                                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Class / Course</th>
                                                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Teacher</th>
                                                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                                                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Date</th>
                                                                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Marks</th>
                                                                <th className="px-5 py-3"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {termExams.map(exam => (
                                                                <tr key={exam.id} onClick={() => navigate(`/exam/${exam.id}`)}
                                                                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors">
                                                                    <td className="px-5 py-3.5">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                                                                                <BookOpen size={15} className="text-emerald-600" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-semibold text-slate-800">{exam.examName}</p>
                                                                                <p className="text-xs text-slate-400 mt-0.5">{exam.subjectName ?? "—"}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3.5">
                                                                        <p className="text-slate-700 font-medium text-sm">{exam.className ?? "—"}</p>
                                                                        <p className="text-xs text-slate-400">{exam.courseName ?? "—"}</p>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-sm text-slate-600">{exam.teacherName ?? "—"}</td>
                                                                    <td className="px-5 py-3.5"><StatusBadge status={exam.status} /></td>
                                                                    <td className="px-5 py-3.5 text-slate-600 text-sm">
                                                                        {exam.examDate ? fmt(exam.examDate) : <span className="text-slate-300">—</span>}
                                                                    </td>
                                                                    <td className="px-5 py-3.5">
                                                                        <span className="text-sm font-semibold text-slate-700">{exam.fullMarks}</span>
                                                                        <span className="text-xs text-slate-400 ml-1">max</span>
                                                                    </td>
                                                                    <td className="px-5 py-3.5">
                                                                        <ChevronRight size={14} className="text-slate-300" />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Helper components ----------------------------------------------------------
const EmptyState = ({ icon: Icon, title, sub }: { icon: typeof Clock; title: string; sub: string }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center gap-3 text-center">
        <Icon size={36} className="text-slate-200" />
        <p className="font-semibold text-slate-500">{title}</p>
        <p className="text-xs text-slate-400 max-w-xs">{sub}</p>
    </div>
);

const LoadingSkeleton = () => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                    <div className="h-3 bg-slate-100 rounded w-20 mb-3" />
                    <div className="h-8 bg-slate-100 rounded w-16" />
                </div>
            ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-4 items-center animate-pulse">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                        <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                    </div>
                    <div className="h-5 w-24 bg-slate-100 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

export default ExamHome;
