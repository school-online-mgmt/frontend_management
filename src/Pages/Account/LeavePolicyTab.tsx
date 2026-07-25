import { useEffect, useState } from "react";
import { Loader2, Save, CalendarClock } from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";

type StaffType = "TEACHER" | "MANAGEMENT";
interface RolePolicy { staffType: StaffType; sickDays: number; personalDays: number; familyDays: number; otherDays: number; totalDays: number }

const LEAVE_FIELDS: { key: "sickDays" | "personalDays" | "familyDays" | "otherDays"; label: string }[] = [
    { key: "sickDays", label: "Sick" },
    { key: "personalDays", label: "Personal" },
    { key: "familyDays", label: "Family" },
    { key: "otherDays", label: "Other" },
];

/**
 * Leave policy config (P1-TT-05). Per-role annual leave entitlement + the
 * encashment ₹/day used when a session's unused balance is paid out on the last
 * payroll. No carry-forward.
 */
const LeavePolicyTab = () => {
    const { addToast } = useToast();
    const [policies, setPolicies] = useState<RolePolicy[]>([]);
    const [encash, setEncash] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        api.getLeavePolicy()
            .then((r) => { setPolicies(r.policies); setEncash(r.leaveEncashPerDay); })
            .catch(() => addToast("Failed to load leave policy", "error"))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    type DayKey = "sickDays" | "personalDays" | "familyDays" | "otherDays";
    const setDay = (staffType: StaffType, key: DayKey, val: number) => {
        setPolicies((ps) => ps.map((p) => p.staffType === staffType ? { ...p, [key]: val } : p));
    };

    const save = async () => {
        setSaving(true);
        try {
            // One PATCH per role + the shared encash rate.
            for (const p of policies) {
                await api.updateLeavePolicy({ staffType: p.staffType, sickDays: p.sickDays, personalDays: p.personalDays, familyDays: p.familyDays, otherDays: p.otherDays });
            }
            await api.updateLeavePolicy({ leaveEncashPerDay: encash });
            addToast("Leave policy saved", "success");
            load();
        } catch (e: any) {
            addToast(e?.response?.data?.message || "Save failed", "error");
        } finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

    const input = "w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><CalendarClock size={17} className="text-indigo-600" /></div>
                <div>
                    <h3 className="font-bold text-slate-800">Leave policy</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Annual leave entitlement per role. No carry-forward — unused balance is encashed on the session's last payroll.</p>
                </div>
            </div>

            {policies.map((p) => (
                <div key={p.staffType} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-700">{p.staffType === "TEACHER" ? "Teachers" : "Management staff"}</p>
                        <span className="text-[11px] text-slate-400">{p.sickDays + p.personalDays + p.familyDays + p.otherDays} days / year</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {LEAVE_FIELDS.map((f) => (
                            <label key={f.key} className="text-xs font-semibold text-slate-600">
                                {f.label}
                                <input data-testid={`leave-${p.staffType}-${f.key}`} type="number" min={0} max={365}
                                    className={`${input} block mt-1`} value={p[f.key]}
                                    onChange={(e) => setDay(p.staffType, f.key, Number(e.target.value) || 0)} />
                            </label>
                        ))}
                    </div>
                </div>
            ))}

            <div>
                <label className="text-xs font-semibold text-slate-600">Encashment rate (₹ per unused day)</label>
                <input data-testid="leave-encash-per-day" type="number" min={0} className={`${input} block mt-1 w-32`}
                    value={encash} onChange={(e) => setEncash(Number(e.target.value) || 0)} />
                <p className="text-[11px] text-slate-400 mt-1">0 disables encashment. Remaining balance × this rate is added to the last-month payroll when a session ends.</p>
            </div>

            <button data-testid="leave-policy-save" onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
        </div>
    );
};

export default LeavePolicyTab;
