import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    UserPlus, Briefcase, Banknote, BookOpen, CheckCircle2, Loader2, Plus, X,
    ChevronRight, ChevronLeft, IdCard,
} from "lucide-react";
import api from "../../api/api";
import type { HrComponent } from "../../api/api";
import { useToast } from "../../context/ToastContext";

/**
 * Guided teacher onboarding, in a modal opened from the Teachers page.
 *
 * NOTHING IS WRITTEN UNTIL "Finish". The previous version was a standalone page
 * that committed each step as you passed it and kept a localStorage draft, so
 * abandoning it halfway left a real teacher in the school with no employment
 * record, no salary and no subjects — and the half-built draft would silently
 * reappear the next time anyone opened the page. Steps here only validate; the
 * whole thing submits once, in order, at the end.
 *
 * Identity is the only mandatory step. Employment, salary and subjects are all
 * optional and can be completed later from HR & Payroll or the Teachers page.
 */

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
    identity: { name: string; gender: string; age: string; qualification: string; phone: string; email: string; password: string; address: string };
    employment: { employeeCode: string; designation: string; department: string; joiningDate: string; employmentType: string };
    salary: { basicSalary: string; components: HrComponent[] };
    /** subjectId → the sectionIds this teacher will teach that subject in. */
    subjectSections: Record<string, string[]>;
}

const EMPTY: WizardState = {
    identity: { name: "", gender: "Male", age: "", qualification: "", phone: "", email: "", password: "", address: "" },
    employment: { employeeCode: "", designation: "", department: "", joiningDate: today(), employmentType: "FULL_TIME" },
    salary: { basicSalary: "", components: [] },
    subjectSections: {},
};

export function computePreview(basic: number, components: HrComponent[]) {
    let gross = basic, deductions = 0;
    for (const c of components) {
        const amt = c.calc === "PERCENT_OF_BASIC" ? Math.round((basic * c.value) / 100) : c.value;
        if (c.type === "EARNING") gross += amt; else deductions += amt;
    }
    return { gross, deductions, net: gross - deductions };
}

