import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Persists the active tab key in the URL via `?tab=…`.
 *
 * Why it matters:
 *   - Browser Back/Forward navigates between tabs without losing the page.
 *   - Reload preserves the active tab.
 *   - Deep-links to a specific tab work (Slack, email, bookmarks).
 *   - Combining with PageHeader's Back button keeps the user's exact tab on
 *     return (e.g. Fees → Invoice detail → Back lands on the Invoices tab).
 *
 * Usage:
 *   const [tab, setTab] = useTabState("attendance", "mark");
 *
 * The first arg is a unique URL param name (allows two tab strips on the
 * same page if ever needed), the second is the default key when no `?tab=`
 * is present.
 */
export function useTabState<K extends string>(paramName: string, defaultTab: K): [K, (next: K) => void] {
    const [search, setSearch] = useSearchParams();
    const current = (search.get(paramName) as K) || defaultTab;

    const setTab = useCallback(
        (next: K) => {
            // No-op if user re-clicks the same tab (avoids a wasted history entry).
            if (next === current) return;
            const params = new URLSearchParams(search);
            if (next === defaultTab) {
                params.delete(paramName);
            } else {
                params.set(paramName, next);
            }
            // Push (not replace): each tab change adds a history entry so the
            // browser Back button + the in-page header Back button walk back
            // through the user's actual tab journey before leaving the page.
            // The "no-op on same tab" guard above prevents bloat from
            // double-clicks or programmatic re-sets to the current tab.
            setSearch(params);
        },
        [search, setSearch, paramName, defaultTab, current],
    );

    return [current, setTab];
}

export default useTabState;
