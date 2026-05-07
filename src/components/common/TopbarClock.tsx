import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Topbar IST clock. Shows the current Asia/Kolkata date + time and ticks
 * every second. Designed to fit in the same row as the session selector
 * and profile dropdown — narrow on mobile (just the time), expanded on
 * larger screens to include the date.
 *
 * Implementation note: we tick every second but the *date* part only
 * changes once per day, so the user never sees a flicker. Using
 * `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"` lets us render
 * IST regardless of what the browser's local zone is.
 */

const ISTDateFmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
});
const ISTTimeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
});

export const TopbarClock: React.FC = () => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        // Align the first tick to the next whole second so the seconds
        // display advances cleanly. After that, fire every 1000ms.
        const ms = 1000 - (Date.now() % 1000);
        let interval: number | null = null;
        const initial = window.setTimeout(() => {
            setNow(new Date());
            interval = window.setInterval(() => setNow(new Date()), 1000);
        }, ms);
        return () => {
            window.clearTimeout(initial);
            if (interval !== null) window.clearInterval(interval);
        };
    }, []);

    const date = ISTDateFmt.format(now);
    const time = ISTTimeFmt.format(now);

    return (
        <div
            title={`${date} · ${time} IST`}
            className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200"
        >
            <Clock size={13} className="text-emerald-400 shrink-0" />
            <div className="flex items-center gap-1.5 leading-none tabular-nums">
                <span className="text-[10px] font-semibold text-slate-400">{date}</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-bold text-white">{time}</span>
                <span className="text-[9px] font-bold text-emerald-400/80 tracking-wider">IST</span>
            </div>
        </div>
    );
};

export default TopbarClock;
