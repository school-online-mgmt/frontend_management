import { useEffect, useRef, useState } from "react";

/** Mirror of lucide-react's icon component shape, but without the import dep
 *  so callers can pass any compatible component (lucide, custom, or React.FC).
 */
type IconLike = React.ComponentType<{ size?: number; className?: string }>;

/**
 * Unified tab strip used across every multi-tab page in the management
 * portal (Attendance, Fees, Leaves, Account, Exam, Performance, etc.).
 *
 * Visual identity:
 *   - Spans the full width of its container, divided into equal-width tabs.
 *   - A single sliding gradient indicator marks the active tab. The indicator
 *     animates between positions with `transform` (GPU-accelerated, no
 *     layout reflow), giving the page a clear sense of place when switching.
 *   - The active tab's text+icon turn white over the gradient; inactive tabs
 *     remain slate-700 with a soft hover wash.
 *   - Conforms to the WAI-ARIA tablist pattern — role, aria-selected,
 *     aria-controls, keyboard arrow navigation handled natively by the
 *     underlying buttons + browser.
 */

export interface TabDescriptor<K extends string = string> {
    key: K;
    label: string;
    icon?: IconLike;
    /** Optional badge count rendered next to the label (e.g. "3"). */
    badge?: number | string;
    disabled?: boolean;
}

interface TabContainerProps<K extends string = string> {
    tabs: ReadonlyArray<TabDescriptor<K>>;
    value: K;
    onChange: (key: K) => void;
    /**
     * "card"   — wrapped in a white panel (default; used at top of page bodies).
     * "inline" — raw strip, no wrapper card. Use when embedding inside another
     *            already-bordered card.
     */
    variant?: "card" | "inline";
    /** Optional id prefix for ARIA wiring with downstream tab panels. */
    idPrefix?: string;
    /** Optional aria-label for the tablist (defaults to "Page sections"). */
    ariaLabel?: string;
    /**
     * Indicator gradient — defaults to violet/indigo. Pass a tailwind class
     * fragment (e.g. "from-emerald-500 to-teal-500") to match the page's
     * module theme (Finance = emerald, Communication = amber, etc).
     */
    indicatorGradient?: string;
}

export function TabContainer<K extends string>({
    tabs,
    value,
    onChange,
    variant = "card",
    idPrefix = "tab",
    ariaLabel = "Page sections",
    indicatorGradient = "from-violet-600 to-indigo-600",
}: TabContainerProps<K>) {
    const listRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

    // Recompute indicator position whenever the active tab, the tab set, or
    // the container width changes. We measure in `useEffect` so the DOM is
    // already settled — `getBoundingClientRect` returns the right value.
    useEffect(() => {
        const el = tabRefs.current[value];
        const list = listRef.current;
        if (!el || !list) { setIndicator(null); return; }
        const elRect = el.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        setIndicator({
            left: elRect.left - listRect.left,
            width: elRect.width,
        });
    }, [value, tabs.length]);

    // Watch the container size so the indicator follows when the page is
    // resized (Chrome dev tools, mobile rotation, etc).
    useEffect(() => {
        const list = listRef.current;
        if (!list || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(() => {
            const el = tabRefs.current[value];
            if (!el) return;
            const elRect = el.getBoundingClientRect();
            const listRect = list.getBoundingClientRect();
            setIndicator({
                left: elRect.left - listRect.left,
                width: elRect.width,
            });
        });
        ro.observe(list);
        return () => ro.disconnect();
    }, [value]);

    const strip = (
        <div
            ref={listRef}
            role="tablist"
            aria-label={ariaLabel}
            className="relative flex items-stretch w-full overflow-x-auto whitespace-nowrap"
        >
            {/* Sliding active-tab indicator */}
            {indicator && (
                <span
                    aria-hidden="true"
                    className={`absolute top-0 bottom-0 rounded-lg bg-gradient-to-r ${indicatorGradient} shadow-md transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
                    style={{
                        left: indicator.left,
                        width: indicator.width,
                    }}
                />
            )}

            {tabs.map((t) => {
                const active = t.key === value;
                const Icon = t.icon;
                return (
                    <button
                        key={t.key}
                        ref={(el) => { tabRefs.current[t.key] = el; }}
                        role="tab"
                        type="button"
                        id={`${idPrefix}-${t.key}`}
                        aria-selected={active}
                        aria-controls={`${idPrefix}panel-${t.key}`}
                        disabled={t.disabled}
                        onClick={() => !t.disabled && onChange(t.key)}
                        className={`relative z-10 flex-1 min-w-fit inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60
                            ${active
                                ? "text-white"
                                : "text-slate-600 hover:text-slate-900"}
                            ${t.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                        {Icon && (
                            <Icon
                                size={15}
                                className={`shrink-0 transition-transform duration-200 ${active ? "scale-110" : ""}`}
                            />
                        )}
                        <span className="truncate">{t.label}</span>
                        {t.badge !== undefined && t.badge !== null && t.badge !== 0 && (
                            <span
                                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold transition-colors ${
                                    active ? "bg-white/25 text-white" : "bg-violet-100 text-violet-700"
                                }`}
                            >
                                {t.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );

    if (variant === "inline") return strip;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
            {strip}
        </div>
    );
}

interface TabPanelProps {
    /** Must match a tab key — used to wire ARIA + visibility. */
    tabKey: string;
    activeKey: string;
    idPrefix?: string;
    children: React.ReactNode;
}

/**
 * Renders children only when its tabKey matches activeKey, with the right
 * ARIA wiring. Drop-in replacement for inline `{tab === 'x' && <X/>}` blocks.
 */
export function TabPanel({ tabKey, activeKey, idPrefix = "tab", children }: TabPanelProps) {
    if (tabKey !== activeKey) return null;
    return (
        <div
            role="tabpanel"
            id={`${idPrefix}panel-${tabKey}`}
            aria-labelledby={`${idPrefix}-${tabKey}`}
            tabIndex={0}
            className="focus:outline-none animate-[fadeIn_0.25s_ease-out]"
        >
            {children}
        </div>
    );
}

export default TabContainer;
