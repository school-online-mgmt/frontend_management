import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    X, AlertCircle, User, Phone, Users, Lock, GraduationCap,
    HeartPulse, ChevronLeft, ChevronRight, Check, Loader2, Eye, EyeOff, UserPlus, Link2,
} from "lucide-react";
import api from "../../api/api";

// ── Types ────────────────────────────────────────────────────────────────────
// Mirrors the student-side admission form so the UX is identical for both
// applicants and management-created admissions.
interface FormState {
    // Personal
    firstName: string; middleName: string; lastName: string;
    dateOfBirth: string; placeOfBirth: string;
    gender: "" | "Male" | "Female" | "Other";
    nationality: string; religion: string; bloodGroup: string;

    // Contact
    email: string; phone: string; address: string;
    emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelationship: string;

    // Family
    fatherName: string; fatherOccupation: string; fatherPhone: string;
    motherName: string; motherOccupation: string; motherPhone: string;
    guardianName: string; guardianPhone: string; guardianRelationship: string;

    // Academic
    previousSchoolName: string; previousSchoolAddress: string;
    previousGrade: string; previousYear: string; academicAchievements: string;

    // Medical
    disability: boolean; disabilityDescription: string;
    allergies: string; medicalHistory: string;

    // Account / additional
    extracurricularInterests: string;
    transportOpted: boolean;
    comments: string;
    password: string;

    // Parent login (P4-AC-12) — REQUIRED. Every student must have a parent the
    // school can communicate with. A parent account is created (or an existing
    // one, matched by phone, is linked to this child).
    parentName: string;
    parentRelation: "FATHER" | "MOTHER" | "GUARDIAN";
    parentPhone: string;
    parentEmail: string;
    parentOccupation: string;
    parentPassword: string;
    /** Set to the matched parent's id when the phone belongs to an existing
     *  parent — the child will be LINKED and password/details are read-only. */
    parentLinkedId: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const BLANK: FormState = {
    firstName: "", middleName: "", lastName: "",
    dateOfBirth: "", placeOfBirth: "",
    gender: "", nationality: "", religion: "", bloodGroup: "",
    email: "", phone: "", address: "",
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
    fatherName: "", fatherOccupation: "", fatherPhone: "",
    motherName: "", motherOccupation: "", motherPhone: "",
    guardianName: "", guardianPhone: "", guardianRelationship: "",
    previousSchoolName: "", previousSchoolAddress: "",
    previousGrade: "", previousYear: "", academicAchievements: "",
    disability: false, disabilityDescription: "",
    allergies: "", medicalHistory: "",
    extracurricularInterests: "",
    transportOpted: false,
    comments: "",
    password: "",
    parentName: "",
    parentRelation: "FATHER",
    parentPhone: "",
    parentEmail: "",
    parentOccupation: "",
    parentPassword: "",
    parentLinkedId: "",
};

// ── Validation (per step + final) ───────────────────────────────────────────
const PHONE_RE = /^\d{10}$/;
const validatePhone = (val: string, label = "Phone number"): string | null => {
    if (!val.trim()) return `${label} is required`;
    if (!/^\d+$/.test(val)) return `${label} must contain digits only`;
    if (!PHONE_RE.test(val)) return `${label} must be exactly 10 digits`;
    return null;
};

function runStepValidation(step: number, f: FormState): Errors {
    const e: Errors = {};
    if (step === 1) {
        if (!f.firstName.trim()) e.firstName = "First name is required";
        if (!f.lastName.trim()) e.lastName = "Last name is required";
        if (!f.dateOfBirth.trim()) e.dateOfBirth = "Date of birth is required";
        if (!f.placeOfBirth.trim()) e.placeOfBirth = "Place of birth is required";
        if (!f.gender) e.gender = "Please select a gender";
        if (!f.nationality.trim()) e.nationality = "Nationality is required";
    }
    if (step === 2) {
        if (!f.email.trim()) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address";

        const pe = validatePhone(f.phone);
        if (pe) e.phone = pe;
        if (!f.address.trim()) e.address = "Residential address is required";

        if (!f.emergencyContactName.trim()) e.emergencyContactName = "Emergency contact name is required";
        const epe = validatePhone(f.emergencyContactPhone, "Emergency contact phone");
        if (epe) e.emergencyContactPhone = epe;
        else if (f.phone && f.emergencyContactPhone === f.phone)
            e.emergencyContactPhone = "Emergency contact phone cannot match the student's phone";
        if (!f.emergencyContactRelationship.trim()) e.emergencyContactRelationship = "Relationship is required";
    }
    if (step === 3) {
        if (!f.fatherName.trim()) e.fatherName = "Father's name is required";
        if (!f.motherName.trim()) e.motherName = "Mother's name is required";
    }
    if (step === 4) {
        if (!f.previousSchoolName.trim()) e.previousSchoolName = "Previous school is required";
        if (!f.previousGrade.trim()) e.previousGrade = "Previous grade is required";
    }
    if (step === 6) {
        if (!f.password.trim()) e.password = "Password is required";
        else if (f.password.length < 8) e.password = "Password must be at least 8 characters";
    }
    if (step === 7) {
        if (!f.parentName.trim()) e.parentName = "Parent name is required";
        const ppe = validatePhone(f.parentPhone, "Parent phone");
        if (ppe) e.parentPhone = ppe;
        else if (f.phone && f.parentPhone === f.phone)
            e.parentPhone = "Parent login phone cannot match the student's phone";
        if (f.parentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.parentEmail))
            e.parentEmail = "Enter a valid email address";
        // A password is only needed for a NEW parent; when linking to an
        // existing account (parentLinkedId set) the field is hidden and skipped.
        if (!f.parentLinkedId) {
            if (!f.parentPassword.trim()) e.parentPassword = "Password is required";
            else if (f.parentPassword.length < 8) e.parentPassword = "Password must be at least 8 characters";
        }
    }
    return e;
}

