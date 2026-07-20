import React, { useEffect, useMemo, useState } from "react";
import {
    BarChart3, TrendingUp, Users, Award, Trophy, Target,
    BookOpen, RefreshCw, ChevronRight, Filter,
    Loader2, ArrowUp, Medal, School,
} from "lucide-react";
import api from "../../api/api";

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

// â”€â”€ SVG Radar Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RadarChart = ({ data, size = 260 }: { data: { label: string; value: number }[]; size?: number }) => {
    const cx = size / 2, cy = size / 2, r = size * 0.38;
    const n = data.length;
    if (n < 3) return null;
    const levels = [20, 40, 60, 80, 100];

    const getPoint = (i: number, val: number) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return { x: cx + (r * val / 100) * Math.cos(angle), y: cy + (r * val / 100) * Math.sin(angle) };
    };

    const polygonPoints = data.map((d, i) => getPoint(i, d.value)).map(p => `${p.x},${p.y}`).join(" ");
    const labelFontSize = n > 6 ? 9 : 10;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
            {/* Grid levels */}
            {levels.map(lv => {
                const pts = Array.from({ length: n }, (_, i) => getPoint(i, lv)).map(p => `${p.x},${p.y}`).join(" ");
                return <polygon key={lv} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="0.8" />;
            })}
            {/* Axes */}
            {data.map((_, i) => {
                const p = getPoint(i, 100);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="0.8" />;
            })}
            {/* Data polygon */}
            <polygon points={polygonPoints} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2" />
            {/* Data dots */}
            {data.map((d, i) => {
                const p = getPoint(i, d.value);
                return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="white" strokeWidth="1.5" />;
            })}
            {/* Labels */}
            {data.map((d, i) => {
                const p = getPoint(i, 118);
                const anchor = Math.abs(p.x - cx) < 5 ? "middle" : p.x > cx ? "start" : "end";
                return (
                    <text key={i} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle"
                        fontSize={labelFontSize} fill="#475569" fontWeight="600">
                        {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
                        <tspan x={p.x} dy="12" fontSize="9" fill="#94a3b8" fontWeight="500">{d.value}%</tspan>
                    </text>
                );
            })}
        </svg>
    );
};

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: typeof Users; label: string; value: string | number; sub?: string; color: string }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2.5 mb-2">
            <div className={`p-2 rounded-lg ${color}`}><Icon size={16} className="text-white" /></div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
);

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PerformanceDashboard: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [sessionId, setSessionId] = useState("");
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"overview" | "class" | "section" | "subject" | "students">("overview");

    // Load sessions & classes
    useEffect(() => {
        api.getSessions().then(s => { setSessions(s); if (s.length && !sessionId) setSessionId(s[0].id); });
        api.getClasses().then(setClasses);
    }, []);

    // Load sections when class changes
    useEffect(() => {
        if (classId) api.getSectionsByClass(classId).then(setSections);
        else setSections([]);
        setSectionId("");
    }, [classId]);

    // Fetch performance data
    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        api.getPerformanceDashboard({ sessionId, classId: classId || undefined, sectionId: sectionId || undefined })
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [sessionId, classId, sectionId]);

    const summary: SchoolSummary | null = data?.schoolSummary ?? null;
    const classBreakdown: ClassRow[] = data?.classBreakdown ?? [];
    const sectionBreakdown: SectionRow[] = data?.sectionBreakdown ?? [];
    const subjectBreakdown: SubjectRow[] = data?.subjectBreakdown ?? [];
    const topPerformers: TopPerformer[] = data?.topPerformers ?? [];

    const radarSubjects = useMemo(() =>
        subjectBreakdown.map(s => ({ label: s.subjectName, value: s.avgPercentage })),
        [subjectBreakdown]
    );
    const radarClasses = useMemo(() =>
        classBreakdown.map(c => ({ label: c.className, value: c.avgPercentage })),
        [classBreakdown]
    );
    const radarSections = useMemo(() =>
        sectionBreakdown.map(s => ({ label: `${s.className} - ${s.sectionName}`, value: s.avgPercentage })),
        [sectionBreakdown]
    );

    const TABS = [
        { key: "overview", label: "Overview", icon: BarChart3 },
        { key: "class", label: "By Class", icon: School },
        { key: "section", label: "By Section", icon: Users },
        { key: "subject", label: "By Subject", icon: BookOpen },
        { key: "students", label: "Top Students", icon: Trophy },
    ] as const;

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 size={20} className="text-indigo-600" /> Performance Dashboard
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">School-wide academic analytics & top performers</p>
                </div>
                <button onClick={() => { if (sessionId) { setLoading(true); api.getPerformanceDashboard({ sessionId, classId: classId || undefined, sectionId: sectionId || undefined }).then(setData).finally(() => setLoading(false)); } }}
                    disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <Filter size={13} className="text-slate-400" />
                <select data-testid="exam-session-id-select" value={sessionId} onChange={e => setSessionId(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-indigo-400">
                    <option value="">Select Session</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select data-testid="exam-class-id-select" value={classId} onChange={e => setClassId(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-indigo-400">
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {sections.length > 0 && (
                    <select data-testid="exam-section-id-select" value={sectionId} onChange={e => setSectionId(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-indigo-400">
                        <option value="">All Sections</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
            </div>

            {/* Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-0.5 overflow-x-auto">
                {TABS.map(t => (
                    <button data-testid="exam-tab-btn" key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                            tab === t.key ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                        }`}>
                        <t.icon size={13} /> {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl border p-16 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3"><Loader2 size={24} className="animate-spin text-indigo-600" /><p className="text-sm text-slate-500">Loading performance data…</p></div>
                </div>
            ) : !summary ? (
                <div className="bg-white rounded-2xl border p-16 flex flex-col items-center gap-3 text-center">
                    <BarChart3 size={40} className="text-slate-200" />
                    <p className="font-semibold text-slate-500">No published results found</p>
                    <p className="text-xs text-slate-400">Performance data appears once exam results are published</p>
                </div>
            ) : (
                <>
                    {/* â”€â”€ OVERVIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {tab === "overview" && (
                        <div className="space-y-5">
                            {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <StatCard icon={BarChart3} label="Total Exams" value={summary.totalExams} color="bg-slate-600" />
                                <StatCard icon={Users} label="Results" value={summary.appeared} sub={`${summary.absent} absent`} color="bg-blue-600" />
                                <StatCard icon={TrendingUp} label="Avg Score" value={`${summary.averagePercentage}%`} color="bg-indigo-600" />
                                <StatCard icon={Target} label="Pass Rate" value={`${summary.passRate}%`} color="bg-emerald-600" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Radar — Subject Performance */}
                                {radarSubjects.length >= 3 && (
                                    <div className="bg-white rounded-2xl border p-5">
                                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                                            <BookOpen size={15} className="text-indigo-500" /> Subject Performance Radar
                                        </h3>
                                        <RadarChart data={radarSubjects} />
                                    </div>
                                )}

                                {/* Grade Distribution */}
                                <div className="bg-white rounded-2xl border p-5">
                                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
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
                                                    <span className="text-xs font-medium text-slate-600 w-14 text-right">{cnt} ({pct}%)</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Top 5 performers quick view */}
                            {topPerformers.length > 0 && (
                                <div className="bg-white rounded-2xl border overflow-hidden">
                                    <div className="px-5 py-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Trophy size={15} className="text-amber-500" /> Top Performers</h3>
                                        <button data-testid="exam-tab-btn-2" onClick={() => setTab("students")} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">View All <ChevronRight size={12} /></button>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {topPerformers.slice(0, 5).map((tp, i) => (
                                            <div key={tp.studentId} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                                                }`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{tp.studentName}</p>
                                                    <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-800">{tp.avgPercentage}%</p>
                                                    <p className="text-[10px] text-slate-400">{tp.examsCount} exams</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${GRADE_COLORS[tp.grade]?.bg ?? "bg-slate-50"} ${GRADE_COLORS[tp.grade]?.text ?? "text-slate-600"} ${GRADE_COLORS[tp.grade]?.border ?? "border-slate-200"}`}>{tp.grade}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* â”€â”€ CLASS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {tab === "class" && (
                        <div className="space-y-5">
                            {radarClasses.length >= 3 && (
                                <div className="bg-white rounded-2xl border p-5">
                                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4"><School size={15} className="text-indigo-500" /> Class Performance Radar</h3>
                                    <RadarChart data={radarClasses} size={300} />
                                </div>
                            )}
                            <div className="bg-white rounded-2xl border overflow-hidden">
                                <div className="px-5 py-4 border-b bg-slate-50"><h3 className="text-sm font-semibold text-slate-800">Class-wise Performance</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 border-b"><tr>
                                            {["Class", "Students", "Results", "Avg %", "Pass Rate"].map(h => <th key={h} className="px-5 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wide">{h}</th>)}
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {classBreakdown.map(c => (
                                                <tr key={c.classId} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => { setClassId(c.classId); setTab("section"); }}>
                                                    <td className="px-5 py-3 font-semibold text-slate-800">{c.className}</td>
                                                    <td className="px-5 py-3 text-slate-600">{c.students}</td>
                                                    <td className="px-5 py-3 text-slate-600">{c.totalResults}</td>
                                                    <td className="px-5 py-3"><span className="font-bold text-indigo-700">{c.avgPercentage}%</span></td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${c.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : c.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{c.passRate}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {classBreakdown.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No class data available</div>}
                            </div>
                        </div>
                    )}

                    {/* â”€â”€ SECTION TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {tab === "section" && (
                        <div className="space-y-5">
                            {radarSections.length >= 3 && (
                                <div className="bg-white rounded-2xl border p-5">
                                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4"><Users size={15} className="text-indigo-500" /> Section Performance Radar</h3>
                                    <RadarChart data={radarSections} size={300} />
                                </div>
                            )}
                            <div className="bg-white rounded-2xl border overflow-hidden">
                                <div className="px-5 py-4 border-b bg-slate-50"><h3 className="text-sm font-semibold text-slate-800">Section-wise Performance</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 border-b"><tr>
                                            {["Section", "Class", "Students", "Results", "Avg %", "Pass Rate"].map(h => <th key={h} className="px-5 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wide">{h}</th>)}
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {sectionBreakdown.map(s => (
                                                <tr key={s.sectionId} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => { setSectionId(s.sectionId); }}>
                                                    <td className="px-5 py-3 font-semibold text-slate-800">{s.sectionName}</td>
                                                    <td className="px-5 py-3 text-slate-500">{s.className}</td>
                                                    <td className="px-5 py-3 text-slate-600">{s.students}</td>
                                                    <td className="px-5 py-3 text-slate-600">{s.totalResults}</td>
                                                    <td className="px-5 py-3"><span className="font-bold text-indigo-700">{s.avgPercentage}%</span></td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : s.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.passRate}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {sectionBreakdown.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No section data available</div>}
                            </div>
                        </div>
                    )}

                    {/* â”€â”€ SUBJECT TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {tab === "subject" && (
                        <div className="space-y-5">
                            {radarSubjects.length >= 3 && (
                                <div className="bg-white rounded-2xl border p-5">
                                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4"><BookOpen size={15} className="text-indigo-500" /> Subject Average % Radar</h3>
                                    <RadarChart data={radarSubjects} size={300} />
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {subjectBreakdown.map(s => {
                                    const gc = GRADE_COLORS[s.avgPercentage >= 90 ? "A+" : s.avgPercentage >= 80 ? "A" : s.avgPercentage >= 70 ? "B+" : s.avgPercentage >= 60 ? "B" : s.avgPercentage >= 50 ? "C" : s.avgPercentage >= 40 ? "D" : "F"];
                                    return (
                                        <div key={s.subjectId} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><BookOpen size={14} className="text-indigo-600" /></div>
                                                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{s.subjectName}</p><p className="text-[10px] text-slate-400">{s.totalResults} results</p></div>
                                            </div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-2xl font-bold text-slate-900">{s.avgPercentage}%</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : s.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.passRate}% pass</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${s.avgPercentage}%` }} />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1"><ArrowUp size={10} className="text-emerald-500" /> Highest: {s.highest}%</p>
                                        </div>
                                    );
                                })}
                            </div>
                            {subjectBreakdown.length === 0 && (
                                <div className="bg-white rounded-2xl border p-8 text-center text-sm text-slate-400">No subject data available</div>
                            )}
                        </div>
                    )}

                    {/* â”€â”€ TOP STUDENTS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {tab === "students" && (
                        <div className="space-y-5">
                            {/* Top performer radar (top 8 subjects of #1 student) */}
                            {topPerformers.length > 0 && radarSubjects.length >= 3 && (
                                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white">
                                    <div className="flex items-center gap-3 mb-1">
                                        <Medal size={20} className="text-amber-400" />
                                        <h3 className="text-base font-bold">School Top Performers</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-4">Top 10 students by average percentage across all published exams</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {topPerformers.slice(0, 3).map((tp, i) => (
                                            <div key={tp.studentId} className="bg-white/10 rounded-xl p-4 flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                                    i === 0 ? "bg-amber-400/20 text-amber-300" : i === 1 ? "bg-slate-400/20 text-slate-300" : "bg-orange-400/20 text-orange-300"
                                                }`}>#{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{tp.studentName}</p>
                                                    <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName} · Roll #{tp.rollNo}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-lg font-black text-white">{tp.avgPercentage}%</p>
                                                    <p className="text-[10px] text-slate-400">{tp.examsCount} exams</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl border overflow-hidden">
                                <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
                                    <Trophy size={15} className="text-amber-500" />
                                    <h3 className="text-sm font-semibold text-slate-800">All Top 10 Performers</h3>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {topPerformers.map((tp, i) => {
                                        const gc = GRADE_COLORS[tp.grade] ?? GRADE_COLORS["C"];
                                        return (
                                            <div key={tp.studentId} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                                    i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                                                }`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">{tp.studentName}</p>
                                                    <p className="text-xs text-slate-400">{tp.className} · {tp.sectionName} · Roll #{tp.rollNo}</p>
                                                </div>
                                                <div className="hidden sm:block w-36">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-700 ${gc.bar}`} style={{ width: `${tp.avgPercentage}%` }} />
                                                        </div>
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
                                {topPerformers.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No student data available</div>}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PerformanceDashboard;

