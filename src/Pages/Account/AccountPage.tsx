import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, Globe, Hash, Calendar,
  AlertTriangle,
  Shield, Phone, Mail, ExternalLink, RefreshCw,
  Edit2, X, Check, MapPin, CreditCard,
  AlertCircle, FileText, Settings2, UserCircle, GraduationCap, Loader2,
} from "lucide-react";
import api from "../../api/api";
import PaymentSettingsTab from "./PaymentSettingsTab";
import EmailServiceTab from "./EmailServiceTab";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";

// ── Constants ─────────────────────────────────────────────────────────────────

const SCHOOL_TYPES = [
  { value: 'public',        label: 'Government / Public',  desc: 'Funded and run by the government' },
  { value: 'private',       label: 'Private',              desc: 'Independently owned and operated' },
  { value: 'aided',         label: 'Government-Aided',     desc: 'Partial government funding' },
  { value: 'international', label: 'International',        desc: 'International curriculum (IB / Cambridge)' },
];

const BOARD_OPTIONS = [
  'CBSE', 'ICSE / ISC', 'State Board', 'IB (International Baccalaureate)',
  'Cambridge IGCSE', 'NIOS', 'Other',
];

const SUB_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  trial:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    label: "Free Trial"  },
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active"      },
  expired:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Expired"     },
  cancelled:{ bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400",   label: "Cancelled"   },
};


// ── Shared input styles ───────────────────────────────────────────────────────

const inp = "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white placeholder:text-slate-400 transition-colors";
const lbl = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

// ── Radio card for school type ────────────────────────────────────────────────

