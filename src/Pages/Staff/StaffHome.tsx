import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Loader2, RefreshCcw, KeyRound, Eye, EyeOff, X, Phone, Mail,
    Shield, Search, GraduationCap, UserPlus, Trash2, Pencil, ShieldCheck,
    Lock, CheckCircle2, AlertTriangle, UserCog, BookMarked, ClipboardCheck,
    Library, MessageSquare, Wallet, Settings, Crown, BarChart3,
} from 'lucide-react';
import api from '../../api/api';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useAuthContext, ALL_MODULES, type AppModule } from '../../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Level = 'NONE' | 'READ' | 'ADMIN';
interface Permission { module: string; level: 'READ' | 'ADMIN' }
interface StaffMember {
    id: string; firstName: string; middleName?: string; lastName: string;
    phone: string; email: string; role: string | null; createdAt: string;
    permissions: Permission[] | null;
}
interface Teacher {
    id: string; name: string; gender: string; age: number;
    qualification: string; phone: string; email?: string; isActive: boolean; createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FULL_ACCESS_ROLES = ['ADMIN', 'PRINCIPAL', 'DIRECTOR'];
function isFullAccess(role: string | null | undefined) {
    return FULL_ACCESS_ROLES.includes(role ?? '');
}

const MODULE_META: Record<AppModule, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    PEOPLE:        { label: 'People',        icon: Users,          color: 'text-blue-600',   bg: 'bg-blue-50'   },
    TEACHERS:      { label: 'Teachers',      icon: UserCog,        color: 'text-violet-600', bg: 'bg-violet-50' },
    ACADEMICS:     { label: 'Academics',     icon: GraduationCap,  color: 'text-emerald-600',bg: 'bg-emerald-50'},
    STUDIES:       { label: 'Studies',       icon: BookMarked,     color: 'text-amber-600',  bg: 'bg-amber-50'  },
    ATTENDANCE:    { label: 'Attendance',    icon: ClipboardCheck, color: 'text-cyan-600',   bg: 'bg-cyan-50'   },
    LIBRARY:       { label: 'Library',       icon: Library,        color: 'text-pink-600',   bg: 'bg-pink-50'   },
    COMMUNICATION: { label: 'Communication', icon: MessageSquare,  color: 'text-indigo-600', bg: 'bg-indigo-50' },
    FINANCE:       { label: 'Finance',       icon: Wallet,         color: 'text-orange-600', bg: 'bg-orange-50' },
};

const ROLE_CARDS = [
    { value: 'MANAGEMENT_STAFF', label: 'Staff',     desc: 'Custom module access', icon: Settings,      accent: 'violet' },
    { value: 'PRINCIPAL',        label: 'Principal', desc: 'Full access',          icon: GraduationCap, accent: 'blue'   },
    { value: 'DIRECTOR',         label: 'Director',  desc: 'Read-only access',     icon: Crown,         accent: 'amber'  },
] as const;

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    ADMIN:            { label: 'Admin',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    PRINCIPAL:        { label: 'Principal', cls: 'bg-blue-100 text-blue-700 border-blue-200'         },
    DIRECTOR:         { label: 'Director',  cls: 'bg-amber-100 text-amber-700 border-amber-200'      },
    MANAGEMENT_STAFF: { label: 'Staff',     cls: 'bg-violet-100 text-violet-700 border-violet-200'   },
};

const ACCENT: Record<string, string> = {
    violet:  'border-violet-400 bg-violet-50',
    blue:    'border-blue-400 bg-blue-50',
    amber:   'border-amber-400 bg-amber-50',
    emerald: 'border-emerald-400 bg-emerald-50',
};
const ACCENT_ICON: Record<string, string> = {
    violet:  'text-violet-600',
    blue:    'text-blue-600',
    amber:   'text-amber-600',
    emerald: 'text-emerald-600',
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 bg-slate-200 rounded-full" />
            <div className="h-3 w-56 bg-slate-100 rounded-full" />
        </div>
        <div className="hidden md:flex gap-1.5">
            {[60, 52, 68].map(w => <div key={w} className={`h-5 w-${w === 60 ? '16' : w === 52 ? '14' : '18'} bg-slate-100 rounded-full`} />)}
        </div>
        <div className="flex gap-1.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100" />
            <div className="w-8 h-8 rounded-lg bg-slate-100" />
        </div>
    </div>
);

