import React, { useEffect, useMemo, useState } from "react";
import {
    BarChart3, TrendingUp, Users, Award, Trophy, Target,
    BookOpen, RefreshCw, ChevronRight, ChevronDown, Loader2,
    ArrowUp, ArrowDown, Medal, School, UserCheck, Minus,
    AlertTriangle, AlertCircle, Lightbulb, X,
    FileText, ClipboardList, TrendingDown, Zap,
} from "lucide-react";
import api from "../../api/api";
import PageHeader from "../../components/PageHeader";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface SchoolSummary {
    totalExams: number; totalResults: number; appeared: number; absent: number;
    averagePercentage: number; passRate: number; highestPct: number;
    lowestPct?: number; medianPct?: number;
    gradeDistribution: Record<string, number>;
}
interface ClassRow { classId: string; className: string; students: number; sections?: number; avgPercentage: number; passRate: number; totalResults: number; highest?: number; }
interface SectionRow { sectionId: string; sectionName: string; classId?: string; className: string; students: number; avgPercentage: number; passRate: number; totalResults: number; highest?: number; }
interface SubjectRow { subjectId: string; subjectName: string; avgPercentage: number; passRate: number; totalResults: number; highest: number; lowest?: number; }
interface TopPerformer { studentId: string; studentName: string; className: string; sectionName: string; rollNo: string; avgPercentage: number; examsCount: number; grade: string; classId?: string; sectionId?: string; pcts?: number[]; }
interface TermBlock {
    term: string;
    examCount: number;
    summary: SchoolSummary;
    classBreakdown: ClassRow[];
    sectionBreakdown: SectionRow[];
    subjectBreakdown: SubjectRow[];
    topPerformers: TopPerformer[];
    radar: { label: string; value: number }[];
}
interface ApiInsight { type: "warning" | "success" | "info"; message: string; }
type AttentionCode = "FAILING" | "DECLINING" | "BELOW_PEERS" | "MULTIPLE_ABSENCES" | "INCONSISTENT";
interface AttentionStudent {
    studentId: string; studentName: string; rollNo: string;
    classId: string; className: string;
    sectionId: string; sectionName: string;
    averagePercentage: number | null;
    examsAppeared: number; examsAbsent: number;
    sectionAveragePercentage: number | null;
    reasons: { code: AttentionCode; detail: string; severity: "high" | "medium" }[];
    priorityScore: number;
}