function SchoolTypeRadio({ value, label, desc, selected, onChange }: {
  value: string; label: string; desc: string; selected: boolean; onChange: (v: string) => void;
}) {
  return (
    <label className={`relative flex items-start gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all
      ${selected
        ? 'border-violet-500 bg-violet-50/60 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]'
        : 'border-slate-200 bg-white hover:border-slate-300'}`}
      onClick={() => onChange(value)}>
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors
        ${selected ? 'border-violet-600' : 'border-slate-300'}`}>
        {selected && <div className="w-2 h-2 bg-violet-600 rounded-full" />}
      </div>
      <div>
        <p className={`text-sm font-semibold ${selected ? 'text-violet-800' : 'text-slate-800'}`}>{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
    </label>
  );
}

// ── Config form type ──────────────────────────────────────────────────────────

type ConfigForm = {
  schoolName: string; tagline: string; bio: string;
  address: string; city: string; state: string; country: string; pincode: string;
  phone: string; email: string; website: string; footerText: string;
  acceptingApplications: boolean; acceptingOnlineFees: boolean;
  establishedYear: string; boardAffiliation: string; schoolType: string;
  principalName: string; emergencyContact: string;
};

const emptyForm = (): ConfigForm => ({
  schoolName: '', tagline: '', bio: '', address: '', city: '', state: '',
  country: 'India', pincode: '', phone: '', email: '', website: '', footerText: '',
  acceptingApplications: false, acceptingOnlineFees: false,
  establishedYear: '', boardAffiliation: '', schoolType: '', principalName: '', emergencyContact: '',
});

function configToForm(c: any): ConfigForm {
  if (!c) return emptyForm();
  return {
    schoolName: c.schoolName ?? '', tagline: c.tagline ?? '', bio: c.bio ?? '',
    address: c.address ?? '', city: c.city ?? '', state: c.state ?? '',
    country: c.country ?? 'India', pincode: c.pincode ?? '',
    phone: c.phone ?? '', email: c.email ?? '', website: c.website ?? '',
    footerText: c.footerText ?? '',
    acceptingApplications: c.acceptingApplications ?? false,
    acceptingOnlineFees: c.acceptingOnlineFees ?? false,
    establishedYear: c.establishedYear ? String(c.establishedYear) : '',
    boardAffiliation: c.boardAffiliation ?? '',
    schoolType: c.schoolType ?? '', principalName: c.principalName ?? '',
    emergencyContact: c.emergencyContact ?? '',
  };
}

// ── Admissions & Operations (always-visible; instant toggles) ─────────────────
// Online admission acceptance is per-session (a school can accept for the new
// year while the old one winds down), so we surface a toggle for each ACTIVE /
// ENDING session here as a one-stop operational control. Writes go to the same
// per-session endpoint the Sessions page uses (`PATCH /session/:id/accept-admission`).
function AdmissionsOperationsCard({ isAdmin }: { isAdmin: boolean }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getSessions()
      .then((s: any[]) => setSessions((s ?? []).filter((x: any) => x.status === "ACTIVE" || x.status === "ENDING")))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (session: any, next: boolean) => {
    setBusyId(session.id);
    try {
      await api.updateAcceptAdmission(session.id, next);
      setSessions(prev => prev.map(s => (s.id === session.id ? { ...s, acceptAdmission: next } : s)));
      setFlash({ ok: true, text: next ? `Admissions opened for ${session.name}.` : `Admissions closed for ${session.name}.` });
    } catch {
      setFlash({ ok: false, text: "Couldn't update admissions. Please try again." });
    } finally {
      setBusyId(null);
      setTimeout(() => setFlash(null), 3000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <GraduationCap size={14} className="text-slate-400" />
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admissions &amp; Operations</p>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-xs text-slate-500">
          Control whether the public admission form accepts new applications. This is set per academic session.
        </p>

        {flash && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${flash.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {flash.ok ? <Check size={13} /> : <AlertCircle size={13} />} {flash.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-3"><Loader2 size={15} className="animate-spin" /> Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No active session. Admissions open once your school is subscribed to a session.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const on = !!s.acceptAdmission;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 border border-slate-200 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400 shrink-0" /> {s.name}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {on ? "Accepting new admission applications." : "Not accepting applications."}
                    </p>
                  </div>
                  <button
                    onClick={() => isAdmin && toggle(s, !on)}
                    disabled={!isAdmin || busyId === s.id}
                    title={isAdmin ? "" : "Only ADMIN / PRINCIPAL / DIRECTOR can change this."}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60
                      ${on ? "bg-emerald-500" : "bg-slate-300"} ${!isAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {busyId === s.id
                      ? <Loader2 size={12} className="animate-spin text-white mx-auto" />
                      : <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-slate-400">
          Tip: full end-of-session controls (promotions, closing a year) live on the <span className="font-semibold">Sessions</span> page.
        </p>
      </div>
    </div>
  );
}

// ── Tab: School Profile ───────────────────────────────────────────────────────

function SchoolProfileTab({ user }: { user: any }) {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ConfigForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ConfigForm, string>>>({});

  const isAdmin = ['ADMIN', 'PRINCIPAL', 'DIRECTOR'].includes(user?.role ?? '');

  useEffect(() => {
    api.getTenantConfig()
      .then(res => { setCfg(res.config); setForm(configToForm(res.config)); })
      .finally(() => setLoading(false));
  }, []);

  const set = useCallback((f: keyof ConfigForm, v: string | boolean) =>
    setForm(p => ({ ...p, [f]: v })), []);

  const validate = () => {
    const errs: Partial<Record<keyof ConfigForm, string>> = {};
    if (!form.schoolName.trim()) errs.schoolName = "School name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address.";
    if (form.website && !/^https?:\/\/.+/.test(form.website)) errs.website = "URL must start with http:// or https://";
    if (form.establishedYear && (parseInt(form.establishedYear) < 1800 || parseInt(form.establishedYear) > new Date().getFullYear())) {
      errs.establishedYear = `Year must be between 1800 and ${new Date().getFullYear()}.`;
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setError(null);
    try {
      const res = await api.updateTenantConfig({
        schoolName: form.schoolName.trim(),
        tagline: form.tagline.trim() || null,
        bio: form.bio.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || 'India',
        pincode: form.pincode.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        footerText: form.footerText.trim() || null,
        acceptingApplications: form.acceptingApplications,
        acceptingOnlineFees: form.acceptingOnlineFees,
        establishedYear: form.establishedYear ? parseInt(form.establishedYear) : null,
        boardAffiliation: form.boardAffiliation.trim() || null,
        schoolType: form.schoolType || null,
        principalName: form.principalName.trim() || null,
        emergencyContact: form.emergencyContact.trim() || null,
      });
      setCfg(res.config);
      setForm(configToForm(res.config));
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setForm(configToForm(cfg)); setEditing(false); setError(null); setValidationErrors({}); };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
      <RefreshCw size={18} className="animate-spin" />
      <span className="text-sm">Loading school profile…</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">School Profile</h3>
          <p className="text-xs text-slate-500 mt-0.5">This information is shown on your school's public portal and student portal.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {savedFlash && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <Check size={12} /> Saved
            </span>
          )}
          {isAdmin && !editing && (
            <button data-testid="account-edit-btn" onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
              <Edit2 size={13} /> Edit Profile
            </button>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <button data-testid="account-cancel-btn" onClick={handleCancel}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60">
                <X size={13} /> Cancel
              </button>
              <button data-testid="account-save-btn" onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Operational toggles — admissions per session (always visible). */}
      <AdmissionsOperationsCard isAdmin={isAdmin} />

      {/*
        Other operational toggles live where they belong:
          - "Accepting Student Applications" → moved to per-session control on
            the Sessions page (each session has its own acceptAdmission flag).
          - "Online Fee Payments" → moved to the Payments tab where it lives
            next to the Razorpay credentials it depends on, and is gated on
            those credentials being configured.
      */}

      {/* Main config - view or edit */}
      {!cfg && !editing ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Settings2 size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">School profile not set up yet.</p>
          {isAdmin && (
            <button onClick={() => setEditing(true)}
              className="mt-4 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Set Up Profile
            </button>
          )}
        </div>
      ) : editing ? (
        /* ── EDIT FORM ── */
        <div className="space-y-5">

          {/* Identity */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">School Identity</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={lbl}>School Name <span className="text-red-400 normal-case">*</span></label>
                <input value={form.schoolName} onChange={e => set('schoolName', e.target.value)}
                  placeholder="e.g. Sunrise Public School" className={`${inp} ${validationErrors.schoolName ? 'border-red-300 focus:ring-red-200' : ''}`} />
                {validationErrors.schoolName && <p className="text-xs text-red-500 mt-1">{validationErrors.schoolName}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Tagline <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <input value={form.tagline} onChange={e => set('tagline', e.target.value)}
                  placeholder="Empowering Minds, Shaping Futures" className={inp} />
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>About the School <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                  rows={3} placeholder="A brief introduction to your school's history, values, and mission…"
                  className={`${inp} resize-none`} />
              </div>
              <div>
                <label className={lbl}>Principal Name</label>
                <input value={form.principalName} onChange={e => set('principalName', e.target.value)}
                  placeholder="Dr. Meera Sharma" className={inp} />
              </div>
              <div>
                <label className={lbl}>Established Year</label>
                <input value={form.establishedYear} onChange={e => set('establishedYear', e.target.value)}
                  placeholder="1998" type="number" min="1800" max={new Date().getFullYear()}
                  className={`${inp} ${validationErrors.establishedYear ? 'border-red-300' : ''}`} />
                {validationErrors.establishedYear && <p className="text-xs text-red-500 mt-1">{validationErrors.establishedYear}</p>}
              </div>
            </div>
          </div>

          {/* School Type */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">School Type</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCHOOL_TYPES.map(t => (
                <SchoolTypeRadio key={t.value} value={t.value} label={t.label} desc={t.desc}
                  selected={form.schoolType === t.value} onChange={v => set('schoolType', v)} />
              ))}
            </div>
          </div>

          {/* Board & Academics */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academics</p>
            </div>
            <div className="p-5">
              <label className={lbl}>Board Affiliation</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BOARD_OPTIONS.map(b => (
                  <label key={b} onClick={() => set('boardAffiliation', b)}
                    className={`flex items-center gap-2 px-3 py-2.5 border-2 rounded-xl cursor-pointer text-sm font-medium transition-all
                      ${form.boardAffiliation === b
                        ? 'border-violet-500 bg-violet-50 text-violet-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                      ${form.boardAffiliation === b ? 'border-violet-600' : 'border-slate-300'}`}>
                      {form.boardAffiliation === b && <div className="w-1.5 h-1.5 bg-violet-600 rounded-full" />}
                    </div>
                    {b}
                  </label>
                ))}
                {/* Custom input if not in list */}
                {!BOARD_OPTIONS.includes(form.boardAffiliation) && form.boardAffiliation && (
                  <div className="col-span-2 sm:col-span-3">
                    <input value={form.boardAffiliation} onChange={e => set('boardAffiliation', e.target.value)}
                      placeholder="Custom board name" className={inp} />
                  </div>
                )}
                {!BOARD_OPTIONS.includes(form.boardAffiliation) && !form.boardAffiliation && (
                  <input value={form.boardAffiliation} onChange={e => set('boardAffiliation', e.target.value)}
                    placeholder="Or type a custom board…" className={`${inp} col-span-2 sm:col-span-3 mt-1`} />
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Information</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+91 98765 43210" className={inp} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="school@example.com" type="email"
                  className={`${inp} ${validationErrors.email ? 'border-red-300' : ''}`} />
                {validationErrors.email && <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>}
              </div>
              <div>
                <label className={lbl}>Website</label>
                <input value={form.website} onChange={e => set('website', e.target.value)}
                  placeholder="https://www.myschool.edu.in"
                  className={`${inp} ${validationErrors.website ? 'border-red-300' : ''}`} />
                {validationErrors.website && <p className="text-xs text-red-500 mt-1">{validationErrors.website}</p>}
              </div>
              <div>
                <label className={lbl}>Emergency Contact</label>
                <input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)}
                  placeholder="+91 98765 43210" className={inp} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Address</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={lbl}>Street Address</label>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Plot 12, MG Road" className={inp} />
              </div>
              <div>
                <label className={lbl}>City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" className={inp} />
              </div>
              <div>
                <label className={lbl}>State</label>
                <input value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" className={inp} />
              </div>
              <div>
                <label className={lbl}>Country</label>
                <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="India" className={inp} />
              </div>
              <div>
                <label className={lbl}>Pincode</label>
                <input value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="400001" className={inp} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <label className={lbl}>Footer Text <span className="text-slate-400 font-normal normal-case">(shown on student portal footer)</span></label>
            <input value={form.footerText} onChange={e => set('footerText', e.target.value)}
              placeholder="© 2024 Sunrise Public School. All rights reserved." className={inp} />
          </div>
        </div>
      ) : (
        /* ── VIEW MODE ── */
        <div className="space-y-5">

          {/* Identity card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Building2 size={14} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">School Identity</p>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-violet-50 rounded-2xl border border-violet-100 flex items-center justify-center shrink-0">
                  <span className="text-violet-700 font-black text-xl">
                    {cfg?.schoolName?.[0] ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">{cfg?.schoolName ?? '—'}</h2>
                  {cfg?.tagline && <p className="text-sm text-slate-500 mt-0.5 italic">"{cfg.tagline}"</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cfg?.schoolType && (
                      <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
                        {SCHOOL_TYPES.find(t => t.value === cfg.schoolType)?.label ?? cfg.schoolType}
                      </span>
                    )}
                    {cfg?.boardAffiliation && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        {cfg.boardAffiliation}
                      </span>
                    )}
                    {cfg?.establishedYear && (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        Est. {cfg.establishedYear}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {cfg?.bio && (
                <p className="text-sm text-slate-600 leading-relaxed mt-4 pt-4 border-t border-slate-100">{cfg.bio}</p>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: UserCircle, label: "Principal",  value: cfg?.principalName },
              { icon: Phone,      label: "Phone",      value: cfg?.phone },
              { icon: Mail,       label: "Email",      value: cfg?.email },
              { icon: Globe,      label: "Website",    value: cfg?.website, link: true },
              { icon: AlertCircle,label: "Emergency",  value: cfg?.emergencyContact },
              { icon: MapPin,     label: "Location",   value: [cfg?.address, cfg?.city, cfg?.state, cfg?.pincode, cfg?.country].filter(Boolean).join(', ') },
              { icon: FileText,   label: "Footer Text",value: cfg?.footerText },
            ].filter(f => f.value).map(({ icon: Icon, label, value, link }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
                <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                  {link ? (
                    <a href={value as string} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 mt-0.5 truncate">
                      {value} <ExternalLink size={10} />
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 mt-0.5 break-words">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Account Page ─────────────────────────────────────────────────────────

type Tab = 'profile' | 'payments' | 'email';

const TABS: { key: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { key: 'profile',  label: 'School Profile', icon: Building2 },
  { key: 'payments', label: 'Payments',       icon: CreditCard, adminOnly: true },
  { key: 'email',    label: 'Email',          icon: Mail,       adminOnly: true },
];

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const load = useCallback((opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    else setRefreshing(true);
    api.getAccount()
      .then(setData)
      .catch(() => setError("Failed to load account details."))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Always render the PageHeader so the page chrome stays consistent
  // with the rest of the app even while loading or in an error state.
  const tenant = data?.tenant;
  const sub = data?.subscription;
  const user = data?.user;
  const trialDaysRemaining = data?.trialDaysRemaining;
  const urgentAlert = sub?.status === 'trial' && (trialDaysRemaining ?? Infinity) <= 5;
  const isAdmin = ['ADMIN', 'PRINCIPAL', 'DIRECTOR'].includes(user?.role ?? '');
  const subBadge = sub ? (SUB_STATUS[sub.status] ?? SUB_STATUS.cancelled) : null;

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        icon={Settings2}
        title="Account & Settings"
        subtitle="Manage your school profile, platform fees and integrations"
        gradient={MODULE_THEMES.admin}
        onRefresh={() => load({ silent: true })}
        refreshing={refreshing || loading}
        primaryActions={
          subBadge ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/15 border border-white/25 rounded-lg text-white text-xs font-bold shrink-0 backdrop-blur-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${subBadge.dot}`} />
              {subBadge.label}
            </span>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <RefreshCw size={20} className="animate-spin" />
            <p className="text-sm">Loading account…</p>
          </div>
        </div>
      ) : error || !data ? (
        <div className="p-8 max-w-5xl mx-auto">
          <div className="bg-white border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-700">{error ?? "Failed to load."}</p>
            <button onClick={() => load()} className="mt-4 px-4 py-2 text-xs font-semibold bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Body wrapper — centred max-width for readability. Tabbed
              section below escapes the wrapper to span page-width. */}
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4">
            {/* Urgent alert */}
            {urgentAlert && (
              <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">
                  <strong>Trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}.</strong>{" "}
                  Contact <a href="mailto:hello@edupilots.in" className="underline font-semibold">hello@edupilots.in</a> to upgrade before access is restricted.
                </p>
              </div>
            )}

            {/* School identity quick view */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <span className="text-white font-black text-xl">{tenant.name?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900">{tenant.name}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Hash size={11} /> <span className="font-mono">{tenant.slug}</span>
                  </span>
                  <a href={tenant.origin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700">
                    <Globe size={11} /> {tenant.origin} <ExternalLink size={9} />
                  </a>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar size={11} /> Since {new Date(tenant.createdAt).toLocaleDateString("en-IN", { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              {/* Logged-in user chip */}
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 shrink-0">
                <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-violet-700 font-bold text-sm">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-violet-600 font-semibold capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                {isAdmin && (
                  <span className="ml-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    <Shield size={9} /> Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <TabbedSection
            idPrefix="account"
            ariaLabel="Account settings sections"
            theme="violet"
            flushPanel
            value={activeTab}
            onChange={(k) => setActiveTab(k as Tab)}
            tabs={TABS.filter(t => !t.adminOnly || isAdmin).map(t => ({
                key: t.key, label: t.label, icon: t.icon as React.ComponentType<{ size?: number; className?: string }>,
            }))}
          >
            <TabPanel tabKey="profile"><SchoolProfileTab user={user} /></TabPanel>
            {isAdmin && <TabPanel tabKey="payments"><PaymentSettingsTab /></TabPanel>}
            {isAdmin && <TabPanel tabKey="email"><EmailServiceTab /></TabPanel>}
          </TabbedSection>
        </>
      )}
    </div>
  );
}
