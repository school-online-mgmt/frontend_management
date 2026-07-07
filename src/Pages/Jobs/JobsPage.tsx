import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Zap, Mail, Play, RefreshCw, CheckCircle2, XCircle, Clock,
    AlertTriangle, Loader2, Calendar, Users, TrendingUp, Info,
    AlertCircle, Receipt, IndianRupee, ChevronDown, ChevronUp,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";

/**
 * Management → Jobs page.
 *
 * Two management-runnable jobs live here today:
 *   1. Monthly attendance report — sends every active student a monthly
 *      attendance summary email. Auto-runs on the 1st of each month.
 *      Gated on the ATTENDANCE module.
 *   2. Overdue late-fee sweep    — flips past-due invoices to OVERDUE and
 *      issues one LATE_FEE per (parent invoice, delinquent month), catching
 *      up any missed months idempotently. Auto-runs on the 2nd of each
 *      month. Gated on the FINANCE module.
 *
 * Each job shows an inline "Run now" panel with historically-recent run
 * cards below. Cards handle scheduled runs (multi-tenant summary rows
 * filtered to this school's slice) and tenant-scoped on-demand runs
 * uniformly.
 */

const monthOptions = () => {
    const now = new Date();
    const opts: Array<{ label: string; month: number; year: number }> = [];
    for (let i = 1; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        opts.push({
            label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
            month: d.getMonth() + 1,
            year: d.getFullYear(),
        });
    }
    return opts;
};

