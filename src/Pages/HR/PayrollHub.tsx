import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Wallet, Users, Plus, X, Loader2, Download, Banknote, Pencil,
    CheckCircle2, Building2, CreditCard, Search, PlayCircle,
    Lock, Receipt, Ban,
} from "lucide-react";
import api from "../../api/api";
import type { HrStaffRow, HrComponent, PayrollRun, Payslip } from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";
import useTabState from "../../hooks/useTabState";
import { useToast } from "../../context/ToastContext";

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "PROBATION", "INTERN"];
const EMPLOYMENT_STATUSES = ["ACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED", "RETIRED"];
const PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "CHEQUE", "UPI", "OTHER"];

const fmtINR = (n: number | null | undefined) =>
    n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Client-side mirror of HrService.computePayslip for live previews. */
function computePreview(basic: number, components: HrComponent[]) {
    let gross = basic, deductions = 0;
    for (const c of components) {
        const amt = c.calc === "PERCENT_OF_BASIC" ? Math.round((basic * c.value) / 100) : c.value;
        if (c.type === "EARNING") gross += amt; else deductions += amt;
    }
    return { gross, deductions, net: gross - deductions };
}

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    ON_LEAVE: "bg-amber-50 text-amber-700",
    RESIGNED: "bg-slate-100 text-slate-600",
    TERMINATED: "bg-red-50 text-red-700",
    RETIRED: "bg-slate-100 text-slate-600",
    DRAFT: "bg-slate-100 text-slate-700",
    FINALIZED: "bg-blue-50 text-blue-700",
    PAID: "bg-emerald-50 text-emerald-700",
    GENERATED: "bg-slate-100 text-slate-700",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700",
    CANCELLED: "bg-red-50 text-red-700",
};
const Pill = ({ status }: { status: string }) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"}`}>
        {status.replace(/_/g, " ")}
    </span>
);

type TabId = "staff" | "runs";

