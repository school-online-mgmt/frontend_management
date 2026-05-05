/**
 * Accessible toggle switch with three sizes (sm / md / lg).
 *
 * Uses an inline-flex + symmetric padding pattern so the thumb travels exactly
 * `track-width − thumb-width − 2*padding` pixels — no off-by-one math, no
 * thumb extending past the right edge regardless of tailwind's translate
 * scale. This was a real bug in the previous absolute-positioned toggle.
 *
 * Conforms to the WAI-ARIA Switch pattern: role="switch" + aria-checked +
 * keyboard space/enter to toggle (via native button behavior).
 */
import { Loader2 } from "lucide-react";

type Size = "sm" | "md" | "lg";

interface SizeStyles { track: string; thumb: string; translate: string; spinner: number }

/**
 * Math invariant for each size:
 *   inner = track - 2*padding  (padding is p-0.5 = 2px on every side)
 *   travel = inner - thumb     (translate amount when ON)
 *
 * sm: 24 - 4 = 20  →  thumb  8  →  travel 12 = translate-x-3
 * md: 28 - 4 = 24  →  thumb 12  →  travel 12 = translate-x-3
 * lg: 36 - 4 = 32  →  thumb 16  →  travel 16 = translate-x-4
 */
const SIZES: Record<Size, SizeStyles> = {
    sm: { track: "h-3 w-6", thumb: "h-2 w-2", translate: "translate-x-3", spinner:  6 },
    md: { track: "h-4 w-7", thumb: "h-3 w-3", translate: "translate-x-3", spinner:  8 },
    lg: { track: "h-5 w-9", thumb: "h-4 w-4", translate: "translate-x-4", spinner: 10 },
};

export interface SwitchProps {
    checked: boolean;
    onChange?: (next: boolean) => void;
    disabled?: boolean;
    loading?: boolean;
    size?: Size;
    /** Accessible label. Provide either this OR ariaLabelledBy. */
    ariaLabel?: string;
    ariaLabelledBy?: string;
    testId?: string;
    /** Tone variants — violet (default), emerald (positive), rose (destructive). */
    tone?: "violet" | "emerald" | "rose";
}

const TONE: Record<NonNullable<SwitchProps["tone"]>, string> = {
    violet:  "bg-violet-600 hover:bg-violet-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    rose:    "bg-rose-600 hover:bg-rose-700",
};

export default function Switch({
    checked, onChange, disabled, loading, size = "md",
    ariaLabel, ariaLabelledBy, testId, tone = "violet",
}: SwitchProps) {
    const s = SIZES[size];
    const interactive = !disabled && !loading;
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            data-testid={testId}
            data-checked={checked ? "true" : "false"}
            disabled={!interactive}
            onClick={() => interactive && onChange?.(!checked)}
            className={`relative inline-flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0
                focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2
                ${s.track}
                ${interactive ? "cursor-pointer" : "cursor-not-allowed"}
                ${disabled && !loading ? "opacity-50" : ""}
                ${checked ? TONE[tone] : "bg-slate-300 hover:bg-slate-400"}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-flex items-center justify-center bg-white rounded-full shadow-sm
                    transition-transform duration-200 ease-out
                    ${s.thumb}
                    ${checked ? s.translate : "translate-x-0"}`}
            >
                {loading && (
                    <Loader2 size={s.spinner} className="animate-spin text-violet-500" />
                )}
            </span>
        </button>
    );
}
