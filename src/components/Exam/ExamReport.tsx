import { useEffect, useState } from "react";
import {
    Users, UserCheck, TrendingUp, Award, BarChart3,
    Trophy, Target, ArrowDown, ArrowUp, Minus, Loader2,
} from "lucide-react";
import api from "../../api/api";

interface ReportData {
    exam: {
        id: string;
        examName: string;
        subjectName: string;
        sessionName: string;
        teacherName: string;
        examTerm: string;
        fullMarks: number;
    };
    summary: {
        totalStudents: number;
        appeared: number;
        absent: number;
        passCount: number;
        failCount: number;
        passRate: number;
        averageMarks: number;
        averagePercentage: number;
        highestMarks: number;
        lowestMarks: number;
        medianMarks: number;
    };
    gradeDistribution: Record<string, number>;
    sectionBreakdown: {
        sectionId: string;
        sectionName: string;
        className: string;
        total: number;
        appeared: number;
        absent: number;
        passCount: number;
        failCount: number;
        passRate: number;
        average: number;
        highest: number;
        lowest: number;
    }[];
    topPerformers: {
        studentName: string;
        marks: number;
        percentage: number;
        grade: string;
        sectionName: string;
    }[];
}

const GRADE_COLORS: Record<string, string> = {
    "A+": "bg-emerald-500",
    "A": "bg-emerald-400",
    "B+": "bg-blue-500",
    "B": "bg-blue-400",
    "C": "bg-amber-500",
    "D": "bg-orange-500",
    "F": "bg-red-500",
};

const GRADE_BG: Record<string, string> = {
    "A+": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "A": "bg-emerald-50 text-emerald-600 border-emerald-200",
    "B+": "bg-blue-50 text-blue-700 border-blue-200",
    "B": "bg-blue-50 text-blue-600 border-blue-200",
    "C": "bg-amber-50 text-amber-700 border-amber-200",
    "D": "bg-orange-50 text-orange-700 border-orange-200",
    "F": "bg-red-50 text-red-700 border-red-200",
};

const StatCard = ({
    icon: Icon, label, value, subtitle, color,
}: {
    icon: typeof Users; label: string; value: string | number; subtitle?: string; color: string;
}) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={18} className="text-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
);

const ExamReport = ({ examId }: { examId: string }) => {
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);
                const data = await api.getExamReport(examId);
                setReport(data);
            } catch (err: any) {
                setError(err?.response?.data?.message || "Failed to load report");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [examId]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border p-12 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={24} className="animate-spin text-emerald-600" />
                    <p className="text-sm text-slate-500">Loading exam report…</p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="bg-white rounded-2xl border p-8 text-center text-slate-500">
                {error || "Unable to load report data."}
            </div>
        );
    }

    const { summary, gradeDistribution, sectionBreakdown, topPerformers } = report;
    const maxGradeCount = Math.max(...Object.values(gradeDistribution), 1);

    return (
        <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <BarChart3 size={24} />
                    <h2 className="text-xl font-bold">Exam Performance Report</h2>
                </div>
                <p className="text-emerald-100 text-sm">
                    Comprehensive analytics for {report.exam.examName} — {report.exam.subjectName}
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Students" value={summary.totalStudents} color="bg-slate-600" />
                <StatCard icon={UserCheck} label="Appeared" value={summary.appeared}
                    subtitle={`${summary.absent} absent`} color="bg-emerald-600" />
                <StatCard icon={TrendingUp} label="Pass Rate" value={`${summary.passRate}%`}
                    subtitle={`${summary.passCount} passed, ${summary.failCount} failed`} color="bg-blue-600" />
                <StatCard icon={Target} label="Average" value={summary.averageMarks}
                    subtitle={`${summary.averagePercentage}% of ${report.exam.fullMarks}`} color="bg-violet-600" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={ArrowUp} label="Highest Marks" value={`${summary.highestMarks} / ${report.exam.fullMarks}`}
                    subtitle={`${Math.round((summary.highestMarks / report.exam.fullMarks) * 100)}%`} color="bg-emerald-500" />
                <StatCard icon={ArrowDown} label="Lowest Marks" value={`${summary.lowestMarks} / ${report.exam.fullMarks}`}
                    subtitle={`${Math.round((summary.lowestMarks / report.exam.fullMarks) * 100)}%`} color="bg-red-500" />
                <StatCard icon={Minus} label="Median Marks" value={`${summary.medianMarks} / ${report.exam.fullMarks}`}
                    subtitle="Middle value" color="bg-indigo-500" />
            </div>

            {/* Grade Distribution */}
            <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-6">
                    <Award size={18} className="text-slate-400" />
                    Grade Distribution
                </h3>
                <div className="space-y-3">
                    {Object.entries(gradeDistribution).map(([grade, count]) => (
                        <div key={grade} className="flex items-center gap-4">
                            <span className={`w-10 text-center px-2 py-1 rounded-md text-xs font-bold border ${GRADE_BG[grade] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                {grade}
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${GRADE_COLORS[grade] || "bg-slate-400"}`}
                                    style={{ width: `${maxGradeCount > 0 ? (count / maxGradeCount) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium text-slate-700 w-12 text-right">
                                {count} <span className="text-slate-400 text-xs">
                                    {summary.appeared > 0 ? `(${Math.round((count / summary.appeared) * 100)}%)` : ""}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section Breakdown */}
            {sectionBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="p-6 border-b bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Section-wise Performance</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Section</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Total</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Appeared</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Absent</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Pass Rate</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Average</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Highest</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Lowest</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sectionBreakdown.map(s => (
                                    <tr key={s.sectionId} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="px-5 py-3">
                                            <div>
                                                <p className="font-medium text-slate-800">{s.sectionName}</p>
                                                <p className="text-xs text-slate-400">{s.className}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">{s.total}</td>
                                        <td className="px-5 py-3 text-slate-600">{s.appeared}</td>
                                        <td className="px-5 py-3 text-slate-600">{s.absent}</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                                s.passRate >= 75 ? "bg-emerald-100 text-emerald-700" :
                                                s.passRate >= 50 ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                                            }`}>
                                                {s.passRate}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-medium text-slate-700">{s.average}</td>
                                        <td className="px-5 py-3 text-emerald-600 font-medium">{s.highest}</td>
                                        <td className="px-5 py-3 text-red-500 font-medium">{s.lowest}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top Performers */}
            {topPerformers.length > 0 && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="p-6 border-b bg-slate-50">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Trophy size={18} className="text-amber-500" />
                            Top Performers
                        </h3>
                    </div>
                    <div className="divide-y">
                        {topPerformers.map((tp, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    i === 0 ? "bg-amber-100 text-amber-700" :
                                    i === 1 ? "bg-slate-200 text-slate-600" :
                                    i === 2 ? "bg-orange-100 text-orange-700" :
                                    "bg-slate-100 text-slate-500"
                                }`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800">{tp.studentName}</p>
                                    <p className="text-xs text-slate-400">{tp.sectionName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-800">{tp.marks} / {report.exam.fullMarks}</p>
                                    <p className="text-xs text-slate-500">{tp.percentage}%</p>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-xs font-bold border ${GRADE_BG[tp.grade] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                    {tp.grade}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamReport;