interface ExamReportData {
    exam: { id: string; examName: string; subjectName: string; sessionName: string; teacherName: string; examTerm: string; fullMarks: number; status: string; };
    summary: { totalStudents: number; appeared: number; absent: number; passCount: number; failCount: number; passRate: number; averageMarks: number; averagePercentage: number; highestMarks: number; lowestMarks: number; medianMarks: number; };
    gradeDistribution: Record<string, number>;
    sectionBreakdown: { sectionId: string; sectionName: string; className: string; total: number; appeared: number; absent: number; passCount: number; failCount: number; passRate: number; average: number; highest: number; lowest: number; }[];
    topPerformers: { studentName: string; marks: number; percentage: number; grade: string; sectionName: string; }[];
}

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ SVG Radar Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Improvement Insights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Prefers backend-computed insights when available (richer, includes term momentum)
// and falls back to a local heuristic otherwise.
const InsightsPanel = ({ summary, subjectBreakdown, classBreakdown, backendInsights }: { summary: SchoolSummary; subjectBreakdown: SubjectRow[]; classBreakdown: ClassRow[]; backendInsights?: ApiInsight[] }) => {
    if (backendInsights && backendInsights.length > 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Lightbulb size={16} className="text-amber-500" /> Improvement Insights & Recommendations
                </h3>
                <div className="space-y-3">
                    {backendInsights.map((ins, i) => (
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
    }
    const insights: { type: "warning" | "success" | "info"; message: string }[] = [];

    // Weak subjects (below 50% avg)
    const weakSubjects = subjectBreakdown.filter(s => s.avgPercentage < 50);
    if (weakSubjects.length > 0) {
        insights.push({ type: "warning", message: `${weakSubjects.length} subject(s) have average below 50%: ${weakSubjects.map(s => s.subjectName).join(", ")}. Consider remedial classes or additional support.` });
    }

    // High failure rate
    if (summary.passRate < 70) {
        insights.push({ type: "warning", message: `Overall pass rate is ${summary.passRate}% – below the 70% benchmark. Review teaching methodologies and student engagement.` });
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

// ── Term progression line chart ──────────────────────────────────────────────
// Shows school average % across terms with the 40% pass threshold marked.
const TermProgressionChart = ({ byTerm }: { byTerm: TermBlock[] }) => {
    const W = 720, H = 220, PL = 40, PR = 40, PT = 20, PB = 36;
    const innerW = W - PL - PR, innerH = H - PT - PB;
    const points = byTerm.map(t => t.summary.averagePercentage);
    const xFor = (i: number) => points.length === 1
        ? PL + innerW / 2
        : PL + (i / (points.length - 1)) * innerW;
    const yFor = (v: number) => PT + innerH - (v / 100) * innerH;
    const linePts = points.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
    const areaPts = `${PL},${H - PB} ${linePts} ${W - PR},${H - PB}`;
    const fmt = (t: string) => t === "ANNUAL" ? "Annual" : t.replace("TERM", "Term ");
    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="termAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map(g => (
                    <g key={g}>
                        <line x1={PL} x2={W - PR} y1={yFor(g)} y2={yFor(g)} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={PL - 6} y={yFor(g)} fontSize="9" fill="#94a3b8" textAnchor="end" dominantBaseline="middle">{g}%</text>
                    </g>
                ))}
                <line x1={PL} x2={W - PR} y1={yFor(40)} y2={yFor(40)} stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3 3" />
                <text x={W - PR} y={yFor(40) - 3} fontSize="8" fill="#ef4444" textAnchor="end" fontWeight="600">PASS 40%</text>
                {byTerm.map((t, i) => (
                    <text key={t.term} x={xFor(i)} y={H - PB / 2 + 8} fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="700">
                        {fmt(t.term)}
                    </text>
                ))}
                <polygon points={areaPts} fill="url(#termAreaGradient)" />
                <polyline points={linePts} fill="none" stroke="#6366f1" strokeWidth="2.4" strokeLinejoin="round" />
                {points.map((v, i) => (
                    <g key={i}>
                        <circle cx={xFor(i)} cy={yFor(v)} r="5" fill="white" stroke="#6366f1" strokeWidth="2" />
                        <text x={xFor(i)} y={yFor(v) - 11} fontSize="10" fontWeight="700" fill="#4338ca" textAnchor="middle">{v}%</text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// ── Mini bar chart for per-term breakdowns ───────────────────────────────────
const HorizontalBar = ({ label, value, max = 100, accent = "bg-indigo-500" }: { label: string; value: number; max?: number; accent?: string }) => (
    <div className="flex items-center gap-3 text-xs">
        <span className="w-32 text-slate-700 font-medium truncate" title={label}>{label}</span>
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full ${accent}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
        </div>
        <span className="w-10 text-right font-bold text-slate-700">{value}%</span>
    </div>
);

// ── Per-term detail card (school summary + class/section/subject/top in that term) ─
const TermDetailCard = ({ term, onJumpToClass, onJumpToSection }: {
    term: TermBlock;
    onJumpToClass: () => void;
    onJumpToSection: () => void;
}) => {
    const fmt = (t: string) => t === "ANNUAL" ? "Annual" : t.replace("TERM", "Term ");
    const dist = term.summary.gradeDistribution;
    const maxCnt = Math.max(...Object.values(dist), 1);
    const avgGrade = term.summary.averagePercentage >= 90 ? "A+"
        : term.summary.averagePercentage >= 80 ? "A"
        : term.summary.averagePercentage >= 70 ? "B+"
        : term.summary.averagePercentage >= 60 ? "B"
        : term.summary.averagePercentage >= 50 ? "C"
        : term.summary.averagePercentage >= 40 ? "D" : "F";
    const gc = GRADE_COLORS[avgGrade] ?? GRADE_COLORS.F;
    return (
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 flex items-center justify-between">
                <div>
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 mb-0.5">Term Report</p>
                    <h3 className="text-base font-bold text-white">{fmt(term.term)}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {term.examCount} exam{term.examCount !== 1 ? "s" : ""} · {term.summary.appeared} attempts · {term.summary.absent} absent
                    </p>
                </div>
                <div className="text-right">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 text-xl font-black ${gc.bg} ${gc.border} ${gc.text}`}>{avgGrade}</div>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-semibold">{term.summary.averagePercentage}% avg</p>
                </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/60">
                {[
                    { label: "Avg",     value: `${term.summary.averagePercentage}%`, sub: "school" },
                    { label: "Pass",    value: `${term.summary.passRate}%`, sub: term.summary.passRate >= 75 ? "good" : "watch" },
                    { label: "Highest", value: `${term.summary.highestPct}%`, sub: "best paper" },
                    { label: "Lowest",  value: `${term.summary.lowestPct ?? 0}%`, sub: "worst paper" },
                    { label: "Median",  value: `${term.summary.medianPct ?? 0}%`, sub: "midpoint" },
                ].map(s => (
                    <div key={s.label} className="px-4 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                        <p className="text-base sm:text-lg font-bold mt-0.5 text-slate-800">{s.value}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Two columns: subject coverage radar + grade distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                <div className="p-5">
                    <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                        <Target size={12} className="text-indigo-500" /> Subject Coverage
                    </h4>
                    {term.radar.length >= 3 ? (
                        <RadarChart data={term.radar} size={260} color="#6366f1" />
                    ) : (
                        <div className="space-y-2 mt-2">
                            {term.subjectBreakdown.map(s => (
                                <HorizontalBar key={s.subjectId} label={s.subjectName} value={s.avgPercentage} accent="bg-indigo-500" />
                            ))}
                            {term.subjectBreakdown.length === 0 && <p className="text-xs text-slate-400 italic">No subject data</p>}
                        </div>
                    )}
                </div>
                <div className="p-5">
                    <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                        <Award size={12} className="text-indigo-500" /> Grade Distribution
                    </h4>
                    <div className="space-y-1.5">
                        {GRADE_ORDER.filter(g => (dist[g] ?? 0) > 0).map(g => {
                            const c = GRADE_COLORS[g];
                            return (
                                <div key={g} className="flex items-center gap-2 text-xs">
                                    <span className={`w-9 text-center font-bold py-0.5 rounded ${c.bg} ${c.text} border ${c.border}`}>{g}</span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.round(((dist[g] ?? 0) / maxCnt) * 100)}%` }} />
                                    </div>
                                    <span className="w-8 text-right font-semibold text-slate-700">{dist[g]}</span>
                                </div>
                            );
                        })}
                        {Object.values(dist).every(v => v === 0) && <p className="text-xs text-slate-400 italic">No graded results</p>}
                    </div>
                </div>
            </div>

            {/* Class breakdown */}
            <div className="border-t border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <School size={12} className="text-indigo-500" /> By Class
                    </h4>
                    <button onClick={onJumpToClass} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold">
                        View all →
                    </button>
                </div>
                {term.classBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No class data</p>
                ) : (
                    <div className="space-y-1.5">
                        {term.classBreakdown.slice(0, 5).map(c => (
                            <div key={c.classId} className="flex items-center gap-2 text-xs">
                                <span className="w-32 text-slate-700 font-semibold truncate">{c.className}</span>
                                <span className="text-[10px] text-slate-400 w-20 shrink-0">{c.students} stu · {c.sections ?? 1} sec</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${c.avgPercentage}%` }} />
                                </div>
                                <span className="w-12 text-right font-bold text-slate-700">{c.avgPercentage}%</span>
                                <span className={`w-12 text-right text-[10px] font-bold rounded px-1 py-0.5 ${c.passRate >= 75 ? "bg-emerald-100 text-emerald-700" : c.passRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{c.passRate}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Section breakdown */}
            <div className="border-t border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Users size={12} className="text-indigo-500" /> By Section
                    </h4>
                    <button onClick={onJumpToSection} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold">
                        View all →
                    </button>
                </div>
                {term.sectionBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No section data</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {term.sectionBreakdown.slice(0, 8).map(s => (
                            <div key={s.sectionId} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                <span className="font-semibold text-slate-800 truncate flex-1" title={`${s.className} · ${s.sectionName}`}>{s.className} · {s.sectionName}</span>
                                <span className="text-[10px] text-slate-400">{s.students} stu</span>
                                <span className="font-bold text-slate-700">{s.avgPercentage}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Top performers */}
            {term.topPerformers.length > 0 && (
                <div className="border-t border-slate-100 p-5">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                        <Trophy size={12} className="text-amber-500" /> Top Performers
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        {term.topPerformers.slice(0, 5).map((p, i) => (
                            <div key={p.studentId} className={`relative p-3 rounded-xl border ${i === 0 ? "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100" : "border-slate-100 bg-slate-50"}`}>
                                <div className="absolute top-2 right-2 text-[10px] font-bold text-slate-400">#{i + 1}</div>
                                <p className="text-sm font-bold text-slate-800 truncate pr-6">{p.studentName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{p.className} · {p.sectionName}</p>
                                <div className="flex items-baseline gap-1 mt-1.5">
                                    <span className="text-lg font-black text-slate-900">{p.avgPercentage}%</span>
                                    <span className="text-[10px] text-slate-400">{p.examsCount} exam{p.examsCount > 1 ? "s" : ""}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

// ── Attention reason metadata ────────────────────────────────────────────────
const REASON_META: Record<AttentionCode, { label: string; tone: "red" | "amber" | "rose" | "slate" | "violet"; icon: typeof AlertTriangle }> = {
    FAILING:           { label: "Failing",           tone: "red",    icon: TrendingDown },
    DECLINING:         { label: "Declining",         tone: "rose",   icon: TrendingDown },
    BELOW_PEERS:       { label: "Below peers",       tone: "amber",  icon: Users        },
    MULTIPLE_ABSENCES: { label: "Frequent absences", tone: "slate",  icon: AlertCircle  },
    INCONSISTENT:      { label: "Inconsistent",      tone: "violet", icon: AlertTriangle},
};
const reasonClasses = (tone: "red" | "amber" | "rose" | "slate" | "violet") =>
    tone === "red"    ? "bg-red-50 border-red-200 text-red-700"
    : tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-700"
    : tone === "rose"  ? "bg-rose-50 border-rose-200 text-rose-700"
    : tone === "slate" ? "bg-slate-50 border-slate-200 text-slate-700"
    : "bg-violet-50 border-violet-200 text-violet-700";

const gradeFromPctMgmt = (p: number) => p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B+" : p >= 60 ? "B" : p >= 50 ? "C" : p >= 40 ? "D" : "F";

const AttentionCard = ({ s }: { s: AttentionStudent }) => {
    const grade = s.averagePercentage !== null ? gradeFromPctMgmt(s.averagePercentage) : null;
    const gc = grade ? (GRADE_COLORS[grade] ?? GRADE_COLORS.F) : GRADE_COLORS.F;
    const isHigh = s.reasons.some(r => r.severity === "high");
    return (
        <div className={`bg-white rounded-2xl border p-4 hover:shadow-md transition-all ${isHigh ? "border-red-200" : "border-slate-100"}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.studentName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{s.className} · {s.sectionName} · Roll {s.rollNo}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className={`text-2xl font-black ${gc.text}`}>{s.averagePercentage !== null ? `${s.averagePercentage}%` : "—"}</p>
                    <p className="text-[10px] text-slate-400">{s.examsAppeared} exam{s.examsAppeared !== 1 ? "s" : ""}{s.examsAbsent > 0 ? ` · ${s.examsAbsent} absent` : ""}</p>
                </div>
            </div>
            {s.sectionAveragePercentage !== null && s.averagePercentage !== null && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-400 font-semibold uppercase tracking-wider">vs Section</span>
                        <span className={`font-bold ${(s.averagePercentage - s.sectionAveragePercentage) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {s.averagePercentage - s.sectionAveragePercentage >= 0 ? "+" : ""}
                            {s.averagePercentage - s.sectionAveragePercentage}%
                        </span>
                    </div>
                    <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${s.sectionAveragePercentage}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${s.averagePercentage}%`, opacity: 0.8 }} />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">Section avg: {s.sectionAveragePercentage}%</p>
                </div>
            )}
            <div className="space-y-1.5">
                {s.reasons.map((r, i) => {
                    const meta = REASON_META[r.code];
                    const Icon = meta.icon;
                    return (
                        <div key={i} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${reasonClasses(meta.tone)}`}>
                            <Icon size={11} className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <span className="font-bold">{meta.label}{r.severity === "high" ? " (high)" : ""}</span>
                                <span className="ml-1.5 opacity-80">— {r.detail}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Expandable class+sections row ────────────────────────────────────────────
interface ClassWithSections extends ClassRow { sectionsList: SectionRow[]; }
const ClassExpandableRow = ({ c, expanded, onToggle, onSectionClick }: {
    c: ClassWithSections;
    expanded: boolean;
    onToggle: () => void;
    onSectionClick: (sectionId: string) => void;
}) => {
    const passColor = (p: number) => p >= 75 ? "bg-emerald-100 text-emerald-700" : p >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
    return (
        <div className="border-b border-slate-50 last:border-0">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-indigo-50/30 transition-colors text-left"
            >
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{c.className}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {c.sectionsList.length} section{c.sectionsList.length !== 1 ? "s" : ""} · {c.students} student{c.students !== 1 ? "s" : ""} · {c.totalResults} result{c.totalResults !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Avg</p>
                        <p className="text-base font-bold text-indigo-700">{c.avgPercentage}%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Highest</p>
                        <p className="text-base font-bold text-slate-700">{c.highest ?? 0}%</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${passColor(c.passRate)}`}>
                        {c.passRate}% pass
                    </span>
                </div>
            </button>

            {expanded && (
                <div className="bg-slate-50/40 border-t border-slate-100 px-5 py-3">
                    {c.sectionsList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic px-2 py-2">No section data for this class.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                                        <th className="px-3 py-2 font-semibold">Section</th>
                                        <th className="px-3 py-2 font-semibold">Students</th>
                                        <th className="px-3 py-2 font-semibold">Results</th>
                                        <th className="px-3 py-2 font-semibold">Avg %</th>
                                        <th className="px-3 py-2 font-semibold">Highest</th>
                                        <th className="px-3 py-2 font-semibold">Pass Rate</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {c.sectionsList.map(s => (
                                        <tr key={s.sectionId}
                                            className="cursor-pointer hover:bg-white/80 transition"
                                            onClick={() => onSectionClick(s.sectionId)}>
                                            <td className="px-3 py-2.5 font-semibold text-slate-700">{s.sectionName}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{s.students}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{s.totalResults}</td>
                                            <td className="px-3 py-2.5"><span className="font-bold text-indigo-700">{s.avgPercentage}%</span></td>
                                            <td className="px-3 py-2.5 text-slate-600">{s.highest ?? 0}%</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${passColor(s.passRate)}`}>
                                                    {s.passRate}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5"><ChevronRight size={14} className="text-slate-300" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ResultsPerformancePage: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [sessionId, setSessionId] = useState("");
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"overview" | "attention" | "by-term" | "class" | "subject" | "students" | "report-card">("overview");

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
        if (classId) api.getSectionsByClass(classId).then((s: any) => setSections(Array.isArray(s) ? s : []));
        else setSections([]);
        setSectionId("");
    }, [classId]);

    // Fetch performance data
    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        api.getPerformanceDashboard({ sessionId, classId: classId || undefined, sectionId: sectionId || undefined })
            .then((d: any) => {
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
    const byTerm: TermBlock[] = data?.byTerm ?? [];
    const apiInsights: ApiInsight[] = data?.insights ?? [];
    const attention: AttentionStudent[] = data?.studentsNeedingAttention ?? [];

    const radarSubjects = useMemo(() => subjectBreakdown.map(s => ({ label: s.subjectName, value: s.avgPercentage })), [subjectBreakdown]);
    const radarClasses = useMemo(() => classBreakdown.map(c => ({ label: c.className, value: c.avgPercentage })), [classBreakdown]);

    // Group sections under their parent class for the merged Classes & Sections tab.
    const classesWithSections = useMemo(() => classBreakdown.map(c => ({
        ...c,
        sectionsList: sectionBreakdown.filter(s => s.classId === c.classId || s.className === c.className),
    })), [classBreakdown, sectionBreakdown]);

    // Needs Attention tab state
    const [attentionFilter, setAttentionFilter] = useState<"" | AttentionCode>("");
    const [attentionSection, setAttentionSection] = useState<string>("");
    const filteredAttention = useMemo(() => attention.filter(a =>
        (!attentionFilter || a.reasons.some(r => r.code === attentionFilter)) &&
        (!attentionSection || a.sectionId === attentionSection),
    ), [attention, attentionFilter, attentionSection]);
    const reasonCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const a of attention) for (const r of a.reasons) counts[r.code] = (counts[r.code] ?? 0) + 1;
        return counts;
    }, [attention]);
    const attentionSections = useMemo(() => {
        const m = new Map<string, { id: string; label: string }>();
        for (const a of attention) m.set(a.sectionId, { id: a.sectionId, label: `${a.className} · ${a.sectionName}` });
        return Array.from(m.values());
    }, [attention]);
    const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());
    const toggleClass = (id: string) => setExpandedClassIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const selectedSessionName = sessions.find(s => s.id === sessionId)?.name ?? "";
    const activeFilters = [classId, sectionId].filter(Boolean).length;

    const TABS = [
        { key: "overview",     label: "Overview",            icon: BarChart3     },
        { key: "attention",    label: "Needs Attention",     icon: UserCheck     },
        { key: "by-term",      label: "By Term",             icon: ClipboardList },
        { key: "class",        label: "Classes & Sections",  icon: School        },
        { key: "subject",      label: "By Subject",          icon: BookOpen      },
        { key: "students",     label: "Top Students",        icon: Trophy        },
        { key: "report-card",  label: "Exam Reports",        icon: FileText      },
    ] as const;

    return (
        <div className="min-h-full bg-slate-50 pb-12">
            <PageHeader
                icon={BarChart3}
                title="Results & Performance"
                gradient="from-indigo-600 via-blue-600 to-cyan-600"
                subtitle="Comprehensive academic analytics, report cards & improvement insights"
                actions={
                    <button onClick={() => { if (sessionId) { setLoading(true); api.getPerformanceDashboard({ sessionId, classId: classId || undefined, sectionId: sectionId || undefined }).then(d => { setData(d); setPublishedExams(d?.exams ?? []); }).catch(() => setData(null)).finally(() => setLoading(false)); } }}
                        disabled={loading || !sessionId}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl flex gap-2 items-center text-sm hover:bg-white/20 disabled:opacity-40 transition-all backdrop-blur-sm">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
                        {/* â”€â”€ OVERVIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                        {tab === "overview" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    <StatCard icon={ClipboardList} label="Total Exams" value={summary.totalExams} color="bg-slate-600" />
                                    <StatCard icon={Users} label="Appeared" value={summary.appeared} sub={`${summary.absent} absent`} color="bg-blue-600" />
                                    <StatCard icon={TrendingUp} label="Avg Score" value={`${summary.averagePercentage}%`} color="bg-indigo-600" />
                                    <StatCard icon={Target} label="Pass Rate" value={`${summary.passRate}%`} sub={summary.passRate >= 75 ? "Good" : summary.passRate >= 50 ? "Needs attention" : "Critical"} color={summary.passRate >= 75 ? "bg-emerald-600" : summary.passRate >= 50 ? "bg-amber-500" : "bg-red-500"} />
                                    <StatCard icon={ArrowUp} label="Highest" value={`${summary.highestPct}%`} color="bg-emerald-600" />
                                </div>

                                {/* Quick Needs Attention callout */}
                                {attention.length > 0 && (
                                    <button
                                        onClick={() => setTab("attention")}
                                        className="w-full text-left bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 hover:from-rose-100 hover:to-amber-100 transition group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 group-hover:bg-rose-200 transition">
                                            <UserCheck size={18} className="text-rose-700" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-rose-900">
                                                {attention.length} student{attention.length !== 1 ? "s" : ""} need{attention.length === 1 ? "s" : ""} academic attention
                                            </p>
                                            <p className="text-[11px] text-rose-700 mt-0.5">
                                                {attention.filter(a => a.reasons.some(r => r.severity === "high")).length} high-priority ·
                                                {" "}{Object.entries(reasonCounts).slice(0, 3).map(([code, n]) => `${REASON_META[code as AttentionCode].label} (${n})`).join(" · ")}
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold text-rose-700 shrink-0">View list →</span>
                                    </button>
                                )}

                                {/* Insights */}
                                <InsightsPanel summary={summary} subjectBreakdown={subjectBreakdown} classBreakdown={classBreakdown} backendInsights={apiInsights} />

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Radar — Subject Performance */}
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

                        {/* ── BY TERM TAB ─────────────────────────────────────────────── */}
                        {tab === "by-term" && (
                            <div className="space-y-6">
                                {byTerm.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400">
                                        No term data — publish exam results to see term-wise analytics.
                                    </div>
                                ) : (
                                    <>
                                        {/* Term-over-term progression */}
                                        {byTerm.length >= 2 && (
                                            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
                                                    <TrendingUp size={15} className="text-indigo-500" /> Term-over-Term Progression
                                                </h3>
                                                <p className="text-[11px] text-slate-400 mb-4">School average % for each term</p>
                                                <TermProgressionChart byTerm={byTerm} />
                                            </div>
                                        )}

                                        {/* One detailed card per term */}
                                        {byTerm.map(t => (
                                            <TermDetailCard key={t.term} term={t}
                                                onJumpToClass={() => { setTab("class"); }}
                                                onJumpToSection={() => { setTab("class"); }} />
                                        ))}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── NEEDS ATTENTION TAB ─────────────────────────────────── */}
                        {tab === "attention" && (
                            <div className="space-y-5">
                                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <UserCheck size={15} className="text-rose-500" /> Students Needing Attention
                                            </h3>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                School-wide list of students flagged as failing, declining, well below their section average, or missing exams.
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">
                                            {filteredAttention.length} student{filteredAttention.length !== 1 ? "s" : ""}
                                            {filteredAttention.length !== attention.length ? ` of ${attention.length}` : ""}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <button onClick={() => setAttentionFilter("")}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                                                attentionFilter === "" ? "bg-slate-800 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                            }`}>
                                            All ({attention.length})
                                        </button>
                                        {(Object.keys(REASON_META) as AttentionCode[]).map(code => {
                                            const meta = REASON_META[code];
                                            const count = reasonCounts[code] ?? 0;
                                            if (count === 0) return null;
                                            const Icon = meta.icon;
                                            const active = attentionFilter === code;
                                            return (
                                                <button key={code}
                                                    onClick={() => setAttentionFilter(active ? "" : code)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                                                        active ? "bg-slate-800 border-slate-800 text-white" : `${reasonClasses(meta.tone)} hover:opacity-90`
                                                    }`}>
                                                    <Icon size={11} /> {meta.label} ({count})
                                                </button>
                                            );
                                        })}
                                        {attentionSections.length > 1 && (
                                            <select value={attentionSection} onChange={e => setAttentionSection(e.target.value)}
                                                className="ml-auto text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                                                <option value="">All Sections</option>
                                                {attentionSections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {filteredAttention.length === 0 ? (
                                    attention.length === 0 ? (
                                        <div className="bg-white rounded-2xl border border-emerald-100 p-12 flex flex-col items-center gap-3 text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                                <UserCheck size={22} className="text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700">No students currently need extra attention</p>
                                            <p className="text-xs text-slate-400 max-w-md">
                                                None of the students in scope are failing, declining, missing multiple exams, or sitting well below their section average.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-400">No students match the current filters.</div>
                                    )
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {filteredAttention.map(s => <AttentionCard key={s.studentId} s={s} />)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── CLASSES & SECTIONS TAB (merged + expandable) ──────────── */}
                        {tab === "class" && (
                            <div className="space-y-6">
                                {radarClasses.length >= 3 && (
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                            <School size={15} className="text-indigo-500" /> Class Performance Radar
                                        </h3>
                                        <RadarChart data={radarClasses} size={300} color="#8b5cf6" />
                                    </div>
                                )}
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">Classes &amp; Sections</h3>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Click a class row to expand into its sections</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedClassIds(new Set(classesWithSections.map(c => c.classId)))}
                                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                                                Expand all
                                            </button>
                                            <span className="text-slate-300">·</span>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedClassIds(new Set())}
                                                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700">
                                                Collapse all
                                            </button>
                                        </div>
                                    </div>
                                    {classesWithSections.length === 0 ? (
                                        <div className="p-12 text-center text-sm text-slate-400">No class data available</div>
                                    ) : (
                                        <div>
                                            {classesWithSections.map(c => (
                                                <ClassExpandableRow
                                                    key={c.classId}
                                                    c={c}
                                                    expanded={expandedClassIds.has(c.classId)}
                                                    onToggle={() => toggleClass(c.classId)}
                                                    onSectionClick={(secId) => { setSectionId(secId); setClassId(c.classId); }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* â”€â”€ SUBJECT TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

                        {/* â”€â”€ TOP STUDENTS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                        {tab === "students" && (
                            <div className="space-y-6">
                                {topPerformers.length > 0 && (
                                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white">
                                        <div className="flex items-center gap-3 mb-1">
                                            <Medal size={20} className="text-amber-400" />
                                            <h3 className="text-base font-bold">School Top Performers</h3>
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

                        {/* â”€â”€ EXAM REPORTS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                                            {publishedExams.map((exam: any) => (
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
                                                <p className="text-indigo-200 text-sm">{examReport.exam.examName} – {examReport.exam.subjectName} · {examReport.exam.examTerm?.replace("TERM", "Term ")} · Full Marks: {examReport.exam.fullMarks}</p>
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
                                                        <h3 className="text-sm font-bold text-slate-800">Top Performers – {examReport.exam.examName}</h3>
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