export default function PayrollHub() {
    const [tab, setTab] = useTabState<TabId>("tab", "staff");
    const qc = useQueryClient();

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                icon={Wallet}
                title="HR & Payroll"
                subtitle="Staff salaries, monthly payroll runs and payslips"
                gradient={MODULE_THEMES.finance}
                onRefresh={() => qc.invalidateQueries({ queryKey: ["hr"] })}
            />
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
                <TabbedSection<TabId>
                    tabs={[
                        { key: "staff", label: "Staff & Salaries" },
                        { key: "runs", label: "Payroll Runs" },
                    ]}
                    value={tab}
                    onChange={setTab}
                    ariaLabel="HR sections"
                    theme="emerald"
                >
                    <TabPanel tabKey="staff">
                        <StaffSalariesTab />
                    </TabPanel>
                    <TabPanel tabKey="runs">
                        <PayrollRunsTab />
                    </TabPanel>
                </TabbedSection>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   STAFF & SALARIES
   ══════════════════════════════════════════════════════════════════════════ */
function StaffSalariesTab() {
    const [search, setSearch] = useState("");
    const [profileTarget, setProfileTarget] = useState<HrStaffRow | null>(null);
    const [salaryTarget, setSalaryTarget] = useState<HrStaffRow | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["hr", "staff"],
        queryFn: () => api.listHrStaff(),
    });

    const rows = useMemo(() => {
        const list = data?.staff ?? [];
        const q = search.trim().toLowerCase();
        return q ? list.filter(s => s.name.toLowerCase().includes(q)
            || (s.profile?.designation ?? "").toLowerCase().includes(q)) : list;
    }, [data, search]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search staff or designation…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : rows.length === 0 ? (
                <div className="text-center py-16 text-slate-500">No staff found.</div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Designation</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Basic salary</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(s => (
                                <tr key={`${s.staffType}:${s.staffId}`} className="border-b border-slate-50 hover:bg-slate-50/60">
                                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                            {s.staffType === "TEACHER" ? <Users size={13} /> : <Building2 size={13} />}
                                            {s.staffType === "TEACHER" ? "Teacher" : "Management"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{s.profile?.designation ?? "—"}</td>
                                    <td className="px-4 py-3">{s.profile ? <Pill status={s.profile.employmentStatus} /> : <span className="text-xs text-slate-400">No profile</span>}</td>
                                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                                        {s.hasSalary ? fmtINR(s.basicSalary) : <span className="text-xs text-slate-400">Not set</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1.5">
                                            <button onClick={() => setProfileTarget(s)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50">
                                                <Pencil size={13} /> Profile
                                            </button>
                                            <button onClick={() => setSalaryTarget(s)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                                                <Banknote size={13} /> Salary
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {profileTarget && <ProfileModal staff={profileTarget} onClose={() => setProfileTarget(null)} />}
            {salaryTarget && <SalaryModal staff={salaryTarget} onClose={() => setSalaryTarget(null)} />}
        </div>
    );
}

/* ── Employment profile modal ─────────────────────────────────────────────── */
function ProfileModal({ staff, onClose }: { staff: HrStaffRow; onClose: () => void }) {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const p = staff.profile;
    const [form, setForm] = useState({
        employeeCode: p?.employeeCode ?? "",
        designation: p?.designation ?? "",
        department: p?.department ?? "",
        joiningDate: p?.joiningDate ?? "",
        employmentType: p?.employmentType ?? "FULL_TIME",
        employmentStatus: p?.employmentStatus ?? "ACTIVE",
        bankAccountName: (p as any)?.bankAccountName ?? "",
        bankAccountNumber: (p as any)?.bankAccountNumber ?? "",
        bankIfsc: (p as any)?.bankIfsc ?? "",
        bankName: (p as any)?.bankName ?? "",
        panNumber: (p as any)?.panNumber ?? "",
    });
    const [saving, setSaving] = useState(false);
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        setSaving(true);
        try {
            const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]));
            await api.saveHrProfile(staff.staffType, staff.staffId, payload as any);
            addToast("Employment profile saved.", "success");
            await qc.invalidateQueries({ queryKey: ["hr"] });
            onClose();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to save profile.", "error");
        } finally { setSaving(false); }
    };

    const field = (label: string, key: keyof typeof form, type = "text") => (
        <label className="block">
            <span className="text-xs font-medium text-slate-600">{label}</span>
            <input type={type} value={(form as any)[key]} onChange={e => set(key as string, e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
        </label>
    );

    return (
        <Modal title={`Employment profile — ${staff.name}`} onClose={onClose}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {field("Employee code", "employeeCode")}
                {field("Designation", "designation")}
                {field("Department", "department")}
                {field("Joining date", "joiningDate", "date")}
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Employment type</span>
                    <select value={form.employmentType} onChange={e => set("employmentType", e.target.value)}
                        className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                        {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Status</span>
                    <select value={form.employmentStatus} onChange={e => set("employmentStatus", e.target.value)}
                        className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                        {EMPLOYMENT_STATUSES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                    </select>
                </label>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><CreditCard size={13} /> Bank details (for salary disbursement)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {field("Account holder name", "bankAccountName")}
                    {field("Account number", "bankAccountNumber")}
                    {field("IFSC", "bankIfsc")}
                    {field("Bank name", "bankName")}
                    {field("PAN", "panNumber")}
                </div>
            </div>
            <ModalActions onClose={onClose} onSave={save} saving={saving} />
        </Modal>
    );
}

/* ── Salary structure modal ───────────────────────────────────────────────── */
function SalaryModal({ staff, onClose }: { staff: HrStaffRow; onClose: () => void }) {
    const qc = useQueryClient();
    const { addToast } = useToast();

    const { data, isLoading } = useQuery({
        queryKey: ["hr", "staff-detail", staff.staffType, staff.staffId],
        queryFn: () => api.getHrStaff(staff.staffType, staff.staffId),
    });

    const [basic, setBasic] = useState<number | "">("");
    const [effectiveFrom, setEffectiveFrom] = useState(today());
    const [components, setComponents] = useState<HrComponent[]>([]);
    const [saving, setSaving] = useState(false);
    const [seeded, setSeeded] = useState(false);

    // Seed the form once the existing salary loads.
    if (!seeded && data) {
        setSeeded(true);
        if (data.salary) {
            setBasic(data.salary.structure.basicSalary);
            setEffectiveFrom(data.salary.structure.effectiveFrom?.slice(0, 10) ?? today());
            setComponents(data.salary.components.map(c => ({ type: c.type, label: c.label, calc: c.calc, value: c.value })));
        }
    }

    const preview = computePreview(Number(basic) || 0, components);
    const addComp = (type: "EARNING" | "DEDUCTION") =>
        setComponents(c => [...c, { type, label: "", calc: "FIXED", value: 0 }]);
    const updateComp = (i: number, patch: Partial<HrComponent>) =>
        setComponents(c => c.map((x, idx) => idx === i ? { ...x, ...patch } : x));
    const removeComp = (i: number) => setComponents(c => c.filter((_, idx) => idx !== i));

    const save = async () => {
        if (basic === "" || Number(basic) < 0) { addToast("Enter a valid basic salary.", "error"); return; }
        if (components.some(c => !c.label.trim())) { addToast("Every component needs a label.", "error"); return; }
        setSaving(true);
        try {
            await api.saveHrSalary(staff.staffType, staff.staffId, { basicSalary: Number(basic), effectiveFrom, components });
            addToast("Salary structure saved.", "success");
            await qc.invalidateQueries({ queryKey: ["hr"] });
            onClose();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to save salary.", "error");
        } finally { setSaving(false); }
    };

    return (
        <Modal title={`Salary — ${staff.name}`} onClose={onClose}>
            {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Basic salary (₹ / month)</span>
                            <input type="number" min={0} value={basic} onChange={e => setBasic(e.target.value === "" ? "" : Number(e.target.value))}
                                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Effective from</span>
                            <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                        </label>
                    </div>

                    <div className="mt-4 space-y-2">
                        {components.map((c, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${c.type === "EARNING" ? "bg-emerald-500" : "bg-red-500"}`} />
                                <input value={c.label} placeholder={c.type === "EARNING" ? "e.g. HRA" : "e.g. PF"} onChange={e => updateComp(i, { label: e.target.value })}
                                    className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg" />
                                <select value={c.calc} onChange={e => updateComp(i, { calc: e.target.value as any })}
                                    className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg">
                                    <option value="FIXED">₹</option>
                                    <option value="PERCENT_OF_BASIC">% of basic</option>
                                </select>
                                <input type="number" min={0} value={c.value} onChange={e => updateComp(i, { value: Number(e.target.value) })}
                                    className="w-24 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-right" />
                                <button onClick={() => removeComp(i)} className="p-1.5 text-slate-400 hover:text-red-600"><X size={15} /></button>
                            </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => addComp("EARNING")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"><Plus size={13} /> Earning</button>
                            <button onClick={() => addComp("DEDUCTION")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Plus size={13} /> Deduction</button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3 text-center">
                        <div><div className="text-[11px] text-slate-500">Gross</div><div className="font-semibold tabular-nums">{fmtINR(preview.gross)}</div></div>
                        <div><div className="text-[11px] text-slate-500">Deductions</div><div className="font-semibold tabular-nums text-red-600">{fmtINR(preview.deductions)}</div></div>
                        <div><div className="text-[11px] text-slate-500">Net pay</div><div className="font-semibold tabular-nums text-emerald-700">{fmtINR(preview.net)}</div></div>
                    </div>
                    <ModalActions onClose={onClose} onSave={save} saving={saving} />
                </>
            )}
        </Modal>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAYROLL RUNS
   ══════════════════════════════════════════════════════════════════════════ */
function PayrollRunsTab() {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [running, setRunning] = useState(false);
    const [openRun, setOpenRun] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["hr", "runs"],
        queryFn: () => api.listPayrollRuns(),
    });

    const run = async () => {
        setRunning(true);
        try {
            const res = await api.generatePayrollRun(month, year);
            addToast(`Payroll generated — ${res.created} payslip(s) added, ${res.skipped} skipped.`, "success");
            await qc.invalidateQueries({ queryKey: ["hr", "runs"] });
            setOpenRun(res.runId);
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to generate payroll.", "error");
        } finally { setRunning(false); }
    };

    return (
        <div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap items-end gap-3">
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Month</span>
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className="mt-1 block px-3 py-2 text-sm border border-slate-200 rounded-lg">
                        {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Year</span>
                    <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="mt-1 block w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </label>
                <button onClick={run} disabled={running} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                    {running ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />} Run payroll
                </button>
                <p className="text-xs text-slate-400 ml-auto">Re-running a period tops up newly-added staff — it never double-pays.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (data?.runs ?? []).length === 0 ? (
                <div className="text-center py-16 text-slate-500">No payroll runs yet.</div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                <th className="px-4 py-3">Period</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Payslips</th>
                                <th className="px-4 py-3 text-right">Total net</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.runs ?? []).map((r: PayrollRun) => (
                                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer" onClick={() => setOpenRun(r.id)}>
                                    <td className="px-4 py-3 font-medium text-slate-800">{MONTHS[r.periodMonth]} {r.periodYear}</td>
                                    <td className="px-4 py-3"><Pill status={r.status} /></td>
                                    <td className="px-4 py-3 text-right tabular-nums">{r.payslipCount}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtINR(r.totalNet)}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600 text-xs font-medium">View →</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {openRun && <RunDetailModal runId={openRun} onClose={() => setOpenRun(null)} />}
        </div>
    );
}

/* ── Run detail modal (payslips) ──────────────────────────────────────────── */
function RunDetailModal({ runId, onClose }: { runId: string; onClose: () => void }) {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [payTarget, setPayTarget] = useState<Payslip | null>(null);
    const [finalizing, setFinalizing] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["hr", "run", runId],
        queryFn: () => api.getPayrollRun(runId),
    });

    const finalize = async () => {
        setFinalizing(true);
        try {
            await api.finalizePayrollRun(runId);
            addToast("Payroll finalized. Teachers can now see their payslips.", "success");
            await qc.invalidateQueries({ queryKey: ["hr"] });
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to finalize.", "error");
        } finally { setFinalizing(false); }
    };

    const cancelRun = async () => {
        if (!window.confirm("Cancel this entire payroll run? All its payslips will be voided. This is only possible while no payment has been recorded.")) return;
        setCancelling(true);
        try {
            await api.cancelPayrollRun(runId);
            addToast("Payroll run cancelled.", "success");
            await qc.invalidateQueries({ queryKey: ["hr"] });
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to cancel the run.", "error");
        } finally { setCancelling(false); }
    };

    const voidPayslip = async (ps: Payslip) => {
        if (!window.confirm(`Void the payslip for ${ps.staffName}? Only possible while nothing has been paid against it.`)) return;
        try {
            await api.cancelPayslip(ps.id);
            addToast("Payslip cancelled.", "success");
            await qc.invalidateQueries({ queryKey: ["hr"] });
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to cancel the payslip.", "error");
        }
    };

    const run = data?.run;
    return (
        <Modal title={run ? `Payroll — ${MONTHS[run.periodMonth]} ${run.periodYear}` : "Payroll run"} onClose={onClose} wide>
            {isLoading || !run ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-3">
                        <Pill status={run.status} />
                        <span className="text-sm text-slate-500">{run.payslipCount} payslips · net {fmtINR(run.totalNet)}</span>
                        {(run.status === "DRAFT" || run.status === "FINALIZED") && (
                            <div className="ml-auto flex items-center gap-2">
                                <button onClick={cancelRun} disabled={cancelling} title="Void this run (only while unpaid)" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60">
                                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Cancel run
                                </button>
                                {run.status === "DRAFT" && (
                                    <button onClick={finalize} disabled={finalizing} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                                        {finalizing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Finalize
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                    <th className="px-3 py-2">Staff</th>
                                    <th className="px-3 py-2 text-right">Gross</th>
                                    <th className="px-3 py-2 text-right">Deductions</th>
                                    <th className="px-3 py-2 text-right">Net</th>
                                    <th className="px-3 py-2 text-right">Paid</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.payslips.map(ps => (
                                    <tr key={ps.id} className="border-b border-slate-50">
                                        <td className="px-3 py-2 font-medium text-slate-800">{ps.staffName}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{fmtINR(ps.grossEarnings)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-red-600">{fmtINR(ps.totalDeductions)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtINR(ps.netPay)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{fmtINR(ps.paidAmount)}</td>
                                        <td className="px-3 py-2"><Pill status={ps.status} /></td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => window.open(api.payslipPdfUrl(ps.id), "_blank")} title="Download PDF" className="p-1.5 text-slate-500 hover:text-emerald-700"><Download size={15} /></button>
                                                {ps.status !== "PAID" && ps.status !== "CANCELLED" && (
                                                    <button onClick={() => setPayTarget(ps)} title="Record payment" className="p-1.5 text-slate-500 hover:text-emerald-700"><Receipt size={15} /></button>
                                                )}
                                                {ps.status === "GENERATED" && ps.paidAmount === 0 && (
                                                    <button onClick={() => voidPayslip(ps)} title="Void payslip" className="p-1.5 text-slate-400 hover:text-red-600"><Ban size={15} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            {payTarget && <PaymentModal payslip={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); qc.invalidateQueries({ queryKey: ["hr"] }); }} />}
        </Modal>
    );
}

/* ── Record payment modal ─────────────────────────────────────────────────── */
function PaymentModal({ payslip, onClose, onDone }: { payslip: Payslip; onClose: () => void; onDone: () => void }) {
    const { addToast } = useToast();
    const due = payslip.netPay - payslip.paidAmount;
    const [amount, setAmount] = useState<number | "">(due > 0 ? due : "");
    const [method, setMethod] = useState("BANK_TRANSFER");
    const [paidAt, setPaidAt] = useState(today());
    const [reference, setReference] = useState("");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (amount === "" || Number(amount) <= 0) { addToast("Enter a positive amount.", "error"); return; }
        setSaving(true);
        try {
            const res = await api.recordSalaryPayment(payslip.id, { amount: Number(amount), method, paidAt, reference: reference || undefined });
            addToast(`Payment recorded — payslip is now ${res.status.replace(/_/g, " ").toLowerCase()}.`, "success");
            onDone();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to record payment.", "error");
        } finally { setSaving(false); }
    };

    return (
        <Modal title={`Record payment — ${payslip.staffName}`} onClose={onClose}>
            <p className="text-sm text-slate-500 mb-3">Net pay {fmtINR(payslip.netPay)} · already paid {fmtINR(payslip.paidAmount)} · due <b className="text-slate-700">{fmtINR(due)}</b></p>
            <div className="grid grid-cols-2 gap-3">
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Amount (₹)</span>
                    <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Date</span>
                    <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Method</span>
                    <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Reference (optional)</span>
                    <input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </label>
            </div>
            <ModalActions onClose={onClose} onSave={save} saving={saving} saveLabel="Record payment" />
        </Modal>
    );
}

/* ── Shared modal primitives ──────────────────────────────────────────────── */
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
function ModalActions({ onClose, onSave, saving, saveLabel = "Save" }: { onClose: () => void; onSave: () => void; saving: boolean; saveLabel?: string }) {
    return (
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">Cancel</button>
            <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {saveLabel}
            </button>
        </div>
    );
}
