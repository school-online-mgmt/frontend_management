import { useEffect, useState } from "react";
import { Loader2, Save, BellRing, Info } from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";

/**
 * Per-tenant fee-defaulter reminder ladder config (P1-COM-06). Schools set the
 * days-overdue at which each escalating reminder fires, and can turn the whole
 * ladder off. The sending time is fixed by the platform (one shared job).
 */
const STAGES: { key: "gentleDays" | "firmDays" | "finalDays"; label: string; hint: string }[] = [
    { key: "gentleDays", label: "Gentle reminder", hint: "A friendly nudge" },
    { key: "firmDays",   label: "Firm reminder",   hint: "A firmer follow-up" },
    { key: "finalDays",  label: "Final notice",    hint: "Last call before escalation" },
];

const FeeReminderSettingsTab = () => {
    const { addToast } = useToast();
    const [form, setForm] = useState({ enabled: true, gentleDays: 3, firmDays: 10, finalDays: 21 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [note, setNote] = useState<string | undefined>();

    useEffect(() => {
        api.getFeeReminderSettings()
            .then((s) => { setForm({ enabled: s.enabled, gentleDays: s.gentleDays, firmDays: s.firmDays, finalDays: s.finalDays }); setNote(s.note); })
            .catch(() => addToast("Failed to load fee reminder settings", "error"))
            .finally(() => setLoading(false));
    }, [addToast]);

    const laddersOk = form.gentleDays < form.firmDays && form.firmDays < form.finalDays;

    const save = async () => {
        if (!laddersOk) { addToast("Days must strictly increase: gentle < firm < final", "error"); return; }
        setSaving(true);
        try {
            const res = await api.updateFeeReminderSettings(form);
            setForm({ enabled: res.enabled, gentleDays: res.gentleDays, firmDays: res.firmDays, finalDays: res.finalDays });
            addToast("Fee reminder settings saved", "success");
        } catch (e: any) {
            addToast(e?.response?.data?.message || "Save failed", "error");
        } finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

    const input = "w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="max-w-xl space-y-5">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><BellRing size={17} className="text-indigo-600" /></div>
                <div>
                    <h3 className="font-bold text-slate-800">Fee reminder ladder</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Automatic escalating email reminders for overdue invoices.</p>
                </div>
            </div>

            <label className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-xl">
                <div>
                    <p className="text-sm font-semibold text-slate-700">Send fee reminders</p>
                    <p className="text-[11px] text-slate-500">When off, no overdue-fee reminder emails are sent.</p>
                </div>
                <input data-testid="fee-reminder-enabled" type="checkbox" checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
            </label>

            <div className={`space-y-3 ${form.enabled ? "" : "opacity-50 pointer-events-none"}`}>
                {STAGES.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-slate-700">{s.label}</p>
                            <p className="text-[11px] text-slate-400">{s.hint}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input data-testid={`fee-reminder-${s.key}`} type="number" min={0} max={365} className={input}
                                value={form[s.key]} onChange={(e) => setForm({ ...form, [s.key]: Number(e.target.value) || 0 })} />
                            <span className="text-xs text-slate-500 w-24">days overdue</span>
                        </div>
                    </div>
                ))}
                {!laddersOk && (
                    <p className="text-xs text-red-600">Days must strictly increase: gentle &lt; firm &lt; final.</p>
                )}
            </div>

            {note && (
                <p className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <Info size={13} className="shrink-0 mt-0.5" /> {note}
                </p>
            )}

            <button data-testid="fee-reminder-save" onClick={save} disabled={saving || !laddersOk}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
        </div>
    );
};

export default FeeReminderSettingsTab;