const REQUIRED_KEYS: (keyof FormState)[] = [
    "firstName", "lastName", "dateOfBirth", "placeOfBirth", "gender", "nationality",
    "email", "phone", "address",
    "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship",
    "fatherName", "motherName", "previousSchoolName", "previousGrade",
    "password",
    "parentName", "parentPhone",
];
function getProgress(f: FormState): number {
    const filled = REQUIRED_KEYS.filter(k => {
        const v = f[k];
        if (typeof v === "boolean") return v;
        if (typeof v === "string") return v.trim() !== "";
        return v !== null && v !== undefined;
    });
    return Math.round((filled.length / REQUIRED_KEYS.length) * 100);
}

// ── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, title: "Personal",  desc: "Student's basic details",       icon: User },
    { id: 2, title: "Contact",   desc: "How to reach the student",      icon: Phone },
    { id: 3, title: "Family",    desc: "Parents and guardian info",     icon: Users },
    { id: 4, title: "Academic",  desc: "Previous school history",       icon: GraduationCap },
    { id: 5, title: "Medical",   desc: "Health and accessibility",      icon: HeartPulse },
    { id: 6, title: "Account",   desc: "Login & additional info",       icon: Lock },
    { id: 7, title: "Parent",    desc: "Parent portal login (optional)", icon: UserPlus },
] as const;

