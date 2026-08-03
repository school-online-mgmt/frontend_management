import { useEffect, useMemo, useState } from "react";
import {
    MessagesSquare, LayoutDashboard, CalendarClock, UserCog, Loader2, Flag,
    TrendingDown, Users, CheckCircle2, AlertCircle, Search, X, Lock, Save,
} from "lucide-react";
import api from "../../api/api";
import type {
    FeedbackDashboard, FeedbackEventStudent, ManagementFeedbackEntry,
    TeacherReviewSummary, AppraisalEntry, PtmEvent,
} from "../../api/api";

/**
 * Feedback & Appraisals (FR-017).
 *
 * One module answering two related questions — "how is each child doing" and
 * "how is each teacher doing" — because a school asks them of the same people
 * in the same conversations.
 *
 * Three tabs: Dashboard (is this meeting actually being completed, and what are
 * we collectively weakest at), PTM (the per-child checklist), and
 * Teacher–Principal (review meetings, which hang off the existing appraisal).
 */

type Tab = "dashboard" | "ptm" | "reviews";

const TABS: Array<{ key: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "ptm", label: "Parent Meetings", icon: CalendarClock },
    { key: "reviews", label: "Teacher–Principal", icon: UserCog },
];

const toneFor = (v: number | null | undefined) =>
    v == null ? "text-slate-300"
    : v >= 4.5 ? "text-emerald-600"
    : v >= 3.5 ? "text-lime-600"
    : v >= 2.5 ? "text-yellow-600"
    : "text-amber-600";

const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const FeedbackPage = () => {
    const [tab, setTab] = useState<Tab>("dashboard");

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <MessagesSquare size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">Feedback &amp; Appraisals</h1>
                    <p className="text-xs text-slate-500">
                        Parent-teacher meetings, per-child feedback over time, and teacher reviews.
                    </p>
                </div>
            </div>

            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit my-4">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        data-testid={`feedback-tab-${key}`}
                        onClick={() => setTab(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                            tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Icon size={13} /> {label}
                    </button>
                ))}
            </div>

            {tab === "dashboard" && <DashboardTab />}
            {tab === "ptm" && <PtmTab />}
            {tab === "reviews" && <ReviewsTab />}
        </div>
    );
};

/* ── Dashboard ──────────────────────────────────────────────────────────── */

