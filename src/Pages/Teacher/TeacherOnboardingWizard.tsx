import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    UserPlus, Briefcase, Banknote, BookOpen, CheckCircle2, Loader2, Plus, X,
    ChevronRight, ChevronLeft, Save, IdCard, RotateCcw,
} from "lucide-react";
import api from "../../api/api";
import type { HrComponent } from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";

const DRAFT_KEY = "hr_teacher_onboarding_v1";
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "PROBATION", "INTERN"];
const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

const STEPS = [
    { key: "identity", label: "Identity", icon: UserPlus },
    { key: "employment", label: "Employment", icon: Briefcase },
    { key: "salary", label: "Salary", icon: Banknote },
    { key: "assignments", label: "Subjects", icon: BookOpen },
    { key: "review", label: "Review", icon: CheckCircle2 },
] as const;
type StepKey = typeof STEPS[number]["key"];

interface WizardState {
    teacherId: string | null;
    identity: { name: string; gender: string; age: string; qualification: string; phone: string; email: string; password: string; address: string };
    employment: { employeeCode: string; designation: string; department: string; joiningDate: string; employmentType: string };
    salary: { basicSalary: string; components: HrComponent[] };
    assignedSubjectIds: string[];
}

const EMPTY: WizardState = {
    teacherId: null,
    identity: { name: "", gender: "Male", age: "", qualification: "", phone: "", email: "", password: "", address: "" },
    employment: { employeeCode: "", designation: "", department: "", joiningDate: today(), employmentType: "FULL_TIME" },
    salary: { basicSalary: "", components: [] },
    assignedSubjectIds: [],
};

function computePreview(basic: number, components: HrComponent[]) {
    let gross = basic, deductions = 0;
    for (const c of components) {
        const amt = c.calc === "PERCENT_OF_BASIC" ? Math.round((basic * c.value) / 100) : c.value;
        if (c.type === "EARNING") gross += amt; else deductions += amt;
    }
    return { gross, deductions, net: gross - deductions };
}

