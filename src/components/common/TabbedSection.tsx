import React, { useEffect, useRef, useState, Children, isValidElement } from "react";

/**
 * TabbedSection — production-grade tabbed view container.
 *
 * Renders the tab strip and the active panel inside a SINGLE bordered card
 * with a unified shadow, so the whole thing reads as one section instead
 * of "row of buttons + floating panel below". The active tab visually
 * merges into the panel via a coloured top accent and a borderless bottom
 * edge, matching the look-and-feel of native OS / IDE tabs.
 *
 * Two render modes are supported:
 *   1) Children-based — wrap each panel in <TabPanel tabKey="x"> ... </TabPanel>.
 *      Easiest migration path from the old `<TabContainer />` + raw `tab === "x" && <X/>`.
 *   2) Render-prop — pass `renderPanel={(key) => ReactNode}`. Simpler for
 *      pages that already keep their tab content in a map.
 *
 * The component computes the active tab's left/width and animates a
 * sliding gradient indicator across the top strip — same trick as the
 * legacy TabContainer, just embedded inside the card.
 */

type IconLike = React.ComponentType<{ size?: number; className?: string }>;

export interface TabDescriptor<K extends string = string> {
    key: K;
    label: string;
    icon?: IconLike;
    badge?: number | string;
    disabled?: boolean;
}

export type ThemeKey =
    | "violet" | "indigo" | "emerald" | "amber" | "rose" | "blue"
    | "cyan" | "sky" | "teal" | "orange" | "fuchsia" | "slate";

const THEME_MAP: Record<ThemeKey, {
    /** active tab pill gradient */
    pill: string;
    /** soft top-strip wash behind tabs */
    strip: string;
    /** thin coloured rail on top of card when section has focus */
    rail: string;
    /** ring shown around the card when any tab is active */
    ring: string;
    /** panel left-rail accent + active tab text colour */
    accent: string;
    /** badge background for inactive tabs */
    badgeBg: string;
    /** badge text for inactive tabs */
    badgeText: string;
}> = {
    violet:  { pill: "from-violet-600 to-indigo-600",   strip: "from-violet-50/60 to-indigo-50/40",  rail: "from-violet-500 via-indigo-500 to-purple-500", ring: "ring-violet-100",   accent: "text-violet-700",   badgeBg: "bg-violet-100",   badgeText: "text-violet-700" },
    indigo:  { pill: "from-indigo-600 to-blue-600",     strip: "from-indigo-50/60 to-blue-50/40",    rail: "from-indigo-500 via-blue-500 to-sky-500",      ring: "ring-indigo-100",   accent: "text-indigo-700",   badgeBg: "bg-indigo-100",   badgeText: "text-indigo-700" },
    emerald: { pill: "from-emerald-600 to-teal-600",    strip: "from-emerald-50/60 to-teal-50/40",   rail: "from-emerald-500 via-teal-500 to-cyan-500",    ring: "ring-emerald-100",  accent: "text-emerald-700",  badgeBg: "bg-emerald-100",  badgeText: "text-emerald-700" },
    amber:   { pill: "from-amber-500 to-orange-600",    strip: "from-amber-50/60 to-orange-50/40",   rail: "from-amber-500 via-orange-500 to-rose-400",    ring: "ring-amber-100",    accent: "text-amber-700",    badgeBg: "bg-amber-100",    badgeText: "text-amber-700" },
    rose:    { pill: "from-rose-500 to-pink-600",       strip: "from-rose-50/60 to-pink-50/40",      rail: "from-rose-500 via-pink-500 to-fuchsia-500",    ring: "ring-rose-100",     accent: "text-rose-700",     badgeBg: "bg-rose-100",     badgeText: "text-rose-700" },
    blue:    { pill: "from-blue-600 to-cyan-600",       strip: "from-blue-50/60 to-cyan-50/40",      rail: "from-blue-500 via-cyan-500 to-teal-500",       ring: "ring-blue-100",     accent: "text-blue-700",     badgeBg: "bg-blue-100",     badgeText: "text-blue-700" },
    cyan:    { pill: "from-cyan-500 to-teal-500",       strip: "from-cyan-50/60 to-teal-50/40",      rail: "from-cyan-500 via-teal-500 to-emerald-500",    ring: "ring-cyan-100",     accent: "text-cyan-700",     badgeBg: "bg-cyan-100",     badgeText: "text-cyan-700" },
    sky:     { pill: "from-sky-500 to-blue-600",        strip: "from-sky-50/60 to-blue-50/40",       rail: "from-sky-500 via-blue-500 to-indigo-500",      ring: "ring-sky-100",      accent: "text-sky-700",      badgeBg: "bg-sky-100",      badgeText: "text-sky-700" },
    teal:    { pill: "from-teal-600 to-emerald-600",    strip: "from-teal-50/60 to-emerald-50/40",   rail: "from-teal-500 via-emerald-500 to-green-500",   ring: "ring-teal-100",     accent: "text-teal-700",     badgeBg: "bg-teal-100",     badgeText: "text-teal-700" },
    orange:  { pill: "from-orange-500 to-red-500",      strip: "from-orange-50/60 to-red-50/40",     rail: "from-orange-500 via-red-500 to-rose-500",      ring: "ring-orange-100",   accent: "text-orange-700",   badgeBg: "bg-orange-100",   badgeText: "text-orange-700" },
    fuchsia: { pill: "from-fuchsia-600 to-pink-600",    strip: "from-fuchsia-50/60 to-pink-50/40",   rail: "from-fuchsia-500 via-pink-500 to-rose-500",    ring: "ring-fuchsia-100",  accent: "text-fuchsia-700",  badgeBg: "bg-fuchsia-100",  badgeText: "text-fuchsia-700" },
    slate:   { pill: "from-slate-700 to-slate-900",     strip: "from-slate-50/60 to-slate-100/40",   rail: "from-slate-500 via-slate-700 to-slate-900",    ring: "ring-slate-200",    accent: "text-slate-700",    badgeBg: "bg-slate-100",    badgeText: "text-slate-700" },
};