const DashboardTab = () => {
    const [data, setData] = useState<FeedbackDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const d = await api.getFeedbackDashboard();
                if (!cancelled) setData(d);
            } catch {
                if (!cancelled) setData(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) return <Spinner />;

    // No meeting yet is an ordinary state, not a failure — say so rather than
    // rendering a wall of zeros that reads as a broken page.
    if (!data?.event) {
        return (
            <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-xl" data-testid="feedback-dashboard-empty">
                <CalendarClock size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">{data?.message ?? "No parent-teacher meeting has been published yet."}</p>
                <p className="text-xs mt-1">Create and publish one from the Parent Meetings tab to start collecting feedback.</p>
            </div>
        );
    }

    const c = data.coverage;

    return (
        <div className="space-y-4" data-testid="feedback-dashboard">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Most recent meeting</p>
                <h2 className="text-base font-bold text-slate-900">{data.event.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                    {fmtDate(data.event.meetingDate)}
                    {data.event.location ? ` · ${data.event.location}` : ""} · {data.event.status.toLowerCase()}
                </p>
            </div>

            {/* The four numbers a principal actually asks for. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric
                    label="Feedback recorded"
                    value={c ? `${c.recorded}/${c.inScope}` : "—"}
                    sub={c?.coveragePct != null ? `${c.coveragePct}% of the class` : undefined}
                    tone={c && c.coveragePct != null && c.coveragePct < 80 ? "text-amber-600" : "text-slate-900"}
                    icon={Users}
                />
                <Metric
                    label="Parents attended"
                    value={c?.attendancePct != null ? `${c.attendancePct}%` : "—"}
                    sub={c ? `${c.presentCount} of ${c.recorded} recorded` : undefined}
                    icon={CheckCircle2}
                />
                <Metric
                    label="Still missing"
                    value={c ? String(c.missing) : "—"}
                    sub="children with no record"
                    tone={c && c.missing > 0 ? "text-amber-600" : "text-emerald-600"}
                    icon={AlertCircle}
                />
                <Metric
                    label="Follow-ups"
                    value={c ? String(c.followUps) : "—"}
                    sub="flagged by teachers"
                    tone={c && c.followUps > 0 ? "text-rose-600" : "text-slate-900"}
                    icon={Flag}
                />
            </div>

            {/* Where the school is collectively weak. */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                    How the school is scoring, by area
                </h3>
                {data.areaAverages.every((a) => a.average == null) ? (
                    <p className="text-sm text-slate-400">No ratings recorded for this meeting yet.</p>
                ) : (
                    <div className="space-y-2.5">
                        {data.areaAverages.map((a) => (
                            <div key={a.area} className="flex items-center gap-3">
                                <span className="text-sm text-slate-700 w-40 shrink-0 capitalize">{a.area}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            a.average == null ? "bg-slate-200"
                                            : a.average >= 3.5 ? "bg-emerald-500"
                                            : a.average >= 2.5 ? "bg-yellow-500" : "bg-amber-500"
                                        }`}
                                        style={{ width: `${((a.average ?? 0) / 5) * 100}%` }}
                                    />
                                </div>
                                <span className={`text-sm font-bold w-10 text-right ${toneFor(a.average)}`}>
                                    {a.average?.toFixed(1) ?? "—"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                {data.weakestArea?.average != null && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 flex items-start gap-1.5">
                        <TrendingDown size={13} className="shrink-0 mt-0.5" />
                        <span>
                            <strong className="capitalize">{data.weakestArea.area}</strong> is the weakest area across
                            the school at {data.weakestArea.average.toFixed(1)} — worth raising with class teachers
                            before the next meeting.
                        </span>
                    </p>
                )}
            </div>

            {/* Action list */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                    <Flag size={13} /> Children flagged for follow-up
                </h3>
                {data.followUps.length === 0 ? (
                    <p className="text-sm text-slate-400">Nothing outstanding.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {data.followUps.map((f) => (
                            <div key={f.id} className="py-2.5 flex items-start justify-between gap-3" data-testid="feedback-followup-row">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800">{f.studentName}</p>
                                    <p className="text-xs text-slate-500">
                                        {f.className}{f.sectionName ? `-${f.sectionName}` : ""}
                                        {f.teacherName ? ` · ${f.teacherName}` : ""}
                                    </p>
                                    {f.areasToImprove && <p className="text-xs text-slate-500 mt-0.5 truncate">{f.areasToImprove}</p>}
                                </div>
                                <span className={`text-xs shrink-0 ${
                                    f.nextReviewDate && new Date(f.nextReviewDate) < new Date() ? "text-rose-600 font-semibold" : "text-slate-500"
                                }`}>
                                    {f.nextReviewDate ? fmtDate(f.nextReviewDate) : "no date set"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── PTM tab ────────────────────────────────────────────────────────────── */

const PtmTab = () => {
    const [events, setEvents] = useState<PtmEvent[]>([]);
    const [eventId, setEventId] = useState<string | null>(null);
    const [rows, setRows] = useState<FeedbackEventStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [rowsLoading, setRowsLoading] = useState(false);
    const [q, setQ] = useState("");
    const [onlyMissing, setOnlyMissing] = useState(false);
    const [historyFor, setHistoryFor] = useState<FeedbackEventStudent | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await api.getPtmEvents();
                if (cancelled) return;
                setEvents(list);
                const first = list.find((e) => e.status === "PUBLISHED" || e.status === "COMPLETED") ?? list[0];
                if (first) setEventId(first.id);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!eventId) return;
        let cancelled = false;
        setRowsLoading(true);
        (async () => {
            try {
                const r = await api.getFeedbackEventStudents(eventId);
                if (!cancelled) setRows(r);
            } catch {
                if (!cancelled) setRows([]);
            } finally {
                if (!cancelled) setRowsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [eventId]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return rows.filter((r) => {
            if (onlyMissing && r.hasFeedback) return false;
            if (!needle) return true;
            return r.studentName.toLowerCase().includes(needle) || (r.rollNo ?? "").toLowerCase().includes(needle);
        });
    }, [rows, q, onlyMissing]);

    if (loading) return <Spinner />;
    if (events.length === 0) {
        return (
            <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-xl">
                <CalendarClock size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No parent-teacher meetings have been created yet.</p>
                <p className="text-xs mt-1">Create one from the Parent Meetings page under Communication.</p>
            </div>
        );
    }

    if (historyFor) return <StudentHistory student={historyFor} onBack={() => setHistoryFor(null)} />;

    const recorded = rows.filter((r) => r.hasFeedback).length;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
                <select
                    data-testid="feedback-event-select"
                    value={eventId ?? ""}
                    onChange={(e) => setEventId(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                    {events.map((e) => (
                        <option key={e.id} value={e.id}>
                            {e.title} — {fmtDate(e.meetingDate)}
                        </option>
                    ))}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        data-testid="feedback-student-search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by name or roll number"
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                </div>
                <button
                    data-testid="feedback-missing-filter"
                    onClick={() => setOnlyMissing((v) => !v)}
                    className={`px-3 py-2 rounded-xl text-sm border transition ${
                        onlyMissing ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500"
                    }`}
                >
                    Missing only
                </button>
            </div>

            <p className="text-xs text-slate-500">
                <strong className="text-slate-800">{recorded}</strong> of {rows.length} children have feedback recorded.
            </p>

            {rowsLoading ? <Spinner /> : (
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {filtered.map((r) => (
                        <button
                            key={r.studentId}
                            data-testid="feedback-student-row"
                            data-has-feedback={r.hasFeedback}
                            onClick={() => setHistoryFor(r)}
                            className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                    {r.studentName}
                                    {r.followUpRequired && <Flag size={12} className="inline ml-1.5 text-amber-600" />}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {r.rollNo ? `Roll ${r.rollNo} · ` : ""}{r.className}{r.sectionName ? `-${r.sectionName}` : ""}
                                    {r.teacherName ? ` · ${r.teacherName}` : ""}
                                </p>
                            </div>
                            {r.hasFeedback ? (
                                <div className="text-right shrink-0">
                                    <div className={`text-base font-bold ${toneFor(r.overallRating)}`}>
                                        {r.overallRating?.toFixed(1) ?? "—"}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {r.isPresent === false ? "did not attend" : r.overallLabel}
                                    </div>
                                </div>
                            ) : (
                                <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                    No feedback
                                </span>
                            )}
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="text-center text-sm text-slate-400 py-10">No children match that filter.</p>
                    )}
                </div>
            )}
        </div>
    );
};

/** A child's whole feedback history — MANAGEMENT view, private notes included. */
const StudentHistory = ({ student, onBack }: { student: FeedbackEventStudent; onBack: () => void }) => {
    const [entries, setEntries] = useState<ManagementFeedbackEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const h = await api.getStudentFeedbackHistory(student.studentId);
                if (!cancelled) setEntries(h.entries);
            } catch {
                if (!cancelled) setEntries([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [student.studentId]);

    return (
        <div>
            <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 mb-3 inline-flex items-center gap-1">
                <X size={14} /> Back to the list
            </button>
            <h2 className="text-base font-bold text-slate-900">{student.studentName}</h2>
            <p className="text-xs text-slate-500 mb-3">
                {student.className}{student.sectionName ? `-${student.sectionName}` : ""}
            </p>

            {loading ? <Spinner /> : entries.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center bg-white border border-slate-200 rounded-xl">
                    No feedback recorded for this child yet.
                </p>
            ) : (
                <div className="space-y-3">
                    {[...entries].reverse().map((e) => (
                        <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid="feedback-history-entry">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{e.eventTitle ?? "Meeting"}</p>
                                    <p className="text-xs text-slate-500">
                                        {fmtDate(e.meetingDate)}{e.teacherName ? ` · ${e.teacherName}` : ""}
                                        {e.isPresent ? "" : " · parent did not attend"}
                                    </p>
                                </div>
                                {e.overallRating != null && (
                                    <span className={`text-lg font-bold ${toneFor(Number(e.overallRating))}`}>
                                        {Number(e.overallRating).toFixed(1)}
                                    </span>
                                )}
                            </div>
                            {e.strengths && <p className="text-xs text-slate-600 mt-2"><strong>Strengths:</strong> {e.strengths}</p>}
                            {e.areasToImprove && <p className="text-xs text-slate-600 mt-1"><strong>To improve:</strong> {e.areasToImprove}</p>}
                            {e.actionForParents && <p className="text-xs text-slate-600 mt-1"><strong>For parents:</strong> {e.actionForParents}</p>}
                            {e.internalNote && (
                                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
                                    <Lock size={12} className="shrink-0 mt-0.5 text-slate-500" />
                                    <span><strong>Internal (staff only):</strong> {e.internalNote}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ── Teacher–Principal reviews ──────────────────────────────────────────── */

const REVIEW_AREAS = [
    { key: "teaching" as const, label: "Teaching quality" },
    { key: "outcomes" as const, label: "Student outcomes" },
    { key: "punctuality" as const, label: "Punctuality" },
    { key: "collaboration" as const, label: "Collaboration" },
    { key: "compliance" as const, label: "Records & compliance" },
];

const ReviewsTab = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [teachers, setTeachers] = useState<TeacherReviewSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [openTeacher, setOpenTeacher] = useState<TeacherReviewSummary | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.getTeacherReviewOverview();
            setSessionId(res.sessionId);
            setTeachers(res.teachers);
        } catch {
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { void load(); }, []);

    if (loading) return <Spinner />;
    if (openTeacher && sessionId) {
        return <TeacherReview teacher={openTeacher} sessionId={sessionId} onBack={() => { setOpenTeacher(null); void load(); }} />;
    }

    const neverReviewed = teachers.filter((t) => t.meetings === 0).length;

    return (
        <div className="space-y-3">
            {neverReviewed > 0 && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>
                        <strong>{neverReviewed}</strong> {neverReviewed === 1 ? "teacher has" : "teachers have"} not been
                        reviewed at all this session. Meetings recorded here feed the appraisal, so an appraisal closed
                        without them is written from memory.
                    </span>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {teachers.map((t) => (
                    <button
                        key={t.teacherId}
                        data-testid="teacher-review-row"
                        onClick={() => setOpenTeacher(t)}
                        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                    >
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{t.teacherName}</p>
                            <p className="text-xs text-slate-500">
                                {t.meetings === 0 ? "No reviews yet" : `${t.meetings} review${t.meetings === 1 ? "" : "s"} · last ${fmtDate(t.lastMetOn)}`}
                                {t.appraisalStatus ? ` · appraisal ${t.appraisalStatus.toLowerCase().replace("_", " ")}` : ""}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className={`text-base font-bold ${toneFor(t.latestOverall)}`}>
                                {t.latestOverall?.toFixed(1) ?? "—"}
                            </div>
                            <div className="text-[10px] text-slate-400">{t.latestLabel ?? "not rated"}</div>
                        </div>
                    </button>
                ))}
                {teachers.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-10">No active teachers found.</p>
                )}
            </div>
        </div>
    );
};

const TeacherReview = ({ teacher, sessionId, onBack }: {
    teacher: TeacherReviewSummary; sessionId: string; onBack: () => void;
}) => {
    const [entries, setEntries] = useState<AppraisalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [quarter, setQuarter] = useState(1);
    const [metOn, setMetOn] = useState(new Date().toISOString().slice(0, 10));
    const [ratings, setRatings] = useState<Record<string, number | null>>({});
    const [strengths, setStrengths] = useState("");
    const [areasToImprove, setAreasToImprove] = useState("");
    const [agreedActions, setAgreedActions] = useState("");
    const [internalNote, setInternalNote] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.getTeacherReviews(teacher.teacherId, sessionId);
            setEntries(res.entries);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [teacher.teacherId, sessionId]);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.recordTeacherReview({
                teacherId: teacher.teacherId,
                sessionId,
                quarter,
                metOn,
                ratings,
                strengths: strengths.trim() || null,
                areasToImprove: areasToImprove.trim() || null,
                agreedActions: agreedActions.trim() || null,
                internalNote: internalNote.trim() || null,
            });
            setShowForm(false);
            setRatings({});
            setStrengths(""); setAreasToImprove(""); setAgreedActions(""); setInternalNote("");
            await load();
        } catch (e) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err.response?.data?.message ?? "Could not record this meeting.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 mb-3 inline-flex items-center gap-1">
                <X size={14} /> Back to teachers
            </button>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">{teacher.teacherName}</h2>
                    <p className="text-xs text-slate-500">
                        {teacher.email ?? ""}
                        {teacher.appraisalStatus ? ` · appraisal ${teacher.appraisalStatus.toLowerCase().replace("_", " ")}` : " · no appraisal open yet"}
                    </p>
                </div>
                {!showForm && (
                    <button
                        data-testid="record-review-btn"
                        onClick={() => setShowForm(true)}
                        className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
                    >
                        Record a meeting
                    </button>
                )}
            </div>

            {/* Recording a meeting opens the appraisal if none exists — which is
                what makes a mid-year joiner reviewable at all (FR-017 D3). */}
            {!teacher.appraisalId && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
                    This teacher has no appraisal open for the session. Recording the first meeting opens one
                    automatically — you do not need to create it separately.
                </p>
            )}

            {showForm && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3" data-testid="review-form">
                    <div className="flex gap-2">
                        <label className="text-xs text-slate-600">
                            Quarter
                            <select
                                data-testid="review-quarter"
                                value={quarter}
                                onChange={(e) => setQuarter(Number(e.target.value))}
                                className="mt-1 block px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            >
                                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
                            </select>
                        </label>
                        <label className="text-xs text-slate-600">
                            Met on
                            <input
                                type="date"
                                data-testid="review-date"
                                value={metOn}
                                onChange={(e) => setMetOn(e.target.value)}
                                className="mt-1 block px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                        </label>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {REVIEW_AREAS.map((a) => (
                            <div key={a.key} className="flex items-center justify-between gap-3 py-2">
                                <span className="text-sm text-slate-700">{a.label}</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            data-testid={`review-${a.key}-${n}`}
                                            onClick={() => setRatings((r) => ({ ...r, [a.key]: r[a.key] === n ? null : n }))}
                                            className={`w-7 h-7 rounded-lg text-xs font-semibold border transition ${
                                                ratings[a.key] === n
                                                    ? "bg-indigo-600 text-white border-indigo-600"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Textarea label="Strengths" value={strengths} onChange={setStrengths} testId="review-strengths" />
                    <Textarea label="Areas to improve" value={areasToImprove} onChange={setAreasToImprove} testId="review-areas" />
                    <Textarea label="Agreed actions" value={agreedActions} onChange={setAgreedActions} testId="review-actions" />

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Lock size={12} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-700">Internal note</span>
                            <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                NOT SHOWN TO THE TEACHER
                            </span>
                        </div>
                        <textarea
                            data-testid="review-internal-note"
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                    </div>

                    {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            data-testid="review-save"
                            onClick={save}
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? "Saving…" : "Record meeting"}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {loading ? <Spinner /> : entries.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center bg-white border border-slate-200 rounded-xl">
                    No review meetings recorded this session.
                </p>
            ) : (
                <div className="space-y-3">
                    {entries.map((e) => (
                        <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid="review-entry">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Q{e.quarter} review</p>
                                    <p className="text-xs text-slate-500">{fmtDate(e.metOn)}</p>
                                </div>
                                {e.overallRating != null && (
                                    <span className={`text-lg font-bold ${toneFor(Number(e.overallRating))}`}>
                                        {Number(e.overallRating).toFixed(1)}
                                    </span>
                                )}
                            </div>
                            {e.strengths && <p className="text-xs text-slate-600 mt-2"><strong>Strengths:</strong> {e.strengths}</p>}
                            {e.areasToImprove && <p className="text-xs text-slate-600 mt-1"><strong>To improve:</strong> {e.areasToImprove}</p>}
                            {e.agreedActions && <p className="text-xs text-slate-600 mt-1"><strong>Agreed:</strong> {e.agreedActions}</p>}
                            {e.internalNote && (
                                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
                                    <Lock size={12} className="shrink-0 mt-0.5 text-slate-500" />
                                    <span><strong>Internal:</strong> {e.internalNote}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ── Small shared pieces ────────────────────────────────────────────────── */

const Spinner = () => (
    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
);

const Metric = ({ label, value, sub, tone = "text-slate-900", icon: Icon }: {
    label: string; value: string; sub?: string; tone?: string; icon: typeof Users;
}) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400">
            <Icon size={12} /> {label}
        </div>
        <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
);

const Textarea = ({ label, value, onChange, testId }: {
    label: string; value: string; onChange: (v: string) => void; testId: string;
}) => (
    <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
        <textarea
            data-testid={testId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
    </div>
);

export default FeedbackPage;
