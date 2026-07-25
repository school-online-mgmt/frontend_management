import { Lock } from "lucide-react";
import { useSession } from "../context/SessionContext";

/**
 * When the session selected in the topbar dropdown has been finalised (ENDED),
 * that year is read-only: management may view everything but only settle
 * outstanding fees (pay / waive). The backend enforces this (403 SESSION_ENDED
 * on any other write); this banner tells the office why an action might be
 * refused and nudges them to switch to the current session.
 */
export default function EndedSessionBanner() {
    const { selectedSession } = useSession();
    if (selectedSession?.status !== "ENDED") return null;

    return (
        <div
            data-testid="ended-session-banner"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-100 text-xs font-medium"
        >
            <Lock size={13} className="shrink-0 text-amber-300" />
            <span>
                <strong>{selectedSession.name ?? "This session"}</strong> is finalised and read-only.
                You can still view everything and settle outstanding fees, but records for this year
                can no longer be changed. Switch to the current session to make edits.
            </span>
        </div>
    );
}