export default function TeacherOnboardingWizard() {
    const nav = useNavigate();
    const { addToast } = useToast();
    const [state, setState] = useState<WizardState>(() => {
        try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) return { ...EMPTY, ...JSON.parse(raw) }; } catch { /* ignore */ }
        return EMPTY;
    });
    const [stepIdx, setStepIdx] = useState(0);
    const [busy, setBusy] = useState(false);
    const step = STEPS[stepIdx].key;

    // Persist a draft on every change so onboarding can resume after a reload.
    useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); }, [state]);

    const patch = <K extends keyof WizardState>(k: K, v: Partial<WizardState[K]>) =>
        setState(s => ({ ...s, [k]: typeof v === "object" && !Array.isArray(v) ? { ...(s[k] as any), ...v } : v }));

    const resetDraft = () => {
        if (!confirm("Discard this onboarding draft and start over?")) return;
        localStorage.removeItem(DRAFT_KEY);
        setState(EMPTY); setStepIdx(0);
    };

    // ── Per-step persistence to the backend ──────────────────────────────────
    async function commitStep(target: StepKey): Promise<boolean> {
        try {
            if (step === "identity") {
                const id = state.identity;
                if (!id.name.trim() || !id.qualification.trim() || id.phone.length !== 10 || !id.age) {
                    addToast("Name, qualification, 10-digit phone and age are required.", "error"); return false;
                }
                if (!state.teacherId) {
                    const res = await api.createTeacherEntry({
                        name: id.name.trim(), gender: id.gender, age: Number(id.age),
                        qualification: id.qualification.trim(), phone: id.phone,
                        email: id.email || undefined, address: id.address || undefined,
                        password: id.password || undefined,
                    });
                    const newId = res?.teacher?.id;
                    if (!newId) { addToast("Teacher was created but no id came back.", "error"); return false; }
                    setState(s => ({ ...s, teacherId: newId }));
                    addToast(`Teacher "${id.name}" created.`, "success");
                }
            } else if (step === "employment" && state.teacherId) {
                const e = state.employment;
                await api.saveHrProfile("TEACHER", state.teacherId, {
                    employeeCode: e.employeeCode || null, designation: e.designation || null,
                    department: e.department || null, joiningDate: e.joiningDate || null,
                    employmentType: e.employmentType,
                });
            } else if (step === "salary" && state.teacherId) {
                if (state.salary.basicSalary !== "") {
                    if (state.salary.components.some(c => !c.label.trim())) { addToast("Every salary component needs a label.", "error"); return false; }
                    await api.saveHrSalary("TEACHER", state.teacherId, {
                        basicSalary: Number(state.salary.basicSalary), effectiveFrom: state.employment.joiningDate || today(),
                        components: state.salary.components,
                    });
                }
            }
            // `assignments` are committed as the user toggles them (see step UI).
            void target;
            return true;
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Couldn't save this step.", "error");
            return false;
        }
    }

    const next = async () => {
        setBusy(true);
        const ok = await commitStep(STEPS[stepIdx + 1]?.key ?? "review");
        setBusy(false);
        if (ok && stepIdx < STEPS.length - 1) setStepIdx(i => i + 1);
    };
    const back = () => setStepIdx(i => Math.max(0, i - 1));

    const finish = () => {
        localStorage.removeItem(DRAFT_KEY);
        addToast("Teacher onboarding complete.", "success");
        nav("/teacher-home");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                icon={UserPlus}
                title="Onboard a Teacher"
                subtitle="Guided setup — identity, employment, salary and subjects in one flow"
                gradient={MODULE_THEMES.people}
                showBack
                primaryActions={
                    <button onClick={resetDraft} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-white/15 text-white hover:bg-white/25">
                        <RotateCcw size={14} /> Reset
                    </button>
                }
            />
            <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5">
                {/* Stepper */}
                <ol className="flex items-center justify-between mb-6">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const done = i < stepIdx, active = i === stepIdx;
                        return (
                            <li key={s.key} className="flex-1 flex items-center">
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${active ? "bg-indigo-600 border-indigo-600 text-white" : done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-400"}`}>
                                        {done ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                                    </div>
                                    <span className={`mt-1 text-[11px] ${active ? "text-indigo-700 font-medium" : "text-slate-500"}`}>{s.label}</span>
                                </div>
                                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 -mt-4 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
                            </li>
                        );
                    })}
                </ol>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                    {step === "identity" && <IdentityStep state={state} patch={patch} />}
                    {step === "employment" && <EmploymentStep state={state} patch={patch} />}
                    {step === "salary" && <SalaryStep state={state} setState={setState} />}
                    {step === "assignments" && <AssignmentsStep state={state} setState={setState} />}
                    {step === "review" && <ReviewStep state={state} />}

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                        <button onClick={back} disabled={stepIdx === 0 || busy} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                            <ChevronLeft size={15} /> Back
                        </button>
                        <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Save size={12} /> Draft saved automatically</span>
                        {step === "review" ? (
                            <button onClick={finish} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                                <CheckCircle2 size={15} /> Finish
                            </button>
                        ) : (
                            <button onClick={next} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
                                {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />} Save &amp; Next
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Steps ─────────────────────────────────────────────────────────────────── */
const Input = ({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <label className="block">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
    </label>
);

function IdentityStep({ state, patch }: { state: WizardState; patch: any }) {
    const id = state.identity;
    const locked = !!state.teacherId;
    return (
        <div>
            {locked && <p className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Teacher already created — identity is locked. Continue to the next steps.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Full name" value={id.name} onChange={v => patch("identity", { name: v })} />
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Gender</span>
                    <select value={id.gender} onChange={e => patch("identity", { gender: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                        {["Male", "Female", "Other"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </label>
                <Input label="Age" type="number" value={id.age} onChange={v => patch("identity", { age: v })} />
                <Input label="Qualification" value={id.qualification} onChange={v => patch("identity", { qualification: v })} />
                <Input label="Phone (10 digits)" value={id.phone} onChange={v => patch("identity", { phone: v.replace(/\D/g, "").slice(0, 10) })} />
                <Input label="Email (optional)" type="email" value={id.email} onChange={v => patch("identity", { email: v })} />
                <Input label="Temporary password (optional)" value={id.password} onChange={v => patch("identity", { password: v })} placeholder="Auto if blank" />
                <Input label="Address (optional)" value={id.address} onChange={v => patch("identity", { address: v })} />
            </div>
        </div>
    );
}

function EmploymentStep({ state, patch }: { state: WizardState; patch: any }) {
    const e = state.employment;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Employee code" value={e.employeeCode} onChange={v => patch("employment", { employeeCode: v })} />
            <Input label="Designation" value={e.designation} onChange={v => patch("employment", { designation: v })} placeholder="e.g. PGT Mathematics" />
            <Input label="Department" value={e.department} onChange={v => patch("employment", { department: v })} placeholder="e.g. Science" />
            <Input label="Joining date" type="date" value={e.joiningDate} onChange={v => patch("employment", { joiningDate: v })} />
            <label className="block">
                <span className="text-xs font-medium text-slate-600">Employment type</span>
                <select value={e.employmentType} onChange={ev => patch("employment", { employmentType: ev.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
            </label>
        </div>
    );
}

function SalaryStep({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
    const s = state.salary;
    const setSalary = (patch: Partial<WizardState["salary"]>) => setState(st => ({ ...st, salary: { ...st.salary, ...patch } }));
    const addComp = (type: "EARNING" | "DEDUCTION") => setSalary({ components: [...s.components, { type, label: "", calc: "FIXED", value: 0 }] });
    const upd = (i: number, p: Partial<HrComponent>) => setSalary({ components: s.components.map((c, idx) => idx === i ? { ...c, ...p } : c) });
    const rm = (i: number) => setSalary({ components: s.components.filter((_, idx) => idx !== i) });
    const preview = computePreview(Number(s.basicSalary) || 0, s.components);

    return (
        <div>
            <p className="text-xs text-slate-500 mb-3">Optional — you can leave this blank and set salary later from HR &amp; Payroll.</p>
            <div className="max-w-xs">
                <Input label="Basic salary (₹ / month)" type="number" value={s.basicSalary} onChange={v => setSalary({ basicSalary: v })} />
            </div>
            <div className="mt-4 space-y-2">
                {s.components.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.type === "EARNING" ? "bg-emerald-500" : "bg-red-500"}`} />
                        <input value={c.label} placeholder={c.type === "EARNING" ? "e.g. HRA" : "e.g. PF"} onChange={e => upd(i, { label: e.target.value })} className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg" />
                        <select value={c.calc} onChange={e => upd(i, { calc: e.target.value as any })} className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg">
                            <option value="FIXED">₹</option><option value="PERCENT_OF_BASIC">% of basic</option>
                        </select>
                        <input type="number" min={0} value={c.value} onChange={e => upd(i, { value: Number(e.target.value) })} className="w-24 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-right" />
                        <button onClick={() => rm(i)} className="p-1.5 text-slate-400 hover:text-red-600"><X size={15} /></button>
                    </div>
                ))}
                <div className="flex gap-2 pt-1">
                    <button onClick={() => addComp("EARNING")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"><Plus size={13} /> Earning</button>
                    <button onClick={() => addComp("DEDUCTION")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Plus size={13} /> Deduction</button>
                </div>
            </div>
            {s.basicSalary !== "" && (
                <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3 text-center max-w-md">
                    <div><div className="text-[11px] text-slate-500">Gross</div><div className="font-semibold">{fmtINR(preview.gross)}</div></div>
                    <div><div className="text-[11px] text-slate-500">Deductions</div><div className="font-semibold text-red-600">{fmtINR(preview.deductions)}</div></div>
                    <div><div className="text-[11px] text-slate-500">Net</div><div className="font-semibold text-emerald-700">{fmtINR(preview.net)}</div></div>
                </div>
            )}
        </div>
    );
}

function AssignmentsStep({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
    const { addToast } = useToast();
    const { data: subjects, isLoading } = useQuery({
        queryKey: ["subjects", "all"],
        queryFn: () => api.getSubjects({ active: true }),
    });
    const [saving, setSaving] = useState<string | null>(null);

    const toggle = async (subjectId: string) => {
        if (!state.teacherId) return;
        if (state.assignedSubjectIds.includes(subjectId)) return; // assignment is additive; remove from Teachers page
        setSaving(subjectId);
        try {
            await api.assignSubjectToTeacher(state.teacherId, subjectId);
            setState(s => ({ ...s, assignedSubjectIds: [...s.assignedSubjectIds, subjectId] }));
            addToast("Subject assigned.", "success");
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Couldn't assign subject.", "error");
        } finally { setSaving(null); }
    };

    return (
        <div>
            <p className="text-xs text-slate-500 mb-3">Optional — assign the subjects this teacher will handle. You can refine assignments later from the Teachers page.</p>
            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" /></div>
            ) : (subjects ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No subjects found for this school yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                    {(subjects as any[]).map(sub => {
                        const assigned = state.assignedSubjectIds.includes(sub.id);
                        return (
                            <button key={sub.id} onClick={() => toggle(sub.id)} disabled={assigned || saving === sub.id}
                                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg border text-left ${assigned ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 hover:bg-slate-50"}`}>
                                <span className="truncate">{sub.name}</span>
                                {saving === sub.id ? <Loader2 size={14} className="animate-spin" /> : assigned ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Plus size={15} className="text-slate-400" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ReviewStep({ state }: { state: WizardState }) {
    const preview = computePreview(Number(state.salary.basicSalary) || 0, state.salary.components);
    const Row = ({ label, value }: { label: string; value: string }) => (
        <div className="flex justify-between py-1.5 border-b border-slate-50 text-sm"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-800">{value || "—"}</span></div>
    );
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 text-emerald-700"><CheckCircle2 size={18} /><span className="font-semibold">Ready to finish</span></div>
            <div className="space-y-4">
                <section>
                    <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-1">Identity</h4>
                    <Row label="Name" value={state.identity.name} />
                    <Row label="Phone" value={state.identity.phone} />
                    <Row label="Qualification" value={state.identity.qualification} />
                </section>
                <section>
                    <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-1">Employment</h4>
                    <Row label="Designation" value={state.employment.designation} />
                    <Row label="Department" value={state.employment.department} />
                    <Row label="Joining date" value={state.employment.joiningDate} />
                </section>
                <section>
                    <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-1">Salary</h4>
                    <Row label="Basic" value={state.salary.basicSalary ? fmtINR(Number(state.salary.basicSalary)) : ""} />
                    <Row label="Net (monthly)" value={state.salary.basicSalary ? fmtINR(preview.net) : ""} />
                </section>
                <section>
                    <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-1">Subjects assigned</h4>
                    <Row label="Count" value={String(state.assignedSubjectIds.length)} />
                </section>
                <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-800">
                    <IdCard size={16} className="shrink-0 mt-0.5" />
                    <span>The teacher can log in with their phone number and upload their own documents (ID, certificates) from the teacher portal after their first sign-in.</span>
                </div>
            </div>
        </div>
    );
}
