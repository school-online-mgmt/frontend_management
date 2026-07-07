import React, { useEffect, useMemo, useState } from "react";
import {
    BarChart3, TrendingUp, Users, Award, Trophy, Target,
    BookOpen, ChevronRight, Filter,
    Loader2, ArrowUp, Medal, School, Search, X,
    UserCheck, GraduationCap,
    Layers, Star,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useSession } from "../../context/SessionContext";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface SchoolSummary {
    totalExams: number; totalResults: number; appeared: number; absent: number;
    averagePercentage: number; passRate: number; highestPct: number;
    gradeDistribution: Record<string, number>;
}
interface ClassRow { classId: string; className: string; students: number; avgPercentage: number; passRate: number; totalResults: number; }
interface SectionRow { sectionId: string; sectionName: string; className: string; students: number; avgPercentage: number; passRate: number; totalResults: number; }
interface SubjectRow { subjectId: string; subjectName: string; avgPercentage: number; passRate: number; totalResults: number; highest: number; }
interface TopPerformer { studentId: string; studentName: string; className: string; sectionName: string; rollNo: string; avgPercentage: number; examsCount: number; grade: string; pcts: number[]; }

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TERMS = [
    { value: "", label: "All Terms" },
    { value: "TERM1", label: "Term 1" },
    { value: "TERM2", label: "Term 2" },
    { value: "TERM3", label: "Term 3" },
];

