import type { ReactNode } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Shared per-module header gradients. Each functional area picks a tonally-
 * distinct accent so an admin can tell at a glance which page they're on
 * without reading the title. Reference: `gradient={MODULE_THEMES.finance}`.
 */
export const MODULE_THEMES = {
    people:        "from-indigo-600 via-blue-600 to-violet-600",     // Students, Applicants, Staff, Teachers
    classes:       "from-indigo-600 via-violet-600 to-purple-600",   // Class & Section
    academics:     "from-blue-600 via-sky-600 to-cyan-600",          // Subjects, Courses
    attendance:    "from-emerald-600 via-teal-600 to-cyan-600",
    exam:          "from-sky-600 via-blue-600 to-indigo-600",
    performance:   "from-purple-600 via-violet-600 to-indigo-600",
    finance:       "from-emerald-600 via-green-600 to-teal-600",
    communication: "from-amber-500 via-orange-500 to-rose-500",
    transport:     "from-cyan-600 via-sky-600 to-blue-600",
    library:       "from-rose-600 via-pink-600 to-fuchsia-600",
    leave:         "from-slate-700 via-slate-800 to-slate-900",
    admin:         "from-violet-700 via-purple-700 to-fuchsia-700",
    assignment:    "from-rose-600 via-pink-600 to-fuchsia-600",
    sports:        "from-green-600 via-emerald-600 to-lime-600",
} as const;

interface PageHeaderProps {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle?: string;
    /** Refresh handler — every header should have one when there's data to refetch. */
    onRefresh?: () => void;
    refreshing?: boolean;
    /** The page's session selector — pages that aren't session-scoped omit this. */
    sessionGate?: ReactNode;
    /**
     * Primary action button(s) — e.g. "Create Class", "New Notice". Renders
     * to the left of the refresh button. Keep compact (one or two buttons).
     */
    primaryActions?: ReactNode;
    /**
     * Whether to show the back button on the left. Defaults to `true` for
     * pages that aren't a top-level navigation entry. Set false for true root
     * pages (Dashboard) where Back is meaningless.
     */
    showBack?: boolean;
    /**
     * Optional fallback path used when the user opened the page directly
     * (no history entry to pop). Defaults to "/".
     */
    backFallback?: string;
    /**
     * @deprecated Use `primaryActions`. Kept for callers still mid-migration.
     */
    actions?: ReactNode;
    gradient?: string;
}

/**
 * Unified page header for the management portal.
 *
 * Layout (left → right):
 *   [back] [icon + title]   [session gate]   [primary actions]   [refresh]
 *
 * On small screens this stacks: title row first, then session + actions on
 * the second row. The header height is consistent across all pages.
 */
const PageHeader = ({
    icon: Icon,
    title,
    subtitle,
    onRefresh,
    refreshing,
    sessionGate,
    primaryActions,
    actions,
    showBack = true,
    backFallback = "/",
    gradient = MODULE_THEMES.academics,
}: PageHeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Use the location key heuristic to decide whether the user has history
    // to pop. React Router gives every entry a key after the first; "default"
    // means we're at the very first entry (or arrived directly).
    const canGoBack = location.key !== "default";

    const handleBack = () => {
        if (canGoBack) navigate(-1);
        else navigate(backFallback);
    };

    return (
        <header className={`shrink-0 bg-gradient-to-r ${gradient} text-white p-3 shadow-md`}>
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                {/* Back + title block */}
                <div className="flex items-center gap-2 min-w-0 sm:flex-1">
                    {showBack && (
                        <button data-testid="page-header-back-btn"
                            type="button"
                            onClick={handleBack}
                            aria-label="Go back"
                            title="Back"
                            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm text-white transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        >
                            <ArrowLeft size={15} />
                        </button>
                    )}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 shrink-0">
                        <Icon size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white leading-tight truncate">{title}</h1>
                        {subtitle && <p className="text-white/70 text-[10px] sm:text-xs mt-0.5 truncate">{subtitle}</p>}
                    </div>
                </div>

                {sessionGate && (
                    <div className="w-full sm:w-auto sm:min-w-[220px] sm:max-w-[300px]">
                        {sessionGate}
                    </div>
                )}

                {(primaryActions || actions || onRefresh) && (
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 sm:ml-auto">
                        {primaryActions ?? actions}
                        {onRefresh && (
                            <button data-testid="page-header-refresh-btn"
                                type="button"
                                onClick={onRefresh}
                                disabled={refreshing}
                                aria-label="Refresh page data"
                                title="Refresh"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-sm text-white transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            >
                                <RefreshCcw size={15} className={refreshing ? "animate-spin" : ""} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default PageHeader;
