import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Activity, AlertTriangle, BookOpen, CalendarCheck, GraduationCap,
    IndianRupee, Info, Library, Loader2, Sparkles, Trophy, TrendingDown, TrendingUp, FileDown,
} from "lucide-react";
import api from "../../api/api";

/**
 * The 360° student record for the management portal (FR-006).
 *
 * The backend has always been able to assemble this — attendance, academics,
 * fees, library, homework, sports and derived insights, redacted per viewer —
 * but no screen consumed it, so the office saw less about a child than a
 * teacher could. This panel is that view.
 *
 * Redaction is the SERVER's job: whatever arrives here is already what this
 * role may see, and `visibility.reason` explains any gap so a missing block
 * reads as a policy, not a bug.
 */
const inr = (n: number | null | undefined) =>
    n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

const LEVEL_STYLES: Record<string, string> = {
    critical: "bg-rose-50 border-rose-200 text-rose-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    positive: "bg-emerald-50 border-emerald-200 text-emerald-800",
    info: "bg-slate-50 border-slate-200 text-slate-700",
};

const Stat = ({ label, value, hint, tone = "slate" }: {
    label: string; value: string | number; hint?: string; tone?: "slate" | "emerald" | "rose" | "amber" | "indigo";
}) => {
    const tones: Record<string, string> = {
        slate: "text-slate-800", emerald: "text-emerald-700", rose: "text-rose-600",
        amber: "text-amber-700", indigo: "text-indigo-700",
    };
    return (
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`mt-0.5 text-lg font-bold tabular-nums ${tones[tone]}`}>{value}</p>
            {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
    );
};

