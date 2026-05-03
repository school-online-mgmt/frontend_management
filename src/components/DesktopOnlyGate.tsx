import { Monitor, Smartphone } from "lucide-react";

/**
 * Full-screen overlay shown only on screens narrower than the `md` breakpoint
 * (768px). The Management portal is desktop-only by product decision; this
 * gate prevents accidental use on phones / narrow tablets without trying to
 * cram the dense data layouts into a small viewport.
 *
 * Implementation note: the overlay renders inside Layout (above all content)
 * with `md:hidden`, so on desktop the rule is purely a no-op — no JS, no
 * resize listener, no flicker.
 */
const DesktopOnlyGate = () => (
    <div className="md:hidden fixed inset-0 z-[9999] bg-slate-900 text-white flex flex-col items-center justify-center px-6 text-center"
        style={{
            paddingTop: "calc(1.5rem + env(safe-area-inset-top))",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}>
        <div className="relative mb-6">
            <Monitor size={64} className="text-emerald-400" strokeWidth={1.4} />
            <Smartphone size={28} className="text-rose-400 absolute -bottom-2 -right-3 bg-slate-900 rounded p-1" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold mb-2">Desktop required</h1>
        <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
            The Management portal is built for desktop screens. Please open this URL
            on a laptop or desktop browser for the full experience.
        </p>
        <div className="mt-8 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-slate-400 max-w-xs">
            Looking for the student app?{" "}
            <a href="/" className="text-emerald-400 font-semibold hover:underline">
                Visit the student portal
            </a>
        </div>
    </div>
);

export default DesktopOnlyGate;