const JobsPage: React.FC = () => {
    return (
        <div className="min-h-full bg-slate-50 pb-20">
            <PageHeader
                icon={Zap}
                title="Automated Jobs"
                subtitle="Scheduled background jobs you can trigger on demand, and history of past runs."
                gradient={MODULE_THEMES.communication}
            />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 space-y-6">
                <AttendanceReportJobCard />
                <LateFeeSweepJobCard />
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Monthly attendance report — job card + history
 * ═══════════════════════════════════════════════════════════════════════════ */

const AttendanceReportJobCard: React.FC = () => {
    const qc = useQueryClient();
    const { showToast } = useToast();
    const months = monthOptions();
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [running, setRunning] = useState(false);

    const runsQuery = useQuery({
        queryKey: ["mgmt-attendance-report-runs"],
        queryFn: () => api.getAttendanceReportJobRuns(20),
        staleTime: 30_000,
    });

    const runJob = async () => {
        setRunning(true);
        try {
            const target = months[selectedIdx]!;
            const res = await api.runAttendanceReportJob({ month: target.month, year: target.year });
            const r = res.result;
            showToast(
                `Sent ${r.emailsSent} email${r.emailsSent === 1 ? "" : "s"} to ${r.studentsProcessed} student${r.studentsProcessed === 1 ? "" : "s"} for ${r.period.monthLabel}.`,
                "success",
            );
            qc.invalidateQueries({ queryKey: ["mgmt-attendance-report-runs"] });
        } catch (err: any) {
            showToast(err?.response?.data?.message ?? "Failed to run job", "error");
        } finally {
            setRunning(false);
        }
    };

    return (
        <JobCard
            icon={Mail}
            title="Monthly Attendance Report"
            gradient="from-cyan-500 to-blue-600"
            chipTone="cyan"
            chipLabel="Monthly · 06:00 IST · 1st of month"
            description="Emails each active student a summary of their attendance for the month just ended — present / absent / late counts vs working days. Runs automatically on the 1st of each month. Trigger below to re-send for a specific month or backfill."
            infoNote="Only students with a valid email address and at least one attendance record for the chosen month receive an email. Requires the ATTENDANCE module."
            actionRow={
                <>
                    <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                            Report for
                        </label>
                        <select value={selectedIdx} onChange={(e) => setSelectedIdx(Number(e.target.value))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-400 outline-none">
                            {months.map((m, i) => (
                                <option key={`${m.month}-${m.year}`} value={i}>
                                    {m.label}{i === 0 ? " · default" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={runJob} disabled={running}
                        className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
                        {running ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Play size={14} /> Run Now</>}
                    </button>
                </>
            }
            runs={runsQuery.data ?? []}
            loading={runsQuery.isLoading}
            fetching={runsQuery.isFetching}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["mgmt-attendance-report-runs"] })}
            renderRunStats={(slice) => slice ? (
                <>
                    <span className="flex items-center gap-1 text-slate-600"><Users size={11} /> {slice.studentsProcessed} student{slice.studentsProcessed === 1 ? "" : "s"}</span>
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} /> {slice.emailsSent} sent</span>
                    {slice.emailsFailed > 0 && (
                        <span className="flex items-center gap-1 text-rose-600"><XCircle size={11} /> {slice.emailsFailed} failed</span>
                    )}
                </>
            ) : null}
            renderRunTrailing={(slice) => slice && slice.studentsProcessed > 0 ? (
                <div className="text-right shrink-0">
                    <div className="text-lg font-black text-emerald-700 tabular-nums leading-none">
                        {Math.round((slice.emailsSent / slice.studentsProcessed) * 100)}%
                    </div>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-0.5">delivery</p>
                </div>
            ) : null}
        />
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Overdue late-fee sweep — job card + history
 * ═══════════════════════════════════════════════════════════════════════════ */

const LateFeeSweepJobCard: React.FC = () => {
    const qc = useQueryClient();
    const { showToast } = useToast();
    const [running, setRunning] = useState(false);

    const runsQuery = useQuery({
        queryKey: ["mgmt-late-fee-sweep-runs"],
        queryFn: () => api.getLateFeeSweepJobRuns(20),
        staleTime: 30_000,
    });

    const runJob = async () => {
        setRunning(true);
        try {
            const res = await api.runLateFeeSweepJob();
            const r = res.result;
            const msg = r.lateFeesIssued > 0
                ? `Issued ${r.lateFeesIssued} late-fee invoice${r.lateFeesIssued === 1 ? "" : "s"} totalling ₹${r.totalLateFeeINR.toLocaleString("en-IN")}.`
                : `No new late fees needed — everything's up to date.`;
            showToast(msg, "success");
            qc.invalidateQueries({ queryKey: ["mgmt-late-fee-sweep-runs"] });
        } catch (err: any) {
            showToast(err?.response?.data?.message ?? "Failed to run sweep", "error");
        } finally {
            setRunning(false);
        }
    };

    return (
        <JobCard
            icon={Receipt}
            title="Overdue Late-Fee Sweep"
            gradient="from-amber-500 to-orange-600"
            chipTone="amber"
            chipLabel="Monthly · 03:00 IST · 2nd of month"
            description="Flips any past-due invoice to OVERDUE and issues one LATE_FEE invoice per delinquent month (up to 12 months per parent). Catch-up safe — running it after months of missed cron ticks backfills every missing month idempotently. Runs automatically on the 2nd of each month."
            infoNote="Requires the FINANCE module and a fee structure with 'Enable late fees' turned on. Late-fee amount = min(cap, flat + percent% × parent invoice)."
            actionRow={
                <div className="flex-1 flex justify-end">
                    <button onClick={runJob} disabled={running}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
                        {running ? <><Loader2 size={14} className="animate-spin" /> Running…</> : <><Play size={14} /> Run Now</>}
                    </button>
                </div>
            }
            runs={runsQuery.data ?? []}
            loading={runsQuery.isLoading}
            fetching={runsQuery.isFetching}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["mgmt-late-fee-sweep-runs"] })}
            renderRunStats={(slice) => slice ? (
                <>
                    <span className="flex items-center gap-1 text-slate-600">
                        <AlertTriangle size={11} /> {slice.overdueMarked} newly overdue
                    </span>
                    <span className="flex items-center gap-1 text-amber-700">
                        <Receipt size={11} /> {slice.lateFeesIssued} late fee{slice.lateFeesIssued === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                        <IndianRupee size={11} /> {slice.totalLateFeeINR.toLocaleString("en-IN")}
                    </span>
                </>
            ) : null}
            renderRunTrailing={(slice) => slice ? (
                <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-800 tabular-nums leading-none">
                        {slice.parentsProcessed}
                    </div>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-0.5">
                        parent{slice.parentsProcessed === 1 ? "" : "s"} touched
                    </p>
                </div>
            ) : null}
        />
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Shared card + run row primitives (works for either job)
 * ═══════════════════════════════════════════════════════════════════════════ */

type AnyRun = {
    id: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    triggeredBy: string | null;
    tenantId: string | null;
    error: string | null;
    summary: any;
    tenantSlice: any;
};

interface JobCardProps {
    icon: typeof Mail;
    title: string;
    gradient: string;
    chipTone: "cyan" | "amber";
    chipLabel: string;
    description: string;
    infoNote: string;
    actionRow: React.ReactNode;
    runs: AnyRun[];
    loading: boolean;
    fetching: boolean;
    onRefresh: () => void;
    renderRunStats: (slice: any) => React.ReactNode;
    renderRunTrailing: (slice: any) => React.ReactNode;
}

const JobCard: React.FC<JobCardProps> = ({
    icon: Icon, title, gradient, chipTone, chipLabel, description, infoNote,
    actionRow, runs, loading, fetching, onRefresh, renderRunStats, renderRunTrailing,
}) => {
    const [showHistory, setShowHistory] = useState(true);
    const chipBg = chipTone === "cyan" ? "bg-cyan-100 text-cyan-700"    : "bg-amber-100 text-amber-700";
    const chipDot = chipTone === "cyan" ? "bg-cyan-500"                 : "bg-amber-500";
    const noteBorder = chipTone === "cyan" ? "border-blue-100 bg-white text-blue-900" : "border-amber-100 bg-white text-amber-900";

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-md`}>
                    <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900">{title}</h2>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${chipBg}`}>
                            <span className={`w-1 h-1 rounded-full ${chipDot}`} />
                            {chipLabel}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
                </div>
            </div>

            <div className="p-5 bg-slate-50/60">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    {actionRow}
                </div>
                <div className={`mt-3 p-3 border rounded-lg flex gap-2 items-start ${noteBorder}`}>
                    <Info size={12} className="mt-0.5 shrink-0 opacity-70" />
                    <p className="text-[11px]">{infoNote}</p>
                </div>
            </div>

            <div className="border-t border-slate-100">
                <button onClick={() => setShowHistory(v => !v)}
                    className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                    <Clock size={14} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-800 flex-1 text-left">Run history</span>
                    <span className="text-[10px] text-slate-500 mr-2">{runs.length} runs</span>
                    <button onClick={(e) => { e.stopPropagation(); onRefresh(); }} title="Refresh"
                        className="p-1 rounded hover:bg-slate-200 text-slate-500">
                        <RefreshCw size={12} className={fetching ? "animate-spin" : ""} />
                    </button>
                    {showHistory ? <ChevronUp size={14} className="text-slate-400 ml-1" /> : <ChevronDown size={14} className="text-slate-400 ml-1" />}
                </button>

                {showHistory && (
                    <div className="divide-y divide-slate-100">
                        {loading && (
                            <div className="py-16 text-center text-slate-400">
                                <Loader2 size={20} className="mx-auto animate-spin" />
                            </div>
                        )}
                        {!loading && runs.length === 0 && (
                            <div className="py-12 text-center">
                                <Calendar size={24} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">No runs yet.</p>
                                <p className="text-[11px] text-slate-400 mt-1">Trigger the job above or wait for the next scheduled tick.</p>
                            </div>
                        )}
                        {runs.map((r) => (
                            <RunRow key={r.id} run={r}
                                renderStats={renderRunStats}
                                renderTrailing={renderRunTrailing} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const RunRow: React.FC<{
    run: AnyRun;
    renderStats: (slice: any) => React.ReactNode;
    renderTrailing: (slice: any) => React.ReactNode;
}> = ({ run, renderStats, renderTrailing }) => {
    const summary = run.summary as any;
    const slice = run.tenantSlice;
    const isTenantScoped = !!run.tenantId;
    const period = summary?.period?.monthLabel;
    const status = slice?.status ?? run.status;
    const cfg = statusConfig(status);

    return (
        <div className="p-4 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <cfg.Icon size={16} className={cfg.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>
                        {period && <span className="text-sm font-semibold text-slate-800">{period}</span>}
                        <span className="text-[10px] text-slate-400">
                            {isTenantScoped ? "On-demand" : "Scheduled"} · {new Date(run.startedAt).toLocaleString("en-IN")}
                        </span>
                    </div>
                    {slice && (
                        <div className="mt-2 flex items-center gap-4 text-xs flex-wrap">
                            {renderStats(slice)}
                        </div>
                    )}
                    {run.triggeredBy && (
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{run.triggeredBy}</p>
                    )}
                    {run.error && (
                        <p className="text-xs text-rose-600 mt-1 flex items-start gap-1">
                            <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {run.error}
                        </p>
                    )}
                </div>
                {renderTrailing(slice)}
            </div>
        </div>
    );
};

function statusConfig(s: string) {
    switch (s) {
        case "SUCCEEDED":
        case "SENT":
        case "SWEPT":
            return { label: s === "SWEPT" ? "Swept" : "Success", pill: "bg-emerald-100 text-emerald-700", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", Icon: CheckCircle2 };
        case "FAILED":
        case "ERROR":
            return { label: "Failed", pill: "bg-rose-100 text-rose-700", iconBg: "bg-rose-100", iconColor: "text-rose-600", Icon: XCircle };
        case "RUNNING":
            return { label: "Running", pill: "bg-blue-100 text-blue-700", iconBg: "bg-blue-100", iconColor: "text-blue-600", Icon: TrendingUp };
        case "SKIPPED_MODULE_DISABLED":
            return { label: "Module off", pill: "bg-slate-200 text-slate-500", iconBg: "bg-slate-100", iconColor: "text-slate-500", Icon: AlertCircle };
        case "SKIPPED_NO_STUDENTS":
            return { label: "No students", pill: "bg-slate-200 text-slate-500", iconBg: "bg-slate-100", iconColor: "text-slate-500", Icon: AlertCircle };
        case "SKIPPED":
            return { label: "Skipped", pill: "bg-slate-200 text-slate-500", iconBg: "bg-slate-100", iconColor: "text-slate-500", Icon: AlertCircle };
        default:
            return { label: s, pill: "bg-slate-200 text-slate-500", iconBg: "bg-slate-100", iconColor: "text-slate-500", Icon: Info };
    }
}

export default JobsPage;
