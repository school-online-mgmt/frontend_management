import { useEffect, useState, useCallback } from "react";
import { Activity, Loader2, Search, RefreshCw } from "lucide-react";
import api from "../../api/api";
import { ErrorState } from "../../components/ui";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";

/**
 * The Activity feed (P0-AC-08) — "who did what, when" for the school.
 *
 * Read-only, admin-gated. The backend writes it from every module; this just
 * renders the audit trail a principal or an auditor asks for, filterable by
 * module and free text, with cursor pagination.
 */

const ACTOR_TONE: Record<string, string> = {
    MANAGEMENT: "bg-indigo-50 text-indigo-700",
    TEACHER: "bg-emerald-50 text-emerald-700",
    STUDENT: "bg-sky-50 text-sky-700",
    SUPERADMIN: "bg-purple-50 text-purple-700",
    SYSTEM: "bg-slate-100 text-slate-600",
};

const fmt = (d: string) => new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
});

export default function ActivityPage() {
    const [rows, setRows] = useState<any[]>([]);
    const [modules, setModules] = useState<string[]>([]);
    const [module, setModule] = useState("");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [nextBefore, setNextBefore] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const [loadError, setLoadError] = useState<unknown>(null);
    const [modulesError, setModulesError] = useState<unknown>(null);

    const load = useCallback(async (reset = true) => {
        reset ? setLoading(true) : setLoadingMore(true);
        setLoadError(null);
        try {
            const res = await api.getActivity({
                module: module || undefined,
                q: q || undefined,
                before: reset ? undefined : (nextBefore ?? undefined),
                limit: 50,
            });
            setRows(prev => reset ? res.activities : [...prev, ...res.activities]);
            setNextBefore(res.nextBefore);
        }
        // The old comment here said "surfaced by empty state" — which is the
        // bug, not the handling. On an audit log, "no activity recorded" and
        // "we could not read the audit log" are opposite claims.
        catch (e: unknown) { setLoadError(e); }
        finally { reset ? setLoading(false) : setLoadingMore(false); }
    }, [module, q, nextBefore]);

    const loadModules = useCallback(() => {
        setModulesError(null);
        api.getActivityModules()
            .then(r => setModules(r.modules))
            .catch((e: unknown) => setModulesError(e));
    }, []);
    useEffect(() => { loadModules(); }, [loadModules]);
    // Reload from the top whenever a filter changes.
    useEffect(() => { load(true); /* eslint-disable-next-line */ }, [module]);

    return (
        <div className="space-y-4">
            <PageHeader icon={Activity} title="Activity" subtitle="Who did what, and when — across every module"
                gradient={MODULE_THEMES.people} onRefresh={() => load(true)} />

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-52 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input data-testid="activity-search-input" value={q} onChange={e => setQ(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && load(true)}
                        placeholder="Search who or what…"
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
                </div>
                <select data-testid="activity-module-select" value={module} onChange={e => setModule(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="">All modules</option>
                    {modules.map(m => <option key={m} value={m}>{m}</option>)}
                    {modulesError != null && <option disabled value="">(module filter unavailable)</option>}
                </select>
                <button data-testid="activity-refresh-btn" onClick={() => load(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : loadError != null ? (
                <ErrorState
                    message="Could not read the activity log. This does not mean nothing happened — the records could not be fetched."
                    error={loadError}
                    onRetry={() => load(true)}
                    testId="activity-error"
                />
            ) : rows.length === 0 ? (
                <p className="py-16 text-center text-sm text-slate-400" data-testid="activity-empty">
                    No activity recorded yet.
                </p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <ul className="divide-y divide-slate-50">
                        {rows.map(a => (
                            <li key={a.id} data-testid="activity-row" data-module={a.module} data-action={a.action}
                                className="flex items-start gap-3 px-4 py-3">
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ACTOR_TONE[a.actorType] ?? ACTOR_TONE.SYSTEM}`}>
                                    {a.actorType}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-slate-800">{a.summary}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {a.actorName ?? "System"}
                                        {a.actorRole ? ` · ${a.actorRole}` : ""}
                                        {" · "}<span className="font-medium text-slate-500">{a.module}</span>
                                        {" · "}{fmt(a.createdAt)}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {nextBefore && (
                        <button data-testid="activity-load-more-btn" onClick={() => load(false)} disabled={loadingMore}
                            className="w-full border-t border-slate-100 py-3 text-sm font-medium text-emerald-600 hover:bg-slate-50 disabled:opacity-60">
                            {loadingMore ? "Loading…" : "Load older activity"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
