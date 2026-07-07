import React, { useState, useRef, useEffect } from 'react';
import {
    School, CalendarDays, Layers, BookOpen, Bus, Library,
    Bell, Loader2, AlertTriangle, Plus, Trash2, CheckCircle2,
    ChevronRight, ArrowRight, Check, X, Sparkles, Receipt, Landmark, Settings,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../api/api';
import { useOnboarding } from '../../context/OnboardingContext';
import { SESSIONS_QUERY_KEY } from '../../context/SessionContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubjectInput  = { name: string; bookName: string; type: 'core' | 'elective' };
type CourseFeeItem = { name: string; feeType: FeeItemType; frequency: FeeFrequency; amount: string };
type CourseInput   = { name: string; description: string; subjectIndices: number[]; feeItems: CourseFeeItem[] };
type TenantConfigInput = {
    schoolName: string; tagline: string; bio: string; address: string;
    city: string; state: string; country: string; pincode: string;
    phone: string; email: string; website: string; footerText: string;
    establishedYear: string; boardAffiliation: string; schoolType: string;
    principalName: string; emergencyContact: string;
};
type ClassInput    = { name: string; sections: string[]; subjects: SubjectInput[]; courses: CourseInput[] };
type ZoneInput     = { name: string; description: string; price: string };
type BookInput     = { title: string; author: string; genre: string; totalCopies: string };
type SessionInput  = { name: string; startDate: string; endDate: string; description: string };
type LogEntry      = { text: string; status: 'pending' | 'done' | 'error' };

type FeeFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'ONE_TIME';
type FeeItemType  = 'TUITION' | 'ADMISSION' | 'LIBRARY' | 'COMPUTER' | 'SPORTS' | 'LAB' | 'DEVELOPMENT' | 'EXAM' | 'BOOKS' | 'UNIFORM' | 'ID_CARD' | 'MISC';
type GlobalFeeItem = { name: string; feeType: FeeItemType; frequency: FeeFrequency; amount: string };

interface WizardState {
    session:        SessionInput;
    config:         TenantConfigInput;
    classes:        ClassInput[];
    globalFeeItems: GlobalFeeItem[];
    zones:          ZoneInput[];
    books:          BookInput[];
    boardName:      string;
    boardDesc:      string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
    // Sessions are provisioned by EduPilots and shared across schools —
    // management can't create them. Step 1 just confirms which session the
    // rest of the wizard will populate; the id + dates come from context.
    { id: 1,  label: 'Current Session',    icon: CalendarDays, optional: false, desc: 'The academic year we are setting up for your school' },
    { id: 2,  label: 'School Profile',     icon: Settings,     optional: false, desc: 'Configure your school identity — logo, address, principal, board' },
    { id: 3,  label: 'Classes & Sections', icon: Layers,       optional: false, desc: 'Add classes with their section divisions' },
    { id: 4,  label: 'Courses & Subjects', icon: BookOpen,     optional: false, desc: 'Configure courses and subjects per class' },
    { id: 5,  label: 'Course Fees',        icon: Receipt,      optional: false, desc: 'Set tuition and fee items for each course' },
    { id: 6,  label: 'Global Fees',        icon: Landmark,     optional: true,  desc: 'School-wide charges applied to all students — optional' },
    { id: 7,  label: 'Transport Zones',    icon: Bus,          optional: true,  desc: 'Configure bus zones and fees — can be done later' },
    { id: 8,  label: 'Library Books',      icon: Library,      optional: true,  desc: 'Seed the library — can be done later' },
    { id: 9,  label: 'Notice Board',       icon: Bell,         optional: true,  desc: 'Create a school-wide notice board — optional' },
    { id: 10, label: 'Review & Launch',    icon: Sparkles,     optional: false, desc: 'Confirm your setup and open the portal' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string): string {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

const yr = new Date().getFullYear();
const defaultSessionName = `${yr}-${String(yr + 1).slice(2)}`;

const mkSubject       = (): SubjectInput  => ({ name: '', bookName: '', type: 'core' });
const mkCourseFeeItem = (): CourseFeeItem => ({ name: '', feeType: 'MISC', frequency: 'MONTHLY', amount: '' });
const mkGlobalFeeItem = (): GlobalFeeItem => ({ name: '', feeType: 'MISC', frequency: 'MONTHLY', amount: '' });
const mkCourse        = (): CourseInput   => ({ name: '', description: '', subjectIndices: [], feeItems: [] });
const mkClass         = (): ClassInput    => ({ name: '', sections: ['A'], subjects: [mkSubject()], courses: [mkCourse()] });
const mkZone          = (): ZoneInput     => ({ name: '', description: '', price: '' });
const mkBook          = (): BookInput     => ({ title: '', author: '', genre: '', totalCopies: '1' });

const defaultFeeItems = (): CourseFeeItem[] => [
    { name: 'Tuition Fee',   feeType: 'TUITION',   frequency: 'MONTHLY', amount: '' },
    { name: 'Admission Fee', feeType: 'ADMISSION', frequency: 'ANNUAL',  amount: '' },
];

// ─── Style helpers ─────────────────────────────────────────────────────────────

const inp = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 bg-white transition-colors placeholder:text-slate-300';
const lbl = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

const errCls = (isErr: boolean) => isErr
    ? 'w-full px-3.5 py-2.5 text-sm border border-red-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-400 bg-red-50/40 transition-colors placeholder:text-red-300'
    : inp;

const inpXs = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 bg-white transition-colors placeholder:text-slate-300';
const errClsXs = (isErr: boolean) => isErr
    ? 'w-full px-3 py-2 text-xs border border-red-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-400 bg-red-50/40 transition-colors placeholder:text-red-300'
    : inpXs;

// ─── Fee constants ────────────────────────────────────────────────────────────

const FEE_FREQ_LABELS: Record<FeeFrequency, string> = {
    MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', SEMI_ANNUAL: 'Semi-Annual', ANNUAL: 'Annual', ONE_TIME: 'One-Time',
};

const FEE_TYPES: { value: FeeItemType; label: string }[] = [
    { value: 'TUITION',     label: 'Tuition' },
    { value: 'ADMISSION',   label: 'Admission' },
    { value: 'EXAM',        label: 'Exam' },
    { value: 'LIBRARY',     label: 'Library' },
    { value: 'LAB',         label: 'Lab' },
    { value: 'COMPUTER',    label: 'Computer' },
    { value: 'SPORTS',      label: 'Sports' },
    { value: 'DEVELOPMENT', label: 'Development' },
    { value: 'BOOKS',       label: 'Books' },
    { value: 'UNIFORM',     label: 'Uniform' },
    { value: 'ID_CARD',     label: 'ID Card' },
    { value: 'MISC',        label: 'Misc' },
];

const FREQUENCIES: { value: FeeFrequency; label: string }[] = [
    { value: 'MONTHLY',     label: 'Monthly' },
    { value: 'QUARTERLY',   label: 'Quarterly' },
    { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
    { value: 'ANNUAL',      label: 'Annual' },
    { value: 'ONE_TIME',    label: 'One-Time' },
];

// ─── Step 2: School Profile ───────────────────────────────────────────────────

const SCHOOL_TYPES = [
    { value: '', label: 'Select type…' },
    { value: 'private', label: 'Private' },
    { value: 'public',  label: 'Public / Government' },
    { value: 'aided',   label: 'Government Aided' },
    { value: 'international', label: 'International' },
];

const BOARD_OPTIONS = [
    '', 'CBSE', 'ICSE / CISCE', 'IB (International Baccalaureate)', 'IGCSE / Cambridge',
    'State Board', 'NIOS', 'Other',
];

const SettingsStep: React.FC<{
    data: TenantConfigInput;
    onChange: (f: keyof TenantConfigInput, v: string | boolean) => void;
    showErrors: boolean;
}> = ({ data, onChange, showErrors }) => (
    <div className="space-y-6 max-w-2xl">
        {/* Identity */}
        <div className="space-y-4">
            <p className={lbl + ' mb-0'}>School Identity</p>
            <div>
                <label className={lbl}>School Name <span className="text-red-400">*</span></label>
                <input data-testid="wizard-school-name" value={data.schoolName} onChange={e => onChange('schoolName', e.target.value)}
                    placeholder="e.g. Sunrise Public School"
                    className={errCls(showErrors && !data.schoolName.trim())} />
                {showErrors && !data.schoolName.trim() && <p className="text-xs text-red-500 mt-1">School name is required.</p>}
            </div>
            <div>
                <label className={lbl}>Tagline <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                <input value={data.tagline} onChange={e => onChange('tagline', e.target.value)}
                    placeholder="e.g. Nurturing minds, Building futures"
                    className={inp} />
            </div>
            <div>
                <label className={lbl}>About / Bio <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                <textarea value={data.bio} onChange={e => onChange('bio', e.target.value)}
                    rows={3} placeholder="Brief description of your school, vision, and values"
                    className={inp + ' resize-none'} />
            </div>
        </div>

        {/* Contact & Location */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
            <p className={lbl + ' mb-0'}>Contact & Location</p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={lbl}>Phone</label>
                    <input value={data.phone} onChange={e => onChange('phone', e.target.value)}
                        placeholder="+91 98765 43210" className={inp} />
                </div>
                <div>
                    <label className={lbl}>Email</label>
                    <input type="email" value={data.email} onChange={e => onChange('email', e.target.value)}
                        placeholder="info@school.edu.in" className={inp} />
                </div>
            </div>
            <div>
                <label className={lbl}>Address</label>
                <input value={data.address} onChange={e => onChange('address', e.target.value)}
                    placeholder="Street / Area" className={inp} />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className={lbl}>City</label>
                    <input value={data.city} onChange={e => onChange('city', e.target.value)}
                        placeholder="City" className={inp} />
                </div>
                <div>
                    <label className={lbl}>State</label>
                    <input value={data.state} onChange={e => onChange('state', e.target.value)}
                        placeholder="State" className={inp} />
                </div>
                <div>
                    <label className={lbl}>Pincode</label>
                    <input value={data.pincode} onChange={e => onChange('pincode', e.target.value)}
                        placeholder="110001" maxLength={10} className={inp} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={lbl}>Website</label>
                    <input value={data.website} onChange={e => onChange('website', e.target.value)}
                        placeholder="https://school.edu.in" className={inp} />
                </div>
                <div>
                    <label className={lbl}>Emergency Contact</label>
                    <input value={data.emergencyContact} onChange={e => onChange('emergencyContact', e.target.value)}
                        placeholder="+91 98000 00000" className={inp} />
                </div>
            </div>
        </div>

        {/* Academic Details */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
            <p className={lbl + ' mb-0'}>Academic Details</p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={lbl}>Principal / Head Name</label>
                    <input value={data.principalName} onChange={e => onChange('principalName', e.target.value)}
                        placeholder="Dr. Anita Sharma" className={inp} />
                </div>
                <div>
                    <label className={lbl}>Established Year</label>
                    <input type="number" value={data.establishedYear} onChange={e => onChange('establishedYear', e.target.value)}
                        placeholder="1985" min={1800} max={new Date().getFullYear()} className={inp} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={lbl}>Board Affiliation</label>
                    <select value={data.boardAffiliation} onChange={e => onChange('boardAffiliation', e.target.value)}
                        className={inp}>
                        {BOARD_OPTIONS.map(b => <option key={b} value={b}>{b || 'Select board…'}</option>)}
                    </select>
                </div>
                <div>
                    <label className={lbl}>School Type</label>
                    <select value={data.schoolType} onChange={e => onChange('schoolType', e.target.value)}
                        className={inp}>
                        {SCHOOL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100">
            <label className={lbl}>Footer Text <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
            <input value={data.footerText} onChange={e => onChange('footerText', e.target.value)}
                placeholder="© 2024 Sunrise Public School. All rights reserved." className={inp} />
        </div>
    </div>
);

// ─── Step 1: Current Session (read-only) ──────────────────────────────────
//
// Sessions are provisioned by the EduPilots platform and shared across every
// school. Management doesn't create sessions from the wizard — this step just
// shows the session the rest of the wizard will populate for. The `data`
// prop is retained for backward-compat but no longer edited here.

const SessionStep: React.FC<{
    session: { id: string; name: string; startDate: string; endDate: string } | null;
}> = ({ session }) => {
    if (!session) {
        return (
            <div className="max-w-xl">
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                    <div className="flex items-start gap-3 mb-3">
                        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-amber-900">No active session</h3>
                            <p className="text-sm text-amber-800 mt-1">
                                Your school isn't subscribed to any academic session yet. Sessions are provisioned
                                by the EduPilots platform team. Contact your platform administrator to subscribe
                                your school to a session before continuing setup.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    const durationMonths = Math.round(
        (new Date(session.endDate).getTime() - new Date(session.startDate).getTime()) / (86400000 * 30)
    );
    const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return (
        <div className="space-y-4 max-w-xl">
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <CalendarDays size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                                Setting up for
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                Active
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{session.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {fmt(session.startDate)} → {fmt(session.endDate)} · {durationMonths} months
                        </p>
                    </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                    Classes, sections, courses, subjects and fee structures you create in the next steps will all
                    belong to this session. Everything you set up here is <strong>additive</strong> — you can add
                    more later from the individual module pages.
                </p>
            </div>
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-900 flex gap-2">
                    <Sparkles size={13} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>
                        <strong>Tip:</strong> There's no rush — press <kbd className="px-1.5 py-0.5 bg-white border border-blue-200 rounded text-[10px] font-mono">Save &amp; continue later</kbd> at
                        any point to bookmark and come back.
                    </span>
                </p>
            </div>
        </div>
    );
};

// ─── Step 2: Classes & Sections ───────────────────────────────────────────────

const ClassesStep: React.FC<{
    classes: ClassInput[];
    updateClass: (ci: number, cls: ClassInput) => void;
    addClass: () => void;
    removeClass: (ci: number) => void;
    showErrors: boolean;
}> = ({ classes, updateClass, addClass, removeClass, showErrors }) => {
    const addSection = (ci: number) =>
        updateClass(ci, { ...classes[ci], sections: [...classes[ci].sections, ''] });
    const removeSection = (ci: number, si: number) =>
        updateClass(ci, { ...classes[ci], sections: classes[ci].sections.filter((_, i) => i !== si) });
    const setSection = (ci: number, si: number, v: string) => {
        const sections = [...classes[ci].sections]; sections[si] = v;
        updateClass(ci, { ...classes[ci], sections });
    };

    return (
        <div className="space-y-4 max-w-2xl">
            {classes.map((cls, ci) => (
                <div key={ci} className={`bg-slate-50 border rounded-2xl p-5 transition-colors ${showErrors && !cls.name.trim() ? 'border-red-300' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex-1">
                            <label className={lbl}>Class Name <span className="text-red-400">*</span></label>
                            <input data-testid={`wizard-class-name-${ci}`} value={cls.name}
                                onChange={e => updateClass(ci, { ...cls, name: e.target.value })}
                                placeholder="e.g. Class 10"
                                className={errCls(showErrors && !cls.name.trim())} />
                            {showErrors && !cls.name.trim() && <p className="text-xs text-red-500 mt-1">Class name is required.</p>}
                        </div>
                        {classes.length > 1 && (
                            <button onClick={() => removeClass(ci)}
                                className="mt-6 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                    <div>
                        <label className={lbl + ' mb-2'}>Sections <span className="text-red-400">*</span></label>
                        <div className="flex flex-wrap gap-2">
                            {cls.sections.map((sec, si) => (
                                <div key={si}
                                    className={`flex items-center gap-1.5 bg-white border rounded-xl px-3 py-1.5 shadow-sm transition-colors ${showErrors && !sec.trim() ? 'border-red-400' : 'border-slate-200'}`}>
                                    <input data-testid={`wizard-class-${ci}-section-${si}`} value={sec} onChange={e => setSection(ci, si, e.target.value)}
                                        placeholder="A" maxLength={12}
                                        className="w-14 text-sm font-bold text-slate-700 bg-transparent border-none outline-none text-center" />
                                    {cls.sections.length > 1 && (
                                        <button onClick={() => removeSection(ci, si)}
                                            className="text-slate-300 hover:text-red-400 transition-colors">
                                            <X size={11} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button data-testid={`wizard-add-section-${ci}`} onClick={() => addSection(ci)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 border border-dashed border-emerald-300 rounded-xl hover:bg-emerald-50 transition-colors">
                                <Plus size={12} /> Section
                            </button>
                        </div>
                        {showErrors && cls.sections.some(s => !s.trim()) && (
                            <p className="text-xs text-red-500 mt-2">All sections must have a name.</p>
                        )}
                    </div>
                </div>
            ))}
            <button data-testid="wizard-add-class" onClick={addClass}
                className="w-full py-3 text-sm font-bold text-emerald-600 border-2 border-dashed border-emerald-200 rounded-2xl hover:bg-emerald-50 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2">
                <Plus size={15} /> Add Another Class
            </button>
        </div>
    );
};

// ─── Step 3: Courses & Subjects ───────────────────────────────────────────────

const CoursesStep: React.FC<{
    classes: ClassInput[];
    update: (classes: ClassInput[]) => void;
    showErrors: boolean;
}> = ({ classes, update, showErrors }) => {
    const [activeTab, setActiveTab] = useState(0);
    const ci = Math.min(activeTab, classes.length - 1);
    const cls = classes[ci];

    const patchClass = (newCls: ClassInput) => {
        const next = [...classes]; next[ci] = newCls; update(next);
    };

    const addSubject = () => patchClass({ ...cls, subjects: [...cls.subjects, mkSubject()] });
    const removeSubject = (si: number) => {
        const subjects = cls.subjects.filter((_, i) => i !== si);
        const courses = cls.courses.map(cr => ({
            ...cr,
            subjectIndices: cr.subjectIndices.filter(idx => idx !== si).map(idx => idx > si ? idx - 1 : idx),
        }));
        patchClass({ ...cls, subjects, courses });
    };
    const patchSubject = (si: number, s: SubjectInput) => {
        const subjects = [...cls.subjects]; subjects[si] = s; patchClass({ ...cls, subjects });
    };

    const addCourse = () => patchClass({ ...cls, courses: [...cls.courses, mkCourse()] });
    const removeCourse = (cIdx: number) =>
        patchClass({ ...cls, courses: cls.courses.filter((_, i) => i !== cIdx) });
    const patchCourse = (cIdx: number, c: CourseInput) => {
        const courses = [...cls.courses]; courses[cIdx] = c; patchClass({ ...cls, courses });
    };
    const toggleSubject = (cIdx: number, si: number) => {
        const course = cls.courses[cIdx];
        const has = course.subjectIndices.includes(si);
        patchCourse(cIdx, {
            ...course,
            subjectIndices: has
                ? course.subjectIndices.filter(i => i !== si)
                : [...course.subjectIndices, si].sort((a, b) => a - b),
        });
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {classes.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1" data-testid="wizard-class-tabs">
                    {classes.map((c, i) => (
                        <button key={i} data-testid={`wizard-class-tab-${i}`} onClick={() => setActiveTab(i)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                                i === ci ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                            }`}>
                            {c.name || `Class ${i + 1}`}
                        </button>
                    ))}
                </div>
            )}

            {/* Subject pool */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className={lbl + ' mb-0'}>
                        Subjects for {cls.name || `Class ${ci + 1}`} <span className="text-red-400">*</span>
                    </p>
                    <button data-testid="wizard-add-subject" onClick={addSubject}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                        <Plus size={12} /> Add Subject
                    </button>
                </div>
                <div className="space-y-2">
                    {cls.subjects.map((subj, si) => (
                        <div key={si} className="grid gap-2 items-start bg-slate-50 border border-slate-200 rounded-xl p-3"
                            data-testid={`wizard-subject-row-${si}`}
                            style={{ gridTemplateColumns: '1fr 1fr 120px auto' }}>
                            <div>
                                <input data-testid={`wizard-subject-name-${si}`} value={subj.name}
                                    onChange={e => patchSubject(si, { ...subj, name: e.target.value })}
                                    placeholder="Subject name *"
                                    className={errClsXs(showErrors && !subj.name.trim())} />
                                {showErrors && !subj.name.trim() && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                            </div>
                            <div>
                                <input data-testid={`wizard-subject-book-${si}`} value={subj.bookName}
                                    onChange={e => patchSubject(si, { ...subj, bookName: e.target.value })}
                                    placeholder="Book / textbook *"
                                    className={errClsXs(showErrors && !subj.bookName.trim())} />
                                {showErrors && !subj.bookName.trim() && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                            </div>
                            <select data-testid={`wizard-subject-type-${si}`} value={subj.type}
                                onChange={e => patchSubject(si, { ...subj, type: e.target.value as 'core' | 'elective' })}
                                className={inpXs}>
                                <option value="core">Core</option>
                                <option value="elective">Elective</option>
                            </select>
                            {cls.subjects.length > 1 ? (
                                <button onClick={() => removeSubject(si)}
                                    className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors justify-self-end">
                                    <Trash2 size={13} />
                                </button>
                            ) : <div />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Courses */}
            <div className="space-y-4">
                {cls.courses.map((course, cIdx) => (
                    <div key={cIdx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex items-start gap-3 p-5 pb-4">
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className={lbl}>Course Name <span className="text-red-400">*</span></label>
                                    <input data-testid={`wizard-course-name-${cIdx}`} value={course.name}
                                        onChange={e => patchCourse(cIdx, { ...course, name: e.target.value })}
                                        placeholder="e.g. Science"
                                        className={errCls(showErrors && !course.name.trim())} />
                                    {showErrors && !course.name.trim() && <p className="text-xs text-red-500 mt-1">Course name is required.</p>}
                                </div>
                                <div>
                                    <label className={lbl}>Description <span className="text-red-400">*</span></label>
                                    <textarea data-testid={`wizard-course-desc-${cIdx}`} value={course.description}
                                        onChange={e => patchCourse(cIdx, { ...course, description: e.target.value })}
                                        rows={2} placeholder="e.g. Covers Physics, Chemistry and Biology for Class 10 students"
                                        className={errCls(showErrors && !course.description.trim()) + ' resize-none'} />
                                    {showErrors && !course.description.trim() && <p className="text-xs text-red-500 mt-1">Course description is required.</p>}
                                </div>
                            </div>
                            {cls.courses.length > 1 && (
                                <button onClick={() => removeCourse(cIdx)}
                                    className="mt-5 p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 size={15} />
                                </button>
                            )}
                        </div>

                        <div className="px-5 pb-4 border-t border-slate-50 pt-4">
                            <p className={lbl + ' mb-2'}>
                                Subjects in this course <span className="text-red-400">*</span>
                                <span className="text-[10px] font-normal normal-case text-slate-400 ml-1">
                                    — a subject can be shared across multiple courses
                                </span>
                            </p>
                            {cls.subjects.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Add subjects above first.</p>
                            ) : (
                                <>
                                    <div className="flex flex-wrap gap-2">
                                        {cls.subjects.map((subj, si) => {
                                            const selected = course.subjectIndices.includes(si);
                                            return (
                                                <button key={si} type="button"
                                                    data-testid={`wizard-toggle-subject-${cIdx}-${si}`}
                                                    data-subject-name={subj.name || ''}
                                                    data-selected={selected ? "true" : "false"}
                                                    onClick={() => toggleSubject(cIdx, si)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                        selected
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                                                    }`}>
                                                    {selected && <Check size={11} />}
                                                    {subj.name || `Subject ${si + 1}`}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {showErrors && course.subjectIndices.length === 0 && (
                                        <p className="text-xs text-red-500 mt-2">Select at least one subject for this course.</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <button data-testid="wizard-add-course" onClick={addCourse}
                    className="w-full py-3 text-sm font-bold text-emerald-600 border-2 border-dashed border-emerald-200 rounded-2xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                    <Plus size={15} /> Add Another Course to {cls.name || `Class ${ci + 1}`}
                </button>
            </div>
        </div>
    );
};

// ─── Step 4: Course Fees ──────────────────────────────────────────────────────

const CourseFeeStep: React.FC<{
    classes: ClassInput[];
    update: (classes: ClassInput[]) => void;
    showErrors: boolean;
}> = ({ classes, update, showErrors }) => {
    const [activeTab, setActiveTab] = useState(0);
    const ci = Math.min(activeTab, classes.length - 1);
    const cls = classes[ci];

    const patchCourse = (cIdx: number, c: CourseInput) => {
        const next = [...classes];
        const courses = [...cls.courses]; courses[cIdx] = c;
        next[ci] = { ...cls, courses };
        update(next);
    };

    const addFeeItem = (cIdx: number) =>
        patchCourse(cIdx, { ...cls.courses[cIdx], feeItems: [...cls.courses[cIdx].feeItems, mkCourseFeeItem()] });
    const removeFeeItem = (cIdx: number, fi: number) =>
        patchCourse(cIdx, { ...cls.courses[cIdx], feeItems: cls.courses[cIdx].feeItems.filter((_, i) => i !== fi) });
    const patchFeeItem = (cIdx: number, fi: number, item: CourseFeeItem) => {
        const feeItems = [...cls.courses[cIdx].feeItems]; feeItems[fi] = item;
        patchCourse(cIdx, { ...cls.courses[cIdx], feeItems });
    };

    return (
        <div className="space-y-5 max-w-3xl">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <Receipt size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-emerald-900">Configure fees per course</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                        Tuition (monthly) and Admission (annual) are pre-filled for each course. Enter the amounts and add more line items as needed.
                    </p>
                </div>
            </div>

            {classes.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1" data-testid="wizard-course-fee-tabs">
                    {classes.map((c, i) => (
                        <button key={i} data-testid={`wizard-course-fee-tab-${i}`} onClick={() => setActiveTab(i)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                                i === ci ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                            }`}>
                            {c.name || `Class ${i + 1}`}
                        </button>
                    ))}
                </div>
            )}

            {cls.courses.map((course, cIdx) => (
                <div key={cIdx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-100">
                        <div>
                            <p className="text-sm font-bold text-slate-800">{course.name || `Course ${cIdx + 1}`}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{cls.name} · {course.feeItems.length} fee item{course.feeItems.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button onClick={() => addFeeItem(cIdx)}
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors">
                            <Plus size={12} /> Add Item
                        </button>
                    </div>

                    <div className="p-4">
                        {course.feeItems.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">
                                No fee items. Click "Add Item" to configure, or go back to step 3 to re-enter this step and auto-populate defaults.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <div className="grid gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1"
                                    style={{ gridTemplateColumns: '2fr 1fr 1fr 110px 32px' }}>
                                    <span>Item Name *</span><span>Type</span><span>Frequency</span><span>Amount (₹) *</span><span />
                                </div>
                                {course.feeItems.map((fi, fIdx) => {
                                    const nameErr = showErrors && !fi.name.trim();
                                    const amtErr  = showErrors && (fi.amount === '' || Number(fi.amount) < 0);
                                    return (
                                        <div key={fIdx} className="grid gap-2 items-start"
                                            data-testid={`wizard-course-fee-${cIdx}-${fIdx}`}
                                            data-fee-type={fi.feeType}
                                            style={{ gridTemplateColumns: '2fr 1fr 1fr 110px 32px' }}>
                                            <div>
                                                <input data-testid={`wizard-course-fee-${cIdx}-${fIdx}-name`}
                                                    value={fi.name}
                                                    onChange={e => patchFeeItem(cIdx, fIdx, { ...fi, name: e.target.value })}
                                                    placeholder="e.g. Lab Charges"
                                                    className={errClsXs(nameErr)} />
                                                {nameErr && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                                            </div>
                                            <select data-testid={`wizard-course-fee-${cIdx}-${fIdx}-type`}
                                                value={fi.feeType}
                                                onChange={e => patchFeeItem(cIdx, fIdx, { ...fi, feeType: e.target.value as FeeItemType })}
                                                className={inpXs}>
                                                {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                            </select>
                                            <select data-testid={`wizard-course-fee-${cIdx}-${fIdx}-frequency`}
                                                value={fi.frequency}
                                                onChange={e => patchFeeItem(cIdx, fIdx, { ...fi, frequency: e.target.value as FeeFrequency })}
                                                className={inpXs}>
                                                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </select>
                                            <div>
                                                <input data-testid={`wizard-course-fee-${cIdx}-${fIdx}-amount`}
                                                    type="number" value={fi.amount} min={0}
                                                    onChange={e => patchFeeItem(cIdx, fIdx, { ...fi, amount: e.target.value })}
                                                    placeholder="0"
                                                    className={errClsXs(amtErr)} />
                                                {amtErr && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                                            </div>
                                            <button onClick={() => removeFeeItem(cIdx, fIdx)}
                                                className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Step 5: Global Fees ──────────────────────────────────────────────────────

const GlobalFeeStep: React.FC<{
    items: GlobalFeeItem[];
    update: (items: GlobalFeeItem[]) => void;
    showErrors: boolean;
}> = ({ items, update, showErrors }) => {
    const add    = () => update([...items, mkGlobalFeeItem()]);
    const remove = (i: number) => update(items.filter((_, idx) => idx !== i));
    const patch  = (i: number, item: GlobalFeeItem) => { const arr = [...items]; arr[i] = item; update(arr); };

    if (items.length === 0) {
        return (
            <div className="max-w-xl space-y-5">
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <Landmark size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-blue-800">School-Wide Fee Items</p>
                        <p className="text-xs text-blue-600 mt-0.5">These fees apply to all students regardless of course — e.g. Development Fund, Smart Class, Sports Day charges.</p>
                    </div>
                </div>
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Landmark size={24} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No global fees yet</p>
                    <p className="text-xs text-slate-400 mb-4">Skip this step — you can configure school-wide fees later from the Fees hub.</p>
                    <button data-testid="wizard-add-global-fee" onClick={add}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors mx-auto">
                        <Plus size={14} /> Add Global Fee Item
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <Landmark size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-blue-800">School-Wide Fee Items</p>
                    <p className="text-xs text-blue-600 mt-0.5">These fees apply to all students regardless of their course or class.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 border-b border-slate-100 bg-slate-50"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 110px 32px' }}>
                    <span>Item Name *</span><span>Type</span><span>Frequency</span><span>Amount (₹) *</span><span />
                </div>
                <div className="p-3 space-y-2">
                    {items.map((gi, i) => {
                        const nameErr = showErrors && !gi.name.trim();
                        const amtErr  = showErrors && (gi.amount === '' || Number(gi.amount) < 0);
                        return (
                            <div key={i} className="grid gap-2 items-start"
                                data-testid={`wizard-global-fee-${i}`}
                                style={{ gridTemplateColumns: '2fr 1fr 1fr 110px 32px' }}>
                                <div>
                                    <input data-testid={`wizard-global-fee-${i}-name`}
                                        value={gi.name}
                                        onChange={e => patch(i, { ...gi, name: e.target.value })}
                                        placeholder="e.g. Development Fee"
                                        className={errClsXs(nameErr)} />
                                    {nameErr && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                                </div>
                                <select data-testid={`wizard-global-fee-${i}-type`}
                                    value={gi.feeType}
                                    onChange={e => patch(i, { ...gi, feeType: e.target.value as FeeItemType })}
                                    className={inpXs}>
                                    {FEE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                </select>
                                <select data-testid={`wizard-global-fee-${i}-frequency`}
                                    value={gi.frequency}
                                    onChange={e => patch(i, { ...gi, frequency: e.target.value as FeeFrequency })}
                                    className={inpXs}>
                                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{FEE_FREQ_LABELS[f.value]}</option>)}
                                </select>
                                <div>
                                    <input data-testid={`wizard-global-fee-${i}-amount`}
                                        type="number" value={gi.amount} min={0}
                                        onChange={e => patch(i, { ...gi, amount: e.target.value })}
                                        placeholder="0"
                                        className={errClsXs(amtErr)} />
                                    {amtErr && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                                </div>
                                <button onClick={() => remove(i)}
                                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <button data-testid="wizard-add-global-fee" onClick={add}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-600 border border-dashed border-emerald-300 rounded-xl hover:bg-emerald-50 transition-colors">
                <Plus size={14} /> Add Another Global Fee
            </button>
        </div>
    );
};

// ─── Step 6: Transport ────────────────────────────────────────────────────────

const TransportStep: React.FC<{
    zones: ZoneInput[];
    update: (z: ZoneInput[]) => void;
}> = ({ zones, update }) => {
    const add    = () => update([...zones, mkZone()]);
    const remove = (i: number) => update(zones.filter((_, idx) => idx !== i));
    const set    = (i: number, z: ZoneInput) => { const zs = [...zones]; zs[i] = z; update(zs); };

    if (zones.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                    <Bus size={24} className="text-amber-400" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">No transport zones yet</p>
                <p className="text-xs text-slate-400 mb-5">Set up transport zones for school bus fee collection. Can be configured later.</p>
                <button data-testid="wizard-add-zone" onClick={add}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                    <Plus size={14} /> Add Transport Zone
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-w-2xl">
            {zones.map((z, i) => (
                <div key={i} className="grid gap-3 items-end bg-slate-50 border border-slate-200 rounded-2xl p-4"
                    data-testid={`wizard-zone-${i}`}
                    style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                    <div>
                        <label className={lbl}>Zone Name <span className="text-red-400">*</span></label>
                        <input data-testid={`wizard-zone-${i}-name`}
                            value={z.name} onChange={e => set(i, { ...z, name: e.target.value })}
                            placeholder="e.g. North Zone" className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Monthly Fee (₹) <span className="text-red-400">*</span></label>
                        <input data-testid={`wizard-zone-${i}-price`}
                            type="number" value={z.price} min={0}
                            onChange={e => set(i, { ...z, price: e.target.value })}
                            placeholder="500" className={inp} />
                    </div>
                    <button onClick={() => remove(i)}
                        className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 size={15} />
                    </button>
                </div>
            ))}
            <button data-testid="wizard-add-zone" onClick={add}
                className="w-full py-3 text-sm font-bold text-emerald-600 border-2 border-dashed border-emerald-200 rounded-2xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                <Plus size={15} /> Add Another Zone
            </button>
        </div>
    );
};

// ─── Step 7: Library ──────────────────────────────────────────────────────────

const LibraryStep: React.FC<{
    books: BookInput[];
    update: (b: BookInput[]) => void;
}> = ({ books, update }) => {
    const add    = () => update([...books, mkBook()]);
    const remove = (i: number) => update(books.filter((_, idx) => idx !== i));
    const set    = (i: number, b: BookInput) => { const bs = [...books]; bs[i] = b; update(bs); };

    if (books.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto">
                <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center mb-4">
                    <Library size={24} className="text-pink-400" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">No library books yet</p>
                <p className="text-xs text-slate-400 mb-5">Seed the library with books for students to browse and borrow. Can be added later.</p>
                <button data-testid="wizard-add-book" onClick={add}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                    <Plus size={14} /> Add Book
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl">
            {books.map((b, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                    data-testid={`wizard-book-${i}`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Book {i + 1}</p>
                        <button onClick={() => remove(i)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={13} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>Title <span className="text-red-400">*</span></label>
                            <input data-testid={`wizard-book-${i}-title`}
                                value={b.title} onChange={e => set(i, { ...b, title: e.target.value })}
                                placeholder="Book title" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Author <span className="text-red-400">*</span></label>
                            <input data-testid={`wizard-book-${i}-author`}
                                value={b.author} onChange={e => set(i, { ...b, author: e.target.value })}
                                placeholder="Author name" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Genre</label>
                            <input data-testid={`wizard-book-${i}-genre`}
                                value={b.genre} onChange={e => set(i, { ...b, genre: e.target.value })}
                                placeholder="Fiction, Science…" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Total Copies</label>
                            <input data-testid={`wizard-book-${i}-copies`}
                                type="number" value={b.totalCopies} min={1}
                                onChange={e => set(i, { ...b, totalCopies: e.target.value })}
                                placeholder="5" className={inp} />
                        </div>
                    </div>
                </div>
            ))}
            <button data-testid="wizard-add-book" onClick={add}
                className="w-full py-3 text-sm font-bold text-emerald-600 border-2 border-dashed border-emerald-200 rounded-2xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                <Plus size={15} /> Add Another Book
            </button>
        </div>
    );
};

// ─── Step 8: Notice Board ─────────────────────────────────────────────────────

const NoticeBoardStep: React.FC<{
    name: string; desc: string;
    onName: (v: string) => void; onDesc: (v: string) => void;
}> = ({ name, desc, onName, onDesc }) => (
    <div className="space-y-5 max-w-xl">
        <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <Bell size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
                <p className="text-sm font-bold text-blue-800">School-Wide Notice Board</p>
                <p className="text-xs text-blue-600 mt-1">Creates a public board visible to all students, teachers, and parents. You can create more boards after setup.</p>
            </div>
        </div>
        <div>
            <label className={lbl}>Board Name</label>
            <input data-testid="wizard-board-name" value={name} onChange={e => onName(e.target.value)}
                placeholder="School Notice Board" className={inp} />
        </div>
        <div>
            <label className={lbl}>Description <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
            <textarea data-testid="wizard-board-desc" value={desc} onChange={e => onDesc(e.target.value)} rows={3}
                placeholder="Main board for school-wide announcements and circulars"
                className={inp + ' resize-none'} />
        </div>
    </div>
);

// ─── Step 9: Review & Launch ──────────────────────────────────────────────────

const ReviewStep: React.FC<{
    state: WizardState;
    session: { id: string; name: string; startDate: string; endDate: string } | null;
    log: LogEntry[];
    submitting: boolean;
    error: string | null;
    done: boolean;
    onSubmit: () => void;
    onRetry: () => void;
}> = ({ state, session, log, submitting, error, done, onSubmit, onRetry }) => {
    const totalClasses  = state.classes.length;
    const totalSections = state.classes.reduce((s, c) => s + c.sections.length, 0);
    const totalCourses  = state.classes.reduce((s, c) => s + c.courses.length, 0);
    const totalSubjects = state.classes.reduce((s, c) => s + c.subjects.length, 0);
    const totalFeeItems = state.classes.reduce((s, c) => s + c.courses.reduce((cs, cr) => cs + cr.feeItems.length, 0), 0) + state.globalFeeItems.length;

    if (done) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
                    <CheckCircle2 size={38} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">School Setup Complete!</h2>
                <p className="text-slate-500 text-sm max-w-sm mt-1">Your school portal is now live. You can manage students, exams, fees, and more.</p>
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
                    {[
                        { label: 'Session',  v: '1 created',                                   bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                        { label: 'Classes',  v: `${totalClasses} · ${totalSections} sections`, bg: 'bg-blue-50 text-blue-700 border-blue-100' },
                        { label: 'Courses',  v: `${totalCourses} courses`,                     bg: 'bg-violet-50 text-violet-700 border-violet-100' },
                        { label: 'Subjects', v: `${totalSubjects} subjects`,                   bg: 'bg-amber-50 text-amber-700 border-amber-100' },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
                            <p className="text-xs font-bold opacity-60 mb-1">{s.label}</p>
                            <p className="text-sm font-black">{s.v}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-400 mt-6">Opening your portal…</p>
            </div>
        );
    }

    if (submitting || log.length > 0) {
        return (
            <div className="space-y-4 max-w-xl">
                <p className="text-sm font-bold text-slate-700">Setting up your school…</p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 max-h-[420px] overflow-y-auto">
                    {log.map((entry, i) => (
                        <div key={i} className="flex items-center gap-3">
                            {entry.status === 'pending' && <Loader2 size={14} className="text-emerald-500 animate-spin shrink-0" />}
                            {entry.status === 'done'    && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                            {entry.status === 'error'   && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                            <span className={`text-sm ${entry.status === 'error' ? 'text-red-600 font-medium' : entry.status === 'done' ? 'text-slate-400' : 'text-slate-700'}`}>
                                {entry.text}
                            </span>
                        </div>
                    ))}
                    {submitting && (
                        <div className="flex items-center gap-2 pt-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.15s]" />
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.3s]" />
                        </div>
                    )}
                </div>
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-red-800 mb-1">Setup failed</p>
                            <p className="text-xs text-red-600 break-words">{error}</p>
                        </div>
                        <button onClick={onRetry}
                            className="shrink-0 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors">
                            Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-slate-500">Review your school setup below. All details can be updated later from the management portal.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings size={13} className="text-slate-600" />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">School Profile</p>
                    </div>
                    <p className="text-base font-black text-slate-900">{state.config.schoolName || '—'}</p>
                    <p className="text-xs text-slate-500 mt-1">{[state.config.city, state.config.state].filter(Boolean).join(', ') || 'Location not set'}</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CalendarDays size={13} className="text-emerald-600" />
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Academic Session</p>
                    </div>
                    <p className="text-base font-black text-emerald-900">{session?.name ?? '—'}</p>
                    <p className="text-xs text-emerald-600 mt-1">
                        {session?.startDate ? new Date(session.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        {' → '}
                        {session?.endDate ? new Date(session.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Layers size={13} className="text-blue-600" />
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Classes & Sections</p>
                    </div>
                    <p className="text-base font-black text-blue-900">{totalClasses} class{totalClasses !== 1 ? 'es' : ''} · {totalSections} section{totalSections !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-blue-600 mt-1 truncate">{state.classes.map(c => c.name).join(', ')}</p>
                </div>

                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={13} className="text-violet-600" />
                        <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Courses & Subjects</p>
                    </div>
                    <p className="text-base font-black text-violet-900">{totalCourses} course{totalCourses !== 1 ? 's' : ''} · {totalSubjects} subject{totalSubjects !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-violet-600 mt-1 truncate">
                        {state.classes.flatMap(c => c.courses.map(cr => cr.name)).join(', ')}
                    </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Optional Setup</p>
                    <div className="space-y-2">
                        {[
                            { icon: Receipt,  label: 'Fee items',       count: totalFeeItems },
                            { icon: Bus,      label: 'Transport zones', count: state.zones.length },
                            { icon: Library,  label: 'Library books',   count: state.books.length },
                            { icon: Bell,     label: 'Notice board',    count: state.boardName.trim() ? 1 : 0 },
                        ].map(({ icon: Icon, label, count }) => (
                            <div key={label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Icon size={11} /> {label}
                                </div>
                                <span className={`text-[11px] font-bold ${count > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    {count > 0 ? `${count} added` : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <button data-testid="wizard-launch-btn" onClick={onSubmit}
                className="flex items-center gap-2.5 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors shadow-lg shadow-emerald-200 mt-2">
                Launch School Setup <ArrowRight size={16} />
            </button>
        </div>
    );
};

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const OnboardingWizard: React.FC = () => {
    const { refetch, forceComplete, status } = useOnboarding();
    // Session comes from the tenant's active subscription — no more manual
    // create. If null, step 1 shows a "contact platform admin" empty state.
    const onboardingSession = status?.session ?? null;
    const queryClient = useQueryClient();

    const [step, setStep]             = useState(1);
    const [showErrors, setShowErrors] = useState(false);

    const [state, setState] = useState<WizardState>({
        session:        { name: defaultSessionName, startDate: '', endDate: '', description: '' },
        config: {
            schoolName: '', tagline: '', bio: '', address: '', city: '', state: '', country: 'India',
            pincode: '', phone: '', email: '', website: '', footerText: '',

            establishedYear: '', boardAffiliation: '', schoolType: '', principalName: '', emergencyContact: '',
        },
        classes:        [mkClass()],
        globalFeeItems: [],
        zones:          [],
        books:          [],
        boardName:      'School Notice Board',
        boardDesc:      'Main notice board for school-wide announcements',
    });

    // Pre-fill the School Name from the tenant's registered name (set by the
    // platform at onboarding) — or an already-saved profile — the moment the
    // onboarding status resolves. Never clobbers a value the user has typed.
    useEffect(() => {
        const preset = status?.steps?.schoolProfile?.detail || status?.tenantName || '';
        if (!preset) return;
        setState(p => p.config.schoolName.trim()
            ? p
            : { ...p, config: { ...p.config, schoolName: preset } });
    }, [status]);

    const logRef = useRef<LogEntry[]>([]);
    const [submitLog,   setSubmitLog]   = useState<LogEntry[]>([]);
    const [submitting,  setSubmitting]  = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [done,        setDone]        = useState(false);

    // ── State helpers ──────────────────────────────────────────────────────────
    const updateClass = (ci: number, cls: ClassInput) =>
        setState(p => { const classes = [...p.classes]; classes[ci] = cls; return { ...p, classes }; });
    const setClasses  = (classes: ClassInput[]) => setState(p => ({ ...p, classes }));

    // ── Validation ─────────────────────────────────────────────────────────────

    const canProceed = (): boolean => {
        const { config, classes, globalFeeItems, zones, books } = state;
        switch (step) {
            case 1:
                // Step 1 is now the read-only current-session card. We can
                // only proceed if the tenant is actually subscribed to a
                // session (checked via onboarding context).
                return !!onboardingSession;
            case 2:
                return !!config.schoolName.trim();
            case 3:
                return classes.length > 0
                    && classes.every(c => c.name.trim() && c.sections.length > 0 && c.sections.every(s => s.trim()));
            case 4:
                return classes.every(c =>
                    c.subjects.length > 0
                    && c.subjects.every(s => s.name.trim() && s.bookName.trim())
                    && c.courses.length > 0
                    && c.courses.every(cr => cr.name.trim() && cr.description.trim() && cr.subjectIndices.length > 0)
                );
            case 5:
                return classes.every(c =>
                    c.courses.every(cr =>
                        cr.feeItems.length > 0
                        && cr.feeItems.every(f => f.name.trim() && f.amount !== '' && Number(f.amount) >= 0)
                    )
                );
            case 6:
                return globalFeeItems.length === 0
                    || globalFeeItems.every(f => f.name.trim() && f.amount !== '' && Number(f.amount) >= 0);
            case 7: return zones.length === 0 || zones.every(z => z.name.trim() && z.price !== '' && Number(z.price) >= 0);
            case 8: return books.length === 0 || books.every(b => b.title.trim() && b.author.trim() && Number(b.totalCopies) >= 1);
            case 9:
            case 10: return true;
            default: return true;
        }
    };

    const stepError = (): string | null => {
        const { config, classes, globalFeeItems, zones, books } = state;
        switch (step) {
            case 1:
                if (!onboardingSession) return 'Your school is not subscribed to any session. Contact your EduPilots administrator.';
                return null;
            case 2:
                if (!config.schoolName.trim()) return 'School name is required.';
                return null;
            case 3:
                if (classes.some(c => !c.name.trim()))                  return 'All classes must have a name.';
                if (classes.some(c => c.sections.some(s => !s.trim()))) return 'All sections must have a name.';
                return null;
            case 4:
                if (classes.some(c => c.subjects.length === 0))                              return 'Each class needs at least one subject.';
                if (classes.some(c => c.subjects.some(s => !s.name.trim())))                 return 'All subjects need a name.';
                if (classes.some(c => c.subjects.some(s => !s.bookName.trim())))             return 'All subjects need a book / textbook name.';
                if (classes.some(c => c.courses.some(cr => !cr.name.trim())))                return 'All courses must have a name.';
                if (classes.some(c => c.courses.some(cr => !cr.description.trim())))         return 'All courses must have a description.';
                if (classes.some(c => c.courses.some(cr => cr.subjectIndices.length === 0))) return 'Each course must have at least one subject assigned.';
                return null;
            case 5:
                if (classes.some(c => c.courses.some(cr => cr.feeItems.length === 0)))       return 'Each course must have at least one fee item.';
                if (classes.some(c => c.courses.some(cr => cr.feeItems.some(f => !f.name.trim())))) return 'All fee items need a name.';
                if (classes.some(c => c.courses.some(cr => cr.feeItems.some(f => f.amount === '' || Number(f.amount) < 0)))) return 'All fee items need a valid amount (0 or more).';
                return null;
            case 6:
                if (globalFeeItems.some(f => !f.name.trim()))                                return 'All global fee items need a name.';
                if (globalFeeItems.some(f => f.amount === '' || Number(f.amount) < 0))       return 'All global fee items need a valid amount.';
                return null;
            case 7:
                if (zones.some(z => !z.name.trim()))                         return 'All zones need a name.';
                if (zones.some(z => z.price === '' || Number(z.price) < 0))  return 'All zones need a valid monthly fee.';
                return null;
            case 8:
                if (books.some(b => !b.title.trim()))  return 'All books need a title.';
                if (books.some(b => !b.author.trim())) return 'All books need an author.';
                return null;
            default: return null;
        }
    };

    const goNext = () => {
        if (!canProceed()) { setShowErrors(true); return; }
        setShowErrors(false);
        // Auto-populate default fee items when entering the Course Fees step (step 5)
        if (step === 4) {
            setState(p => ({
                ...p,
                classes: p.classes.map(cls => ({
                    ...cls,
                    courses: cls.courses.map(cr =>
                        cr.feeItems.length === 0 ? { ...cr, feeItems: defaultFeeItems() } : cr
                    ),
                })),
            }));
        }
        setStep(s => s + 1);
    };

    // ── Submission ─────────────────────────────────────────────────────────────

    const addLog = (text: string): number => {
        logRef.current = [...logRef.current, { text, status: 'pending' }];
        setSubmitLog([...logRef.current]);
        return logRef.current.length - 1;
    };

    const updateLog = (idx: number, status: LogEntry['status']) => {
        logRef.current = logRef.current.map((l, i) => i === idx ? { ...l, status } : l);
        setSubmitLog([...logRef.current]);
    };

    const handleSubmit = async () => {
        logRef.current = [];
        setSubmitLog([]);
        setSubmitError(null);
        setSubmitting(true);

        const { config, classes, globalFeeItems, zones, books, boardName, boardDesc } = state;

        try {
            // 0 ── School profile / tenant config
            let idx = addLog('Saving school profile…');
            await api.updateTenantConfig({
                schoolName:            config.schoolName.trim(),
                tagline:               config.tagline.trim() || null,
                bio:                   config.bio.trim() || null,
                address:               config.address.trim() || null,
                city:                  config.city.trim() || null,
                state:                 config.state.trim() || null,
                country:               config.country.trim() || 'India',
                pincode:               config.pincode.trim() || null,
                phone:                 config.phone.trim() || null,
                email:                 config.email.trim() || null,
                website:               config.website.trim() || null,
                footerText:            config.footerText.trim() || null,
                acceptingApplications: false,
                acceptingOnlineFees:   false,
                establishedYear:       config.establishedYear ? parseInt(config.establishedYear) : null,
                boardAffiliation:      config.boardAffiliation.trim() || null,
                schoolType:            config.schoolType || null,
                principalName:         config.principalName.trim() || null,
                emergencyContact:      config.emergencyContact.trim() || null,
            });
            updateLog(idx, 'done');

            // 1 ── Academic session — use the tenant's active subscription
            //      session. Management can't create sessions (they're global,
            //      provisioned by EduPilots) so we just plug the id through.
            if (!onboardingSession) {
                throw new Error('No active session available. Contact your EduPilots administrator.');
            }
            const sessionId: string = onboardingSession.id;
            idx = addLog(`Setting up "${onboardingSession.name}"…`);
            updateLog(idx, 'done');

            // 2 ── Classes → sections → subjects → courses
            const courseIdMap = new Map<string, string>();

            for (let classIdx = 0; classIdx < classes.length; classIdx++) {
                const cls = classes[classIdx];
                idx = addLog(`Creating ${cls.name}…`);
                const classRes = await api.createClass({ sessionId, name: cls.name.trim(), slug: slugify(cls.name.trim()) });
                const classId: string = classRes.newClass?.id;
                if (!classId) throw new Error(`Class "${cls.name}" creation did not return an ID.`);
                updateLog(idx, 'done');

                idx = addLog(`  └ Creating ${cls.sections.length} section(s) for ${cls.name}…`);
                for (const secName of cls.sections) {
                    await api.createSection(classId, { name: secName.trim(), slug: slugify(`${cls.name}-${secName}`) });
                }
                updateLog(idx, 'done');

                const subjectIds: string[] = [];
                idx = addLog(`  └ Creating ${cls.subjects.length} subject(s) for ${cls.name}…`);
                for (const subj of cls.subjects) {
                    const subjRes = await api.createSubject({
                        name: subj.name.trim(), slug: slugify(`${cls.name}-${subj.name}`),
                        bookName: subj.bookName.trim(), sessionId, type: subj.type,
                    });
                    const subjectId: string = subjRes.subject?.id;
                    if (!subjectId) throw new Error(`Subject "${subj.name}" creation did not return an ID.`);
                    subjectIds.push(subjectId);
                }
                updateLog(idx, 'done');

                for (let courseIdx = 0; courseIdx < cls.courses.length; courseIdx++) {
                    const course = cls.courses[courseIdx];
                    idx = addLog(`  └ Creating course "${course.name}" (${cls.name})…`);
                    const courseRes = await api.createCourse({
                        name: course.name.trim(), slug: slugify(`${cls.name}-${course.name}`),
                        classId, sessionId, description: course.description.trim(),
                    });
                    const courseId: string = courseRes.course?.id;
                    if (!courseId) throw new Error(`Course "${course.name}" creation did not return an ID.`);
                    courseIdMap.set(`${classIdx}-${courseIdx}`, courseId);
                    updateLog(idx, 'done');

                    // Set course fee from the tuition fee item
                    const tuitionItem = course.feeItems.find(f => f.feeType === 'TUITION');
                    if (tuitionItem) {
                        const fee = parseFloat(String(tuitionItem.amount));
                        if (!isNaN(fee) && fee > 0) {
                            await api.setCourseFee(courseId, fee);
                        }
                    }

                    idx = addLog(`    └ Assigning ${course.subjectIndices.length} subject(s) to "${course.name}"…`);
                    for (const si of course.subjectIndices) {
                        await api.addSubjectToCourse(courseId, subjectIds[si]);
                    }
                    updateLog(idx, 'done');
                }
            }

            // 3 ── Fee structure items (per-course + global)
            const allFeePayloads: Record<string, unknown>[] = [];
            for (let cIdx = 0; cIdx < classes.length; cIdx++) {
                for (let crIdx = 0; crIdx < classes[cIdx].courses.length; crIdx++) {
                    const courseId = courseIdMap.get(`${cIdx}-${crIdx}`);
                    for (const f of classes[cIdx].courses[crIdx].feeItems) {
                        if (!f.name.trim() || f.amount === '') continue;
                        allFeePayloads.push({
                            name: f.name.trim(), feeType: f.feeType,
                            scope: 'COURSE', frequency: f.frequency,
                            amount: parseFloat(String(f.amount)) || 0,
                            ...(courseId ? { courseId } : {}),
                        });
                    }
                }
            }
            for (const f of globalFeeItems) {
                if (!f.name.trim() || f.amount === '') continue;
                allFeePayloads.push({
                    name: f.name.trim(), feeType: f.feeType,
                    scope: 'GLOBAL', frequency: f.frequency,
                    amount: parseFloat(String(f.amount)) || 0,
                });
            }
            if (allFeePayloads.length > 0) {
                idx = addLog(`Creating fee structure with ${allFeePayloads.length} item(s)…`);
                const fsRes = await api.createFeeStructure({ name: 'Main Fee Structure', sessionId, isActive: true });
                const feeStructureId: string = fsRes.structure?.id;
                if (!feeStructureId) throw new Error('Fee structure creation did not return an ID.');
                for (const payload of allFeePayloads) {
                    await api.createFeeStructureItem(feeStructureId, payload as any);
                }
                updateLog(idx, 'done');
            }

            // 4 ── Transport zones
            if (zones.length > 0) {
                idx = addLog(`Creating ${zones.length} transport zone(s)…`);
                for (const z of zones) {
                    await api.createTransportZone({
                        name: z.name.trim(), description: z.description.trim() || undefined,
                        price: parseFloat(String(z.price)) || 0,
                    });
                }
                updateLog(idx, 'done');
            }

            // 5 ── Library books
            if (books.length > 0) {
                idx = addLog(`Adding ${books.length} library book(s)…`);
                for (const b of books) {
                    await api.createLibraryBook({
                        title: b.title.trim(), author: b.author.trim(),
                        genre: b.genre.trim() || undefined, totalCopies: parseInt(String(b.totalCopies)) || 1,
                    });
                }
                updateLog(idx, 'done');
            }

            // 6 ── Notice board
            if (boardName.trim()) {
                idx = addLog('Creating school notice board…');
                await api.createNoticeBoard({ sessionId, name: boardName.trim(), description: boardDesc.trim() || undefined, visibility: 'PUBLIC' });
                updateLog(idx, 'done');
            }

            setDone(true);
            // The wizard just bulk-created sessions / classes / teachers /
            // fees / etc. None of that data is in any React Query cache
            // yet (the queries were created before the wizard ran). Wipe
            // the cache so the dashboard, topbar session selector, and
            // every list page see the fresh school data immediately.
            await queryClient.invalidateQueries();
            // Also explicitly refresh the global session cache so the
            // topbar session selector (which depends on SESSIONS_QUERY_KEY
            // and gates pages on a session being chosen) picks up the
            // new session before SessionContext's auto-pick effect runs.
            await queryClient.refetchQueries({ queryKey: SESSIONS_QUERY_KEY });
            await refetch();
            forceComplete();

        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'An unexpected error occurred. Please try again.';
            setSubmitError(msg);
            const lastPendingIdx = logRef.current.reduceRight((found, l, i) => found === -1 && l.status === 'pending' ? i : found, -1);
            if (lastPendingIdx >= 0) updateLog(lastPendingIdx, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetry = () => {
        logRef.current = [];
        setSubmitLog([]);
        setSubmitError(null);
        handleSubmit();
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    const meta        = STEPS[step - 1];
    const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;
    const err         = showErrors ? stepError() : null;

    const optionalEmpty = meta.optional && (
        (step === 6 && state.globalFeeItems.length === 0) ||
        (step === 7 && state.zones.length === 0) ||
        (step === 8 && state.books.length === 0) ||
        (step === 9 && !state.boardName.trim())
    );

    return (
        <div className="fixed inset-0 bg-white flex overflow-hidden" data-testid="onboarding-wizard" data-current-step={step}>

            {/* ── Left sidebar (desktop) ── */}
            <aside className="hidden lg:flex w-[268px] bg-slate-900 flex-col shrink-0">
                <div className="px-6 py-5 border-b border-white/[0.07]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/25">
                            <School size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white leading-none">EduAdmin</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">School Setup Wizard</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto [scrollbar-width:none]">
                    {STEPS.map(s => {
                        const Icon = s.icon;
                        const curr = step === s.id;
                        const past = step > s.id;
                        return (
                            <div key={s.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                                    ${curr ? 'bg-emerald-500/15 border border-emerald-500/20' : ''}
                                    ${past ? 'opacity-50' : ''}
                                    ${!curr && !past ? 'opacity-30' : ''}`}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                                    ${past ? 'bg-emerald-500/20' : curr ? 'bg-emerald-500/25' : 'bg-white/5'}`}>
                                    {past
                                        ? <Check size={13} className="text-emerald-400" />
                                        : <Icon size={13} className={curr ? 'text-emerald-400' : 'text-slate-500'} />}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-bold truncate ${curr ? 'text-white' : 'text-slate-400'}`}>
                                        {s.label}
                                    </p>
                                    {s.optional && <p className="text-[10px] text-slate-600">optional</p>}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="px-6 py-5 border-t border-white/[0.07]">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] text-slate-500">Progress</p>
                        <p className="text-[11px] text-emerald-400 font-bold">{step} of {STEPS.length}</p>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-3">Complete setup to unlock the management portal</p>
                </div>
            </aside>

            {/* ── Main panel ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Mobile header */}
                <div className="lg:hidden flex items-center gap-3 px-5 py-3 bg-slate-900">
                    <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <School size={14} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-white flex-1">School Setup</p>
                    <p className="text-xs text-slate-400">{step}/{STEPS.length}</p>
                </div>
                <div className="lg:hidden h-1 bg-slate-800">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>

                {/* Step header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-start gap-4 max-w-3xl">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                            {React.createElement(meta.icon, { size: 18, className: 'text-emerald-600' })}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-black text-slate-900">{meta.label}</h1>
                                {meta.optional && (
                                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        Optional
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">{meta.desc}</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {err && (
                        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-5 max-w-2xl">
                            <AlertTriangle size={14} className="shrink-0" /> {err}
                        </div>
                    )}

                    {step === 1 && <SessionStep session={onboardingSession} />}
                    {step === 2 && (
                        <SettingsStep
                            data={state.config}
                            onChange={(f, v) => setState(p => ({ ...p, config: { ...p.config, [f]: v } }))}
                            showErrors={showErrors}
                        />
                    )}
                    {step === 3 && (
                        <ClassesStep
                            classes={state.classes}
                            updateClass={updateClass}
                            addClass={() => setState(p => ({ ...p, classes: [...p.classes, mkClass()] }))}
                            removeClass={ci => setState(p => ({ ...p, classes: p.classes.filter((_, i) => i !== ci) }))}
                            showErrors={showErrors}
                        />
                    )}
                    {step === 4 && <CoursesStep classes={state.classes} update={setClasses} showErrors={showErrors} />}
                    {step === 5 && <CourseFeeStep classes={state.classes} update={setClasses} showErrors={showErrors} />}
                    {step === 6 && (
                        <GlobalFeeStep
                            items={state.globalFeeItems}
                            update={items => setState(p => ({ ...p, globalFeeItems: items }))}
                            showErrors={showErrors}
                        />
                    )}
                    {step === 7 && <TransportStep zones={state.zones} update={zs => setState(p => ({ ...p, zones: zs }))} />}
                    {step === 8 && <LibraryStep books={state.books} update={bs => setState(p => ({ ...p, books: bs }))} />}
                    {step === 9 && (
                        <NoticeBoardStep
                            name={state.boardName} desc={state.boardDesc}
                            onName={v => setState(p => ({ ...p, boardName: v }))}
                            onDesc={v => setState(p => ({ ...p, boardDesc: v }))}
                        />
                    )}
                    {step === 10 && (
                        <ReviewStep
                            state={state} session={onboardingSession}
                            log={submitLog} submitting={submitting}
                            error={submitError} done={done}
                            onSubmit={handleSubmit} onRetry={handleRetry}
                        />
                    )}
                </div>

                {/* Navigation footer */}
                {!done && (
                    <div className="px-8 py-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between gap-4">
                        <button
                            data-testid="wizard-back-btn"
                            disabled={step === 1 || submitting}
                            onClick={() => { setShowErrors(false); setStep(s => s - 1); }}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight size={15} className="rotate-180" /> Back
                        </button>

                        <div className="flex items-center gap-3">
                            {!canProceed() && step < 10 && showErrors && (
                                <p className="text-xs text-red-500 hidden sm:block">
                                    Please fix the errors above to continue.
                                </p>
                            )}
                            {step < 10 && (
                                <button data-testid="wizard-next-btn" data-skip={optionalEmpty ? "true" : "false"} onClick={goNext}
                                    className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-colors shadow-sm
                                        ${optionalEmpty
                                            ? 'bg-slate-400 hover:bg-slate-500 shadow-slate-200'
                                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                        }`}>
                                    {optionalEmpty ? 'Skip – Add Later' : 'Next'}
                                    <ChevronRight size={15} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingWizard;