export interface TabbedSectionProps<K extends string = string> {
    tabs: ReadonlyArray<TabDescriptor<K>>;
    value: K;
    onChange: (key: K) => void;
    /** Module accent colour. Picks the matching tab pill / strip / rail. */
    theme?: ThemeKey;
    /** Optional id prefix for ARIA wiring. */
    idPrefix?: string;
    /** Aria label on the tablist. */
    ariaLabel?: string;
    /** Optional title rendered to the left of the tabs (e.g. "Overview"). */
    title?: string;
    /** Optional element rendered to the right of the tabs (e.g. action button). */
    trailing?: React.ReactNode;
    /**
     * Render-prop alternative to passing <TabPanel> children. Receives the
     * active tab key and returns the panel node.
     */
    renderPanel?: (key: K) => React.ReactNode;
    /** Tighter inner padding on the panel (used inside dense pages). */
    densePanel?: boolean;
    /** Removes the panel padding entirely (when the panel is its own grid). */
    flushPanel?: boolean;
    children?: React.ReactNode;
    /** Extra classes on the outer card */
    className?: string;
}

/**
 * Wrap each panel inside one of these. The component matches `tabKey`
 * against the parent TabbedSection's `value` and renders only when active.
 */
export interface TabPanelProps {
    tabKey: string;
    children: React.ReactNode;
}
export const TabPanel: React.FC<TabPanelProps> = ({ children }) => <>{children}</>;
TabPanel.displayName = "TabPanel";

