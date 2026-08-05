import { useEffect, useState } from 'react';
import {
    AlertTriangle, Save, Clock, Percent, Info, IndianRupee, Zap, ExternalLink,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';

interface Props {
    structureId: string;
    initial: {
        lateFeeEnabled?: boolean;
        lateFeeGraceDays?: number;
        lateFeeFlatAmount?: number;
        lateFeePercent?: number;
        lateFeeMaxAmount?: number;
        /** Legacy compound flag — kept for schema back-compat but no longer used by the sweep. */
        lateFeeCompound?: boolean;
    };
    onSaved?: () => void;
}

/**
 * Late-fee rules for a fee structure.
 *
 * Model (must match the backend `overdueLateFeeSweepJob` + `InvoiceService`):
 *
 *   • Runs monthly on the 2nd at 03:00 IST (also management-triggerable
 *     from the Scheduled Jobs page).
 *   • For every unpaid MONTHLY / ANNUAL / ADMISSION / EXTRA_CHARGE parent
 *     invoice that is past `dueDate + graceDays`, one LATE_FEE invoice is
 *     issued **per delinquent calendar month**, capped at 12 months per
 *     parent.
 *   • Amount per LATE_FEE = min(cap, flat + percent% × parent.total).
 *   • Catch-up safe: a partial unique index enforces one LATE_FEE per
 *     (parent, YYYY-MM) so re-running after months of missed cron ticks
 *     backfills every missing month without duplicating.
 *
 * Example: parent invoice due 2026-03-15 (grace 0) is still unpaid on
 * 2026-08-05. Next sweep issues four LATE_FEE invoices — one each for the
 * delinquent months of April, May, June, and July — regardless of whether
 * the previous sweeps ran.
 *
 * A cumulative preview at the bottom shows how the fee compounds over
 * three delinquent months so operators can gut-check the config.
 */
const LateFeeConfigCard = ({ structureId, initial, onSaved }: Props) => {
    const { addToast } = useToast();
    const [form, setForm] = useState({
        enabled:    initial.lateFeeEnabled    ?? false,
        graceDays:  initial.lateFeeGraceDays  ?? 5,
        flatAmount: initial.lateFeeFlatAmount ?? 100,
        percent:    initial.lateFeePercent    ?? 0,
        maxAmount:  initial.lateFeeMaxAmount  ?? 500,
    });
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    // Preview stays collapsed by default so the form stays compact — most
    // ops don't need to see the projection unless they're tweaking values.
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        setForm({
            enabled:    initial.lateFeeEnabled    ?? false,
            graceDays:  initial.lateFeeGraceDays  ?? 5,
            flatAmount: initial.lateFeeFlatAmount ?? 100,
            percent:    initial.lateFeePercent    ?? 0,
            maxAmount:  initial.lateFeeMaxAmount  ?? 500,
        });
        setDirty(false);
    }, [structureId,
        initial.lateFeeEnabled, initial.lateFeeGraceDays, initial.lateFeeFlatAmount,
        initial.lateFeePercent, initial.lateFeeMaxAmount]);

    const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
        setForm(f => ({ ...f, [key]: value }));
        setDirty(true);
    };

    // Per-month charge on a ₹5,000 monthly invoice.
    const SAMPLE_TOTAL = 5000;
    const perMonthCharge = (() => {
        let c = form.flatAmount + Math.round(form.percent * SAMPLE_TOTAL / 100);
        if (form.maxAmount > 0) c = Math.min(c, form.maxAmount);
        return Math.max(0, c);
    })();

    const save = async () => {
        setSaving(true);
        try {
            await api.updateFeeStructure(structureId, {
                lateFeeEnabled:    form.enabled,
                lateFeeGraceDays:  form.graceDays,
                lateFeeFlatAmount: form.flatAmount,
                lateFeePercent:    form.percent,
                lateFeeMaxAmount:  form.maxAmount,
                // `lateFeeCompound` is legacy and no longer read by the sweep;
                // we keep the field in the DB row but stop touching it from here.
            });
            addToast('Late fee rules saved', 'success');
            setDirty(false);
            onSaved?.();
        } catch (err: any) {
            addToast(err?.response?.data?.message || 'Failed to save late fee rules', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
            {/* ── Header + master toggle ── */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form.enabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Late Fees</h3>
                        <p className="text-xs text-slate-500">
                            Applied automatically once a month by the overdue sweep. See
                            {' '}<Link to="/admin/jobs" className="text-amber-700 hover:underline inline-flex items-center gap-0.5">Scheduled Jobs<ExternalLink size={9} /></Link>{' '}
                            to trigger manually or view history.
                        </p>
                    </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                    <input data-testid="late-fee-config-card-update-checkbox" type="checkbox" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-amber-500 relative transition-colors">
                        <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${form.enabled ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{form.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
            </div>

            {form.enabled && (
                <>
                    {/* ── How it works ── */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex gap-2">
                            <Info size={13} className="text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-blue-900 leading-relaxed">
                                <p className="font-semibold text-blue-900 mb-0.5">How it works</p>
                                <p>
                                    One late fee is charged <strong>per delinquent month</strong> per overdue invoice. If an
                                    invoice due <strong>March 15</strong> is still unpaid on <strong>July 5</strong>, the sweep
                                    issues four late-fee invoices — one each for April, May, June, and July — even if it hasn't
                                    run in months. Capped at <strong>12 months</strong> per parent invoice.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Field grid ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Field icon={<Clock size={14} className="text-slate-400" />} label="Grace period"
                            help="Days after due date before an invoice becomes late-fee eligible.">
                            <div className="relative">
                                <input data-testid="late-fee-config-card-update-input" type="number" min={0} max={90} value={form.graceDays}
                                    onChange={(e) => update('graceDays', Number(e.target.value))}
                                    className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">days</span>
                            </div>
                        </Field>
                        <Field icon={<IndianRupee size={12} className="text-slate-400" />} label="Flat fee (per month)"
                            help="Base rupee amount charged per delinquent month.">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                <input data-testid="late-fee-config-card-update-input-2" type="number" min={0} value={form.flatAmount}
                                    onChange={(e) => update('flatAmount', Number(e.target.value))}
                                    className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none" />
                            </div>
                        </Field>
                        <Field icon={<Percent size={14} className="text-slate-400" />} label="Percent of overdue"
                            help="Additional charge = % of parent invoice's total.">
                            <div className="relative">
                                <input data-testid="late-fee-config-card-update-input-3" type="number" min={0} max={100} value={form.percent}
                                    onChange={(e) => update('percent', Number(e.target.value))}
                                    className="w-full border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">%</span>
                            </div>
                        </Field>
                        <Field icon={<IndianRupee size={12} className="text-slate-400" />} label="Cap per month"
                            help="Late fee for one month never exceeds this. 0 = uncapped.">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                <input data-testid="late-fee-config-card-update-input-4" type="number" min={0} value={form.maxAmount}
                                    onChange={(e) => update('maxAmount', Number(e.target.value))}
                                    className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none" />
                            </div>
                        </Field>
                    </div>

                    {/* ── Live preview: per-month + cumulative (collapsible) ── */}
                    <div className="border border-amber-100 rounded-xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50/50">
                        <button data-testid="late-fee-config-card-preview-open-btn" type="button" onClick={() => setPreviewOpen(v => !v)}
                            aria-expanded={previewOpen}
                            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-amber-100/40 transition-colors text-left">
                            <Zap size={13} className="text-amber-600 shrink-0" />
                            <span className="text-xs font-semibold text-amber-900">
                                Preview on a ₹{SAMPLE_TOTAL.toLocaleString('en-IN')} overdue invoice
                            </span>
                            <span className="ml-auto flex items-center gap-2">
                                <span className="text-[11px] font-bold text-amber-700 tabular-nums">
                                    ₹{perMonthCharge.toLocaleString('en-IN')} / mo
                                </span>
                                {previewOpen
                                    ? <ChevronUp size={13} className="text-amber-600" />
                                    : <ChevronDown size={13} className="text-amber-600" />}
                            </span>
                        </button>
                        {previewOpen && (
                            <div className="px-4 pb-4 space-y-3 border-t border-amber-100">
                                <div className="grid grid-cols-4 gap-2 pt-3">
                                    <PreviewTile label="Per month" value={perMonthCharge} highlight />
                                    <PreviewTile label="After 3 months" value={perMonthCharge * 3} />
                                    <PreviewTile label="After 6 months" value={perMonthCharge * 6} />
                                    <PreviewTile label="After 12 months (cap)" value={perMonthCharge * 12} />
                                </div>
                                <p className="text-[10px] text-amber-800 flex items-start gap-1">
                                    <Info size={10} className="mt-0.5 shrink-0" />
                                    <span>
                                        Per-month = <span className="font-mono">₹{form.flatAmount}</span>
                                        {form.percent > 0 && <> + <span className="font-mono">{form.percent}%</span> × ₹{SAMPLE_TOTAL.toLocaleString('en-IN')}</>}
                                        {form.maxAmount > 0 && <> (capped at ₹{form.maxAmount.toLocaleString('en-IN')}/month)</>}
                                        . After 12 months the sweep stops adding new fees for that parent.
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[10px] text-slate-400">
                    Changes apply from the next sweep. Already-issued late fees stay untouched.
                </p>
                <button data-testid="late-fee-config-card-save-btn" onClick={save} disabled={saving || !dirty}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shrink-0">
                    <Save size={14} />
                    {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
            </div>
        </div>
    );
};

const Field = ({ icon, label, help, children }: { icon: React.ReactNode; label: string; help: string; children: React.ReactNode }) => (
    <div>
        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            {icon} {label}
        </label>
        {children}
        <p className="text-[10px] text-slate-400 mt-1 leading-tight">{help}</p>
    </div>
);

const PreviewTile = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => (
    <div className={`rounded-lg p-2.5 border ${highlight ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-100 text-amber-900'}`}>
        <p className={`text-lg font-black tabular-nums leading-none ${highlight ? '' : 'text-amber-800'}`}>
            ₹{value.toLocaleString('en-IN')}
        </p>
        <p className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${highlight ? 'text-amber-100' : 'text-amber-600'}`}>
            {label}
        </p>
    </div>
);

export default LateFeeConfigCard;
