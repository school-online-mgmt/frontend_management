import { useState, useEffect, useMemo, useCallback } from "react";
import {
    BookMarked, Loader2, Search, X, CheckCircle2, Clock, AlertTriangle,
    FileText, TrendingUp, Layers, ChevronRight, School,
} from "lucide-react";
import api from "../../api/api";
import { ErrorState } from "../../components/ui";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSessionId } from "../../context/SessionContext";

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
    PUBLISHED: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Published" },
    DRAFT:     { bg: "bg-slate-100",  text: "text-slate-600",   label: "Draft" },
    CLOSED:    { bg: "bg-amber-50",   text: "text-amber-700",   label: "Closed" },
};

const StatTile = ({ icon: Icon, label, value, tint, tintText }: { icon: any; label: string; value: React.ReactNode; tint: string; tintText: string }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div className={`w-10 h-10 ${tint} rounded-xl flex items-center justify-center shrink-0`}><Icon size={18} className={tintText} /></div>
        <div className="min-w-0">
            <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{label}</p>
        </div>
    </div>
);

const HomeworkPage = () => {
    const sessionId = useSessionId();
    const [insights, setInsights] = useState<any>(null);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [loadError, setLoadError] = useState<unknown>(null);

    const load = useCallback(async () => {
        if (!sessionId) { setRows([]); setInsights(null); return; }
        setLoading(true);
        setLoadError(null);
        /* `Promise.allSettled` never rejects, so the catch that used to sit
           here could not fire — the list silently became [] and the "Failed to
           load homework" toast never appeared. The rejection has to be read off
           the settled result instead. */
        const [ins, list] = await Promise.allSettled([
            api.getHomeworkInsights(sessionId),
            api.getHomeworkList({ sessionId, ...(statusFilter ? { status: statusFilter } : {}) }),
        ]);
        setInsights(ins.status === "fulfilled" ? ins.value : null);
        setRows(list.status === "fulfilled" ? (list.value.homework ?? []) : []);
        // Only the LIST failing is worth blocking on — insights are a summary
        // strip above it, and losing them does not misrepresent the homework.
        if (list.status === "rejected") setLoadError(list.reason);
        setLoading(false);
    }, [sessionId, statusFilter]);
    useEffect(() => { load(); }, [load]);

    const q = search.trim().toLowerCase();
    const filtered = useMemo(() => rows.filter(r =>
        !q || r.title?.toLowerCase().includes(q) || r.subjectName?.toLowerCase().includes(q) ||
        r.teacherName?.toLowerCase().includes(q) || r.className?.toLowerCase().includes(q) || r.sectionName?.toLowerCase().includes(q)
    ), [rows, q]);

    const s = insights?.summary;
    const today = new Date().toISOString().slice(0, 10);

    if (!sessionId) return <div className="min-h-full bg-slate-50"><div className="p-6 max-w-6xl mx-auto"><EmptySessionState entityPlural="homework" /></div></div>;

    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader icon={BookMarked} title="Homework" gradient={MODULE_THEMES.assignment}
                subtitle="School-wide oversight of homework — teachers assign & grade in their portal." onRefresh={load} refreshing={loading} />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-5">
                {/* Insight tiles */}
                {s && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatTile icon={FileText} label="Total homework" value={s.total} tint="bg-indigo-50" tintText="text-indigo-600" />
                        <StatTile icon={TrendingUp} label="Submission rate" value={`${s.submissionRate}%`} tint="bg-emerald-50" tintText="text-emerald-600" />
                        <StatTile icon={Clock} label="Pending grading" value={s.pendingGrading} tint="bg-amber-50" tintText="text-amber-600" />
                        <StatTile icon={AlertTriangle} label="Overdue & open" value={s.overdueOpen} tint="bg-rose-50" tintText="text-rose-600" />
                    </div>
                )}

                {/* Per-class breakdown */}
                {insights?.byClass?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2"><Layers size={13} /> By class</p>
                        <div className="flex flex-wrap gap-2">
                            {insights.byClass.map((c: any) => (
                                <div key={c.className} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
                                    <School size={12} className="text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-700">{c.className}</span>
                                    <span className="text-[11px] text-slate-500">{c.total} set{c.overdueOpen > 0 && <span className="text-rose-600 font-semibold"> · {c.overdueOpen} overdue</span>}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input data-testid="homework-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, subject, teacher, class…"
                            className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm" />
                        {search && <button data-testid="homework-search-btn" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
                    </div>
                    <select data-testid="homework-status-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm">
                        <option value="">All statuses</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="DRAFT">Draft</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
                ) : loadError != null ? (
                    /* Ahead of the empty state: "No homework yet — teachers
                       create homework from their portal" points the blame at
                       teachers for a request that failed. */
                    <div className="bg-white rounded-2xl border border-slate-100">
                        <ErrorState
                            message="Could not load homework."
                            error={loadError}
                            onRetry={() => void load()}
                            testId="homework-error"
                        />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">
                        {search ? `No homework matching "${search}"` : "No homework yet — teachers create homework from their portal."}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                        {filtered.map(hw => {
                            const pill = STATUS_PILL[hw.status] ?? STATUS_PILL.PUBLISHED;
                            const overdue = hw.status === "PUBLISHED" && hw.dueDate < today;
                            return (
                                <div key={hw.id} data-testid="homework-overview-row" data-homework-id={hw.id} data-title={hw.title} data-status={hw.status} data-submissions={hw.submissionCount ?? hw.submissionsCount ?? ""} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0"><BookMarked size={15} className="text-rose-500" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{hw.title}</p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {hw.className} · {hw.sectionName} · {hw.subjectName} · {hw.teacherName ?? "—"}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
                                            {hw.status === "PUBLISHED" ? <CheckCircle2 size={10} /> : null}{pill.label}
                                        </span>
                                        <p className={`text-[10px] mt-1 ${overdue ? "text-rose-600 font-semibold" : "text-slate-400"}`}>Due {hw.dueDate}{overdue && " · overdue"}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeworkPage;