// ── Field wrapper ───────────────────────────────────────────────────────────
const Field = ({ label, required, optional, error, children }: {
    label: string; required?: boolean; optional?: boolean; error?: string; children: React.ReactNode;
}) => (
    <div>
        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1">
            {label}
            {required && <span className="text-red-500">*</span>}
            {optional && <span className="text-slate-400 font-normal">(optional)</span>}
        </label>
        {children}
        {error && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
    </div>
);

const inputCls = (hasError?: boolean) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
        hasError ? "border-red-400 bg-red-50/30" : "border-slate-200"
    }`;

// ── Props ────────────────────────────────────────────────────────────────────
type Props = {
    onClose: () => void;
    onCreated: () => void;
};

const NewStudentModal: React.FC<Props> = ({ onClose, onCreated }) => {
    const [form, setForm] = useState<FormState>(BLANK);
    const [errors, setErrors] = useState<Errors>({});
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const set = useCallback(<K extends keyof FormState>(field: K) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const target = e.target as HTMLInputElement;
            const val = target.type === "checkbox" ? target.checked : target.value;
            setForm(prev => ({ ...prev, [field]: val } as FormState));
            setErrors(prev => {
                if (!prev[field]) return prev;
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }, []);

    const setPhone = useCallback(<K extends keyof FormState>(field: K) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
            setForm(prev => ({ ...prev, [field]: digits } as FormState));
            setErrors(prev => {
                if (!prev[field]) return prev;
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }, []);

    const progress = useMemo(() => getProgress(form), [form]);

    // ── Parent lookup (P4-AC-12) ────────────────────────────────────────────
    // When the operator types a 10-digit parent phone, check if a parent
    // already exists at this school. If so, auto-fill and switch to LINK mode
    // (this becomes the 2nd/3rd child of that parent). Debounced.
    const [lookupState, setLookupState] = useState<"idle" | "checking" | "found" | "new">("idle");
    const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastLookedUp = useRef<string>("");

    useEffect(() => {
        const phone = form.parentPhone;
        if (!/^\d{10}$/.test(phone)) { setLookupState("idle"); return; }
        if (phone === lastLookedUp.current) return;
        if (lookupTimer.current) clearTimeout(lookupTimer.current);
        lookupTimer.current = setTimeout(async () => {
            setLookupState("checking");
            try {
                const res = await api.lookupParent(phone);
                lastLookedUp.current = phone;
                if (res.found && res.parent) {
                    setForm(prev => ({
                        ...prev,
                        parentName: res.parent!.name,
                        parentRelation: (["FATHER", "MOTHER", "GUARDIAN"].includes(res.parent!.relation)
                            ? res.parent!.relation : "GUARDIAN") as FormState["parentRelation"],
                        parentEmail: res.parent!.email ?? "",
                        parentOccupation: res.parent!.occupation ?? "",
                        parentPassword: "",
                        parentLinkedId: res.parent!.id,
                    }));
                    setErrors(prev => {
                        const n = { ...prev };
                        delete n.parentName; delete n.parentPassword; delete n.parentEmail;
                        return n;
                    });
                    setLookupState("found");
                } else {
                    // A previously-linked parent phone was edited to a new one.
                    setForm(prev => prev.parentLinkedId ? { ...prev, parentLinkedId: "" } : prev);
                    setLookupState("new");
                }
            } catch {
                setLookupState("idle");
            }
        }, 500);
        return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); };
    }, [form.parentPhone]);

    const goNext = () => {
        const stepErrs = runStepValidation(step, form);
        if (Object.keys(stepErrs).length > 0) {
            setErrors(prev => ({ ...prev, ...stepErrs }));
            return;
        }
        if (step < STEPS.length) setStep(step + 1);
    };
    const goPrev = () => { if (step > 1) setStep(step - 1); };

    const handleSubmit = async () => {
        // Final validation across every step
        const allErrs: Errors = {};
        for (let s = 1; s <= STEPS.length; s++) Object.assign(allErrs, runStepValidation(s, form));
        if (Object.keys(allErrs).length > 0) {
            setErrors(allErrs);
            // Jump to the earliest step with errors
            for (let s = 1; s <= STEPS.length; s++) {
                if (Object.keys(runStepValidation(s, form)).length > 0) {
                    setStep(s);
                    break;
                }
            }
            return;
        }

        setLoading(true);
        setServerError(null);
        try {
            // Backend currently accepts a subset of the collected fields.
            // The richer fields are captured for parity with the public student
            // application form but are intentionally not transmitted yet.
            await api.createStudent({
                firstName: form.firstName,
                middleName: form.middleName || undefined,
                lastName: form.lastName,
                fatherName: form.fatherName,
                motherName: form.motherName,
                gender: form.gender,
                phone: form.phone,
                address: form.address,
                password: form.password,
                disability: form.disability,
                disabilityDescription: form.disabilityDescription || undefined,
                email: form.email,
                dateOfBirth: form.dateOfBirth,
                comments: form.comments || undefined,
                allergies: form.allergies || undefined,
                medicalNotes: form.medicalHistory || undefined,
                bloodGroup: form.bloodGroup || undefined,
                emergencyContactName: form.emergencyContactName || undefined,
                emergencyContactPhone: form.emergencyContactPhone || undefined,
                parent: {
                    name: form.parentName,
                    relation: form.parentRelation,
                    phone: form.parentPhone,
                    email: form.parentEmail || undefined,
                    occupation: form.parentOccupation || undefined,
                    // For an existing parent the backend ignores the password;
                    // send a placeholder so the field is always present.
                    password: form.parentLinkedId ? "linked-existing" : form.parentPassword,
                },
            });
            onCreated();
            onClose();
        } catch (err) {
            const e = err as { response?: { status?: number; data?: { message?: string } } };
            const status = e.response?.status;
            const msg = e.response?.data?.message ?? "";
            setServerError(
                status === 409
                    ? "A student with this phone or email already exists."
                    : status === 400
                        ? msg || "Some fields have invalid data. Please review and try again."
                        : msg || "Failed to create student. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    const isLastStep = step === STEPS.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[94vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
                    <div>
                        <h2 className="text-base font-bold">New Student Admission</h2>
                        <p className="text-indigo-100 text-[11px] mt-0.5">Multi-step admission form — same as the student application process</p>
                    </div>
                    <button data-testid="new-student-modal-close-btn" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Step indicator + progress */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            {STEPS.map(s => {
                                const Icon = s.icon;
                                const done = s.id < step;
                                const active = s.id === step;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => { if (done) setStep(s.id); }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                                            active
                                                ? "bg-indigo-600 text-white"
                                                : done
                                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                                    : "bg-white text-slate-500 border border-slate-200"
                                        }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                                            active ? "bg-white text-indigo-600" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                                        }`}>
                                            {done ? <Check size={8} strokeWidth={3} /> : s.id}
                                        </span>
                                        <Icon size={12} />
                                        <span className="hidden sm:inline">{s.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0 ml-3">{progress}%</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {serverError && (
                        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            {serverError}
                        </div>
                    )}

                    {/* ── STEP 1 — PERSONAL ───────────────────────────────────── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="First Name" required error={errors.firstName}>
                                    <input data-testid="new-student-modal-first-name-input" className={inputCls(!!errors.firstName)} value={form.firstName} onChange={set("firstName")} placeholder="e.g. Rahul" />
                                </Field>
                                <Field label="Middle Name" optional>
                                    <input data-testid="new-student-modal-middle-name-input" className={inputCls()} value={form.middleName} onChange={set("middleName")} placeholder="Optional" />
                                </Field>
                                <Field label="Last Name" required error={errors.lastName}>
                                    <input data-testid="new-student-modal-last-name-input" className={inputCls(!!errors.lastName)} value={form.lastName} onChange={set("lastName")} placeholder="e.g. Sharma" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Date of Birth" required error={errors.dateOfBirth}>
                                    <input data-testid="new-student-modal-date-of-birth-input" type="date" className={inputCls(!!errors.dateOfBirth)} value={form.dateOfBirth} onChange={set("dateOfBirth")} max={new Date().toISOString().split("T")[0]} />
                                </Field>
                                <Field label="Place of Birth" required error={errors.placeOfBirth}>
                                    <input data-testid="new-student-modal-place-of-birth-input" className={inputCls(!!errors.placeOfBirth)} value={form.placeOfBirth} onChange={set("placeOfBirth")} placeholder="City of birth" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Gender" required error={errors.gender}>
                                    <select data-testid="new-student-modal-gender-select" className={inputCls(!!errors.gender)} value={form.gender} onChange={set("gender")}>
                                        <option value="">Select gender</option>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </Field>
                                <Field label="Nationality" required error={errors.nationality}>
                                    <input data-testid="new-student-modal-nationality-input" className={inputCls(!!errors.nationality)} value={form.nationality} onChange={set("nationality")} placeholder="e.g. Indian" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Religion" optional>
                                    <input data-testid="new-student-modal-religion-input" className={inputCls()} value={form.religion} onChange={set("religion")} placeholder="Optional" />
                                </Field>
                                <Field label="Blood Group" optional>
                                    <select data-testid="new-student-modal-blood-group-select" className={inputCls()} value={form.bloodGroup} onChange={set("bloodGroup")}>
                                        <option value="">Select blood group</option>
                                        {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => <option key={bg}>{bg}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2 — CONTACT ────────────────────────────────────── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Email Address" required error={errors.email}>
                                    <input data-testid="new-student-modal-email-input" type="email" className={inputCls(!!errors.email)} value={form.email} onChange={set("email")} placeholder="student@example.com" />
                                </Field>
                                <Field label="Phone Number" required error={errors.phone}>
                                    <input data-testid="new-student-modal-phone-input" className={inputCls(!!errors.phone)} value={form.phone} onChange={setPhone("phone")} placeholder="10-digit number" inputMode="numeric" maxLength={10} />
                                </Field>
                            </div>
                            <Field label="Residential Address" required error={errors.address}>
                                <textarea rows={2} className={`${inputCls(!!errors.address)} resize-none`} value={form.address} onChange={set("address")} placeholder="House no, street, city, pin code" />
                            </Field>

                            <div className="border-t border-slate-100 pt-3">
                                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-2">Emergency Contact</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Field label="Name" required error={errors.emergencyContactName}>
                                        <input className={inputCls(!!errors.emergencyContactName)} value={form.emergencyContactName} onChange={set("emergencyContactName")} placeholder="Full name" />
                                    </Field>
                                    <Field label="Phone" required error={errors.emergencyContactPhone}>
                                        <input className={inputCls(!!errors.emergencyContactPhone)} value={form.emergencyContactPhone} onChange={setPhone("emergencyContactPhone")} placeholder="10-digit number" inputMode="numeric" maxLength={10} />
                                    </Field>
                                    <Field label="Relationship" required error={errors.emergencyContactRelationship}>
                                        <input className={inputCls(!!errors.emergencyContactRelationship)} value={form.emergencyContactRelationship} onChange={set("emergencyContactRelationship")} placeholder="e.g. Uncle" />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3 — FAMILY ─────────────────────────────────────── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-2">Father</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Field label="Name" required error={errors.fatherName}>
                                        <input className={inputCls(!!errors.fatherName)} value={form.fatherName} onChange={set("fatherName")} />
                                    </Field>
                                    <Field label="Occupation" optional>
                                        <input className={inputCls()} value={form.fatherOccupation} onChange={set("fatherOccupation")} />
                                    </Field>
                                    <Field label="Phone" optional>
                                        <input className={inputCls()} value={form.fatherPhone} onChange={setPhone("fatherPhone")} placeholder="10-digit number" inputMode="numeric" maxLength={10} />
                                    </Field>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-3">
                                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-2">Mother</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Field label="Name" required error={errors.motherName}>
                                        <input className={inputCls(!!errors.motherName)} value={form.motherName} onChange={set("motherName")} />
                                    </Field>
                                    <Field label="Occupation" optional>
                                        <input className={inputCls()} value={form.motherOccupation} onChange={set("motherOccupation")} />
                                    </Field>
                                    <Field label="Phone" optional>
                                        <input className={inputCls()} value={form.motherPhone} onChange={setPhone("motherPhone")} placeholder="10-digit number" inputMode="numeric" maxLength={10} />
                                    </Field>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-3">
                                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-2">Guardian (if different from parents)</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Field label="Name" optional>
                                        <input className={inputCls()} value={form.guardianName} onChange={set("guardianName")} />
                                    </Field>
                                    <Field label="Phone" optional>
                                        <input className={inputCls()} value={form.guardianPhone} onChange={setPhone("guardianPhone")} placeholder="10-digit number" inputMode="numeric" maxLength={10} />
                                    </Field>
                                    <Field label="Relationship" optional>
                                        <input className={inputCls()} value={form.guardianRelationship} onChange={set("guardianRelationship")} placeholder="e.g. Grandparent" />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4 — ACADEMIC ───────────────────────────────────── */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Previous School Name" required error={errors.previousSchoolName}>
                                    <input className={inputCls(!!errors.previousSchoolName)} value={form.previousSchoolName} onChange={set("previousSchoolName")} />
                                </Field>
                                <Field label="Previous Grade / Class" required error={errors.previousGrade}>
                                    <input className={inputCls(!!errors.previousGrade)} value={form.previousGrade} onChange={set("previousGrade")} placeholder="e.g. Class 5" />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Previous School Address" optional>
                                    <input className={inputCls()} value={form.previousSchoolAddress} onChange={set("previousSchoolAddress")} />
                                </Field>
                                <Field label="Year of Completion" optional>
                                    <input className={inputCls()} value={form.previousYear} onChange={set("previousYear")} placeholder="e.g. 2024" inputMode="numeric" maxLength={4} />
                                </Field>
                            </div>
                            <Field label="Academic Achievements" optional>
                                <textarea rows={3} className={`${inputCls()} resize-none`} value={form.academicAchievements} onChange={set("academicAchievements")} placeholder="Awards, certificates, scholarships, ranks, etc." />
                            </Field>
                        </div>
                    )}

                    {/* ── STEP 5 — MEDICAL ────────────────────────────────────── */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                                <input type="checkbox" checked={form.disability} onChange={set("disability")} className="w-4 h-4 rounded accent-indigo-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Has a disability</p>
                                    <p className="text-[11px] text-slate-500">Tick if the student has any disability the school should accommodate.</p>
                                </div>
                            </label>
                            {form.disability && (
                                <Field label="Disability Description" optional>
                                    <textarea rows={2} className={`${inputCls()} resize-none`} value={form.disabilityDescription} onChange={set("disabilityDescription")} placeholder="Describe the disability and accommodations needed" />
                                </Field>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Allergies" optional>
                                    <textarea rows={2} className={`${inputCls()} resize-none`} value={form.allergies} onChange={set("allergies")} placeholder="Food, medicine, environmental, etc." />
                                </Field>
                                <Field label="Medical History" optional>
                                    <textarea rows={2} className={`${inputCls()} resize-none`} value={form.medicalHistory} onChange={set("medicalHistory")} placeholder="Any chronic conditions or relevant history" />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 6 — ACCOUNT & EXTRA ────────────────────────────── */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <Field label="Account Password" required error={errors.password}>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className={`${inputCls(!!errors.password)} pr-10`}
                                        value={form.password}
                                        onChange={set("password")}
                                        placeholder="Min 8 characters"
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        aria-label={showPassword ? "Hide password" : "Show password"}>
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Student will use this to log in to their portal.</p>
                            </Field>

                            <Field label="Extracurricular Interests" optional>
                                <textarea rows={2} className={`${inputCls()} resize-none`} value={form.extracurricularInterests} onChange={set("extracurricularInterests")} placeholder="Sports, music, arts, debate, etc." />
                            </Field>

                            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                                <input type="checkbox" checked={form.transportOpted} onChange={set("transportOpted")} className="w-4 h-4 rounded accent-indigo-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Opt in for school transport</p>
                                    <p className="text-[11px] text-slate-500">A transport zone can be assigned during the admission step.</p>
                                </div>
                            </label>

                            <Field label="Comments / Notes" optional>
                                <textarea rows={2} className={`${inputCls()} resize-none`} value={form.comments} onChange={set("comments")} placeholder="Anything else the school should know about the student" />
                            </Field>
                        </div>
                    )}

                    {/* ── STEP 7 — PARENT LOGIN (P4-AC-12) ────────────────────── */}
                    {step === 7 && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 border border-indigo-200 bg-indigo-50/60 rounded-lg">
                                <UserPlus size={16} className="shrink-0 mt-0.5 text-indigo-600" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Parent portal login <span className="text-red-500">*</span></p>
                                    <p className="text-[11px] text-slate-500">
                                        Every student must have a parent — a person the school can communicate with and who signs into
                                        the student portal to view fees, attendance, notices and give consents (not necessarily the
                                        biological parent). If they already have a child here, enter their phone to link this child to the same account.
                                    </p>
                                </div>
                            </div>

                            <>
                                    <Field label="Parent Login Phone" required error={errors.parentPhone}>
                                        <div className="relative">
                                            <input
                                                data-testid="new-student-modal-parent-phone-input"
                                                className={`${inputCls(!!errors.parentPhone)} pr-24`}
                                                value={form.parentPhone}
                                                onChange={setPhone("parentPhone")}
                                                placeholder="10-digit number (their login ID)"
                                                inputMode="numeric"
                                                maxLength={10}
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold">
                                                {lookupState === "checking" && (
                                                    <span className="flex items-center gap-1 text-slate-400"><Loader2 size={11} className="animate-spin" /> Checking…</span>
                                                )}
                                                {lookupState === "found" && (
                                                    <span className="flex items-center gap-1 text-emerald-600"><Link2 size={11} /> Existing parent</span>
                                                )}
                                                {lookupState === "new" && (
                                                    <span className="flex items-center gap-1 text-indigo-500"><UserPlus size={11} /> New parent</span>
                                                )}
                                            </span>
                                        </div>
                                    </Field>

                                    {form.parentLinkedId && (
                                        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-800">
                                            <Link2 size={14} className="shrink-0 mt-0.5" />
                                            <span>
                                                This phone already belongs to a parent at this school. This child will be
                                                <strong> linked to their existing account</strong> — their name and password stay unchanged.
                                            </span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Parent Name" required error={errors.parentName}>
                                            <input
                                                data-testid="new-student-modal-parent-name-input"
                                                className={inputCls(!!errors.parentName)}
                                                value={form.parentName}
                                                onChange={set("parentName")}
                                                disabled={!!form.parentLinkedId}
                                                placeholder="Full name"
                                            />
                                        </Field>
                                        <Field label="Relation" required>
                                            <select
                                                data-testid="new-student-modal-parent-relation-select"
                                                className={inputCls()}
                                                value={form.parentRelation}
                                                onChange={set("parentRelation")}
                                                disabled={!!form.parentLinkedId}
                                            >
                                                <option value="FATHER">Father</option>
                                                <option value="MOTHER">Mother</option>
                                                <option value="GUARDIAN">Guardian</option>
                                            </select>
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Parent Email" optional error={errors.parentEmail}>
                                            <input
                                                data-testid="new-student-modal-parent-email-input"
                                                type="email"
                                                className={inputCls(!!errors.parentEmail)}
                                                value={form.parentEmail}
                                                onChange={set("parentEmail")}
                                                disabled={!!form.parentLinkedId}
                                                placeholder="parent@example.com"
                                            />
                                        </Field>
                                        <Field label="Occupation" optional>
                                            <input
                                                data-testid="new-student-modal-parent-occupation-input"
                                                className={inputCls()}
                                                value={form.parentOccupation}
                                                onChange={set("parentOccupation")}
                                                disabled={!!form.parentLinkedId}
                                                placeholder="e.g. Engineer"
                                            />
                                        </Field>
                                    </div>

                                    {!form.parentLinkedId && (
                                        <Field label="Parent Account Password" required error={errors.parentPassword}>
                                            <input
                                                data-testid="new-student-modal-parent-password-input"
                                                type="text"
                                                className={inputCls(!!errors.parentPassword)}
                                                value={form.parentPassword}
                                                onChange={set("parentPassword")}
                                                placeholder="Min 8 characters"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">The parent uses this to log in; they'll be asked to change it on first sign-in.</p>
                                        </Field>
                                    )}
                            </>
                        </div>
                    )}
                </div>

                {/* Footer / step controls */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between rounded-b-2xl shrink-0">
                    <button
                        type="button"
                        onClick={step === 1 ? onClose : goPrev}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white transition disabled:opacity-50"
                    >
                        <ChevronLeft size={13} /> {step === 1 ? "Cancel" : "Back"}
                    </button>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                        Step <span className="font-bold text-slate-700">{step}</span> of {STEPS.length} — {STEPS[step - 1]!.desc}
                    </p>
                    {isLastStep ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                        >
                            {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            {loading ? "Creating…" : "Create Admission"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={goNext}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                        >
                            Next <ChevronRight size={13} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewStudentModal;