const Section = ({ icon: Icon, title, badge, children }: {
    icon: any; title: string; badge?: string; children: React.ReactNode;
}) => (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
                <Icon size={15} className="text-slate-500" />
            </div>
            <h3 className="font-bold text-slate-800">{title}</h3>
            {badge && (
                <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{badge}</span>
            )}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

/** Per-term "Download Report Card" button. Streams the PDF and saves it. */
const ReportCardButton = ({ studentId, sessionId, examTerm, termLabel }: {
    studentId: string; sessionId?: string; examTerm: string; termLabel?: string;
}) => {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    if (!sessionId) return null;

    const download = async () => {
        setBusy(true); setErr(null);
        try {
            const blob = await api.downloadReportCard(studentId, { sessionId, examTerm, ...(termLabel ? { termLabel } : {}) });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ReportCard_${examTerm}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            const msg = e?.response?.status === 404
                ? "No published results for this term yet."
                : (e?.response?.data?.message ?? "Could not generate report card.");
            setErr(msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {err && <span className="text-[11px] text-rose-500">{err}</span>}
            <button data-testid="student-360-report-card-btn" data-exam-term={examTerm} onClick={download} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                {busy ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                Report Card
            </button>
        </div>
    );
};

const Student360Panel = ({ studentId }: { studentId: string }) => {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["student-360", studentId],
        queryFn: () => api.getStudent360(studentId),
        enabled: !!studentId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400" data-testid="student-360-loading">
                <Loader2 className="animate-spin" size={18} /> Building the 360° record…
            </div>
        );
    }
    if (isError || !data) {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" data-testid="student-360-error">
                Could not load the 360° record{(error as any)?.response?.data?.message ? `: ${(error as any).response.data.message}` : "."}
            </div>
        );
    }

    const { visibility, attendance, academics, fees, library, homework, sports, insights, enrolment } = data as any;

    return (
        <div className="space-y-4" data-testid="student-360-panel" data-scope={visibility?.scope ?? ""}>
            {/* What this viewer may see — shown so a redacted block reads as policy. */}
            {visibility?.scope === "LIMITED" && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                    data-testid="student-360-visibility-note">
                    <Info size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{visibility.reason}</span>
                </div>
            )}

            {/* Insights first: the reason to open this screen at all. */}
            {(insights ?? []).length > 0 && (
                <Section icon={Sparkles} title="Insights" badge={`${insights.length}`}>
                    <ul className="space-y-2" data-testid="student-360-insights">
                        {insights.map((i: any, idx: number) => (
                            <li key={idx}
                                data-testid="student-360-insight"
                                data-level={i.level}
                                data-module={i.module}
                                className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${LEVEL_STYLES[i.level] ?? LEVEL_STYLES.info}`}>
                                {i.level === "positive"
                                    ? <TrendingUp size={14} className="mt-0.5 shrink-0" />
                                    : i.level === "critical"
                                        ? <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                        : <Activity size={14} className="mt-0.5 shrink-0" />}
                                <span><span className="font-semibold">{i.module}</span> · {i.message}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {enrolment && (
                <Section icon={GraduationCap} title="Enrolment">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Class" value={enrolment.className ?? "—"} />
                        <Stat label="Section" value={enrolment.sectionName ?? "—"} />
                        <Stat label="Course" value={enrolment.courseName ?? "—"} />
                        <Stat label="Roll no." value={enrolment.rollNo ?? "—"} />
                    </div>
                </Section>
            )}

            {attendance && (
                <Section icon={CalendarCheck} title="Attendance" badge={`${attendance.percentage}%`}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Days recorded" value={attendance.totalDays} />
                        <Stat label="Present" value={attendance.present} tone="emerald" />
                        <Stat label="Absent" value={attendance.absent} tone="rose" />
                        <Stat label="Late" value={attendance.late} tone="amber" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        {attendance.last30Days && (
                            <Stat label="Last 30 days" value={`${attendance.last30Days.percentage}%`}
                                hint={`${attendance.last30Days.total} day(s) recorded`}
                                tone={attendance.last30Days.percentage < 75 ? "rose" : "emerald"} />
                        )}
                        <Stat label="Current absent streak" value={attendance.currentAbsentStreak ?? 0}
                            tone={(attendance.currentAbsentStreak ?? 0) > 0 ? "rose" : "slate"} />
                    </div>
                    {(attendance.byMonth ?? []).length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {attendance.byMonth.map((m: any) => (
                                <span key={m.month} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                    {m.month} · <strong className="tabular-nums">{m.percentage}%</strong>
                                </span>
                            ))}
                        </div>
                    )}
                </Section>
            )}

            {academics && (
                <Section icon={BookOpen} title="Academics"
                    badge={academics.overall ? `${academics.overall.percentage}% · ${academics.overall.grade ?? "—"}` : undefined}>
                    {academics.narrowedToTaughtSubjects && (
                        <p className="mb-3 text-xs text-slate-400">
                            Narrowed to the subjects you teach — {academics.hiddenSubjectCount} result(s) hidden.
                        </p>
                    )}
                    {!academics.hasResults ? (
                        <p className="text-sm text-slate-400">No published results yet.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <Stat label="Obtained" value={academics.overall?.obtained ?? "—"} />
                                <Stat label="Out of" value={academics.overall?.total ?? "—"} />
                                <Stat label="Awaiting publication" value={academics.pendingPublication} tone="amber" />
                                <Stat label="Papers missed" value={academics.absentPapers} tone="rose" />
                            </div>
                            {/* One card per exam the school actually conducted
                                (FR-008). Falls back to the per-term roll-up on
                                an older API that predates `examSets`. */}
                            {((academics.examSets ?? academics.terms ?? []) as any[]).length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {((academics.examSets ?? academics.terms) as any[]).map((t: any, gi: number) => (
                                        <div key={`${t.term}-${t.examName ?? gi}`}
                                            data-testid="student-360-exam-set"
                                            data-exam-name={t.examName ?? (t.examNames ?? []).join(", ")}
                                            className="rounded-xl border border-slate-100 p-3">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-slate-700">
                                                    {t.examName ?? (t.examNames ?? []).join(" · ") ?? t.term}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-semibold tabular-nums text-slate-500">
                                                        {t.obtained}/{t.total} · {t.percentage}%{t.grade ? ` · ${t.grade}` : ""}
                                                        {t.failedCount > 0 ? ` · ${t.failedCount} below pass` : ""}
                                                    </span>
                                                    <ReportCardButton
                                                        studentId={studentId}
                                                        sessionId={enrolment?.sessionId}
                                                        examTerm={t.term}
                                                        termLabel={t.examName ?? undefined}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(t.subjects ?? []).map((s: any, i: number) => (
                                                    <span key={i}
                                                        className={`rounded-lg px-2.5 py-1 text-xs ${
                                                            s.passed === false ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>
                                                        {s.subjectName}: <strong className="tabular-nums">{s.marks ?? "—"}/{s.fullMarks}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {(academics.subjectTrends ?? []).length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {academics.subjectTrends.map((s: any, i: number) => (
                                        <span key={i} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs ${
                                            s.trend === "down" ? "bg-rose-50 text-rose-700" : s.trend === "up" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>
                                            {s.trend === "down" ? <TrendingDown size={11} /> : s.trend === "up" ? <TrendingUp size={11} /> : null}
                                            {s.subjectName}{s.delta != null ? ` (${s.delta > 0 ? "+" : ""}${s.delta}%)` : ""}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </Section>
            )}

            {/* Money — only present when the server cleared this viewer for it. */}
            {fees ? (
                <Section icon={IndianRupee} title="Fees" badge={fees.outstanding > 0 ? `${inr(fees.outstanding)} due` : "Settled"}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Billed" value={inr(fees.totalBilled)} />
                        <Stat label="Collected" value={inr(fees.totalPaid)} tone="emerald" />
                        <Stat label="Outstanding" value={inr(fees.outstanding)} tone={fees.outstanding > 0 ? "rose" : "slate"} />
                        <Stat label="Overdue" value={`${fees.overdueCount}`} hint={fees.overdueAmount ? inr(fees.overdueAmount) : undefined}
                            tone={fees.overdueCount > 0 ? "rose" : "slate"} />
                    </div>
                </Section>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                    data-testid="student-360-fees-hidden">
                    Fee details are not part of your view.
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {library && (
                    <Section icon={Library} title="Library">
                        <div className="grid grid-cols-2 gap-3">
                            <Stat label="Issued (all time)" value={library.totalIssued} />
                            <Stat label="Held now" value={library.currentlyHeld} />
                            <Stat label="Overdue" value={library.overdue} tone={library.overdue > 0 ? "rose" : "slate"} />
                            {library.unpaidFines != null && <Stat label="Unpaid fines" value={inr(library.unpaidFines)} tone="amber" />}
                        </div>
                    </Section>
                )}
                {homework && (
                    <Section icon={BookOpen} title="Homework" badge={`${homework.submissionRate}%`}>
                        <div className="grid grid-cols-2 gap-3">
                            <Stat label="Assigned" value={homework.assigned} />
                            <Stat label="Pending" value={homework.pending} tone={homework.pending > 0 ? "amber" : "slate"} />
                            <Stat label="Late" value={homework.late} tone={homework.late > 0 ? "rose" : "slate"} />
                            <Stat label="Avg. marks" value={homework.averageMarks ?? "—"} />
                        </div>
                    </Section>
                )}
                {sports && (
                    <Section icon={Trophy} title="Sports">
                        <div className="grid grid-cols-2 gap-3">
                            <Stat label="Enrolments" value={sports.totalEnrolments} />
                            <Stat label="Active" value={sports.active} tone="emerald" />
                            <Stat label="Applied" value={sports.applied} />
                            <Stat label="Completed" value={sports.completed} tone="indigo" />
                        </div>
                    </Section>
                )}
            </div>
        </div>
    );
};

export default Student360Panel;
