import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Users, Loader2, KeyRound, Eye, EyeOff, X, Phone, Mail,
    Shield, Search, GraduationCap, UserPlus, Trash2, Pencil, ShieldCheck,
    Lock, CheckCircle2, AlertTriangle, UserCog, BookMarked, ClipboardCheck,
    Library, MessageSquare, Wallet, Settings, Crown, BarChart3,
    TrendingUp, Activity, Info, Bus, Trophy, Sparkles, Package, CalendarDays,
    ChevronLeft, Plus,
} from 'lucide-react';
import api from '../../api/api';
import type { StaffRoleDef } from '../../api/api';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useAuthContext, ALL_MODULES, type AppModule } from '../../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Level = 'NONE' | 'READ' | 'ADMIN';
interface Permission { module: string; level: 'READ' | 'ADMIN' }
interface AssignedRole { type: string; key: string; name: string }
interface StaffMember {
    id: string; firstName: string; middleName?: string; lastName: string;
    phone: string; email: string; role: string | null; createdAt: string;
    permissions: Permission[] | null;
    roles?: AssignedRole[];
}
interface Teacher {
    id: string; name: string; gender: string; age: number;
    qualification: string; phone: string; email?: string; isActive: boolean; createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * "No-permission-grid" roles. ADMIN and PRINCIPAL are full-write; DIRECTOR is
 * read-only across every module. In all three cases the per-module grid is
 * meaningless so we hide it and send an empty permission array.
 */
const NO_GRID_ROLES = ['ADMIN', 'PRINCIPAL', 'DIRECTOR'];
function needsPermissionGrid(role: string | null | undefined) {
    return !NO_GRID_ROLES.includes(role ?? '');
}
/** Truly full-access — ADMIN and PRINCIPAL. DIRECTOR is read-only. */
function isFullWriteAccess(role: string | null | undefined) {
    return role === 'ADMIN' || role === 'PRINCIPAL';
}
/** Kept for backwards-compatible callsites in this file. */
function isFullAccess(role: string | null | undefined) {
    return NO_GRID_ROLES.includes(role ?? '');
}

/** Modules bundled with every school by default (kept in sync with backend). */
const ALWAYS_ON_MODULES: readonly AppModule[] = ['PEOPLE', 'TEACHERS', 'ACADEMICS'];

const MODULE_META: Record<AppModule, {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    desc: string;
    pages: string[];
}> = {
    PEOPLE:        { label: 'People',        icon: Users,          color: 'text-blue-600',    bg: 'bg-blue-50',
        desc: 'Applicants, students, staff directory.',
        pages: ['Applicants', 'Students', 'Staff accounts'] },
    TEACHERS:      { label: 'Teachers',      icon: UserCog,        color: 'text-violet-600',  bg: 'bg-violet-50',
        desc: 'Teacher roster, assignments.',
        pages: ['Teachers', 'Assignments'] },
    ACADEMICS:     { label: 'Academics',     icon: GraduationCap,  color: 'text-emerald-600', bg: 'bg-emerald-50',
        desc: 'Sessions, classes, courses, subjects.',
        pages: ['Sessions', 'Classes', 'Courses', 'Subjects'] },
    STUDIES:       { label: 'Studies',       icon: BookMarked,     color: 'text-amber-600',   bg: 'bg-amber-50',
        desc: 'Exams, marks, performance reports.',
        pages: ['Exams', 'Performance'] },
    ATTENDANCE:    { label: 'Attendance',    icon: ClipboardCheck, color: 'text-cyan-600',    bg: 'bg-cyan-50',
        desc: 'Student & teacher attendance, leaves.',
        pages: ['Student attendance', 'Teacher attendance', 'Leaves'] },
    LIBRARY:       { label: 'Library',       icon: Library,        color: 'text-pink-600',    bg: 'bg-pink-50',
        desc: 'Book catalogue, issues, returns.',
        pages: ['Library'] },
    COMMUNICATION: { label: 'Communication', icon: MessageSquare,  color: 'text-indigo-600',  bg: 'bg-indigo-50',
        desc: 'Notice board, email blasts, calendar.',
        pages: ['Notice board', 'Email blast', 'Calendar'] },
    FINANCE:       { label: 'Finance',       icon: Wallet,         color: 'text-orange-600',  bg: 'bg-orange-50',
        desc: 'Fee structures, invoices, payments.',
        pages: ['Fee management'] },
    TRANSPORT:     { label: 'Transport',     icon: Bus,            color: 'text-teal-600',    bg: 'bg-teal-50',
        desc: 'Vehicles, routes, transport fees.',
        pages: ['Transport'] },
    SPORTS:        { label: 'Sports',        icon: Trophy,         color: 'text-yellow-600',  bg: 'bg-yellow-50',
        desc: 'Sports events, coaches, enrolments.',
        pages: ['Sports'] },
    INVENTORY:     { label: 'Inventory',     icon: Package,        color: 'text-lime-600',    bg: 'bg-lime-50',
        desc: 'Item master, procurement, consumption ledger.',
        pages: ['Inventory'] },
    HOMEWORK:      { label: 'Homework',      icon: BookMarked,     color: 'text-rose-600',    bg: 'bg-rose-50',
        desc: 'Assign homework, track & grade submissions.',
        pages: ['Homework'] },
    TIMETABLE:     { label: 'Timetable',     icon: CalendarDays,   color: 'text-sky-600',     bg: 'bg-sky-50',
        desc: 'Build the weekly class timetable.',
        pages: ['Timetable'] },
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

const LevelPicker: React.FC<{ level: Level; onChange: (l: Level) => void; readOnly?: boolean; minRead?: boolean }> = ({ level, onChange, readOnly, minRead }) => (
    <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
        {(['NONE', 'READ', 'ADMIN'] as Level[]).map(l => {
            const cfg = LEVEL_CONFIG[l];
            // minRead = always-on module: READ is the floor, so NONE is locked.
            const locked = readOnly || (minRead && l === 'NONE');
            return (
                <button
                    key={l}
                    type="button"
                    disabled={locked}
                    onClick={() => onChange(l)}
                    title={minRead && l === 'NONE' ? 'People, Teachers & Academics are always at least Read' : undefined}
                    className={`px-3 py-1.5 text-[11px] font-bold transition-all min-w-[46px] ${level === l ? cfg.active : cfg.idle} disabled:opacity-40 disabled:cursor-not-allowed`}
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
    /** Modules the tenant has actually subscribed to. If undefined we treat every module as enabled (loading state). */
    enabledModules?: readonly string[];
    /** Optional "same as" prefill dropdown. */
    copyFromOptions?: Array<{ id: string; label: string; permissions: Permission[] }>;
}> = ({ permissions, onChange, readOnly, enabledModules, copyFromOptions }) => {
    // People/Teachers/Academics can never drop below READ (product rule).
    const ensureFloor = (perms: Permission[]): Permission[] => {
        const map = new Map(perms.map(p => [p.module, p.level] as const));
        for (const m of ALWAYS_ON_MODULES) if (!map.has(m)) map.set(m, 'READ');
        return [...map.entries()].map(([module, level]) => ({ module, level: level as 'READ' | 'ADMIN' }));
    };
    const emit = (perms: Permission[]) => onChange(ensureFloor(perms));

    const getLevel = (mod: AppModule): Level => {
        const p = permissions.find(p => p.module === mod);
        return p ? p.level : 'NONE';
    };
    const setLevel = (mod: AppModule, level: Level) => {
        // Guard the floor: an always-on module can't be set to NONE.
        if (level === 'NONE' && ALWAYS_ON_MODULES.includes(mod)) return;
        const filtered = permissions.filter(p => p.module !== mod);
        emit(level === 'NONE' ? filtered : [...filtered, { module: mod, level: level as 'READ' | 'ADMIN' }]);
    };

    const isEnabled = (mod: AppModule): boolean => {
        if (!enabledModules) return true;
        return enabledModules.includes(mod);
    };

    const granted = permissions.length;
    const adminCount = permissions.filter(p => p.level === 'ADMIN').length;
    const dormantCount = permissions.filter(p => !isEnabled(p.module as AppModule)).length;

    // Group into "Always on" and "Optional" so the picker mirrors the same
    // concept the superadmin module screen uses. Always-on modules are the
    // "bundled" ones (PEOPLE, TEACHERS, ACADEMICS) which are baseline for
    // every school and can't be disabled at the tenant level.
    //
    // Defensive filter: exclude any module that doesn't have MODULE_META so a
    // stale bundle or a mis-synced constant can't crash the picker with a
    // "Cannot read properties of undefined (reading 'icon')" runtime error.
    const alwaysOn = ALL_MODULES.filter(m => ALWAYS_ON_MODULES.includes(m) && MODULE_META[m]);
    const optional = ALL_MODULES.filter(m => !ALWAYS_ON_MODULES.includes(m) && MODULE_META[m]);

    // Actions bar helpers
    const applyAll = (level: Exclude<Level, 'NONE'>, scope: 'enabled' | 'all') => {
        const targets = ALL_MODULES.filter(m => scope === 'all' || isEnabled(m));
        emit(targets.map(m => ({ module: m, level })));
    };

    return (
        <div className="space-y-3">
            {/* Quick-set bar */}
            {!readOnly && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-auto">
                        {granted === 0 ? 'No modules granted' : `${granted} granted`}
                        {adminCount > 0 && ` · ${adminCount} admin`}
                        {dormantCount > 0 && (
                            <span className="text-amber-600 ml-1">· {dormantCount} dormant</span>
                        )}
                    </span>
                    {copyFromOptions && copyFromOptions.length > 0 && (
                        <select
                            defaultValue=""
                            onChange={(e) => {
                                const opt = copyFromOptions.find(o => o.id === e.target.value);
                                if (opt) onChange(opt.permissions.map(p => ({ ...p })));
                                e.target.value = '';
                            }}
                            className="text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            title="Copy permissions from another staff member"
                        >
                            <option value="">Copy from…</option>
                            {copyFromOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                        </select>
                    )}
                    <button type="button" onClick={() => applyAll('READ', 'enabled')}
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 px-2.5 py-1 rounded-lg hover:bg-sky-50 transition-colors">
                        Read all
                    </button>
                    <button type="button" onClick={() => applyAll('ADMIN', 'enabled')}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                        Admin all
                    </button>
                    <button type="button" onClick={() => emit([])}
                        className="text-[11px] font-semibold text-slate-400 hover:text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Clears optional modules; People/Teachers/Academics stay at Read">
                        Clear
                    </button>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <PermissionGridSection
                    title="Always on"
                    subtitle="Bundled with every school · minimum Read"
                    modules={alwaysOn}
                    getLevel={getLevel} setLevel={setLevel}
                    isEnabled={isEnabled}
                    readOnly={readOnly}
                    minRead
                />
                <PermissionGridSection
                    title="Optional"
                    subtitle="Requires school subscription"
                    modules={optional}
                    getLevel={getLevel} setLevel={setLevel}
                    isEnabled={isEnabled}
                    readOnly={readOnly}
                    firstRowDivided
                />
            </div>

            {dormantCount > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-2.5">
                    <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                        {dormantCount} permission{dormantCount !== 1 ? 's are' : ' is'} for {dormantCount !== 1 ? 'modules' : 'a module'} the school hasn't subscribed to yet.
                        {' '}They'll activate automatically when your super-admin enables the module.
                    </p>
                </div>
            )}
        </div>
    );
};

/** Section within PermissionGrid — one for "Always on", one for "Optional". */
const PermissionGridSection: React.FC<{
    title: string;
    subtitle: string;
    modules: readonly AppModule[];
    getLevel: (m: AppModule) => Level;
    setLevel: (m: AppModule, l: Level) => void;
    isEnabled: (m: AppModule) => boolean;
    readOnly?: boolean;
    firstRowDivided?: boolean;
    minRead?: boolean;
}> = ({ title, subtitle, modules, getLevel, setLevel, isEnabled, readOnly, firstRowDivided, minRead }) => (
    <>
        <div className={`grid grid-cols-[1fr_auto] items-center px-4 py-2 bg-slate-50 gap-4 ${firstRowDivided ? 'border-t' : ''} border-b border-slate-200`}>
            <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
                <span className="text-[10px] text-slate-400 ml-2">— {subtitle}</span>
            </div>
            <div className="flex gap-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="min-w-[46px] text-center">None</span>
                <span className="min-w-[46px] text-center">Read</span>
                <span className="min-w-[46px] text-center">Admin</span>
            </div>
        </div>
        {modules.map((mod, idx) => {
            const meta = MODULE_META[mod];
            if (!meta) return null;
            const Icon = meta.icon;
            const level = getLevel(mod);
            const enabled = isEnabled(mod);
            return (
                <div key={mod}
                    className={`grid grid-cols-[1fr_auto] items-center px-4 py-3 gap-4 transition-colors
                        ${level !== 'NONE' ? 'bg-white' : 'bg-white hover:bg-slate-50/60'}
                        ${idx < modules.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                    <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg} ${!enabled ? 'opacity-60' : ''}`}>
                            <Icon size={14} className={meta.color} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-sm font-semibold ${level !== 'NONE' ? 'text-slate-800' : 'text-slate-600'}`}>
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
                                {!enabled && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                        <Info size={9} /> Not subscribed
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight mt-0.5 line-clamp-1">{meta.desc}</p>
                        </div>
                    </div>
                    <LevelPicker level={level} onChange={(l) => setLevel(mod, l)} readOnly={readOnly} minRead={minRead} />
                </div>
            );
        })}
    </>
);

// ── Role Card Picker ──────────────────────────────────────────────────────────

const RolePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

// ── Role (job-title) selector — built-in + school-defined presets ─────────────

const roleId = (r: { type: string; key: string }) => `${r.type}:${r.key}`;

const RoleSelector: React.FC<{
    builtIn: StaffRoleDef[];
    custom: StaffRoleDef[];
    selected: Array<{ type: string; key: string }>;
    onToggle: (role: StaffRoleDef) => void;
    onManage: () => void;
}> = ({ builtIn, custom, selected, onToggle, onManage }) => {
    const selectedSet = new Set(selected.map(roleId));
    const Chip: React.FC<{ role: StaffRoleDef }> = ({ role }) => {
        const active = selectedSet.has(roleId(role));
        const adminMods = role.permissions.filter(p => p.level === 'ADMIN').length;
        return (
            <button type="button" onClick={() => onToggle(role)} title={role.description}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}>
                {active ? <CheckCircle2 size={13} /> : <Shield size={12} className="opacity-60" />}
                {role.name}
                {adminMods > 0 && <span className={`text-[9px] font-bold px-1 rounded ${active ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>{adminMods}★</span>}
            </button>
        );
    };
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Pick one or more roles — their access is merged into the grid below (strongest wins). You can fine-tune afterward.</p>
                <button type="button" onClick={onManage} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap flex items-center gap-1">
                    <Settings size={11} /> Manage roles
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {builtIn.map(r => <Chip key={roleId(r)} role={r} />)}
            </div>
            {custom.length > 0 && (
                <>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">Your school's roles</p>
                    <div className="flex flex-wrap gap-2">
                        {custom.map(r => <Chip key={roleId(r)} role={r} />)}
                    </div>
                </>
            )}
        </div>
    );
};

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

const PermSummary: React.FC<{
    permissions: Permission[] | null;
    role: string | null;
    enabledModules?: readonly string[];
}> = ({ permissions, role, enabledModules }) => {
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
    // Sort so ADMIN grants come first (they're higher-privilege signal).
    const sorted = [...permissions].sort((a, b) =>
        a.level === b.level ? 0 : a.level === 'ADMIN' ? -1 : 1,
    );
    // Drop entries for modules we don't have metadata for so the render can't
    // hit an undefined access at the icon lookup.
    const knownSorted = sorted.filter(p => !!MODULE_META[p.module as AppModule]);
    const shown = knownSorted.slice(0, 3);
    const rest  = knownSorted.length - 3;
    const dormantCount = enabledModules
        ? permissions.filter(p => !enabledModules.includes(p.module)).length
        : 0;
    return (
        <div className="flex flex-wrap items-center gap-1">
            {shown.map(p => {
                const meta = MODULE_META[p.module as AppModule];
                if (!meta) return null;
                const Icon = meta.icon;
                const dormant = enabledModules && !enabledModules.includes(p.module);
                const chipCls = dormant
                    ? 'bg-slate-50 text-slate-500 border-slate-200 opacity-70'
                    : p.level === 'ADMIN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200';
                return (
                    <span key={p.module}
                        title={dormant ? `${meta.label} — school not subscribed` : `${meta.label} — ${p.level === 'ADMIN' ? 'Admin' : 'Read'}`}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${chipCls}`}>
                        <Icon size={9} />
                        {meta.label}
                        <span className="opacity-60">{p.level === 'ADMIN' ? '·A' : '·R'}</span>
                    </span>
                );
            })}
            {rest > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    +{rest} more
                </span>
            )}
            {dormantCount > 0 && (
                <span title={`${dormantCount} permission${dormantCount !== 1 ? 's' : ''} awaiting module subscription`}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Info size={9} /> {dormantCount} dormant
                </span>
            )}
        </div>
    );
};

// ── Staff Drawer (create / edit) ──────────────────────────────────────────────

interface DrawerProps {
    initial?: StaffMember | null;
    currentUserId?: string;
    enabledModules?: readonly string[];
    /** Other staff to seed "copy access from" — excludes `initial` when editing. */
    copyFromOptions?: Array<{ id: string; label: string; permissions: Permission[] }>;
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
}

const StaffDrawer: React.FC<DrawerProps> = ({ initial, enabledModules, copyFromOptions, onSave, onClose }) => {
    const isEdit = !!initial;
    const [firstName, setFirstName] = useState(initial?.firstName ?? '');
    const [lastName,  setLastName]  = useState(initial?.lastName  ?? '');
    const [phone,     setPhone]     = useState(initial?.phone     ?? '');
    const [email,     setEmail]     = useState(initial?.email     ?? '');
    const [role,      setRole]      = useState(initial?.role      ?? 'MANAGEMENT_STAFF');
    const [password,  setPassword]  = useState('');
    const [showPass,  setShowPass]  = useState(false);
    // New staff start at the read floor (People/Teachers/Academics = READ).
    const [perms, setPerms] = useState<Permission[]>(() => {
        const base = initial?.permissions ?? [];
        const map = new Map(base.map(p => [p.module, p.level] as const));
        for (const m of ALWAYS_ON_MODULES) if (!map.has(m)) map.set(m, 'READ');
        return [...map.entries()].map(([module, level]) => ({ module, level: level as 'READ' | 'ADMIN' }));
    });
    const [selectedRoles, setSelectedRoles] = useState<Array<{ type: string; key: string }>>(
        () => (initial?.roles ?? []).map(r => ({ type: r.type, key: r.key }))
    );
    const [showRoleManager, setShowRoleManager] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const rolesQuery = useQuery({ queryKey: ['staff', 'roles'], queryFn: () => api.getStaffRoles() });
    const builtIn = rolesQuery.data?.builtIn ?? [];
    const custom  = rolesQuery.data?.custom ?? [];

    // Toggle a role: selecting merges its permissions into the grid (strongest
    // wins, floor preserved); deselecting just drops the tag — the grid keeps
    // whatever it holds so manual edits are never lost.
    const toggleRole = (roleDef: StaffRoleDef) => {
        const id = `${roleDef.type}:${roleDef.key}`;
        const isOn = selectedRoles.some(r => `${r.type}:${r.key}` === id);
        if (isOn) {
            setSelectedRoles(prev => prev.filter(r => `${r.type}:${r.key}` !== id));
        } else {
            setSelectedRoles(prev => [...prev, { type: roleDef.type, key: roleDef.key }]);
            setPerms(prev => {
                const map = new Map(prev.map(p => [p.module, p.level] as const));
                const rank = { READ: 1, ADMIN: 2 } as const;
                for (const p of roleDef.permissions) {
                    const cur = map.get(p.module);
                    if (!cur || rank[p.level as 'READ' | 'ADMIN'] > rank[cur as 'READ' | 'ADMIN']) map.set(p.module, p.level as 'READ' | 'ADMIN');
                }
                for (const m of ALWAYS_ON_MODULES) if (!map.has(m)) map.set(m, 'READ');
                return [...map.entries()].map(([module, level]) => ({ module, level: level as 'READ' | 'ADMIN' }));
            });
        }
    };

    // Effective access: what pages this staff will actually see, given both
    // per-user grants AND per-tenant module subscriptions. Recompute on any
    // change so admins can watch the preview update as they toggle levels.
    const effectiveAccess = useMemo(() => {
        if (isFullWriteAccess(role)) {
            return { label: 'Full portal access', modules: [...ALL_MODULES] as string[], readOnly: false };
        }
        if (role === 'DIRECTOR') {
            return { label: 'Read-only across every module', modules: [...ALL_MODULES] as string[], readOnly: true };
        }
        // Staff — intersection of grants and enabled modules.
        const enabled = enabledModules ? new Set(enabledModules) : null;
        const modules = perms
            .filter(p => !enabled || enabled.has(p.module))
            .map(p => p.module);
        return { label: modules.length === 0 ? 'No modules yet' : `${modules.length} module${modules.length !== 1 ? 's' : ''}`, modules, readOnly: false };
    }, [role, perms, enabledModules]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null); setSaving(true);
        try {
            await onSave({
                firstName, lastName, phone, email, role,
                ...(password ? { password } : {}),
                permissions: isFullAccess(role) ? [] : perms,
                roles: isFullAccess(role) ? [] : selectedRoles.map(r => ({ type: r.type as 'BUILTIN' | 'CUSTOM', key: r.key })),
            });
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Failed to save. Please try again.');
            setSaving(false);
        }
    };

    const inputCls = "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white transition-colors placeholder:text-slate-300";
    const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
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
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
                        {/* Left column — identity, role & job roles */}
                        <div className="overflow-y-auto px-6 py-6 space-y-6 md:border-r border-slate-100">
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

                        {/* Job roles (presets) */}
                        {needsPermissionGrid(role) && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job Roles</p>
                                    <span className="text-[10px] text-slate-400">— optional presets</span>
                                </div>
                                {rolesQuery.isLoading
                                    ? <p className="text-xs text-slate-400">Loading roles…</p>
                                    : <RoleSelector builtIn={builtIn} custom={custom} selected={selectedRoles} onToggle={toggleRole} onManage={() => setShowRoleManager(true)} />}
                            </div>
                        )}
                        </div>{/* /left column */}

                        {/* Right column — module access */}
                        <div className="overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/40">
                        {/* Module Access */}
                        {needsPermissionGrid(role) ? (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Module Access</p>
                                    <span className="text-[10px] text-slate-400">— fine-tune anything</span>
                                </div>
                                <PermissionGrid
                                    permissions={perms}
                                    onChange={setPerms}
                                    enabledModules={enabledModules}
                                    copyFromOptions={copyFromOptions}
                                />

                                {/* Effective access preview */}
                                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3.5 py-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={13} className="text-indigo-600" />
                                        <p className="text-xs font-bold text-indigo-900">Effective access</p>
                                        <span className="text-[10px] font-semibold text-indigo-600 bg-white/60 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                                            {effectiveAccess.label}
                                        </span>
                                    </div>
                                    {effectiveAccess.modules.filter(m => MODULE_META[m as AppModule]).length === 0 ? (
                                        <p className="text-[11px] text-indigo-700/80 italic">
                                            No pages will be visible. Grant at least one module above.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {effectiveAccess.modules.map(m => {
                                                const meta = MODULE_META[m as AppModule];
                                                if (!meta) return null;
                                                const Icon = meta.icon;
                                                const grant = perms.find(p => p.module === m);
                                                return (
                                                    <span key={m} className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-900 bg-white border border-indigo-100 px-2 py-0.5 rounded-full"
                                                          title={meta.pages.join(' · ')}>
                                                        <Icon size={10} className={meta.color} />
                                                        {meta.label}
                                                        {grant?.level === 'ADMIN' && <span className="text-emerald-600">·A</span>}
                                                        {grant?.level === 'READ' && <span className="text-sky-600">·R</span>}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : role === 'DIRECTOR' ? (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <Crown size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800">Director has read-only access</p>
                                    <p className="text-xs text-amber-700 mt-0.5">This role can view every module but cannot make changes. No per-module configuration is needed.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-800">{role} has full access</p>
                                    <p className="text-xs text-emerald-600 mt-0.5">This role can access every module without restrictions. No per-module configuration is needed.</p>
                                </div>
                            </div>
                        )}
                        </div>{/* /right column */}
                    </div>{/* /two-column grid */}

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
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

            {showRoleManager && (
                <RoleManager
                    custom={custom}
                    enabledModules={enabledModules}
                    onClose={() => setShowRoleManager(false)}
                    onChanged={() => rolesQuery.refetch()}
                />
            )}
        </div>
    );
};

// ── Role Manager (school-defined role CRUD) ───────────────────────────────────

const RoleManager: React.FC<{
    custom: StaffRoleDef[];
    enabledModules?: readonly string[];
    onClose: () => void;
    onChanged: () => void;
}> = ({ custom, enabledModules, onClose, onChanged }) => {
    const { addToast } = useToast();
    const [editing, setEditing] = useState<StaffRoleDef | null>(null);
    const [mode, setMode] = useState<'list' | 'form'>('list');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [perms, setPerms] = useState<Permission[]>([]);
    const [busy, setBusy] = useState(false);

    const startNew = () => { setEditing(null); setName(''); setDescription(''); setPerms([]); setMode('form'); };
    const startEdit = (r: StaffRoleDef) => {
        setEditing(r); setName(r.name); setDescription(r.description);
        setPerms(r.permissions.map(p => ({ module: p.module, level: p.level }))); setMode('form');
    };

    const save = async () => {
        if (name.trim().length < 2) { addToast('Role name is too short.', 'error'); return; }
        setBusy(true);
        try {
            if (editing) await api.updateStaffRole(editing.key, { name, description, permissions: perms });
            else await api.createStaffRole({ name, description, permissions: perms });
            addToast(editing ? 'Role updated.' : 'Role created.', 'success');
            onChanged(); setMode('list');
        } catch (e: any) {
            addToast(e?.response?.data?.message ?? 'Could not save role.', 'error');
        } finally { setBusy(false); }
    };
    const remove = async (r: StaffRoleDef) => {
        setBusy(true);
        try { await api.deleteStaffRole(r.key); addToast('Role deleted.', 'success'); onChanged(); }
        catch (e: any) { addToast(e?.response?.data?.message ?? 'Could not delete role.', 'error'); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        {mode === 'form' && <button onClick={() => setMode('list')} className="text-slate-400 hover:text-slate-600"><ChevronLeft size={16} /></button>}
                        <h3 className="text-sm font-bold text-slate-800">{mode === 'list' ? "Your school's roles" : editing ? 'Edit role' : 'New role'}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {mode === 'list' ? (
                        <div className="space-y-2">
                            <button onClick={startNew} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100">
                                <Plus size={14} /> Create a role
                            </button>
                            {custom.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No custom roles yet. Built-in roles are always available.</p>}
                            {custom.map(r => (
                                <div key={r.key} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{r.description || `${r.permissions.length} module grant(s)`}</p>
                                    </div>
                                    <button onClick={() => startEdit(r)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={13} /></button>
                                    <button disabled={busy} onClick={() => remove(r)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role name <span className="text-red-400">*</span></label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lab Assistant" className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this role does" className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Access</label>
                                <PermissionGrid permissions={perms} onChange={setPerms} enabledModules={enabledModules} />
                            </div>
                        </div>
                    )}
                </div>

                {mode === 'form' && (
                    <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                        <button onClick={() => setMode('list')} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Back</button>
                        <button onClick={save} disabled={busy} className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {busy && <Loader2 size={14} className="animate-spin" />} {editing ? 'Save role' : 'Create role'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Permission Drawer (standalone) ────────────────────────────────────────────

const PermDrawer: React.FC<{
    staff: StaffMember;
    enabledModules?: readonly string[];
    copyFromOptions?: Array<{ id: string; label: string; permissions: Permission[] }>;
    onSave: (perms: Permission[]) => Promise<void>;
    onClose: () => void;
}> = ({ staff, enabledModules, copyFromOptions, onSave, onClose }) => {
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
                            <PermissionGrid
                                permissions={perms}
                                onChange={setPerms}
                                enabledModules={enabledModules}
                                copyFromOptions={copyFromOptions}
                            />
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

    const queryClient = useQueryClient();
    const [search,    setSearch]    = useState('');
    const [tab,       setTab]       = useState<TabKey>('staff');

    // Drawer / modal state
    const [showCreate,    setShowCreate]    = useState(false);
    const [editTarget,    setEditTarget]    = useState<StaffMember | null>(null);
    const [permTarget,    setPermTarget]    = useState<StaffMember | null>(null);
    const [resetTarget,   setResetTarget]   = useState<{ id: string; name: string; type: 'staff' | 'teacher' } | null>(null);
    const [deleteTarget,  setDeleteTarget]  = useState<{ id: string; name: string } | null>(null);

    // Staff + teachers as separate queries; teachers query key is shared
    // with TeacherHome / Dashboard so revisits hydrate from cache.
    const staffQuery = useQuery({
        queryKey: ["staff", "list"],
        queryFn: () => api.getStaff(),
        select: (d: any) => d?.staff ?? [],
    });
    const teachersQuery = useQuery({
        queryKey: ["teachers", "list"],
        queryFn: () => api.getTeachers(),
        select: (d: any) => Array.isArray(d) ? d : (d?.teachers ?? []),
    });
    // Tenant's module subscription state — feeds the "Not subscribed" badge
    // in the permission grid so admins know which grants are dormant.
    const allowedModulesQuery = useQuery({
        queryKey: ["staff", "allowed-modules"],
        queryFn: () => api.getStaffAllowedModules(),
        // Modules rarely change; keep the response fresh for a few minutes.
        staleTime: 5 * 60 * 1000,
    });

    const staffList: StaffMember[] = staffQuery.data ?? [];
    const teachers:  Teacher[]     = teachersQuery.data ?? [];
    const enabledModules: readonly string[] | undefined = allowedModulesQuery.data?.enabled;
    const loading = staffQuery.isLoading || teachersQuery.isLoading;

    useEffect(() => {
        if (staffQuery.error || teachersQuery.error) {
            addToast('Failed to load staff data.', 'error');
        }
    }, [staffQuery.error, teachersQuery.error, addToast]);

    const fetchAll = () => {
        queryClient.invalidateQueries({ queryKey: ["staff", "list"] });
        queryClient.invalidateQueries({ queryKey: ["teachers", "list"] });
    };

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
        // Also update permissions + role assignments in the same flow.
        if (!isFullAccess(data.role)) {
            await api.updateStaffPermissions(editTarget.id, data.permissions ?? []);
            await api.updateStaffRoles(editTarget.id, data.roles ?? [], false);
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

    // Richer insights: role breakdown, recent additions, teachers split,
    // module reach, and "needs attention" count for staff with zero permissions.
    const insights = useMemo(() => {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

        const byRole: Record<string, number> = {};
        for (const s of staffList) {
            const r = s.role ?? 'UNASSIGNED';
            byRole[r] = (byRole[r] ?? 0) + 1;
        }

        const newStaffWeek = staffList.filter(s => s.createdAt && now - new Date(s.createdAt).getTime() < SEVEN_DAYS).length;
        const newStaffMonth = staffList.filter(s => s.createdAt && now - new Date(s.createdAt).getTime() < THIRTY_DAYS).length;
        const newTeacherWeek = teachers.filter(t => t.createdAt && now - new Date(t.createdAt).getTime() < SEVEN_DAYS).length;

        const activeTeachers = teachers.filter(t => t.isActive).length;
        const inactiveTeachers = teachers.length - activeTeachers;

        // Custom-access staff with empty permission grids — likely an admin oversight.
        const noPermsCount = staffList.filter(s =>
            !isFullAccess(s.role) && (!s.permissions || s.permissions.length === 0),
        ).length;

        // Module coverage: number of distinct modules at least one staff has READ/ADMIN on.
        const reachedModules = new Set<string>();
        for (const s of staffList) {
            if (isFullAccess(s.role)) {
                ALL_MODULES.forEach(m => reachedModules.add(m));
                break;
            }
            for (const p of s.permissions ?? []) reachedModules.add(p.module);
        }

        return {
            byRole,
            newStaffWeek,
            newStaffMonth,
            newTeacherWeek,
            activeTeachers,
            inactiveTeachers,
            noPermsCount,
            reachedModules: reachedModules.size,
            totalModules: ALL_MODULES.length,
        };
    }, [staffList, teachers]);

    // ── Render ─────────────────────────────────────────────────────────────

    // Build "copy from" options — only staff members that actually have a
    // custom permission grid (i.e. not full-access roles). Exclude the person
    // being edited so they don't appear in their own dropdown.
    const buildCopyFrom = (excludeId?: string) =>
        staffList
            .filter(u => needsPermissionGrid(u.role) && u.id !== excludeId && (u.permissions?.length ?? 0) > 0)
            .map(u => ({
                id: u.id,
                label: `${u.firstName} ${u.lastName} · ${u.permissions?.length ?? 0} module${(u.permissions?.length ?? 0) !== 1 ? 's' : ''}`,
                permissions: u.permissions ?? [],
            }));

    return (
        <div className="min-h-full bg-slate-50 pb-20">
            {/* Drawers & Modals */}
            {(showCreate || editTarget) && (
                <StaffDrawer
                    initial={editTarget}
                    currentUserId={currentUserId ?? undefined}
                    enabledModules={enabledModules}
                    copyFromOptions={buildCopyFrom(editTarget?.id)}
                    onSave={editTarget ? handleEdit : handleCreate}
                    onClose={() => { setShowCreate(false); setEditTarget(null); }}
                />
            )}
            {permTarget && (
                <PermDrawer
                    staff={permTarget}
                    enabledModules={enabledModules}
                    copyFromOptions={buildCopyFrom(permTarget.id)}
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
                gradient={MODULE_THEMES.admin}
                onRefresh={fetchAll}
                refreshing={loading}
            />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-2.5">

                {/* ── Primary stat strip (compact) ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                        {
                            label: 'Total Personnel', count: staffList.length + teachers.length,
                            sub: insights.newStaffMonth + insights.newTeacherWeek > 0 ? `+${insights.newStaffMonth} staff this month` : undefined,
                            icon: Users, bg: 'bg-indigo-50', ic: 'text-indigo-500', border: 'border-indigo-100',
                        },
                        {
                            label: 'Management Accounts', count: staffList.length,
                            sub: staffOnlyCount > 0 ? `${staffOnlyCount} with custom access` : undefined,
                            icon: Shield, bg: 'bg-violet-50', ic: 'text-violet-500', border: 'border-violet-100',
                        },
                        {
                            label: 'Full-Access Roles', count: fullAccessCount,
                            sub: fullAccessCount > 0 && staffList.length > 0 ? `${Math.round((fullAccessCount / staffList.length) * 100)}% of accounts` : undefined,
                            icon: ShieldCheck, bg: 'bg-emerald-50', ic: 'text-emerald-500', border: 'border-emerald-100',
                        },
                        {
                            label: 'Teachers', count: teachers.length,
                            sub: insights.activeTeachers > 0 ? `${insights.activeTeachers} active · ${insights.inactiveTeachers} inactive` : undefined,
                            icon: GraduationCap, bg: 'bg-blue-50', ic: 'text-blue-500', border: 'border-blue-100',
                        },
                    ].map(({ label, count, sub, icon: Icon, bg, ic, border }) => (
                        <div key={label} className="bg-white rounded-lg border border-slate-200 p-2.5 flex items-center gap-2.5 shadow-sm shadow-slate-100">
                            <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center shrink-0`}>
                                <Icon size={14} className={ic} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg font-black text-slate-900 leading-tight">{count}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{label}</p>
                                {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Secondary insights row ── */}
                {staffList.length + teachers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* Role breakdown — inline mini stacked bar */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Crown size={12} className="text-slate-400" />
                                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">Role mix</p>
                                {insights.noPermsCount > 0 && (
                                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                        <AlertTriangle size={10} /> {insights.noPermsCount} unset
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center h-2.5 rounded-full overflow-hidden bg-slate-100">
                                {(['ADMIN', 'PRINCIPAL', 'DIRECTOR', 'MANAGEMENT_STAFF'] as const).map(r => {
                                    const c = insights.byRole[r] ?? 0;
                                    if (c === 0 || staffList.length === 0) return null;
                                    const pct = (c / staffList.length) * 100;
                                    const cls =
                                        r === 'ADMIN' ? 'bg-emerald-500'
                                        : r === 'PRINCIPAL' ? 'bg-blue-500'
                                        : r === 'DIRECTOR' ? 'bg-amber-500'
                                        : 'bg-violet-500';
                                    return <div key={r} className={cls} style={{ width: `${pct}%` }} title={`${ROLE_BADGE[r]?.label ?? r}: ${c}`} />;
                                })}
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[10px] font-semibold text-slate-500">
                                {(['ADMIN', 'PRINCIPAL', 'DIRECTOR', 'MANAGEMENT_STAFF'] as const).map(r => {
                                    const c = insights.byRole[r] ?? 0;
                                    if (c === 0) return null;
                                    const dot =
                                        r === 'ADMIN' ? 'bg-emerald-500'
                                        : r === 'PRINCIPAL' ? 'bg-blue-500'
                                        : r === 'DIRECTOR' ? 'bg-amber-500'
                                        : 'bg-violet-500';
                                    return (
                                        <span key={r} className="flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                            {ROLE_BADGE[r]?.label ?? r} {c}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* New this week */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5 flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center shrink-0">
                                <TrendingUp size={14} className="text-violet-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">{insights.newStaffWeek + insights.newTeacherWeek}</p>
                                <p className="text-[10px] text-slate-500 font-medium">Added this week</p>
                                {(insights.newStaffWeek > 0 || insights.newTeacherWeek > 0) && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {insights.newStaffWeek > 0 && `${insights.newStaffWeek} staff`}
                                        {insights.newStaffWeek > 0 && insights.newTeacherWeek > 0 && ' · '}
                                        {insights.newTeacherWeek > 0 && `${insights.newTeacherWeek} teacher${insights.newTeacherWeek > 1 ? 's' : ''}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Module coverage */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5 flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center shrink-0">
                                <Activity size={14} className="text-cyan-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">{insights.reachedModules}<span className="text-slate-400 font-normal text-xs"> / {insights.totalModules}</span></p>
                                <p className="text-[10px] text-slate-500 font-medium">Modules covered by staff</p>
                            </div>
                            {insights.reachedModules < insights.totalModules && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                    {insights.totalModules - insights.reachedModules} gap
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Toolbar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Tab switcher */}
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 gap-1 shadow-sm shadow-slate-100 shrink-0">
                        {(['staff', 'teachers'] as TabKey[]).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    tab === t
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}>
                                {t === 'staff' ? <Shield size={12} /> : <GraduationCap size={12} />}
                                {t === 'staff' ? 'Management' : 'Teachers'}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                                    tab === t ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {t === 'staff' ? staffList.length : teachers.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email, or phone…"
                            className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors shadow-sm shadow-slate-100" />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                        {/* Refresh moved to the page header for consistency. */}
                        {canManageStaff && tab === 'staff' && (
                            <button onClick={() => setShowCreate(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-300">
                                <UserPlus size={12} /> Add Staff
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-100 overflow-hidden">

                    {/* Column headers */}
                    {!loading && ((tab === 'staff' && filteredStaff.length > 0) || (tab === 'teachers' && filteredTeachers.length > 0)) && (
                        <div className={`grid ${tab === 'staff' ? 'grid-cols-[2fr_1fr_2fr_auto]' : 'grid-cols-[2fr_1fr_1fr_auto]'} gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200`}>
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
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                    <Shield size={20} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-bold text-slate-600 mb-1">
                                    {search ? 'No matching staff found' : 'No management accounts yet'}
                                </p>
                                <p className="text-xs text-slate-400 max-w-xs mb-4">
                                    {search
                                        ? 'Try a different search term.'
                                        : 'Create staff accounts to give your team access to the management portal with specific module permissions.'}
                                </p>
                                {canManageStaff && !search && (
                                    <button onClick={() => setShowCreate(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                                        <UserPlus size={12} /> Create First Staff Member
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
                                            className="grid grid-cols-[2fr_1fr_2fr_auto] gap-2 sm:gap-3 items-center px-3 sm:px-4 py-3 sm:py-2.5 hover:bg-slate-50/60 transition-colors">
                                            {/* Member — bigger text on mobile */}
                                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                                <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${avatarGrad} text-white flex items-center justify-center font-black text-xs sm:text-[11px] shrink-0`}>
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-xs font-bold text-slate-900 truncate">{fullName}</p>
                                                        {isSelf && (
                                                            <span className="text-[10px] sm:text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 sm:px-1 py-0.5 rounded-full">You</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="flex items-center gap-1 text-[11px] sm:text-[10px] text-slate-400">
                                                            <Phone size={9} /> {user.phone}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[11px] sm:text-[10px] text-slate-400 truncate">
                                                            <Mail size={9} /> {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Role + assigned job roles */}
                                            <div className="flex flex-wrap items-center gap-1">
                                                <RoleBadge role={user.role} />
                                                {(user.roles ?? []).slice(0, 3).map(r => (
                                                    <span key={`${r.type}:${r.key}`} title={r.name}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                        {r.name}
                                                    </span>
                                                ))}
                                                {(user.roles?.length ?? 0) > 3 && (
                                                    <span className="text-[10px] font-semibold text-slate-400">+{(user.roles!.length - 3)}</span>
                                                )}
                                            </div>

                                            {/* Module Access */}
                                            <div className="min-w-0">
                                                <PermSummary permissions={user.permissions} role={user.role} enabledModules={enabledModules} />
                                            </div>

                                            {/* Actions — bigger tap targets on mobile */}
                                            <div className="flex items-center gap-1 justify-end shrink-0">
                                                {canManageStaff && !fullR && (
                                                    <button
                                                        onClick={() => setPermTarget(user)}
                                                        title="Edit module access"
                                                        className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-md transition-colors">
                                                        <Lock size={10} /> Access
                                                    </button>
                                                )}
                                                {canManageStaff && (
                                                    <>
                                                        {!fullR && (
                                                            <button
                                                                onClick={() => setPermTarget(user)}
                                                                aria-label="Edit module access"
                                                                className="sm:hidden w-9 h-9 flex items-center justify-center text-violet-600 hover:bg-violet-50 active:bg-violet-100 rounded-md transition-colors">
                                                                <Lock size={14} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => setEditTarget(user)} aria-label="Edit staff member"
                                                            className="w-9 h-9 sm:w-auto sm:h-auto sm:p-1.5 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 rounded-md transition-colors">
                                                            <Pencil size={14} className="sm:hidden" />
                                                            <Pencil size={12} className="hidden sm:block" />
                                                        </button>
                                                        <button onClick={() => setResetTarget({ id: user.id, name: fullName, type: 'staff' })}
                                                            aria-label="Reset password"
                                                            className="w-9 h-9 sm:w-auto sm:h-auto sm:p-1.5 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100 rounded-md transition-colors">
                                                            <KeyRound size={14} className="sm:hidden" />
                                                            <KeyRound size={12} className="hidden sm:block" />
                                                        </button>
                                                        {!isSelf && (
                                                            <button onClick={() => setDeleteTarget({ id: user.id, name: fullName })}
                                                                aria-label="Delete staff member"
                                                                className="w-9 h-9 sm:w-auto sm:h-auto sm:p-1.5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-md transition-colors">
                                                                <Trash2 size={14} className="sm:hidden" />
                                                                <Trash2 size={12} className="hidden sm:block" />
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
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                    <GraduationCap size={20} className="text-slate-300" />
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
                                            className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                                            {/* Member */}
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-black text-[11px] shrink-0">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{t.qualification} · {t.gender} · Age {t.age}</p>
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                                    t.isActive
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {t.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>

                                            {/* Contact */}
                                            <div className="space-y-0">
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                    <Phone size={9} className="text-slate-300" /> {t.phone}
                                                </div>
                                                {t.email && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                                                        <Mail size={9} className="text-slate-300" /> {t.email}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 justify-end">
                                                {canManageStaff && (
                                                    <button
                                                        onClick={() => setResetTarget({ id: t.id, name: t.name, type: 'teacher' })}
                                                        title="Reset teacher password"
                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                                                        <KeyRound size={12} />
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
                    <p className="text-[11px] text-slate-400 text-center pb-2">
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
