import { ExternalLink } from "lucide-react";

/**
 * Consistent page footer used across all management pages.
 *
 * Renders the school name (when available) on the left and a "Powered by
 * EduPilots" tagline on the right. Designed to sit at the bottom of every
 * page's main scroll container — minimal height (28px), neutral colors,
 * doesn't compete with primary content.
 *
 * The school context is read from a global `__schoolName` set by the layout
 * (or AuthProvider) when the tenant config loads. Kept loose to avoid
 * wiring a context just for the footer.
 */

declare global {
    interface Window {
        __schoolName?: string;
    }
}

interface PageFooterProps {
    /** Optional override for the left-side label (defaults to school name from window). */
    schoolName?: string;
}

const PageFooter = ({ schoolName }: PageFooterProps) => {
    const left =
        schoolName ??
        (typeof window !== "undefined" ? window.__schoolName : undefined) ??
        "EduPilots School";
    const year = new Date().getFullYear();

    return (
        <footer className="shrink-0 mt-auto border-t border-slate-200 bg-white px-4 sm:px-6 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3 text-[11px] text-slate-500">
                <p className="truncate">
                    © {year} <span className="font-semibold text-slate-700">{left}</span>. All rights reserved.
                </p>
                <a
                    href="https://edupilots.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-violet-600 transition-colors"
                >
                    Powered by <span className="font-semibold">EduPilots</span>
                    <ExternalLink size={10} />
                </a>
            </div>
        </footer>
    );
};

export default PageFooter;