const GRADE_COLORS: Record<string, { bg: string; text: string; bar: string; border: string; ring: string }> = {
    "A+": { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200", ring: "ring-emerald-200" },
    "A":  { bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-400", border: "border-emerald-200", ring: "ring-emerald-200" },
    "B+": { bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-500",    border: "border-blue-200",    ring: "ring-blue-200" },
    "B":  { bg: "bg-blue-50",    text: "text-blue-600",    bar: "bg-blue-400",    border: "border-blue-200",    ring: "ring-blue-200" },
    "C":  { bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   border: "border-amber-200",   ring: "ring-amber-200" },
    "D":  { bg: "bg-orange-50",  text: "text-orange-700",  bar: "bg-orange-500",  border: "border-orange-200",  ring: "ring-orange-200" },
    "F":  { bg: "bg-red-50",     text: "text-red-700",     bar: "bg-red-500",     border: "border-red-200",     ring: "ring-red-200" },
};
const GRADE_ORDER = ["A+", "A", "B+", "B", "C", "D", "F"];

const gradeFromPct = (p: number) => p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B+" : p >= 60 ? "B" : p >= 50 ? "C" : p >= 40 ? "D" : "F";

// â”€â”€ SVG Radar Chart (enhanced) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RadarChart = ({ data, size = 280, color = "#6366f1", fillColor = "rgba(99,102,241,0.12)", label }: {
    data: { label: string; value: number }[]; size?: number; color?: string; fillColor?: string; label?: string;
}) => {
    const cx = size / 2, cy = size / 2, r = size * 0.36;
    const n = data.length;
    if (n < 3) return <p className="text-xs text-slate-400 text-center py-8">Need at least 3 data points for radar</p>;
    const levels = [20, 40, 60, 80, 100];

    const getPoint = (i: number, val: number) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return { x: cx + (r * val / 100) * Math.cos(angle), y: cy + (r * val / 100) * Math.sin(angle) };
    };

    const polygonPoints = data.map((d, i) => getPoint(i, d.value)).map(p => `${p.x},${p.y}`).join(" ");
    const labelFontSize = n > 8 ? 8 : n > 6 ? 9 : 10;

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background circle fill */}
                <circle cx={cx} cy={cy} r={r} fill="#f8fafc" />
                {/* Grid levels */}
                {levels.map(lv => {
                    const pts = Array.from({ length: n }, (_, i) => getPoint(i, lv)).map(p => `${p.x},${p.y}`).join(" ");
                    return <polygon key={lv} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="0.7" strokeDasharray={lv === 40 ? "3,3" : "0"} />;
                })}
                {/* Axes */}
                {data.map((_, i) => {
                    const p = getPoint(i, 100);
                    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="0.7" />;
                })}
                {/* Data polygon */}
                <polygon points={polygonPoints} fill={fillColor} stroke={color} strokeWidth="2" strokeLinejoin="round" />
                {/* Data dots */}
                {data.map((d, i) => {
                    const p = getPoint(i, d.value);
                    return <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2" />;
                })}
                {/* Labels */}
                {data.map((d, i) => {
                    const p = getPoint(i, 122);
                    const anchor = Math.abs(p.x - cx) < 5 ? "middle" : p.x > cx ? "start" : "end";
                    return (
                        <text key={i} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle"
                            fontSize={labelFontSize} fill="#475569" fontWeight="600">
                            {d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label}
                            <tspan x={p.x} dy="13" fontSize="9" fill="#94a3b8" fontWeight="500">{d.value}%</tspan>
                        </text>
                    );
                })}
                {/* Center label */}
                {label && <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#94a3b8" fontWeight="600">{label}</text>}
            </svg>
        </div>
    );
};

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatCard = ({ icon: Icon, label, value, sub, color, trend }: {
    icon: typeof Users; label: string; value: string | number; sub?: string; color: string; trend?: "up" | "down" | null;
}) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:shadow-slate-100 transition-all duration-200 group">
        <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${color} shadow-sm`}><Icon size={16} className="text-white" /></div>
            {trend === "up" && <ArrowUp size={14} className="text-emerald-500" />}
        </div>
        <p className="text-2xl font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">{value}</p>
        <p className="text-[11px] font-medium text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
);

// â”€â”€ Filter Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FilterBadge = ({ label, onClear }: { label: string; onClear: () => void }) => (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">
        {label}
        <button onClick={onClear} className="hover:bg-indigo-100 rounded p-0.5"><X size={10} /></button>
    </span>
);

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PerformancePage: React.FC = () => {
    // Session is supplied by the global SessionContext (rendered in the
    // layout topbar). Pages just consume it.
    const { selectedSessionId: sessionId } = useSession();
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [term, setTerm] = useState("");
    const [studentId, setStudentId] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"overview" | "class" | "section" | "subject" | "students" | "student-detail">("overview");

    // Load classes scoped to the chosen session.
    useEffect(() => {
        if (!sessionId) { setClasses([]); return; }
        api.getClasses(sessionId).then(setClasses);
    }, [sessionId]);

    // Load sections when class changes
    useEffect(() => {
        if (classId) api.getSectionsByClass(classId).then(setSections);
        else setSections([]);
        setSectionId("");
    }, [classId]);

    // Load students when class/section selected
    useEffect(() => {
        if (sessionId) {
            api.getStudents(undefined, sessionId).then((d: any) => {
                setStudents(d?.students ?? d ?? []);
            });
        }
    }, [sessionId]);

    // Fetch performance data
    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        api.getPerformanceDashboard({
            sessionId,
            classId: classId || undefined,
            sectionId: sectionId || undefined,
            term: term || undefined,
            studentId: studentId || undefined,
        })
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [sessionId, classId, sectionId, term, studentId]);

    // Auto-switch to student-detail tab when student selected
    useEffect(() => {
        if (studentId) setTab("student-detail");
        else if (tab === "student-detail") setTab("overview");
    }, [studentId]);

    const summary: SchoolSummary | null = data?.schoolSummary ?? null;
    const classBreakdown: ClassRow[] = data?.classBreakdown ?? [];
    const sectionBreakdown: SectionRow[] = data?.sectionBreakdown ?? [];
    const subjectBreakdown: SubjectRow[] = data?.subjectBreakdown ?? [];
    const topPerformers: TopPerformer[] = data?.topPerformers ?? [];

    const radarSubjects = useMemo(() => subjectBreakdown.map(s => ({ label: s.subjectName, value: s.avgPercentage })), [subjectBreakdown]);
    const radarClasses = useMemo(() => classBreakdown.map(c => ({ label: c.className, value: c.avgPercentage })), [classBreakdown]);
    const radarSections = useMemo(() => sectionBreakdown.map(s => ({ label: `${s.className}-${s.sectionName}`, value: s.avgPercentage })), [sectionBreakdown]);

    const filteredStudents = useMemo(() => {
        if (!studentSearch) return [];
        const q = studentSearch.toLowerCase();
        return (students || []).filter((s: any) =>
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
            s.rollNo?.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [studentSearch, students]);

    const selectedStudentName = useMemo(() => {
        if (!studentId) return "";
        const s = (students || []).find((s: any) => s.id === studentId);
        return s ? `${s.firstName} ${s.lastName}` : "";
    }, [studentId, students]);

    const activeFilterCount = [classId, sectionId, term, studentId].filter(Boolean).length;

    const clearAllFilters = () => {
        setClassId("");
        setSectionId("");
        setTerm("");
        setStudentId("");
        setStudentSearch("");
    };

    const TABS = [
        { key: "overview", label: "Overview", icon: BarChart3 },
        { key: "class", label: "By Class", icon: School },
        { key: "section", label: "By Section", icon: Layers },
        { key: "subject", label: "By Subject", icon: BookOpen },
        { key: "students", label: "Top Students", icon: Trophy },
        ...(studentId ? [{ key: "student-detail", label: "Student", icon: GraduationCap }] : []),
    ] as const;

    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader
                icon={BarChart3}
                title="Performance Analytics"
                gradient={MODULE_THEMES.performance}
                subtitle="School-wide academic performance tracking & insights"
                onRefresh={() => {
                    if (sessionId) {
                        setLoading(true);
                        api.getPerformanceDashboard({
                            sessionId,
                            classId: classId || undefined,
                            sectionId: sectionId || undefined,
                            term: term || undefined,
                            studentId: studentId || undefined,
                        }).then(setData).finally(() => setLoading(false));
                    }
                }}
                refreshing={loading}
            />
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-5">

            {/* Refinement filters (term / class / section / student) — session
                lives in the header. */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="ml-1 w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                    )}
                    {activeFilterCount > 0 && (
                        <button onClick={clearAllFilters} className="ml-auto text-xs text-slate-400 hover:text-red-500 font-medium">Clear All</button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Term + (optional) Section + student search. The class
                        filter was removed per request — drill-down by class
                        happens via the Class breakdown tab; section filtering
                        is more useful as a refinement and is kept. */}
                    <select value={term} onChange={e => setTerm(e.target.value)}
                        className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors font-medium">
                        {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {sections.length > 0 && (
                        <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors font-medium">
                            <option value="">All Sections</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                    {/* Student search */}
                    <div className="relative">
                        <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
                            <Search size={12} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search student…"
                                value={studentId ? selectedStudentName : studentSearch}
                                onChange={e => { setStudentSearch(e.target.value); setStudentId(""); setShowStudentDropdown(true); }}
                                onFocus={() => setShowStudentDropdown(true)}
                                className="text-xs font-medium bg-transparent outline-none w-32 placeholder-slate-400"
                            />
                            {studentId && (
                                <button onClick={() => { setStudentId(""); setStudentSearch(""); }} className="text-slate-400 hover:text-red-500">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        {showStudentDropdown && filteredStudents.length > 0 && !studentId && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                                {filteredStudents.map((s: any) => (
                                    <button key={s.id} onClick={() => { setStudentId(s.id); setStudentSearch(""); setShowStudentDropdown(false); }}
                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center gap-2 transition-colors">
                                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-bold text-indigo-600">{s.firstName?.charAt(0)}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{s.firstName} {s.lastName}</p>
                                            <p className="text-[10px] text-slate-400">Roll: {s.rollNo ?? "–"}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Active filter badges */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                        {term && <FilterBadge label={TERMS.find(t => t.value === term)?.label ?? term} onClear={() => setTerm("")} />}
                        {classId && <FilterBadge label={classes.find(c => c.id === classId)?.name ?? "Class"} onClear={() => setClassId("")} />}
                        {sectionId && <FilterBadge label={sections.find(s => s.id === sectionId)?.name ?? "Section"} onClear={() => setSectionId("")} />}
                        {studentId && <FilterBadge label={selectedStudentName || "Student"} onClear={() => { setStudentId(""); setStudentSearch(""); }} />}
                    </div>
                )}
            </div>

            {/* Tabbed views — strip + active panel inside one bordered card */}
            <TabbedSection
                idPrefix="performance"
                value={tab}
                onChange={(k) => setTab(k as typeof tab)}
                theme="indigo"
                flushPanel
                tabs={TABS as any}
            >
                {(() => {
                    const panelLoading = (
                        <div className="p-12 sm:p-16 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3"><Loader2 size={28} className="animate-spin text-indigo-600" /><p className="text-sm text-slate-500 font-medium">Loading performance data…</p></div>
                        </div>
                    );
                    const panelEmpty = (
                        <div className="p-12 sm:p-16 flex flex-col items-center gap-4 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center"><BarChart3 size={28} className="text-slate-300" /></div>
                            <div>
                                <p className="font-bold text-slate-600 text-sm">No Published Results Found</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">Performance data will appear here once exam results are published for the selected session.</p>
                            </div>
                        </div>
                    );
                    const panelGate = (content: React.ReactNode): React.ReactNode =>
                        loading ? panelLoading : !summary ? panelEmpty : <div className="p-4 sm:p-5 md:p-6">{content}</div>;
                    return (<>
                    {/* â”€â”€ OVERVIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <TabPanel tabKey="overview">{panelGate(tab === "overview" && summary && (
                        <div className="space-y-5">
                            {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                <StatCard icon={BarChart3} label="Total Exams" value={summary.totalExams} color="bg-slate-700" />
                                <StatCard icon={Users} label="Students Appeared" value={summary.appeared} sub={`${summary.absent} absent`} color="bg-blue-600" />
                                <StatCard icon={TrendingUp} label="Average Score" value={`${summary.averagePercentage}%`} color="bg-indigo-600" trend="up" />
                                <StatCard icon={Target} label="Pass Rate" value={`${summary.passRate}%`} color="bg-emerald-600" />
                                <StatCard icon={Award} label="Highest Score" value={`${summary.highestPct}%`} color="bg-amber-600" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Radar — Subject Performance */}
                                {radarSubjects.length >= 3 && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                                            <BookOpen size={15} className="text-indigo-500" /> Subject Performance Radar
                                        </h3>
                                        <p className="text-[10px] text-slate-400 mb-4">Average score across all subjects</p>
                                        <RadarChart data={radarSubjects} label="SUBJECTS" />
                                    </div>
                                )}

                                {/* Grade Distribution */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                                        <Award size={15} className="text-amber-500" /> Grade Distribution
                                    </h3>
                                    <p className="text-[10px] text-slate-400 mb-4">Performance breakdown by grade bands</p>
                                    <div className="space-y-3">
                                        {GRADE_ORDER.filter(g => (summary.gradeDistribution[g] ?? 0) > 0).map(g => {
                                            const cnt = summary.gradeDistribution[g] ?? 0;
                                            const pct = summary.appeared > 0 ? Math.round((cnt / summary.appeared) * 100) : 0;
                                            const gc = GRADE_COLORS[g];
                                            return (
                                                <div key={g} className="flex items-center gap-3">
                                                    <span className={`w-10 text-center text-xs font-bold px-1.5 py-1 rounded-lg border ${gc.bg} ${gc.text} ${gc.border}`}>{g}</span>
                                                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                                                        <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${pct}%` }} />
                                                        <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-semibold text-slate-600">{pct}%</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600 w-10 text-right">{cnt}</span>
                                                </div>
                                            );
                                        })}
                                        {GRADE_ORDER.every(g => !(summary.gradeDistribution[g] ?? 0)) && (
                                            <p className="text-xs text-slate-400 text-center py-4">No grade data available</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Class radar (if no class filter and enough classes) */}
                            {!classId && radarClasses.length >= 3 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                                        <School size={15} className="text-violet-500" /> Class-wise Performance Radar
                                    </h3>
                                    <p className="text-[10px] text-slate-400 mb-4">Compare average performance across all classes</p>
                                    <div className="flex justify-center">
                                        <RadarChart data={radarClasses} size={320} color="#7c3aed" fillColor="rgba(124,58,237,0.10)" label="CLASSES" />
                                    </div>
                                </div>
                            )}

                            {/* Top 5 performers quick view */}
                            {topPerformers.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Trophy size={16} className="text-amber-500" /> Top Performers</h3>
                                        <button onClick={() => setTab("students")} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">View All <ChevronRight size={12} /></button>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {topPerformers.slice(0, 5).map((tp, i) => (
                                            <div key={tp.studentId} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() => { setStudentId(tp.studentId); }}>
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    i === 0 ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                                                }`}>#{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{tp.studentName}</p>
                                                    <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName}</p>
                                                </div>
                                                <div className="hidden sm:flex items-center gap-2 w-28">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div className={`h-full rounded-full ${GRADE_COLORS[tp.grade]?.bar ?? "bg-slate-400"}`} style={{ width: `${tp.avgPercentage}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-800">{tp.avgPercentage}%</p>
                                                    <p className="text-[10px] text-slate-400">{tp.examsCount} exams</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${GRADE_COLORS[tp.grade]?.bg ?? "bg-slate-50"} ${GRADE_COLORS[tp.grade]?.text ?? "text-slate-600"} ${GRADE_COLORS[tp.grade]?.border ?? "border-slate-200"}`}>{tp.grade}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}</TabPanel>

                    {/* â”€â”€ CLASS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <TabPanel tabKey="class">{panelGate(tab === "class" && summary && (
                        <div className="space-y-5">
                            {radarClasses.length >= 3 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><School size={15} className="text-indigo-500" /> Class Performance Radar</h3>
                                    <RadarChart data={radarClasses} size={320} color="#7c3aed" fillColor="rgba(124,58,237,0.10)" label="CLASSES" />
                                </div>
                            )}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b bg-slate-50"><h3 className="text-sm font-bold text-slate-800">Class-wise Performance Breakdown</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50/50 border-b"><tr>
                                            {["Class", "Students", "Results", "Avg %", "Pass Rate", ""].map(h => <th key={h} className="px-6 py-3.5 font-semibold text-xs text-slate-500 uppercase tracking-wide">{h}</th>)}
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {classBreakdown.map(c => (
                                                <tr key={c.classId} className="hover:bg-indigo-50/30 cursor-pointer transition-colors" onClick={() => { setClassId(c.classId); setTab("section"); }}>
                                                    <td className="px-6 py-3.5 font-semibold text-slate-800">{c.className}</td>
                                                    <td className="px-6 py-3.5 text-slate-600">{c.students}</td>
                                                    <td className="px-6 py-3.5 text-slate-600">{c.totalResults}</td>
                                                    <td className="px-6 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div className={`h-full rounded-full ${GRADE_COLORS[gradeFromPct(c.avgPercentage)]?.bar}`} style={{ width: `${c.avgPercentage}%` }} />
                                                            </div>
                                                            <span className="font-bold text-indigo-700">{c.avgPercentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${c.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : c.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{c.passRate}%</span>
                                                    </td>
                                                    <td className="px-6 py-3.5"><ChevronRight size={14} className="text-slate-300" /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {classBreakdown.length === 0 && <div className="p-12 text-center text-sm text-slate-400">No class data available</div>}
                            </div>
                        </div>
                    ))}</TabPanel>

                    {/* â”€â”€ SECTION TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <TabPanel tabKey="section">{panelGate(tab === "section" && summary && (
                        <div className="space-y-5">
                            {radarSections.length >= 3 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Layers size={15} className="text-indigo-500" /> Section Performance Radar</h3>
                                    <RadarChart data={radarSections} size={320} color="#0891b2" fillColor="rgba(8,145,178,0.10)" label="SECTIONS" />
                                </div>
                            )}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b bg-slate-50"><h3 className="text-sm font-bold text-slate-800">Section-wise Performance Breakdown</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50/50 border-b"><tr>
                                            {["Section", "Class", "Students", "Results", "Avg %", "Pass Rate"].map(h => <th key={h} className="px-6 py-3.5 font-semibold text-xs text-slate-500 uppercase tracking-wide">{h}</th>)}
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {sectionBreakdown.map(s => (
                                                <tr key={s.sectionId} className="hover:bg-indigo-50/30 cursor-pointer transition-colors" onClick={() => setSectionId(s.sectionId)}>
                                                    <td className="px-6 py-3.5 font-semibold text-slate-800">{s.sectionName}</td>
                                                    <td className="px-6 py-3.5 text-slate-500">{s.className}</td>
                                                    <td className="px-6 py-3.5 text-slate-600">{s.students}</td>
                                                    <td className="px-6 py-3.5 text-slate-600">{s.totalResults}</td>
                                                    <td className="px-6 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div className={`h-full rounded-full ${GRADE_COLORS[gradeFromPct(s.avgPercentage)]?.bar}`} style={{ width: `${s.avgPercentage}%` }} />
                                                            </div>
                                                            <span className="font-bold text-indigo-700">{s.avgPercentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : s.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.passRate}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {sectionBreakdown.length === 0 && <div className="p-12 text-center text-sm text-slate-400">No section data available</div>}
                            </div>
                        </div>
                    ))}</TabPanel>

                    {/* â”€â”€ SUBJECT TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <TabPanel tabKey="subject">{panelGate(tab === "subject" && summary && (
                        <div className="space-y-5">
                            {radarSubjects.length >= 3 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><BookOpen size={15} className="text-indigo-500" /> Subject Average % Radar</h3>
                                    <RadarChart data={radarSubjects} size={320} label="SUBJECTS" />
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subjectBreakdown.map(s => {
                                    const g = gradeFromPct(s.avgPercentage);
                                    const gc = GRADE_COLORS[g];
                                    return (
                                        <div key={s.subjectId} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-slate-100 transition-all duration-200 group">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><BookOpen size={16} className="text-indigo-600" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{s.subjectName}</p>
                                                    <p className="text-[10px] text-slate-400">{s.totalResults} results</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${gc.bg} ${gc.text} ${gc.border}`}>{g}</span>
                                            </div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-3xl font-black text-slate-900">{s.avgPercentage}%</span>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : s.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.passRate}% pass</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
                                                <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${s.avgPercentage}%` }} />
                                            </div>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1"><Star size={10} className="text-amber-400" /> Highest: {s.highest}%</p>
                                        </div>
                                    );
                                })}
                            </div>
                            {subjectBreakdown.length === 0 && (
                                <div className="bg-white rounded-2xl border p-12 text-center text-sm text-slate-400">No subject data available</div>
                            )}
                        </div>
                    ))}</TabPanel>

                    {/* â”€â”€ TOP STUDENTS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <TabPanel tabKey="students">{panelGate(tab === "students" && summary && (
                        <div className="space-y-5">
                            {topPerformers.length > 0 && (
                                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
                                    <div className="flex items-center gap-3 mb-1">
                                        <Medal size={22} className="text-amber-400" />
                                        <h3 className="text-lg font-bold">School Top Performers</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-5">Top 10 students by average percentage across all published exams{term ? ` (${TERMS.find(t => t.value === term)?.label})` : ""}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {topPerformers.slice(0, 3).map((tp, i) => (
                                            <div key={tp.studentId} className={`rounded-xl p-5 flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02] ${
                                                i === 0 ? "bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/20" :
                                                i === 1 ? "bg-white/10 border border-white/10" : "bg-white/5 border border-white/5"
                                            }`} onClick={() => setStudentId(tp.studentId)}>
                                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-black mb-3 ${
                                                    i === 0 ? "bg-amber-400/20 text-amber-300 ring-2 ring-amber-400/30" :
                                                    i === 1 ? "bg-slate-400/20 text-slate-300" : "bg-orange-400/20 text-orange-300"
                                                }`}>#{i + 1}</div>
                                                <p className="text-sm font-bold text-white truncate w-full">{tp.studentName}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{tp.className} · {tp.sectionName}</p>
                                                <p className="text-2xl font-black text-white mt-2">{tp.avgPercentage}%</p>
                                                <p className="text-[10px] text-slate-500">{tp.examsCount} exams · Grade {tp.grade}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
                                    <Trophy size={15} className="text-amber-500" />
                                    <h3 className="text-sm font-bold text-slate-800">Complete Leaderboard (Top 10)</h3>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {topPerformers.map((tp, i) => {
                                        const gc = GRADE_COLORS[tp.grade] ?? GRADE_COLORS["C"];
                                        return (
                                            <div key={tp.studentId} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() => setStudentId(tp.studentId)}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                                    i === 0 ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                                                }`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">{tp.studentName}</p>
                                                    <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName} · Roll #{tp.rollNo}</p>
                                                </div>
                                                <div className="hidden sm:block w-36">
                                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${tp.avgPercentage}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-right min-w-[60px]">
                                                    <p className="text-sm font-bold text-slate-800">{tp.avgPercentage}%</p>
                                                    <p className="text-[10px] text-slate-400">{tp.examsCount} exams</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${gc.bg} ${gc.text} ${gc.border}`}>{tp.grade}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {topPerformers.length === 0 && <div className="p-12 text-center text-sm text-slate-400">No student data available</div>}
                            </div>
                        </div>
                    ))}</TabPanel>

                    {/* â”€â”€ STUDENT DETAIL TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <TabPanel tabKey="student-detail">{panelGate(tab === "student-detail" && studentId && summary && (
                        <div className="space-y-5">
                            {/* Student performance = same as school summary but for one student */}
                            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center text-xl font-black text-indigo-300 ring-2 ring-indigo-500/30">
                                        {selectedStudentName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{selectedStudentName}</h2>
                                        <p className="text-xs text-slate-400">Individual Performance Report</p>
                                    </div>
                                    {summary && (
                                        <div className="ml-auto text-right">
                                            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 text-xl font-black ${GRADE_COLORS[gradeFromPct(summary.averagePercentage)]?.bg} ${GRADE_COLORS[gradeFromPct(summary.averagePercentage)]?.border} ${GRADE_COLORS[gradeFromPct(summary.averagePercentage)]?.text}`}>
                                                {gradeFromPct(summary.averagePercentage)}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">{summary.averagePercentage}% avg</p>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-white/10 rounded-xl p-3">
                                        <BarChart3 size={14} className="text-blue-300 mb-1.5" />
                                        <p className="text-lg font-bold">{summary?.totalExams ?? 0}</p>
                                        <p className="text-[10px] text-slate-400">Exams</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3">
                                        <TrendingUp size={14} className="text-emerald-300 mb-1.5" />
                                        <p className="text-lg font-bold">{summary?.averagePercentage ?? 0}%</p>
                                        <p className="text-[10px] text-slate-400">Average</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3">
                                        <Target size={14} className="text-amber-300 mb-1.5" />
                                        <p className="text-lg font-bold">{summary?.highestPct ?? 0}%</p>
                                        <p className="text-[10px] text-slate-400">Highest</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3">
                                        <UserCheck size={14} className="text-emerald-300 mb-1.5" />
                                        <p className="text-lg font-bold">{summary?.passRate ?? 0}%</p>
                                        <p className="text-[10px] text-slate-400">Pass Rate</p>
                                    </div>
                                </div>
                            </div>

                            {/* Student subject radar */}
                            {radarSubjects.length >= 3 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <BookOpen size={15} className="text-indigo-500" /> Subject-wise Performance
                                    </h3>
                                    <RadarChart data={radarSubjects} size={320} color="#059669" fillColor="rgba(5,150,105,0.10)" label="STUDENT" />
                                </div>
                            )}

                            {/* Subject cards for student */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subjectBreakdown.map(s => {
                                    const g = gradeFromPct(s.avgPercentage);
                                    const gc = GRADE_COLORS[g];
                                    return (
                                        <div key={s.subjectId} className="bg-white rounded-2xl border border-slate-200 p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><BookOpen size={14} className="text-indigo-600" /></div>
                                                    <p className="text-sm font-bold text-slate-800 truncate">{s.subjectName}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${gc.bg} ${gc.text} ${gc.border}`}>{g}</span>
                                            </div>
                                            <p className="text-3xl font-black text-slate-900 mb-2">{s.avgPercentage}%</p>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className={`h-full rounded-full ${gc.bar}`} style={{ width: `${s.avgPercentage}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}</TabPanel>
                    </>);
                })()}
            </TabbedSection>
            </div>
        </div>
    );
};

export default PerformancePage;

