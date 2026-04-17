import React, { useEffect, useMemo, useState } from "react";
import {
    BarChart3, TrendingUp, Users, Award, Trophy, Target,
    BookOpen, RefreshCw, ChevronRight, Loader2,
    ArrowUp, ArrowDown, Medal, School, UserCheck, Minus,
    AlertTriangle, Lightbulb, X,
    FileText, ClipboardList, Zap,
} from "lucide-react";
import api from "../../api/api";

// ── Types ───────────────────────────────────────────────────────────────────────
interface SchoolSummary {
    totalExams: number; totalResults: number; appeared: number; absent: number;
    averagePercentage: number; passRate: number; highestPct: number;
    gradeDistribution: Record<string, number>;
}
interface ClassRow { classId: string; className: string; students: number; avgPercentage: number; passRate: number; totalResults: number; }
interface SectionRow { sectionId: string; sectionName: string; className: string; students: number; avgPercentage: number; passRate: number; totalResults: number; }
interface SubjectRow { subjectId: string; subjectName: string; avgPercentage: number; passRate: number; totalResults: number; highest: number; }
interface TopPerformer { studentId: string; studentName: string; className: string; sectionName: string; rollNo: string; avgPercentage: number; examsCount: number; grade: string; pcts: number[]; }

interface ExamReportData {
    exam: { id: string; examName: string; subjectName: string; sessionName: string; teacherName: string; examTerm: string; fullMarks: number; status: string; };
    summary: { totalStudents: number; appeared: number; absent: number; passCount: number; failCount: number; passRate: number; averageMarks: number; averagePercentage: number; highestMarks: number; lowestMarks: number; medianMarks: number; };
    gradeDistribution: Record<string, number>;
    sectionBreakdown: { sectionId: string; sectionName: string; className: string; total: number; appeared: number; absent: number; passCount: number; failCount: number; passRate: number; average: number; highest: number; lowest: number; }[];
    topPerformers: { studentName: string; marks: number; percentage: number; grade: string; sectionName: string; }[];
}