export default function TeacherOnboardingModal({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
    const { addToast } = useToast();
    const [state, setState] = useState<WizardState>(EMPTY);
    const [stepIdx, setStepIdx] = useState(0);
    const [busy, setBusy] = useState(false);
    const step = STEPS[stepIdx]!.key;

    const patch = <K extends keyof WizardState>(k: K, v: Partial<WizardState[K]>) =>
        setState(s => ({ ...s, [k]: { ...(s[k] as any), ...v } }));

    /** Client-side gate for the current step. No network calls. */
    function validate(which: StepKey): string | null {
        if (which === "identity") {
            const id = state.identity;
            if (!id.name.trim()) return "Full name is required.";
            if (!id.qualification.trim()) return "Qualification is required.";
            if (id.phone.length !== 10) return "Phone must be exactly 10 digits.";
            const age = Number(id.age);
            if (!id.age || !Number.isInteger(age) || age < 18 || age > 100) return "Age must be a whole number between 18 and 100.";
            if (id.email && !/^\S+@\S+\.\S+$/.test(id.email)) return "That email address doesn't look right.";
            if (id.password && id.password.length < 6) return "A temporary password must be at least 6 characters.";
        }
        if (which === "salary") {
            const s = state.salary;
            if (s.basicSalary !== "" && !(Number(s.basicSalary) > 0)) return "Basic salary must be a positive amount, or leave it blank.";
            if (s.components.some(c => !c.label.trim())) return "Every salary component needs a label.";
            if (s.components.some(c => !(c.value >= 0))) return "Salary component amounts cannot be negative.";
        }
        return null;
    }

    const next = () => {
        const err = validate(step);
        if (err) { addToast(err, "error"); return; }
        setStepIdx(i => Math.min(STEPS.length - 1, i + 1));
    };
    const back = () => setStepIdx(i => Math.max(0, i - 1));

    /**
     * Single submit. Ordered because each call needs the id from the first, so a
     * later failure is reported against what DID land rather than pretending the
     * whole thing failed — the teacher exists and should not be created twice.
     */
    const finish = async () => {
        for (const s of STEPS.map(s => s.key)) {
            const err = validate(s);
            if (err) { addToast(err, "error"); return; }
        }

        setBusy(true);
        let teacherId: string | null = null;
        try {
            const id = state.identity;
            const res = await api.createTeacherEntry({
                name: id.name.trim(), gender: id.gender, age: Number(id.age),
                qualification: id.qualification.trim(), phone: id.phone,
                email: id.email || undefined, address: id.address || undefined,
                password: id.password || undefined,
            });
            teacherId = res?.teacher?.id ?? null;
            if (!teacherId) throw new Error("Teacher was created but no id came back.");

            const e = state.employment;
            await api.saveHrProfile("TEACHER", teacherId, {
                employeeCode: e.employeeCode || null, designation: e.designation || null,
                department: e.department || null, joiningDate: e.joiningDate || null,
                employmentType: e.employmentType,
            });

            if (state.salary.basicSalary !== "") {
                await api.saveHrSalary("TEACHER", teacherId, {
                    basicSalary: Number(state.salary.basicSalary),
                    effectiveFrom: e.joiningDate || today(),
                    components: state.salary.components,
                });
            }

            // Assign the teacher to each picked (subject, section) via the real
            // per-section endpoint. A duplicate returns 409, which we treat as
            // "already assigned" rather than an error. These run after the
            // teacher exists and are individually caught, so a single failure
            // never rolls back the onboarding — it just gets reported.
            let assigned = 0;
            let failed = 0;
            for (const [subjectId, sectionIds] of Object.entries(state.subjectSections)) {
                for (const sectionId of sectionIds) {
                    try {
                        await api.addTeacherToSubject(subjectId, { teacherId, sectionId });
                        assigned++;
                    } catch (e: any) {
                        if (e?.response?.status === 409) { assigned++; continue; }
                        failed++;
                    }
                }
            }
            addToast(
                failed > 0
                    ? `${state.identity.name} onboarded; ${assigned} subject-section assignment${assigned === 1 ? "" : "s"} saved, ${failed} failed — finish them from Subjects → Assignments.`
                    : assigned > 0
                        ? `${state.identity.name} onboarded and assigned to ${assigned} subject-section${assigned === 1 ? "" : "s"}.`
                        : `${state.identity.name} onboarded.`,
                failed > 0 ? "error" : "success",
            );
            onDone?.();
            onClose();
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? "Onboarding failed.";
            addToast(
                teacherId
                    ? `${state.identity.name} was created, but a later step failed: ${msg}. Finish the remaining details from HR & Payroll.`
                    : msg,
                "error",
            );
            // The teacher exists — close so a retry can't create a duplicate.
            if (teacherId) { onDone?.(); onClose(); }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={busy ? undefined : onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Onboard a teacher"
                data-testid="teacher-onboard-modal"
                data-step={step}
                className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div>
                        <h3 className="font-semibold text-slate-800">Onboard a Teacher</h3>
                        <p className="text-xs text-slate-500">Identity, employment, salary and subjects — saved when you finish</p>
                    </div>
                    <button data-testid="teacher-onboard-close-btn" onClick={onClose} disabled={busy} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-40"><X size={18} /></button>
                </div>

                <div className="p-5">
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

                    {step === "identity" && <IdentityStep state={state} patch={patch} />}
                    {step === "employment" && <EmploymentStep state={state} patch={patch} />}
                    {step === "salary" && <SalaryStep state={state} setState={setState} />}
                    {step === "assignments" && <AssignmentsStep state={state} setState={setState} />}
                    {step === "review" && <ReviewStep state={state} />}

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                        <button data-testid="teacher-onboard-back-btn" onClick={back} disabled={stepIdx === 0 || busy} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                            <ChevronLeft size={15} /> Back
                        </button>
                        <span className="text-xs text-slate-400">Step {stepIdx + 1} of {STEPS.length}</span>
                        {step === "review" ? (
                            <button data-testid="teacher-onboard-finish-btn" onClick={finish} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                                {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Finish &amp; create
                            </button>
                        ) : (
                            <button data-testid="teacher-onboard-next-btn" onClick={next} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
                                Next <ChevronRight size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Field primitives ──────────────────────────────────────────────────────── */
const Field = ({ testId, label, value, onChange, type = "text", placeholder }: {
    testId: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
    <label className="block">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input data-testid={testId} type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
    </label>
);

/* ── Steps ─────────────────────────────────────────────────────────────────── */
function IdentityStep({ state, patch }: { state: WizardState; patch: any }) {
    const id = state.identity;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field testId="teacher-onboard-name-input" label="Full name" value={id.name} onChange={v => patch("identity", { name: v })} />
            <label className="block">
                <span className="text-xs font-medium text-slate-600">Gender</span>
                <select data-testid="teacher-onboard-gender-select" value={id.gender} onChange={e => patch("identity", { gender: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {["Male", "Female", "Other"].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </label>
            <Field testId="teacher-onboard-age-input" label="Age" type="number" value={id.age} onChange={v => patch("identity", { age: v })} />
            <Field testId="teacher-onboard-qualification-input" label="Qualification" value={id.qualification} onChange={v => patch("identity", { qualification: v })} />
            <Field testId="teacher-onboard-phone-input" label="Phone (10 digits)" value={id.phone} onChange={v => patch("identity", { phone: v.replace(/\D/g, "").slice(0, 10) })} />
            <Field testId="teacher-onboard-email-input" label="Email (optional)" type="email" value={id.email} onChange={v => patch("identity", { email: v })} />
            <Field testId="teacher-onboard-password-input" label="Temporary password (optional)" value={id.password} onChange={v => patch("identity", { password: v })} placeholder="Defaults to their phone number" />
            <Field testId="teacher-onboard-address-input" label="Address (optional)" value={id.address} onChange={v => patch("identity", { address: v })} />
        </div>
    );
}

function EmploymentStep({ state, patch }: { state: WizardState; patch: any }) {
    const e = state.employment;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field testId="teacher-onboard-employee-code-input" label="Employee code" value={e.employeeCode} onChange={v => patch("employment", { employeeCode: v })} />
            <Field testId="teacher-onboard-designation-input" label="Designation" value={e.designation} onChange={v => patch("employment", { designation: v })} placeholder="e.g. PGT Mathematics" />
            <Field testId="teacher-onboard-department-input" label="Department" value={e.department} onChange={v => patch("employment", { department: v })} placeholder="e.g. Science" />
            <Field testId="teacher-onboard-joining-date-input" label="Joining date" type="date" value={e.joiningDate} onChange={v => patch("employment", { joiningDate: v })} />
            <label className="block">
                <span className="text-xs font-medium text-slate-600">Employment type</span>
                <select data-testid="teacher-onboard-employment-type-select" value={e.employmentType} onChange={ev => patch("employment", { employmentType: ev.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
            </label>
        </div>
    );
}

export function SalaryStep({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
    const s = state.salary;
    const setSalary = (p: Partial<WizardState["salary"]>) => setState(st => ({ ...st, salary: { ...st.salary, ...p } }));
    const addComp = (type: "EARNING" | "DEDUCTION") => setSalary({ components: [...s.components, { type, label: "", calc: "FIXED", value: 0 }] });
    const upd = (i: number, p: Partial<HrComponent>) => setSalary({ components: s.components.map((c, idx) => idx === i ? { ...c, ...p } : c) });
    const rm = (i: number) => setSalary({ components: s.components.filter((_, idx) => idx !== i) });
    const preview = computePreview(Number(s.basicSalary) || 0, s.components);

    return (
        <div data-testid="teacher-onboard-salary-step">
            <p className="text-xs text-slate-500 mb-3">Optional — leave blank to set salary later from HR &amp; Payroll.</p>
            <div className="max-w-xs">
                <Field testId="teacher-onboard-basic-salary-input" label="Basic salary (₹ / month)" type="number" value={s.basicSalary} onChange={v => setSalary({ basicSalary: v })} />
            </div>
            <div className="mt-4 space-y-2">
                {s.components.map((c, i) => (
                    <div key={i} data-testid="teacher-onboard-component-row" data-type={c.type} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.type === "EARNING" ? "bg-emerald-500" : "bg-red-500"}`} />
                        <input data-testid="teacher-onboard-component-label-input" value={c.label} placeholder={c.type === "EARNING" ? "e.g. HRA" : "e.g. PF"} onChange={e => upd(i, { label: e.target.value })} className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg" />
                        <select data-testid="teacher-onboard-component-calc-select" value={c.calc} onChange={e => upd(i, { calc: e.target.value as any })} className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg">
                            <option value="FIXED">₹</option><option value="PERCENT_OF_BASIC">% of basic</option>
                        </select>
                        <input data-testid="teacher-onboard-component-value-input" type="number" min={0} value={c.value} onChange={e => upd(i, { value: Number(e.target.value) })} className="w-24 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-right" />
                        <button data-testid="teacher-onboard-component-remove-btn" onClick={() => rm(i)} className="p-1.5 text-slate-400 hover:text-red-600"><X size={15} /></button>
                    </div>
                ))}
                <div className="flex gap-2 pt-1">
                    <button data-testid="teacher-onboard-add-earning-btn" onClick={() => addComp("EARNING")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"><Plus size={13} /> Earning</button>
                    <button data-testid="teacher-onboard-add-deduction-btn" onClick={() => addComp("DEDUCTION")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Plus size={13} /> Deduction</button>
                </div>
            </div>
            {s.basicSalary !== "" && (
                <div data-testid="teacher-onboard-salary-preview" data-gross={preview.gross} data-deductions={preview.deductions} data-net={preview.net}
                    className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3 text-center max-w-md">
                    <div><div className="text-[11px] text-slate-500">Gross</div><div className="font-semibold">{fmtINR(preview.gross)}</div></div>
                    <div><div className="text-[11px] text-slate-500">Deductions</div><div className="font-semibold text-red-600">{fmtINR(preview.deductions)}</div></div>
                    <div><div className="text-[11px] text-slate-500">Net</div><div className="font-semibold text-emerald-700">{fmtINR(preview.net)}</div></div>
                </div>
            )}
        </div>
    );
}

function AssignmentsStep({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
    const { data: subjects, isLoading } = useQuery({
        queryKey: ["subjects", "all"],
        queryFn: () => api.getSubjects({ active: true }),
    });

    // Pick a subject (add/remove its key); an empty array means "picked, no
    // sections chosen yet". Assignments are written at Finish with the rest.
    const togglePick = (subjectId: string) => setState(s => {
        const next = { ...s.subjectSections };
        if (subjectId in next) delete next[subjectId]; else next[subjectId] = [];
        return { ...s, subjectSections: next };
    });
    const toggleSection = (subjectId: string, sectionId: string) => setState(s => {
        const cur = s.subjectSections[subjectId] ?? [];
        const nextSecs = cur.includes(sectionId) ? cur.filter(x => x !== sectionId) : [...cur, sectionId];
        return { ...s, subjectSections: { ...s.subjectSections, [subjectId]: nextSecs } };
    });

    return (
        <div>
            <p className="text-xs text-slate-500 mb-3">Optional — pick each subject this teacher handles, then tick the sections they teach it in. You can refine this later from Subjects → Assignments.</p>
            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" /></div>
            ) : (subjects ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No subjects found for this school yet.</p>
            ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(subjects as any[]).map(sub => (
                        <SubjectRow key={sub.id} sub={sub}
                            picked={sub.id in state.subjectSections}
                            pickedSections={state.subjectSections[sub.id] ?? []}
                            onTogglePick={() => togglePick(sub.id)}
                            onToggleSection={(secId) => toggleSection(sub.id, secId)} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SubjectRow({ sub, picked, pickedSections, onTogglePick, onToggleSection }: {
    sub: any; picked: boolean; pickedSections: string[];
    onTogglePick: () => void; onToggleSection: (sectionId: string) => void;
}) {
    // Load candidate sections only once the subject is picked (server derives
    // them: subject → its courses → their classes → sections).
    const { data, isLoading } = useQuery({
        queryKey: ["subject-sections", sub.id],
        queryFn: () => api.getSubjectSections(sub.id),
        enabled: picked,
    });
    const sections = data?.sections ?? [];

    return (
        <div data-testid="teacher-onboard-subject-row" data-subject-name={sub.name} data-selected={picked}
            className={`rounded-lg border ${picked ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
            <button type="button" data-testid="teacher-onboard-subject-option" data-subject-name={sub.name} data-selected={picked}
                onClick={onTogglePick}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left">
                <span className="truncate font-medium text-slate-800">{sub.name}</span>
                {picked ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Plus size={15} className="text-slate-400" />}
            </button>
            {picked && (
                <div className="px-3 pb-2.5">
                    {isLoading ? (
                        <span className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading sections…</span>
                    ) : sections.length === 0 ? (
                        <span className="text-xs text-amber-600">Not part of any course yet — add this subject to a course to assign sections.</span>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {sections.map((sec: any) => {
                                const on = pickedSections.includes(sec.id);
                                return (
                                    <button key={sec.id} type="button"
                                        data-testid="teacher-onboard-section-option" data-section-name={`${sec.className} ${sec.name}`} data-selected={on}
                                        onClick={() => onToggleSection(sec.id)}
                                        className={`px-2.5 py-1 text-xs rounded-md border ${on ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                                        {sec.className} · {sec.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
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
        <div data-testid="teacher-onboard-review">
            <div className="flex items-center gap-2 mb-3 text-emerald-700"><CheckCircle2 size={18} /><span className="font-semibold">Nothing has been saved yet</span></div>
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
                    <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-1">Subjects</h4>
                    <Row label="Subjects picked" value={String(Object.keys(state.subjectSections).length)} />
                    <Row label="Section assignments" value={String(Object.values(state.subjectSections).reduce((n, arr) => n + arr.length, 0))} />
                </section>
                <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-800">
                    <IdCard size={16} className="shrink-0 mt-0.5" />
                    <span>The teacher signs in with their phone number, is asked to set a new password, and can then upload their own documents from the teacher portal.</span>
                </div>
            </div>
        </div>
    );
}