// ── Level Picker (segmented button) ──────────────────────────────────────────

const LEVEL_CONFIG = {
    NONE:  { label: 'None',  active: 'bg-slate-100 text-slate-600 ring-1 ring-slate-300/50',      idle: 'text-slate-300 hover:text-slate-500 hover:bg-slate-50' },
    READ:  { label: 'Read',  active: 'bg-sky-100 text-sky-700 ring-1 ring-sky-300/50',            idle: 'text-slate-300 hover:text-sky-500 hover:bg-sky-50'    },
    ADMIN: { label: 'Admin', active: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/50', idle: 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'},
};

const LevelPicker: React.FC<{ level: Level; onChange: (l: Level) => void; readOnly?: boolean }> = ({ level, onChange, readOnly }) => (
    <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
        {(['NONE', 'READ', 'ADMIN'] as Level[]).map(l => {
            const cfg = LEVEL_CONFIG[l];
            return (
                <button
                    key={l}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange(l)}
                    className={`px-3 py-1.5 text-[11px] font-bold transition-all min-w-[46px] ${level === l ? cfg.active : cfg.idle} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {cfg.label}
                </button>
            );
        })}
    </div>
);

// ── Permission Grid ───────────────────────────────────────────────────────────

const PermissionGrid: React.FC<{
    permissions: Permission[];
    onChange: (p: Permission[]) => void;
    readOnly?: boolean;
}> = ({ permissions, onChange, readOnly }) => {
    const getLevel = (mod: AppModule): Level => {
        const p = permissions.find(p => p.module === mod);
        return p ? p.level : 'NONE';
    };
    const setLevel = (mod: AppModule, level: Level) => {
        const filtered = permissions.filter(p => p.module !== mod);
        onChange(level === 'NONE' ? filtered : [...filtered, { module: mod, level: level as 'READ' | 'ADMIN' }]);
    };

    const granted = permissions.length;
    const adminCount = permissions.filter(p => p.level === 'ADMIN').length;

    return (
        <div className="space-y-2">
            {/* Quick-set bar */}
            {!readOnly && (
                <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] text-slate-400 mr-auto">
                        {granted === 0 ? 'No access' : `${granted} module${granted !== 1 ? 's' : ''} granted`}
                        {adminCount > 0 && ` · ${adminCount} admin`}
                    </span>
                    <button type="button" onClick={() => onChange(ALL_MODULES.map(m => ({ module: m, level: 'READ' as const })))}
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 px-2.5 py-1 rounded-lg hover:bg-sky-50 transition-colors">
                        Read All
                    </button>
                    <button type="button" onClick={() => onChange(ALL_MODULES.map(m => ({ module: m, level: 'ADMIN' as const })))}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                        Admin All
                    </button>
                    <button type="button" onClick={() => onChange([])}
                        className="text-[11px] font-semibold text-slate-400 hover:text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
                        Clear
                    </button>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto] items-center px-4 py-2 bg-slate-50 border-b border-slate-200 gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Module</span>
                    <div className="flex gap-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="min-w-[46px] text-center">None</span>
                        <span className="min-w-[46px] text-center">Read</span>
                        <span className="min-w-[46px] text-center">Admin</span>
                    </div>
                </div>

                {ALL_MODULES.map((mod, idx) => {
                    const meta = MODULE_META[mod];
                    const Icon = meta.icon;
                    const level = getLevel(mod);
                    return (
                        <div key={mod}
                            className={`grid grid-cols-[1fr_auto] items-center px-4 py-3 gap-4 transition-colors
                                ${level !== 'NONE' ? 'bg-white' : 'bg-white hover:bg-slate-50/60'}
                                ${idx < ALL_MODULES.length - 1 ? 'border-b border-slate-100' : ''}`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                                    <Icon size={13} className={meta.color} />
                                </div>
                                <span className={`text-sm font-semibold ${level !== 'NONE' ? 'text-slate-800' : 'text-slate-500'}`}>
                                    {meta.label}
                                </span>
                                {level === 'ADMIN' && (
                                    <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                        <ShieldCheck size={9} /> Admin
                                    </span>
                                )}
                                {level === 'READ' && (
                                    <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full">
                                        <BarChart3 size={9} /> Read
                                    </span>
                                )}
                            </div>
                            <LevelPicker level={level} onChange={(l) => setLevel(mod, l)} readOnly={readOnly} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Role Card Picker ──────────────────────────────────────────────────────────

const RolePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ROLE_CARDS.map(r => {
            const Icon = r.icon;
            const active = value === r.value;
            return (
                <button
                    key={r.value}
                    type="button"
                    onClick={() => onChange(r.value)}
                    className={`relative flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all text-left
                        ${active ? `${ACCENT[r.accent]} border-opacity-100` : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'}`}
                >
                    {active && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-current flex items-center justify-center opacity-80">
                            <CheckCircle2 size={10} className="text-white" />
                        </div>
                    )}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? `${r.accent === 'violet' ? 'bg-violet-100' : r.accent === 'blue' ? 'bg-blue-100' : r.accent === 'amber' ? 'bg-amber-100' : 'bg-emerald-100'}` : 'bg-slate-100'}`}>
                        <Icon size={16} className={active ? ACCENT_ICON[r.accent] : 'text-slate-400'} />
                    </div>
                    <div className="text-center">
                        <p className={`text-xs font-bold ${active ? ACCENT_ICON[r.accent] : 'text-slate-700'}`}>{r.label}</p>
                        <p className={`text-[10px] mt-0.5 ${active ? 'text-slate-500' : 'text-slate-400'}`}>{r.desc}</p>
                    </div>
                </button>
            );
        })}
    </div>
);

// ── Role Badge ────────────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: string | null }> = ({ role }) => {
    const r = role ? ROLE_BADGE[role.toUpperCase()] : null;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${r?.cls ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            <Shield size={8} /> {r?.label ?? role ?? 'Staff'}
        </span>
    );
};

// ── Permission Summary Chips ──────────────────────────────────────────────────

const PermSummary: React.FC<{ permissions: Permission[] | null; role: string | null }> = ({ permissions, role }) => {
    if (role === 'DIRECTOR') {
        return (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <BarChart3 size={10} /> Read Only · All Modules
            </span>
        );
    }
    if (isFullAccess(role)) {
        return (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <ShieldCheck size={10} /> Full Access
            </span>
        );
    }
    if (!permissions || permissions.length === 0) {
        return <span className="text-[11px] text-slate-400 italic">No module access</span>;
    }
    const shown = permissions.slice(0, 3);
    const rest  = permissions.length - 3;
    return (
        <div className="flex flex-wrap items-center gap-1">
            {shown.map(p => {
                const meta = MODULE_META[p.module as AppModule];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                    <span key={p.module}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
                            ${p.level === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                        <Icon size={9} />
                        {meta.label}
                        <span className={`opacity-60`}>{p.level === 'ADMIN' ? '·A' : '·R'}</span>
                    </span>
                );
            })}
            {rest > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    +{rest} more
                </span>
            )}
        </div>
    );
};

// ── Staff Drawer (create / edit) ──────────────────────────────────────────────

interface DrawerProps {
    initial?: StaffMember | null;
    currentUserId?: string;
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
}

const StaffDrawer: React.FC<DrawerProps> = ({ initial, onSave, onClose }) => {
    const isEdit = !!initial;
    const [firstName, setFirstName] = useState(initial?.firstName ?? '');
    const [lastName,  setLastName]  = useState(initial?.lastName  ?? '');
    const [phone,     setPhone]     = useState(initial?.phone     ?? '');
    const [email,     setEmail]     = useState(initial?.email     ?? '');
    const [role,      setRole]      = useState(initial?.role      ?? 'MANAGEMENT_STAFF');
    const [password,  setPassword]  = useState('');
    const [showPass,  setShowPass]  = useState(false);
    const [perms, setPerms] = useState<Permission[]>(() =>
        initial?.permissions ?? []
    );
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null); setSaving(true);
        try {
            await onSave({
                firstName, lastName, phone, email, role,
                ...(password ? { password } : {}),
                permissions: isFullAccess(role) ? [] : perms,
            });
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Failed to save. Please try again.');
            setSaving(false);
        }
    };

    const inputCls = "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white transition-colors placeholder:text-slate-300";
    const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5";

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                        {isEdit ? <Pencil size={16} className="text-white" /> : <UserPlus size={16} className="text-white" />}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-white">{isEdit ? 'Edit Staff Member' : 'New Staff Member'}</h2>
                        <p className="text-xs text-white/60 mt-0.5">{isEdit ? `${initial!.firstName} ${initial!.lastName}` : 'Create account and configure access'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-6 py-6 space-y-6">
                        {err && (
                            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                                <AlertTriangle size={15} className="shrink-0" /> {err}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Personal Info</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
                                    <input value={firstName} onChange={e => setFirstName(e.target.value)} required className={inputCls} placeholder="Rahul" />
                                </div>
                                <div>
                                    <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
                                    <input value={lastName} onChange={e => setLastName(e.target.value)} required className={inputCls} placeholder="Sharma" />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Phone <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        required pattern="[0-9]{10}" className={inputCls + " pl-9"} placeholder="9876543210" />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                        className={inputCls + " pl-9"} placeholder="rahul@school.edu" />
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className={labelCls}>
                                {isEdit ? 'New Password' : 'Password'} {!isEdit && <span className="text-red-400">*</span>}
                                {isEdit && <span className="ml-1 normal-case font-normal text-slate-400">(leave blank to keep current)</span>}
                            </label>
                            <div className="relative">
                                <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                <input type={showPass ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required={!isEdit} minLength={8}
                                    placeholder={isEdit ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
                                    className={inputCls + " pl-9 pr-10"} />
                                <button type="button" onClick={() => setShowPass(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {!isEdit && <p className="text-[11px] text-slate-400 mt-1.5">Staff member will use this to log in to the portal.</p>}
                        </div>

                        {/* Role */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Role</p>
                            <RolePicker value={role} onChange={setRole} />
                        </div>

                        {/* Module Access */}
                        {!isFullAccess(role) && role !== 'DIRECTOR' ? (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Module Access</p>
                                    <span className="text-[10px] text-slate-400">— controls which sections this staff can access</span>
                                </div>
                                <PermissionGrid permissions={perms} onChange={setPerms} />
                            </div>
                        ) : role === 'DIRECTOR' ? (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <Crown size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800">Director has read-only access</p>
                                    <p className="text-xs text-amber-700 mt-0.5">This role can view all modules but cannot make changes. No per-module configuration is needed.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-800">{role} has full access</p>
                                    <p className="text-xs text-emerald-600 mt-0.5">This role can access all modules without restrictions. No per-module configuration is needed.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200">
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {isEdit ? 'Save Changes' : 'Create Staff Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Permission Drawer (standalone) ────────────────────────────────────────────

const PermDrawer: React.FC<{
    staff: StaffMember;
    onSave: (perms: Permission[]) => Promise<void>;
    onClose: () => void;
}> = ({ staff, onSave, onClose }) => {
    const [perms, setPerms] = useState<Permission[]>(staff.permissions ?? []);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true); setErr(null);
        try { await onSave(perms); }
        catch (e: any) { setErr(e?.response?.data?.message ?? 'Failed to update.'); setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                        <Lock size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-white">Module Access</h2>
                        <p className="text-xs text-white/60 mt-0.5">{staff.firstName} {staff.lastName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {isFullAccess(staff.role) ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-emerald-800">{staff.role} — Full Access</p>
                                <p className="text-xs text-emerald-600 mt-0.5">No per-module restrictions apply.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {err && (
                                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 mb-4">
                                    <AlertTriangle size={15} className="shrink-0" /> {err}
                                </div>
                            )}
                            <PermissionGrid permissions={perms} onChange={setPerms} />
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isFullAccess(staff.role) && (
                    <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0 border-t border-slate-100">
                        <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200">
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            Save Permissions
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Reset Password Modal ──────────────────────────────────────────────────────

const ResetPasswordModal: React.FC<{
    target: { name: string; role?: string };
    onConfirm: (pw: string) => Promise<void>;
    onClose: () => void;
}> = ({ target, onConfirm, onClose }) => {
    const [pw, setPw] = useState('');
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
        setSaving(true); setErr(null);
        try { await onConfirm(pw); }
        catch (e: any) { setErr(e?.response?.data?.message ?? 'Failed to reset password.'); setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <KeyRound size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">Reset Password</p>
                        <p className="text-xs text-slate-400 mt-0.5">{target.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={15} />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">{err}</p>}
                    <div className="relative">
                        <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                            required minLength={8} autoFocus
                            placeholder="New password (min 8 characters)"
                            className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-colors" />
                        <button type="button" onClick={() => setShow(v => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {show ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={onClose}
                            className="py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || pw.length < 8}
                            className="py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                            {saving && <Loader2 size={13} className="animate-spin" />}
                            Reset
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

const DeleteModal: React.FC<{
    name: string;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}> = ({ name, onConfirm, onClose }) => {
    const [deleting, setDeleting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const confirm = async () => {
        setDeleting(true); setErr(null);
        try { await onConfirm(); }
        catch (e: any) { setErr(e?.response?.data?.message ?? 'Delete failed.'); setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={22} className="text-red-500" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">Delete Staff Member</h3>
                    <p className="text-sm text-slate-500">
                        <strong className="text-slate-700">{name}</strong> will be permanently deleted and lose portal access. This cannot be undone.
                    </p>
                    {err && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{err}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 px-6 pb-6">
                    <button onClick={onClose} className="py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                        Cancel
                    </button>
                    <button onClick={confirm} disabled={deleting}
                        className="py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                        {deleting && <Loader2 size={13} className="animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

type TabKey = 'staff' | 'teachers';

const StaffHome: React.FC = () => {
    const { role: currentRole, userId: currentUserId } = useAuthContext();
    // Only ADMIN and PRINCIPAL can create/edit/delete staff; DIRECTOR is read-only
    const canManageStaff = currentRole === 'ADMIN' || currentRole === 'PRINCIPAL';
    const { addToast } = useToast();

    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [teachers,  setTeachers]  = useState<Teacher[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');
    const [tab,       setTab]       = useState<TabKey>('staff');

    // Drawer / modal state
    const [showCreate,    setShowCreate]    = useState(false);
    const [editTarget,    setEditTarget]    = useState<StaffMember | null>(null);
    const [permTarget,    setPermTarget]    = useState<StaffMember | null>(null);
    const [resetTarget,   setResetTarget]   = useState<{ id: string; name: string; type: 'staff' | 'teacher' } | null>(null);
    const [deleteTarget,  setDeleteTarget]  = useState<{ id: string; name: string } | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [staffData, teacherData] = await Promise.all([
                api.getStaff(),
                api.getTeachers(),
            ]);
            setStaffList(staffData?.staff ?? []);
            const tList = Array.isArray(teacherData) ? teacherData : (teacherData?.teachers ?? []);
            setTeachers(tList);
        } catch {
            addToast('Failed to load staff data.', 'error');
        } finally { setLoading(false); }
    }, [addToast]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── CRUD handlers ──────────────────────────────────────────────────────

    const handleCreate = async (data: any) => {
        await api.createStaff(data);
        addToast('Staff member created successfully.', 'success');
        setShowCreate(false);
        fetchAll();
    };

    const handleEdit = async (data: any) => {
        if (!editTarget) return;
        await api.updateStaff(editTarget.id, data);
        // Also update permissions in the same call
        if (!isFullAccess(data.role)) {
            await api.updateStaffPermissions(editTarget.id, data.permissions ?? []);
        }
        addToast('Staff member updated.', 'success');
        setEditTarget(null);
        fetchAll();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await api.deleteStaff(deleteTarget.id);
        addToast('Staff member deleted.', 'success');
        setDeleteTarget(null);
        fetchAll();
    };

    const handlePermsSave = async (id: string, perms: Permission[]) => {
        await api.updateStaffPermissions(id, perms);
        addToast('Module access updated.', 'success');
        setPermTarget(null);
        fetchAll();
    };

    const handleResetPassword = async (password: string) => {
        if (!resetTarget) return;
        if (resetTarget.type === 'staff') {
            await api.updateStaff(resetTarget.id, { password });
        } else {
            await api.resetTeacherPassword(resetTarget.id, password);
        }
        addToast(`Password reset for ${resetTarget.name}.`, 'success');
        setResetTarget(null);
    };

    // ── Filtered lists ─────────────────────────────────────────────────────

    const filteredStaff = staffList.filter(u => {
        const q = search.toLowerCase();
        return !q
            || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
            || u.email.toLowerCase().includes(q)
            || u.phone.includes(q)
            || (u.role ?? '').toLowerCase().includes(q);
    });

    const filteredTeachers = teachers.filter(t => {
        const q = search.toLowerCase();
        return !q
            || t.name.toLowerCase().includes(q)
            || (t.email ?? '').toLowerCase().includes(q)
            || t.phone.includes(q);
    });

    // ── Stats ──────────────────────────────────────────────────────────────

    const fullAccessCount  = staffList.filter(u => isFullAccess(u.role)).length;
    const staffOnlyCount   = staffList.filter(u => !isFullAccess(u.role)).length;

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="min-h-full bg-slate-50 pb-20">
            {/* Drawers & Modals */}
            {(showCreate || editTarget) && (
                <StaffDrawer
                    initial={editTarget}
                    currentUserId={currentUserId ?? undefined}
                    onSave={editTarget ? handleEdit : handleCreate}
                    onClose={() => { setShowCreate(false); setEditTarget(null); }}
                />
            )}
            {permTarget && (
                <PermDrawer
                    staff={permTarget}
                    onSave={(perms) => handlePermsSave(permTarget.id, perms)}
                    onClose={() => setPermTarget(null)}
                />
            )}
            {resetTarget && (
                <ResetPasswordModal
                    target={{ name: resetTarget.name }}
                    onConfirm={handleResetPassword}
                    onClose={() => setResetTarget(null)}
                />
            )}
            {deleteTarget && (
                <DeleteModal
                    name={deleteTarget.name}
                    onConfirm={handleDelete}
                    onClose={() => setDeleteTarget(null)}
                />
            )}

            <PageHeader
                icon={Shield}
                title="Staff Accounts"
                subtitle="Manage management staff, roles, and per-module permissions"
                gradient="from-indigo-600 via-violet-600 to-purple-700"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-5">

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Personnel', count: staffList.length + teachers.length, icon: Users, bg: 'bg-indigo-50', ic: 'text-indigo-500', border: 'border-indigo-100' },
                        { label: 'Management Accounts', count: staffList.length,   icon: Shield,       bg: 'bg-violet-50', ic: 'text-violet-500', border: 'border-violet-100' },
                        { label: 'Full-Access Roles',   count: fullAccessCount,    icon: ShieldCheck,  bg: 'bg-emerald-50',ic: 'text-emerald-500',border: 'border-emerald-100'},
                        { label: 'Teachers',            count: teachers.length,    icon: GraduationCap,bg: 'bg-blue-50',   ic: 'text-blue-500',  border: 'border-blue-100'   },
                    ].map(({ label, count, icon: Icon, bg, ic, border }) => (
                        <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm shadow-slate-100">
                            <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center shrink-0`}>
                                <Icon size={17} className={ic} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900 leading-none">{count}</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Toolbar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Tab switcher */}
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm shadow-slate-100 shrink-0">
                        {(['staff', 'teachers'] as TabKey[]).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    tab === t
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}>
                                {t === 'staff' ? <Shield size={13} /> : <GraduationCap size={13} />}
                                {t === 'staff' ? 'Management' : 'Teachers'}
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                                    tab === t ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {t === 'staff' ? staffList.length : teachers.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email, or phone…"
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors shadow-sm shadow-slate-100" />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <button onClick={fetchAll} disabled={loading}
                            title="Refresh"
                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50 shadow-sm shadow-slate-100">
                            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {canManageStaff && tab === 'staff' && (
                            <button onClick={() => setShowCreate(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-300">
                                <UserPlus size={14} /> Add Staff
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 overflow-hidden">

                    {/* Column headers */}
                    {!loading && ((tab === 'staff' && filteredStaff.length > 0) || (tab === 'teachers' && filteredTeachers.length > 0)) && (
                        <div className={`grid ${tab === 'staff' ? 'grid-cols-[2fr_1fr_2fr_auto]' : 'grid-cols-[2fr_1fr_1fr_auto]'} gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200`}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tab === 'staff' ? 'Role' : 'Status'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tab === 'staff' ? 'Module Access' : 'Contact'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="divide-y divide-slate-100">
                            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                        </div>
                    ) : tab === 'staff' ? (
                        filteredStaff.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                    <Shield size={24} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-bold text-slate-600 mb-1">
                                    {search ? 'No matching staff found' : 'No management accounts yet'}
                                </p>
                                <p className="text-xs text-slate-400 max-w-xs mb-5">
                                    {search
                                        ? 'Try a different search term.'
                                        : 'Create staff accounts to give your team access to the management portal with specific module permissions.'}
                                </p>
                                {canManageStaff && !search && (
                                    <button onClick={() => setShowCreate(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                                        <UserPlus size={14} /> Create First Staff Member
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredStaff.map(user => {
                                    const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
                                    const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
                                    const isSelf   = user.id === currentUserId;
                                    const fullR    = isFullAccess(user.role);

                                    const avatarGrad = fullR
                                        ? 'from-emerald-500 to-teal-600'
                                        : 'from-indigo-500 to-violet-600';

                                    return (
                                        <div key={user.id}
                                            className="grid grid-cols-[2fr_1fr_2fr_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50/60 transition-colors">
                                            {/* Member */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGrad} text-white flex items-center justify-center font-black text-sm shrink-0`}>
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{fullName}</p>
                                                        {isSelf && (
                                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">You</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                            <Phone size={9} /> {user.phone}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                                                            <Mail size={9} /> {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Role */}
                                            <div>
                                                <RoleBadge role={user.role} />
                                            </div>

                                            {/* Module Access */}
                                            <div className="min-w-0">
                                                <PermSummary permissions={user.permissions} role={user.role} />
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 justify-end shrink-0">
                                                {canManageStaff && !fullR && (
                                                    <button
                                                        onClick={() => setPermTarget(user)}
                                                        title="Edit module access"
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors">
                                                        <Lock size={11} /> Access
                                                    </button>
                                                )}
                                                {canManageStaff && (
                                                    <>
                                                        <button onClick={() => setEditTarget(user)} title="Edit staff member"
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button onClick={() => setResetTarget({ id: user.id, name: fullName, type: 'staff' })}
                                                            title="Reset password"
                                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                            <KeyRound size={14} />
                                                        </button>
                                                        {!isSelf && (
                                                            <button onClick={() => setDeleteTarget({ id: user.id, name: fullName })}
                                                                title="Delete staff member"
                                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        /* ── Teachers Tab ── */
                        filteredTeachers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                    <GraduationCap size={24} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-bold text-slate-600 mb-1">
                                    {search ? 'No matching teachers' : 'No teachers yet'}
                                </p>
                                <p className="text-xs text-slate-400 max-w-xs">
                                    {search ? 'Try a different search term.' : 'Add teachers from the Teachers section.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredTeachers.map(t => {
                                    const initials = t.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                                    return (
                                        <div key={t.id}
                                            className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50/60 transition-colors">
                                            {/* Member */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{t.qualification} · {t.gender} · Age {t.age}</p>
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                                                    t.isActive
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {t.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>

                                            {/* Contact */}
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                    <Phone size={10} className="text-slate-300" /> {t.phone}
                                                </div>
                                                {t.email && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                                                        <Mail size={10} className="text-slate-300" /> {t.email}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 justify-end">
                                                {canManageStaff && (
                                                    <button
                                                        onClick={() => setResetTarget({ id: t.id, name: t.name, type: 'teacher' })}
                                                        title="Reset teacher password"
                                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                        <KeyRound size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>

                {/* Footer note */}
                {!loading && tab === 'staff' && filteredStaff.length > 0 && (
                    <p className="text-xs text-slate-400 text-center pb-2">
                        {filteredStaff.length} management account{filteredStaff.length !== 1 ? 's' : ''}
                        {staffOnlyCount > 0 && ` · ${staffOnlyCount} with custom access`}
                        {fullAccessCount > 0 && ` · ${fullAccessCount} full access`}
                    </p>
                )}
            </div>
        </div>
    );
};

export default StaffHome;