// ── Constants ───────────────────────────────────────────────────────────────────
const GRADE_COLORS: Record<string, { bg: string; text: string; bar: string; border: string }> = {
    "A+": { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200" },
    "A":  { bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-400", border: "border-emerald-200" },
    "B+": { bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-500",    border: "border-blue-200"    },
    "B":  { bg: "bg-blue-50",    text: "text-blue-600",    bar: "bg-blue-400",    border: "border-blue-200"    },
    "C":  { bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   border: "border-amber-200"   },
    "D":  { bg: "bg-orange-50",  text: "text-orange-700",  bar: "bg-orange-500",  border: "border-orange-200"  },
    "F":  { bg: "bg-red-50",     text: "text-red-700",     bar: "bg-red-500",     border: "border-red-200"     },
};
const GRADE_ORDER = ["A+", "A", "B+", "B", "C", "D", "F"];

// ── SVG Radar Chart ─────────────────────────────────────────────────────────────
const RadarChart = ({ data, size = 260, color = "#6366f1" }: { data: { label: string; value: number }[]; size?: number; color?: string }) => {
    const cx = size / 2, cy = size / 2, r = size * 0.36;
    const n = data.length;
    if (n < 3) return null;
    const levels = [20, 40, 60, 80, 100];
    const getPoint = (i: number, val: number) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return { x: cx + (r * val / 100) * Math.cos(angle), y: cy + (r * val / 100) * Math.sin(angle) };
    };
    const polygonPoints = data.map((d, i) => getPoint(i, d.value)).map(p => `${p.x},${p.y}`).join(" ");

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
            {levels.map(lv => {
                const pts = Array.from({ length: n }, (_, i) => getPoint(i, lv)).map(p => `${p.x},${p.y}`).join(" ");
                return <polygon key={lv} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="0.8" />;
            })}
            {data.map((_, i) => { const p = getPoint(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="0.8" />; })}
            <polygon points={polygonPoints} fill={color + "22"} stroke={color} strokeWidth="2" />
            {data.map((d, i) => { const p = getPoint(i, d.value); return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />; })}
            {data.map((d, i) => {
                const p = getPoint(i, 120);
                const anchor = Math.abs(p.x - cx) < 5 ? "middle" : p.x > cx ? "start" : "end";
                return (
                    <text key={i} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle" fontSize={n > 6 ? 9 : 10} fill="#475569" fontWeight="600">
                        {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
                        <tspan x={p.x} dy="12" fontSize="9" fill="#94a3b8" fontWeight="500">{d.value}%</tspan>
                    </text>
                );
            })}
        </svg>
    );
};

// ── Stat Card ───────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: typeof Users; label: string; value: string | number; sub?: string; color: string }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg transition-all group">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={18} className="text-white" />
            </div>
        </div>
    </div>
);

// ── Improvement Insights ────────────────────────────────────────────────────────
const InsightsPanel = ({ summary, subjectBreakdown, classBreakdown }: { summary: SchoolSummary; subjectBreakdown: SubjectRow[]; classBreakdown: ClassRow[] }) => {
    const insights: { type: "warning" | "success" | "info"; message: string }[] = [];

    // Weak subjects (below 50% avg)
    const weakSubjects = subjectBreakdown.filter(s => s.avgPercentage < 50);
    if (weakSubjects.length > 0) {
        insights.push({ type: "warning", message: `${weakSubjects.length} subject(s) have average below 50%: ${weakSubjects.map(s => s.subjectName).join(", ")}. Consider remedial classes or additional support.` });
    }

    // High failure rate
    if (summary.passRate < 70) {
        insights.push({ type: "warning", message: `Overall pass rate is ${summary.passRate}% — below the 70% benchmark. Review teaching methodologies and student engagement.` });
    }

    // Strong subjects
    const strongSubjects = subjectBreakdown.filter(s => s.avgPercentage >= 80);
    if (strongSubjects.length > 0) {
        insights.push({ type: "success", message: `${strongSubjects.length} subject(s) performing excellently (80%+): ${strongSubjects.map(s => s.subjectName).join(", ")}.` });
    }

    // Class disparity
    if (classBreakdown.length >= 2) {
        const sorted = [...classBreakdown].sort((a, b) => b.avgPercentage - a.avgPercentage);
        const gap = sorted[0].avgPercentage - sorted[sorted.length - 1].avgPercentage;
        if (gap > 20) {
            insights.push({ type: "info", message: `${gap}% gap between best class (${sorted[0].className}: ${sorted[0].avgPercentage}%) and weakest (${sorted[sorted.length - 1].className}: ${sorted[sorted.length - 1].avgPercentage}%). Consider resource reallocation.` });
        }
    }

    // High absence
    if (summary.totalResults > 0) {
        const absRate = Math.round((summary.absent / summary.totalResults) * 100);
        if (absRate > 15) {
            insights.push({ type: "warning", message: `${absRate}% absence rate across exams. Investigate reasons and take corrective measures.` });
        }
    }

    if (summary.passRate >= 85) {
        insights.push({ type: "success", message: `Excellent overall performance with ${summary.passRate}% pass rate! Keep up the momentum.` });
    }

    if (insights.length === 0) {
        insights.push({ type: "info", message: "Performance data looks stable. Continue monitoring for trends across terms." });
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Lightbulb size={16} className="text-amber-500" /> Improvement Insights & Recommendations
            </h3>
            <div className="space-y-3">
                {insights.map((ins, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                        ins.type === "warning" ? "bg-amber-50 border border-amber-100" :
                        ins.type === "success" ? "bg-emerald-50 border border-emerald-100" :
                        "bg-blue-50 border border-blue-100"
                    }`}>
                        {ins.type === "warning" ? <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" /> :
                         ins.type === "success" ? <TrendingUp size={16} className="text-emerald-600 shrink-0 mt-0.5" /> :
                         <Zap size={16} className="text-blue-600 shrink-0 mt-0.5" />}
                        <p className="text-sm text-slate-700">{ins.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Main Component ──────────────────────────────────────────────────────────────
const ResultsPerformancePage: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [sessionId, setSessionId] = useState("");
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [data, setData] = useState<unknown>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"overview" | "class" | "section" | "subject" | "students" | "report-card">("overview");

    // Report card state
    const [publishedExams, setPublishedExams] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [examReport, setExamReport] = useState<ExamReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    // Load sessions & classes
    useEffect(() => {
        Promise.all([api.getSessions(), api.getClasses()]).then(([s, c]) => {
            const sessArr = Array.isArray(s) ? s : [];
            setSessions(sessArr);
            setClasses(Array.isArray(c) ? c : []);
            if (sessArr.length > 0) setSessionId(sessArr[0].id);
        });
    }, []);

    // Load sections when class changes
    useEffect(() => {
        if (classId) api.getSectionsByClass(classId).then((s: unknown) => setSections(Array.isArray(s) ? s : []));
        else setSections([]);
        setSectionId("");
    }, [classId]);

    // Fetch performance data
    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        api.getPerformanceDashboard({ sessionId, classId: classId || undefined, sectionId: sectionId || undefined })
            .then((d: unknown) => {
                setData(d);
                setPublishedExams(d?.exams ?? []);
            })
            .catch(() => { setData(null); setPublishedExams([]); })
            .finally(() => setLoading(false));
    }, [sessionId, classId, sectionId]);

    // Fetch individual exam report
    useEffect(() => {
        if (!selectedExamId) { setExamReport(null); return; }
        setReportLoading(true);
        api.getExamReport(selectedExamId)
            .then((d: ExamReportData) => setExamReport(d))
            .catch(() => setExamReport(null))
            .finally(() => setReportLoading(false));
    }, [selectedExamId]);

    const summary: SchoolSummary | null = data?.schoolSummary ?? null;
    const classBreakdown: ClassRow[] = data?.classBreakdown ?? [];
    const sectionBreakdown: SectionRow[] = data?.sectionBreakdown ?? [];
    const subjectBreakdown: SubjectRow[] = data?.subjectBreakdown ?? [];
    const topPerformers: TopPerformer[] = data?.topPerformers ?? [];

    const radarSubjects = useMemo(() => subjectBreakdown.map(s => ({ label: s.subjectName, value: s.avgPercentage })), [subjectBreakdown]);
    const radarClasses = useMemo(() => classBreakdown.map(c => ({ label: c.className, value: c.avgPercentage })), [classBreakdown]);
    const radarSections = useMemo(() => sectionBreakdown.map(s => ({ label: `${s.className} - ${s.sectionName}`, value: s.avgPercentage })), [sectionBreakdown]);

    const selectedSessionName = sessions.find(s => s.id === sessionId)?.name ?? "";
    const activeFilters = [classId, sectionId].filter(Boolean).length;

    const TABS = [
        { key: "overview",     label: "Overview",       icon: BarChart3     },
        { key: "class",        label: "By Class",       icon: School        },
        { key: "section",      label: "By Section",     icon: Users         },
        { key: "subject",      label: "By Subject",     icon: BookOpen      },
        { key: "students",     label: "Top Students",   icon: Trophy        },
        { key: "report-card",  label: "Exam Reports",   icon: FileText      },
    ] as const;

    return (
        <div className="min-h-full pb-12">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <BarChart3 size={22} />
                                </div>
                                <h1 className="text-3xl font-bold">Results & Performance</h1>
                            </div>
                            <p className="text-indigo-200 text-sm">Comprehensive academic analytics, report cards & improvement insights</p>
                        </div>
                        <button onClick={() => { if (sessionId) { setLoading(true); api.getPerformanceDashboard({ sessionId, classId: classId || undefined, sectionId: sectionId || undefined }).then(d => { setData(d); setPublishedExams(d?.exams ?? []); }).catch(() => setData(null)).finally(() => setLoading(false)); } }}
                            disabled={loading || !sessionId}
                            className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl flex gap-2 items-center text-sm hover:bg-white/20 disabled:opacity-40 transition-all backdrop-blur-sm self-end">
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-4">
                {/* Filters */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session *</label>
                            <select value={sessionId} onChange={e => { setSessionId(e.target.value); setClassId(""); setSectionId(""); }}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[170px] font-medium">
                                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="w-px h-8 bg-slate-200 hidden sm:block" />

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</label>
                            <select value={classId} onChange={e => { setClassId(e.target.value); setSectionId(""); }}
                                className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]">
                                <option value="">All Classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {sections.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section</label>
                                <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                                    className="border border-slate-200 bg-slate-50 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]">
                                    <option value="">All Sections</option>
                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}

                        {activeFilters > 0 && (
                            <button onClick={() => { setClassId(""); setSectionId(""); }}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors self-end">
                                <X size={12} /> Clear Filters
                            </button>
                        )}

                        <div className="ml-auto text-right self-end">
                            <p className="text-xs text-slate-400">
                                {selectedSessionName && <span className="font-medium text-slate-600">{selectedSessionName}</span>}
                                {classId && <span> · {classes.find(c => c.id === classId)?.name}</span>}
                                {sectionId && <span> · {sections.find(s => s.id === sectionId)?.name}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto mb-6">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                tab === t.key ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                            }`}>
                            <t.icon size={14} /> {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={28} className="animate-spin text-indigo-600" />
                            <p className="text-sm text-slate-500">Loading performance data…</p>
                        </div>
                    </div>
                ) : !summary ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center gap-3 text-center">
                        <BarChart3 size={40} className="text-slate-200" />
                        <p className="font-semibold text-slate-500">No published results found</p>
                        <p className="text-xs text-slate-400 max-w-md">Performance data appears once exam results are published. Create exams, conduct them, enter marks, and publish results to see analytics here.</p>
                    </div>
                ) : (
                    <>
                        {/* ── OVERVIEW TAB ────────────────────────────────────────── */}
                        {tab === "overview" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    <StatCard icon={ClipboardList} label="Total Exams" value={summary.totalExams} color="bg-slate-600" />
                                    <StatCard icon={Users} label="Appeared" value={summary.appeared} sub={`${summary.absent} absent`} color="bg-blue-600" />
                                    <StatCard icon={TrendingUp} label="Avg Score" value={`${summary.averagePercentage}%`} color="bg-indigo-600" />
                                    <StatCard icon={Target} label="Pass Rate" value={`${summary.passRate}%`} sub={summary.passRate >= 75 ? "Good" : summary.passRate >= 50 ? "Needs attention" : "Critical"} color={summary.passRate >= 75 ? "bg-emerald-600" : summary.passRate >= 50 ? "bg-amber-500" : "bg-red-500"} />
                                    <StatCard icon={ArrowUp} label="Highest" value={`${summary.highestPct}%`} color="bg-emerald-600" />
                                </div>

                                {/* Insights */}
                                <InsightsPanel summary={summary} subjectBreakdown={subjectBreakdown} classBreakdown={classBreakdown} />

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Radar – Subject Performance */}
                                    {radarSubjects.length >= 3 && (
                                        <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                                <BookOpen size={15} className="text-indigo-500" /> Subject Performance Radar
                                            </h3>
                                            <RadarChart data={radarSubjects} />
                                        </div>
                                    )}

                                    {/* Grade Distribution */}
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                            <Award size={15} className="text-amber-500" /> Grade Distribution
                                        </h3>
                                        <div className="space-y-2.5">
                                            {GRADE_ORDER.filter(g => (summary.gradeDistribution[g] ?? 0) > 0).map(g => {
                                                const cnt = summary.gradeDistribution[g] ?? 0;
                                                const pct = summary.appeared > 0 ? Math.round((cnt / summary.appeared) * 100) : 0;
                                                const gc = GRADE_COLORS[g];
                                                return (
                                                    <div key={g} className="flex items-center gap-3">
                                                        <span className={`w-9 text-center text-xs font-bold px-1 py-0.5 rounded border ${gc.bg} ${gc.text} ${gc.border}`}>{g}</span>
                                                        <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600 w-16 text-right">{cnt} ({pct}%)</span>
                                                    </div>
                                                );
                                            })}
                                            {GRADE_ORDER.every(g => (summary.gradeDistribution[g] ?? 0) === 0) && (
                                                <p className="text-sm text-slate-400 text-center py-4">No grade data</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Top 5 quick view */}
                                {topPerformers.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Trophy size={15} className="text-amber-500" /> Top Performers</h3>
                                            <button onClick={() => setTab("students")} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">View All <ChevronRight size={12} /></button>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {topPerformers.slice(0, 5).map((tp, i) => {
                                                const gc = GRADE_COLORS[tp.grade] ?? GRADE_COLORS["C"];
                                                return (
                                                    <div key={tp.studentId} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                                            i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                                                        }`}>{i + 1}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-800 truncate">{tp.studentName}</p>
                                                            <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName} · Roll #{tp.rollNo}</p>
                                                        </div>
                                                        <div className="hidden sm:block w-28">
                                                            <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                <div className={`h-full rounded-full ${gc.bar}`} style={{ width: `${tp.avgPercentage}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-slate-800">{tp.avgPercentage}%</p>
                                                            <p className="text-[10px] text-slate-400">{tp.examsCount} exams</p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${gc.bg} ${gc.text} ${gc.border}`}>{tp.grade}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── CLASS TAB ────────────────────────────────────────────── */}
                        {tab === "class" && (
                            <div className="space-y-6">
                                {radarClasses.length >= 3 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><School size={15} className="text-indigo-500" /> Class Performance Radar</h3>
                                        <RadarChart data={radarClasses} size={300} color="#8b5cf6" />
                                    </div>
                                )}
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b bg-slate-50"><h3 className="text-sm font-bold text-slate-800">Class-wise Performance</h3></div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 border-b"><tr>
                                                {["Class", "Students", "Results", "Avg %", "Pass Rate", ""].map(h => <th key={h} className="px-5 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wide">{h}</th>)}
                                            </tr></thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {classBreakdown.map(c => (
                                                    <tr key={c.classId} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => { setClassId(c.classId); setTab("section"); }}>
                                                        <td className="px-5 py-3.5 font-semibold text-slate-800">{c.className}</td>
                                                        <td className="px-5 py-3.5 text-slate-600">{c.students}</td>
                                                        <td className="px-5 py-3.5 text-slate-600">{c.totalResults}</td>
                                                        <td className="px-5 py-3.5"><span className="font-bold text-indigo-700">{c.avgPercentage}%</span></td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${c.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : c.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{c.passRate}%</span>
                                                        </td>
                                                        <td className="px-5 py-3.5"><ChevronRight size={14} className="text-slate-300" /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {classBreakdown.length === 0 && <div className="p-12 text-center text-sm text-slate-400">No class data available</div>}
                                </div>
                            </div>
                        )}

                        {/* ── SECTION TAB ──────────────────────────────────────────── */}
                        {tab === "section" && (
                            <div className="space-y-6">
                                {radarSections.length >= 3 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Users size={15} className="text-indigo-500" /> Section Performance Radar</h3>
                                        <RadarChart data={radarSections} size={300} color="#0ea5e9" />
                                    </div>
                                )}
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b bg-slate-50"><h3 className="text-sm font-bold text-slate-800">Section-wise Performance</h3></div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 border-b"><tr>
                                                {["Section", "Class", "Students", "Results", "Avg %", "Pass Rate"].map(h => <th key={h} className="px-5 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wide">{h}</th>)}
                                            </tr></thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {sectionBreakdown.map(s => (
                                                    <tr key={s.sectionId} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => setSectionId(s.sectionId)}>
                                                        <td className="px-5 py-3.5 font-semibold text-slate-800">{s.sectionName}</td>
                                                        <td className="px-5 py-3.5 text-slate-500">{s.className}</td>
                                                        <td className="px-5 py-3.5 text-slate-600">{s.students}</td>
                                                        <td className="px-5 py-3.5 text-slate-600">{s.totalResults}</td>
                                                        <td className="px-5 py-3.5"><span className="font-bold text-indigo-700">{s.avgPercentage}%</span></td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : s.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.passRate}%</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {sectionBreakdown.length === 0 && <div className="p-12 text-center text-sm text-slate-400">No section data available</div>}
                                </div>
                            </div>
                        )}

                        {/* ── SUBJECT TAB ──────────────────────────────────────────── */}
                        {tab === "subject" && (
                            <div className="space-y-6">
                                {radarSubjects.length >= 3 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><BookOpen size={15} className="text-indigo-500" /> Subject Average % Radar</h3>
                                        <RadarChart data={radarSubjects} size={300} />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {subjectBreakdown.map(s => {
                                        const gc = GRADE_COLORS[s.avgPercentage >= 90 ? "A+" : s.avgPercentage >= 80 ? "A" : s.avgPercentage >= 70 ? "B+" : s.avgPercentage >= 60 ? "B" : s.avgPercentage >= 50 ? "C" : s.avgPercentage >= 40 ? "D" : "F"];
                                        const needsAttention = s.avgPercentage < 50;
                                        return (
                                            <div key={s.subjectId} className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all ${needsAttention ? "border-amber-200" : "border-slate-100"}`}>
                                                <div className="flex items-center gap-2.5 mb-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${needsAttention ? "bg-amber-50" : "bg-indigo-50"}`}>
                                                        <BookOpen size={16} className={needsAttention ? "text-amber-600" : "text-indigo-600"} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 truncate">{s.subjectName}</p>
                                                        <p className="text-[10px] text-slate-400">{s.totalResults} results</p>
                                                    </div>
                                                    {needsAttention && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                                                </div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-2xl font-bold text-slate-900">{s.avgPercentage}%</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : s.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.passRate}% pass</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${s.avgPercentage}%` }} />
                                                </div>
                                                <p className="text-[10px] text-slate-400 flex items-center gap-1"><ArrowUp size={10} className="text-emerald-500" /> Highest: {s.highest}%</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                {subjectBreakdown.length === 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400">No subject data available</div>
                                )}
                            </div>
                        )}

                        {/* ── TOP STUDENTS TAB ────────────────────────────────────── */}
                        {tab === "students" && (
                            <div className="space-y-6">
                                {topPerformers.length > 0 && (
                                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white">
                                        <div className="flex items-center gap-3 mb-1">
                                            <Medal size={20} className="text-amber-400" />
                                            <h3 className="text-base font-bold">🏆 School Top Performers</h3>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-5">Top students by average percentage across all published exams</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {topPerformers.slice(0, 3).map((tp, i) => (
                                                <div key={tp.studentId} className={`rounded-xl p-4 flex items-center gap-3 ${
                                                    i === 0 ? "bg-amber-500/15 border border-amber-400/30" : i === 1 ? "bg-slate-400/15 border border-slate-400/20" : "bg-orange-500/15 border border-orange-400/20"
                                                }`}>
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${
                                                        i === 0 ? "bg-amber-400/25 text-amber-300" : i === 1 ? "bg-slate-400/25 text-slate-300" : "bg-orange-400/25 text-orange-300"
                                                    }`}>#{i + 1}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white truncate">{tp.studentName}</p>
                                                        <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName}</p>
                                                        <p className="text-xs text-slate-500">Roll #{tp.rollNo}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xl font-black text-white">{tp.avgPercentage}%</p>
                                                        <p className="text-[10px] text-slate-400">{tp.examsCount} exams</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
                                        <Trophy size={15} className="text-amber-500" />
                                        <h3 className="text-sm font-bold text-slate-800">All Top 10 Performers</h3>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {topPerformers.map((tp, i) => {
                                            const gc = GRADE_COLORS[tp.grade] ?? GRADE_COLORS["C"];
                                            return (
                                                <div key={tp.studentId} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                                        i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                                                    }`}>{i + 1}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800">{tp.studentName}</p>
                                                        <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName} · Roll #{tp.rollNo}</p>
                                                    </div>
                                                    <div className="hidden sm:block w-32">
                                                        <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div className={`h-full rounded-full ${gc.bar}`} style={{ width: `${tp.avgPercentage}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="text-right min-w-[60px]">
                                                        <p className="text-sm font-bold text-slate-800">{tp.avgPercentage}%</p>
                                                        <p className="text-[10px] text-slate-400">{tp.examsCount} exams</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${gc.bg} ${gc.text} ${gc.border}`}>{tp.grade}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {topPerformers.length === 0 && <div className="p-12 text-center text-sm text-slate-400">No student data available</div>}
                                </div>
                            </div>
                        )}

                        {/* ── EXAM REPORTS TAB ────────────────────────────────────── */}
                        {tab === "report-card" && (
                            <div className="space-y-6">
                                {/* Exam selector */}
                                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <FileText size={15} className="text-emerald-600" /> Select Published Exam
                                    </h3>
                                    {publishedExams.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-8">No published exams found for this session</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {publishedExams.map((exam: unknown) => (
                                                <button key={exam.id}
                                                    onClick={() => setSelectedExamId(selectedExamId === exam.id ? null : exam.id)}
                                                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                                                        selectedExamId === exam.id
                                                            ? "border-indigo-500 bg-indigo-50 shadow-md"
                                                            : "border-slate-100 hover:border-indigo-300 bg-white"
                                                    }`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selectedExamId === exam.id ? "bg-indigo-600" : "bg-indigo-50"}`}>
                                                            <BarChart3 size={15} className={selectedExamId === exam.id ? "text-white" : "text-indigo-600"} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-800 text-sm truncate">{exam.examName}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">{exam.subjectName} · {exam.examTerm?.replace("TERM", "T")}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Exam Report */}
                                {selectedExamId && (
                                    reportLoading ? (
                                        <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center">
                                            <Loader2 size={24} className="animate-spin text-indigo-600" />
                                        </div>
                                    ) : examReport ? (
                                        <div className="space-y-6">
                                            {/* Report header */}
                                            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <FileText size={22} />
                                                    <h2 className="text-xl font-bold">Exam Report Card</h2>
                                                </div>
                                                <p className="text-indigo-200 text-sm">{examReport.exam.examName} — {examReport.exam.subjectName} · {examReport.exam.examTerm?.replace("TERM", "Term ")} · Full Marks: {examReport.exam.fullMarks}</p>
                                            </div>

                                            {/* Report stats */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                <StatCard icon={Users} label="Total Students" value={examReport.summary.totalStudents} color="bg-slate-600" />
                                                <StatCard icon={UserCheck} label="Appeared" value={examReport.summary.appeared} sub={`${examReport.summary.absent} absent`} color="bg-emerald-600" />
                                                <StatCard icon={TrendingUp} label="Pass Rate" value={`${examReport.summary.passRate}%`} sub={`${examReport.summary.passCount} passed, ${examReport.summary.failCount} failed`} color="bg-blue-600" />
                                                <StatCard icon={Target} label="Average" value={examReport.summary.averageMarks} sub={`${examReport.summary.averagePercentage}% of ${examReport.exam.fullMarks}`} color="bg-violet-600" />
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <StatCard icon={ArrowUp} label="Highest" value={`${examReport.summary.highestMarks}/${examReport.exam.fullMarks}`} sub={`${Math.round((examReport.summary.highestMarks / examReport.exam.fullMarks) * 100)}%`} color="bg-emerald-500" />
                                                <StatCard icon={ArrowDown} label="Lowest" value={`${examReport.summary.lowestMarks}/${examReport.exam.fullMarks}`} sub={`${Math.round((examReport.summary.lowestMarks / examReport.exam.fullMarks) * 100)}%`} color="bg-red-500" />
                                                <StatCard icon={Minus} label="Median" value={`${examReport.summary.medianMarks}/${examReport.exam.fullMarks}`} sub="Middle value" color="bg-indigo-500" />
                                            </div>

                                            {/* Grade Distribution */}
                                            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4"><Award size={15} className="text-amber-500" /> Grade Distribution</h3>
                                                <div className="space-y-2.5">
                                                    {Object.entries(examReport.gradeDistribution).map(([grade, count]) => {
                                                        const maxC = Math.max(...Object.values(examReport.gradeDistribution), 1);
                                                        const gc = GRADE_COLORS[grade] ?? GRADE_COLORS["C"];
                                                        return (
                                                            <div key={grade} className="flex items-center gap-3">
                                                                <span className={`w-9 text-center text-xs font-bold px-1 py-0.5 rounded border ${gc.bg} ${gc.text} ${gc.border}`}>{grade}</span>
                                                                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                                                    <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${maxC > 0 ? (count / maxC) * 100 : 0}%` }} />
                                                                </div>
                                                                <span className="text-xs font-medium text-slate-600 w-16 text-right">{count} {examReport.summary.appeared > 0 ? `(${Math.round((count / examReport.summary.appeared) * 100)}%)` : ""}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Section breakdown */}
                                            {examReport.sectionBreakdown.length > 0 && (
                                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                                    <div className="px-6 py-4 border-b bg-slate-50"><h3 className="text-sm font-bold text-slate-800">Section-wise Breakdown</h3></div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-slate-50 border-b"><tr>
                                                                {["Section", "Total", "Appeared", "Absent", "Pass Rate", "Average", "Highest", "Lowest"].map(h => <th key={h} className="px-5 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wide">{h}</th>)}
                                                            </tr></thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {examReport.sectionBreakdown.map(s => (
                                                                    <tr key={s.sectionId} className="hover:bg-slate-50">
                                                                        <td className="px-5 py-3.5"><p className="font-medium text-slate-800">{s.sectionName}</p><p className="text-xs text-slate-400">{s.className}</p></td>
                                                                        <td className="px-5 py-3.5 text-slate-600">{s.total}</td>
                                                                        <td className="px-5 py-3.5 text-slate-600">{s.appeared}</td>
                                                                        <td className="px-5 py-3.5 text-slate-600">{s.absent}</td>
                                                                        <td className="px-5 py-3.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : s.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.passRate}%</span></td>
                                                                        <td className="px-5 py-3.5 font-medium text-slate-700">{s.average}</td>
                                                                        <td className="px-5 py-3.5 text-emerald-600 font-medium">{s.highest}</td>
                                                                        <td className="px-5 py-3.5 text-red-500 font-medium">{s.lowest}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Top performers for this exam */}
                                            {examReport.topPerformers.length > 0 && (
                                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                                    <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
                                                        <Trophy size={15} className="text-amber-500" />
                                                        <h3 className="text-sm font-bold text-slate-800">Top Performers — {examReport.exam.examName}</h3>
                                                    </div>
                                                    <div className="divide-y divide-slate-50">
                                                        {examReport.topPerformers.map((tp, i) => {
                                                            const gc = GRADE_COLORS[tp.grade] ?? GRADE_COLORS["C"];
                                                            return (
                                                                <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                                                        i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                                                                    }`}>{i + 1}</div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium text-slate-800">{tp.studentName}</p>
                                                                        <p className="text-xs text-slate-400">{tp.sectionName}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="font-bold text-slate-800">{tp.marks} / {examReport.exam.fullMarks}</p>
                                                                        <p className="text-xs text-slate-500">{tp.percentage}%</p>
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${gc.bg} ${gc.text} ${gc.border}`}>{tp.grade}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">Unable to load report data.</div>
                                    )
                                )}

                                {!selectedExamId && publishedExams.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center gap-2 text-center">
                                        <FileText size={32} className="text-slate-200" />
                                        <p className="text-sm font-medium text-slate-400">Select an exam above to view its detailed report card</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ResultsPerformancePage;

