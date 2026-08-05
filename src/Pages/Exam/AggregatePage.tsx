import { useEffect, useMemo, useState, useCallback, Fragment } from "react";
import { Sigma, ChevronRight, ChevronDown, Trophy } from "lucide-react";
import api from "../../api/api";
import type { ExamAggregateRow } from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { GRADE_COLORS } from "../../utils/grades";
import { EmptyState, ErrorState, InlineError, Skeleton } from "../../components/ui";

const FALLBACK = { bg: "bg-slate-100", text: "text-slate-600" };
const gradeBadge = (g: string) => {
    const s = (GRADE_COLORS as Record<string, { bg: string; text: string }>)[g] ?? FALLBACK;
    return `${s.bg} ${s.text}`;
};

const TERMS = [
    { value: "", label: "All terms" },
    { value: "TERM1", label: "Term 1" },
    { value: "TERM2", label: "Term 2" },
    { value: "TERM3", label: "Term 3" },
];

const AggregatePage = () => {
    const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);
    const [classes, setClasses] = useState<Array<{ id: string; name: string; sections?: Array<{ id: string; name: string }> }>>([]);
    const [sessionId, setSessionId] = useState("");
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [term, setTerm] = useState("");
    const [rows, setRows] = useState<ExamAggregateRow[]>([]);
    const [examCount, setExamCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    /* Three loads, three independent failure modes. They are tracked
       separately because they do not mean the same thing: without sessions the
       page cannot function at all, without classes only the filter degrades,
       and a failed aggregate must never be shown as "no results". */
    const [sessionsError, setSessionsError] = useState<unknown>(null);
    const [classesError, setClassesError] = useState<unknown>(null);
    const [error, setError] = useState<unknown>(null);

    // Sessions once; classes follow the chosen session.
    const loadSessions = useCallback(() => {
        setSessionsError(null);
        api.getSessions().then((s: any) => {
            const list = Array.isArray(s) ? s : (s?.sessions ?? []);
            setSessions(list);
            if (list[0]) setSessionId(list[0].id);
            // No sessions at all is a real (if unusual) state, not a failure —
            // but nothing further will load, so stop showing a spinner.
            if (!list[0]) setLoading(false);
        }).catch((e: unknown) => { setSessionsError(e); setLoading(false); });
    }, []);
    useEffect(() => { loadSessions(); }, [loadSessions]);

    const loadClasses = useCallback(() => {
        if (!sessionId) return;
        setClassesError(null);
        api.getClasses(sessionId)
            .then((c: any) => setClasses(Array.isArray(c) ? c : (c?.classes ?? [])))
            .catch((e: unknown) => { setClasses([]); setClassesError(e); });
    }, [sessionId]);
    useEffect(() => {
        loadClasses();
        setClassId(""); setSectionId("");
    }, [loadClasses]);

    const sections = useMemo(() => classes.find((c) => c.id === classId)?.sections ?? [], [classes, classId]);

    const load = useCallback(async () => {
        if (!sessionId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.getExamAggregate({ sessionId, classId: classId || undefined, sectionId: sectionId || undefined, term: term || undefined });
            setRows(res.students);
            setExamCount(res.examCount);
        } catch (e: unknown) {
            // Previously `setRows([])`, which rendered "No published results
            // for this selection yet." A teacher reads that as marks not having
            // been entered and goes off to enter them again.
            setRows([]); setExamCount(0); setError(e);
        }
        finally { setLoading(false); }
    }, [sessionId, classId, sectionId, term]);
    useEffect(() => { void load(); }, [load]);

    const select = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <PageHeader icon={Sigma} title="Consolidated Results"
                subtitle="Total marks achieved across all published exams — no weighting, every exam counts equally"
                gradient={MODULE_THEMES.exam} onRefresh={load} refreshing={loading} />

            <div className="flex flex-wrap gap-2 mt-4 mb-3">
                <select data-testid="agg-session" className={select} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                    {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className={select} value={classId} disabled={!!classesError} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }}>
                    <option value="">All classes</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {classesError != null && (
                    <InlineError message="Class list unavailable." onRetry={loadClasses} testId="agg-classes-error" />
                )}
                <select className={select} value={sectionId} disabled={!classId} onChange={(e) => setSectionId(e.target.value)}>
                    <option value="">All sections</option>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className={select} value={term} onChange={(e) => setTerm(e.target.value)}>
                    {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
            </div>

            {sessionsError != null ? (
                <div className="bg-white rounded-xl border border-slate-200">
                    <ErrorState
                        message="Could not load the academic sessions this page is built from."
                        error={sessionsError}
                        onRetry={loadSessions}
                        testId="agg-sessions-error"
                    />
                </div>
            ) : loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4"><Skeleton rows={6} /></div>
            ) : error != null ? (
                <div className="bg-white rounded-xl border border-slate-200">
                    <ErrorState
                        message="Could not load consolidated results. This is a loading failure, not an empty result — marks already entered are safe."
                        error={error}
                        onRetry={load}
                        testId="agg-error"
                    />
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200">
                    <EmptyState
                        icon={<Sigma size={22} />}
                        title="No published results for this selection yet"
                        message="Results appear here once an exam has been conducted and its results published."
                        testId="agg-empty"
                    />
                </div>
            ) : (
                <>
                    <p className="text-xs text-slate-500 mb-2">{rows.length} student(s) · aggregated over {examCount} published exam(s)</p>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="text-left px-3 py-2.5 font-semibold">Rank</th>
                                        <th className="text-left px-3 py-2.5 font-semibold">Roll</th>
                                        <th className="text-left px-3 py-2.5 font-semibold">Student</th>
                                        <th className="text-left px-3 py-2.5 font-semibold">Class</th>
                                        <th className="text-right px-3 py-2.5 font-semibold">Achieved / Total</th>
                                        <th className="text-right px-3 py-2.5 font-semibold">%</th>
                                        <th className="text-center px-3 py-2.5 font-semibold">Grade</th>
                                        <th className="w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rows.map((r) => (
                                        <Fragment key={r.studentId}>
                                            <tr data-testid="agg-row"
                                                className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === r.studentId ? null : r.studentId)}>
                                                <td className="px-3 py-2.5">
                                                    <span className={`inline-flex items-center gap-1 font-semibold ${r.rank <= 3 ? "text-amber-600" : "text-slate-600"}`}>
                                                        {r.rank <= 3 && <Trophy size={13} />}{r.rank}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-500">{r.rollNo}</td>
                                                <td className="px-3 py-2.5 font-medium text-slate-800">{r.studentName}</td>
                                                <td className="px-3 py-2.5 text-slate-500">{r.className}{r.sectionName !== "—" ? `-${r.sectionName}` : ""}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.achieved} / {r.total}</td>
                                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.pct}%</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${gradeBadge(r.grade)}`}>{r.grade}</span>
                                                </td>
                                                <td className="px-2 text-slate-300">{expanded === r.studentId ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                                            </tr>
                                            {expanded === r.studentId && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={8} className="px-6 py-3">
                                                        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                                            {r.subjects.map((s) => (
                                                                <div key={s.subjectId} className="flex items-center justify-between gap-2 text-xs bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                                                                    <span className="text-slate-600 truncate">{s.subjectName}</span>
                                                                    <span className="flex items-center gap-2 shrink-0">
                                                                        <span className="tabular-nums text-slate-700">{s.achieved}/{s.total}</span>
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeBadge(s.grade)}`}>{s.grade}</span>
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AggregatePage;
