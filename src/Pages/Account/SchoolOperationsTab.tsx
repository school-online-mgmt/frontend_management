import { useEffect, useState } from "react";
import { Loader2, Save, CalendarDays, Clock } from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface OpsForm {
    weeklyOffDays: number[];
    schoolStartTime: string;
    schoolEndTime: string;
    academicYearStartMonth: number;
    defaultPassPercentage: number;
    currency: string;
    timezone: string;
}

/**
 * School operations config (P-CFG). The working week (which days are off drives
 * attendance holidays), day timing, academic-year start, default pass %, and
 * currency/timezone — previously hard-coded, now management-editable.
 */
const SchoolOperationsTab = () => {
    const { addToast } = useToast();
    const [form, setForm] = useState<OpsForm>({
        weeklyOffDays: [0, 6], schoolStartTime: "", schoolEndTime: "",
        academicYearStartMonth: 4, defaultPassPercentage: 40, currency: "INR", timezone: "Asia/Kolkata",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.getSchoolOperations()
            .then((s) => setForm({
                weeklyOffDays: s.weeklyOffDays ?? [0, 6],
                schoolStartTime: s.schoolStartTime ?? "",
                schoolEndTime: s.schoolEndTime ?? "",
                academicYearStartMonth: s.academicYearStartMonth ?? 4,
                defaultPassPercentage: s.defaultPassPercentage ?? 40,
                currency: s.currency ?? "INR",
                timezone: s.timezone ?? "Asia/Kolkata",
            }))
            .catch(() => addToast("Failed to load school operations", "error"))
            .finally(() => setLoading(false));
    }, [addToast]);

    const toggleDay = (d: number) => setForm((f) => ({
        ...f,
        weeklyOffDays: f.weeklyOffDays.includes(d) ? f.weeklyOffDays.filter((x) => x !== d) : [...f.weeklyOffDays, d].sort((a, b) => a - b),
    }));

    const save = async () => {
        setSaving(true);
        try {
            await api.updateSchoolOperations({
                weeklyOffDays: form.weeklyOffDays,
                schoolStartTime: form.schoolStartTime || null,
                schoolEndTime: form.schoolEndTime || null,
                academicYearStartMonth: form.academicYearStartMonth,
                defaultPassPercentage: form.defaultPassPercentage,
                currency: form.currency.toUpperCase(),
                timezone: form.timezone,
            });
            addToast("School operations saved", "success");
        } catch (e: any) {
            addToast(e?.response?.data?.message || "Save failed", "error");
        } finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

    const input = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="max-w-2xl space-y-6">
            {/* Working week */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <CalendarDays size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-800">Working week</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2.5">Tap the days your school is closed. These are treated as holidays for attendance.</p>
                <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((wd, i) => {
                        const off = form.weeklyOffDays.includes(i);
                        return (
                            <button key={i} data-testid={`weekday-${i}`} onClick={() => toggleDay(i)}
                                className={`w-12 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                                    off ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                                }`}>
                                {wd}
                            </button>
                        );
                    })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Red = weekly off. E.g. select only Sun for a 6-day week.</p>
            </div>

            {/* Timing */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-800">School timing</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                    <label className="text-xs font-semibold text-slate-600">Start
                        <input type="time" className={`${input} block mt-1`} value={form.schoolStartTime} onChange={(e) => setForm({ ...form, schoolStartTime: e.target.value })} />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">End
                        <input type="time" className={`${input} block mt-1`} value={form.schoolEndTime} onChange={(e) => setForm({ ...form, schoolEndTime: e.target.value })} />
                    </label>
                </div>
            </div>

            {/* Academic + grading + locale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-semibold text-slate-600">Academic year starts
                    <select className={`${input} block mt-1 w-full`} value={form.academicYearStartMonth} onChange={(e) => setForm({ ...form, academicYearStartMonth: Number(e.target.value) })}>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">Default pass %
                    <input type="number" min={0} max={100} className={`${input} block mt-1 w-full`} value={form.defaultPassPercentage} onChange={(e) => setForm({ ...form, defaultPassPercentage: Number(e.target.value) || 0 })} />
                </label>
                <label className="text-xs font-semibold text-slate-600">Currency
                    <input maxLength={3} className={`${input} block mt-1 w-full uppercase`} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </label>
                <label className="text-xs font-semibold text-slate-600">Timezone
                    <input className={`${input} block mt-1 w-full`} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                </label>
            </div>

            <button data-testid="school-ops-save" onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
        </div>
    );
};

export default SchoolOperationsTab;