export function TabbedSection<K extends string>({
    tabs,
    value,
    onChange,
    theme = "violet",
    idPrefix = "tab",
    ariaLabel = "Page sections",
    title,
    trailing,
    renderPanel,
    densePanel = false,
    flushPanel = false,
    children,
    className = "",
}: TabbedSectionProps<K>) {
    const t = THEME_MAP[theme];
    const listRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
    const [enterKey, setEnterKey] = useState(value);

    // Bump the panel mount key on tab change so React replays the entrance
    // animation. We set it inside `useEffect` (not directly in the click
    // handler) so any external `value` change drives the same effect —
    // useful when tabs are URL-driven and update from <Link> elsewhere.
    useEffect(() => { setEnterKey(value); }, [value]);

    useEffect(() => {
        const el = tabRefs.current[value];
        const list = listRef.current;
        if (!el || !list) { setIndicator(null); return; }
        const elRect = el.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        setIndicator({ left: elRect.left - listRect.left, width: elRect.width });
    }, [value, tabs.length]);

    useEffect(() => {
        const list = listRef.current;
        if (!list || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(() => {
            const el = tabRefs.current[value];
            if (!el || !list) return;
            const elRect = el.getBoundingClientRect();
            const listRect = list.getBoundingClientRect();
            setIndicator({ left: elRect.left - listRect.left, width: elRect.width });
        });
        ro.observe(list);
        return () => ro.disconnect();
    }, [value]);

    // Keyboard navigation — left/right arrow + home/end across the tab
    // list. We let focus stay on whatever element the user tabs into,
    // and treat arrow keys as moving the active selection (auto-activated).
    const onTabsKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        const idx = tabs.findIndex(x => x.key === value);
        if (idx === -1) return;
        const enabled = (i: number) => !tabs[i]?.disabled;
        const move = (next: number) => {
            let n = next;
            const N = tabs.length;
            for (let i = 0; i < N; i++) {
                const probe = ((n % N) + N) % N;
                if (enabled(probe)) { onChange(tabs[probe].key); tabRefs.current[tabs[probe].key]?.focus(); return; }
                n = next > idx ? n + 1 : n - 1;
            }
        };
        if (e.key === "ArrowRight") { e.preventDefault(); move(idx + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); move(idx - 1); }
        else if (e.key === "Home") { e.preventDefault(); move(0); }
        else if (e.key === "End") { e.preventDefault(); move(tabs.length - 1); }
    };

    // Resolve the active panel content. Children take precedence: scan
    // for a <TabPanel tabKey={value}>. Falls back to renderPanel.
    let activePanel: React.ReactNode = null;
    if (children) {
        Children.forEach(children, (c) => {
            if (!isValidElement(c)) return;
            const props = c.props as { tabKey?: string };
            if (props && props.tabKey === value) activePanel = c;
        });
    }
    if (activePanel === null && renderPanel) activePanel = renderPanel(value);

    const panelPadding = flushPanel ? "" : densePanel ? "p-3 sm:p-4" : "p-4 sm:p-5 md:p-6";

    return (
        <section
            className={`bg-white border-y border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.06)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_12px_32px_-12px_rgba(15,23,42,0.08)] transition-shadow duration-300 overflow-hidden ${className}`}
            aria-label={ariaLabel}
        >
            {/* Top accent rail — picks up the theme so the whole card reads
                as part of the active module. Edge-to-edge so the colour
                visually anchors the entire page width. */}
            <div className={`h-[3px] bg-gradient-to-r ${t.rail}`} />

            {/* Tab strip header */}
            <div className={`relative flex items-center gap-3 px-2.5 sm:px-3 pt-2.5 pb-0 bg-gradient-to-b ${t.strip} border-b border-slate-200/80`}>
                {title && (
                    <div className="hidden md:flex items-center gap-2 pl-2 pr-3 mr-1 border-r border-slate-200/80 self-stretch py-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
                    </div>
                )}

                <div
                    ref={listRef}
                    role="tablist"
                    aria-label={ariaLabel}
                    onKeyDown={onTabsKeyDown}
                    className="relative flex items-end flex-1 min-w-0 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {/* Sliding pill — sits BEHIND the tab buttons.
                        We give the active tab a tinted background + bottom
                        border that masks the strip's own bottom border, so
                        the active tab visually "merges" into the panel. */}
                    {indicator && (
                        <span
                            aria-hidden="true"
                            className="absolute bottom-0 h-[calc(100%-4px)] rounded-t-lg bg-white shadow-[0_-2px_8px_-2px_rgba(15,23,42,0.08)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-t border-l border-r border-slate-200/80"
                            style={{ left: indicator.left, width: indicator.width }}
                        />
                    )}
                    {/* Coloured top stripe on the active tab */}
                    {indicator && (
                        <span
                            aria-hidden="true"
                            className={`absolute top-0 h-[2px] rounded-b-full bg-gradient-to-r ${t.pill} transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
                            style={{ left: indicator.left + 8, width: Math.max(0, indicator.width - 16) }}
                        />
                    )}

                    {tabs.map((tab) => {
                        const active = tab.key === value;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                ref={(el) => { tabRefs.current[tab.key] = el; }}
                                role="tab"
                                type="button"
                                id={`${idPrefix}-${tab.key}`}
                                aria-selected={active}
                                aria-controls={`${idPrefix}panel-${tab.key}`}
                                tabIndex={active ? 0 : -1}
                                disabled={tab.disabled}
                                onClick={() => !tab.disabled && onChange(tab.key)}
                                className={`relative z-10 inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 md:px-5 pt-2.5 pb-2.5 rounded-t-lg text-xs sm:text-[13px] font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-violet-400/60
                                    ${active
                                        ? `${t.accent}`
                                        : "text-slate-500 hover:text-slate-800 hover:bg-white/60"}
                                    ${tab.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                                {Icon && (
                                    <Icon
                                        size={14}
                                        className={`shrink-0 transition-transform duration-200 ${active ? "scale-110" : ""}`}
                                    />
                                )}
                                <span className="truncate">{tab.label}</span>
                                {tab.badge !== undefined && tab.badge !== null && tab.badge !== 0 && (
                                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold transition-colors ${
                                        active ? `bg-gradient-to-r ${t.pill} text-white shadow-sm` : `${t.badgeBg} ${t.badgeText}`
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {trailing && (
                    <div className="hidden lg:flex items-center gap-2 pl-3 self-stretch py-1.5 ml-auto shrink-0">
                        {trailing}
                    </div>
                )}
            </div>

            {/* Panel — keyed on `value` so a tab change replays the entrance
                animation. We use a CSS class with a custom keyframe defined
                in index.css so this works everywhere without framer-motion. */}
            <div
                role="tabpanel"
                id={`${idPrefix}panel-${value}`}
                aria-labelledby={`${idPrefix}-${value}`}
                tabIndex={0}
                key={enterKey}
                className={`focus:outline-none animate-tabFadeIn ${panelPadding}`}
            >
                {activePanel}
            </div>
        </section>
    );
}

export default TabbedSection;
