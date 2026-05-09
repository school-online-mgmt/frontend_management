import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import api from "../../api/api";

/**
 * Reusable session selector banner used across pages that need to scope
 * data per academic session: students, applicants, classes, exams, fees,
 * attendance, performance, transport, notice boards.
 *
 * Renders the same purple gradient header pattern as StudentsHome and
 * ApplicantsHome, manages its own session list fetch + auto-pick of the
 * ACTIVE session, and reports the chosen sessionId via `onChange` so the
 * parent page can refetch.
 *
 * The companion <EmptySessionState /> renders the "Pick a session to begin"
 * card so pages don't have to duplicate that markup.
 */

export interface SessionOption {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    endDate: string;
    status?: string;
}

interface SessionGateProps {
    /** Currently selected session id (controlled). Empty string = none. */
    value: string;
    onChange: (sessionId: string) => void;
    /** Short label shown under "Academic Session" — e.g. "Pick a session to view its classes". */
    subtitle?: string;
    /**
     * Optional render-prop for trailing summary chips (counts, badges) shown
     * when a session is selected. Receives the chosen session option.
     */
    renderTrailing?: (selected: SessionOption) => React.ReactNode;
    /** Surface the loaded sessions list to the parent (e.g. for breadcrumb labels). */
    onSessionsLoaded?: (sessions: SessionOption[]) => void;
    /**
     * Compact header variant — drops the gradient card, the icon block, and
     * the subtitle. Just renders a clean white pill-select that matches the
     * page header's white-on-gradient styling. Use this when SessionGate
     * lives inside a PageHeader.
     */
    compact?: boolean;
}

export const SessionGate: React.FC<SessionGateProps> = ({
    value,
    onChange,
    subtitle = "Pick a session to view its data",
    renderTrailing,
    onSessionsLoaded,
    compact = false,
}) => {
    const [sessions, setSessions] = useState<SessionOption[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res: any = await api.getSessions();
                if (cancelled) return;
                const list: SessionOption[] = Array.isArray(res?.sessions) ? res.sessions : Array.isArray(res) ? res : [];
                setSessions(list);
                onSessionsLoaded?.(list);
                // Auto-pick the active session (or the first one) ONLY if the
                // parent hasn't already chosen something. Avoids fighting URL
                // params or persisted selections.
                if (!value) {
                    const active = list.find(s => s.status === "ACTIVE") ?? list[0];
                    if (active) onChange(active.id);
                }
            } catch {
                /* non-fatal — selector just stays empty */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // We intentionally only run once on mount — re-running on `value`
        // changes would loop, and onChange/onSessionsLoaded are typically
        // stable across renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selected = sessions.find(s => s.id === value);

    // Compact variant — meant for embedding in PageHeader. White pill on the
    // header's gradient background, no icon/subtitle decoration.
    if (compact) {
        return (
            <div className="relative">
                <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-600 pointer-events-none" />
                <select
                    data-testid="session-gate-select"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={loading}
                    aria-label="Academic session"
                    className="w-full pl-9 pr-9 py-2 rounded-lg bg-white text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60 appearance-none shadow-sm border border-white/20"
                >
                    {loading && <option>Loading sessions…</option>}
                    {!loading && sessions.length === 0 && <option value="">No sessions found</option>}
                    {!loading && sessions.length > 0 && <option value="">— Select a session —</option>}
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}{s.status && s.status !== "ACTIVE" ? ` (${s.status.toLowerCase()})` : ""}
                        </option>
                    ))}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-3 sm:p-4 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
                        <CalendarDays size={17} />
                    </div>
                    <div className="leading-tight">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-white/70">Academic Session</p>
                        <p className="text-[11px] text-white/80">{subtitle}</p>
                    </div>
                </div>
                <div className="flex-1 min-w-0 relative">
                    <select
                        data-testid="session-gate-select"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={loading}
                        className="w-full px-3 py-2 pr-9 rounded-lg bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 appearance-none"
                    >
                        {loading && <option>Loading sessions…</option>}
                        {!loading && sessions.length === 0 && <option value="">No sessions found</option>}
                        {!loading && sessions.length > 0 && <option value="">— Select a session —</option>}
                        {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}{s.status && s.status !== "ACTIVE" ? ` (${s.status.toLowerCase()})` : ""}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {selected && renderTrailing && (
                    <div className="flex flex-wrap gap-2 text-[11px] shrink-0">
                        {renderTrailing(selected)}
                    </div>
                )}
            </div>
        </div>
    );
};

interface EmptySessionStateProps {
    /** Singular noun for the entity, e.g. "students", "classes", "applicants". */
    entityPlural: string;
}

export const EmptySessionState: React.FC<EmptySessionStateProps> = ({ entityPlural }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <CalendarDays size={26} className="text-indigo-400" />
        </div>
        <p className="text-sm font-bold text-slate-700 mb-1">Pick a session to begin</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {entityPlural[0]?.toUpperCase() + entityPlural.slice(1)} are listed per academic session.
            Select a session above to see the data for that year.
        </p>
    </div>
);

export default SessionGate;
