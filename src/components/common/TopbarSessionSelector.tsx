import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Check, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useSession, type SessionOption } from "../../context/SessionContext";

/**
 * Compact session picker rendered in the global Layout topbar. Reads from
 * SessionContext so every page sees the same value. Shows a status-coloured
 * dot next to the active session for at-a-glance lifecycle state.
 *
 * Visual choice — a popover menu instead of a native <select> gives us
 * room for status badges and richer context per option, and matches the
 * topbar's dark theme without an awkward white pill mid-bar.
 */

const statusBadge = (status?: string) => {
    switch (status) {
        case "ACTIVE":
            return { dot: "bg-emerald-400", label: "Active",   tone: "text-emerald-300" };
        case "ENDING":
            return { dot: "bg-amber-400",   label: "Ending",   tone: "text-amber-300" };
        case "ENDED":
            return { dot: "bg-slate-500",   label: "Ended",    tone: "text-slate-400" };
        default:
            return { dot: "bg-slate-500",   label: status ?? "—", tone: "text-slate-400" };
    }
};

export const TopbarSessionSelector: React.FC = () => {
    const { sessions, selectedSessionId, setSelectedSessionId, selectedSession, loading } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, [open]);

    const triggerLabel = loading
        ? "Loading sessions…"
        : selectedSession
            ? selectedSession.name
            : sessions.length === 0
                ? "No sessions"
                : "Select a session";

    const triggerBadge = selectedSession ? statusBadge(selectedSession.status) : null;

    return (
        <>
            {/* Backdrop blur — when the session menu is open, dim and blur
                the rest of the page so the user's eye is drawn to the
                selector. Click anywhere on the backdrop to dismiss. */}
            {open && (
                <div
                    aria-hidden="true"
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200"
                />
            )}
        <div ref={ref} className="relative z-50" data-testid="topbar-session-selector">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                disabled={loading || sessions.length === 0}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`group h-9 inline-flex items-center gap-2 px-3 rounded-lg text-xs font-semibold transition-colors
                    ${open
                        ? "bg-white/[0.12] text-white ring-2 ring-emerald-400/30"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white"}
                    border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                <CalendarDays size={14} className="text-emerald-400 shrink-0" />
                <span className="hidden sm:flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session</span>
                    <span className="text-slate-700">|</span>
                </span>
                <span className="max-w-[180px] truncate">{triggerLabel}</span>
                {triggerBadge && (
                    <span className={`hidden md:inline-flex w-1.5 h-1.5 rounded-full ${triggerBadge.dot} shrink-0`} />
                )}
                {loading
                    ? <Loader2 size={12} className="animate-spin text-slate-400 shrink-0" />
                    : <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />}
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label="Academic sessions"
                    className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 py-1.5 z-50 max-h-[60vh] overflow-y-auto"
                >
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic session</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Switching changes data on every page</p>
                    </div>
                    {sessions.length === 0 ? (
                        <div className="px-3 py-6 text-center">
                            <p className="text-xs text-slate-500">No sessions found.</p>
                        </div>
                    ) : (
                        sessions.map((s: SessionOption) => {
                            const active = s.id === selectedSessionId;
                            const badge = statusBadge(s.status);
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => { setSelectedSessionId(s.id); setOpen(false); }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                                        ${active ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs truncate ${active ? "font-bold text-emerald-700" : "font-semibold text-slate-800"}`}>{s.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {s.status === "ACTIVE" && <CheckCircle2 size={9} className="text-emerald-500" />}
                                            {s.status === "ENDING" && <Clock size={9} className="text-amber-500" />}
                                            <p className={`text-[10px] font-medium ${active ? "text-emerald-600" : badge.tone.replace("300", "500").replace("400", "500")}`}>
                                                {badge.label}
                                            </p>
                                        </div>
                                    </div>
                                    {active && <Check size={13} className="text-emerald-600 shrink-0" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
        </>
    );
};

export default TopbarSessionSelector;
