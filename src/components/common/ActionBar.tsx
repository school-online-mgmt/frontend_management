import type { ReactNode } from "react";

/**
 * Consistent action-button row that lives below the page header and above
 * the tab container. Replaces the ad-hoc collections of buttons that used
 * to ride along in <PageHeader actions=...>. The page header is now reserved
 * for title + session filter + refresh; everything functional sits here.
 *
 * Layout: `leading` group on the left (e.g. summary stats), `trailing` on
 * the right (primary CTAs). Either side can be omitted. On mobile the two
 * groups stack with the trailing group sliding under the leading.
 */

interface ActionBarProps {
    leading?: ReactNode;
    children?: ReactNode;
    trailing?: ReactNode;
}

const ActionBar = ({ leading, children, trailing }: ActionBarProps) => {
    if (!leading && !trailing && !children) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {leading && <div className="flex items-center gap-2 flex-wrap">{leading}</div>}
            {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
            {trailing && <div className="flex items-center gap-2 flex-wrap sm:ml-auto">{trailing}</div>}
        </div>
    );
};

export default ActionBar;
