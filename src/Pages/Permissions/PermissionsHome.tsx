import { useEffect, useState, useCallback, useMemo } from 'react';
import api, {
    type PermissionGroup, type StaffAccount, type ScopeType, type StaffGroupMembership,
} from '../../api/api';
import { ShieldCheck, Users, Plus, Trash2, X, Search, Lock } from 'lucide-react';

/**
 * Permissions (FR-014e/f).
 *
 * Replaces the old module x level grid on the staff page. Two tabs:
 *   • People — who holds which groups, and how narrowly
 *   • Groups — the catalogue, built-in and school-defined
 *
 * A person can hold SEVERAL groups at once and their effective permission is
 * the union, so the People tab shows groups as chips rather than as a single
 * "role" field — that plurality is the whole point of the model.
 */

const SCOPES: ScopeType[] = ['GLOBAL', 'SECTION', 'CLASS', 'WING', 'DEPARTMENT', 'SESSION'];

type Tab = 'people' | 'groups';
type Person = {
    staffType: 'MANAGEMENT' | 'TEACHER';
    id: string;
    name: string;
    subtitle: string;
    role: string | null;
    groups: StaffGroupMembership[];
};

export default function PermissionsHome() {
    const [tab, setTab] = useState<Tab>('people');
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [statements, setStatements] = useState<string[]>([]);
    const [resourceGroups, setResourceGroups] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const [assignFor, setAssignFor] = useState<Person | null>(null);
    const [assignGroupId, setAssignGroupId] = useState('');
    const [assignScope, setAssignScope] = useState<ScopeType>('GLOBAL');
    const [assignScopeIds, setAssignScopeIds] = useState('');
    const [busy, setBusy] = useState(false);

    const [newGroupOpen, setNewGroupOpen] = useState(false);
    const [ngName, setNgName] = useState('');
    const [ngDescription, setNgDescription] = useState('');
    const [ngScope, setNgScope] = useState<ScopeType>('GLOBAL');
    const [ngStatements, setNgStatements] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [g, s, t, cat] = await Promise.all([
                api.getPermissionGroups(),
                api.getStaff(),
                api.getTeachersWithAccess().catch(() => ({ teachers: [] })),
                api.getRbacCatalogue(),
            ]);
            setGroups(g.groups ?? []);
            setStatements(cat.statements ?? []);
            setResourceGroups(cat.resourceGroups ?? {});
            setPeople([
                ...(s.staff ?? []).map((u: StaffAccount) => ({
                    staffType: 'MANAGEMENT' as const,
                    id: u.id,
                    name: [u.firstName, u.lastName].filter(Boolean).join(' '),
                    subtitle: u.email ?? u.phone,
                    role: u.role,
                    groups: u.groups ?? [],
                })),
                ...(t.teachers ?? []).map(tt => ({
                    staffType: 'TEACHER' as const,
                    id: tt.id,
                    name: tt.name,
                    subtitle: tt.email ?? tt.phone,
                    role: 'TEACHER',
                    groups: tt.groups ?? [],
                })),
            ]);
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not load permissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return people;
        return people.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q) ||
            p.groups.some(g => g.groupName.toLowerCase().includes(q)));
    }, [people, query]);

    const seed = async () => {
        setBusy(true); setError(null);
        try {
            const r = await api.seedPermissionGroups();
            setNotice(`Built-in roles ready — ${r.created} added, ${r.updated} refreshed.`);
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not set up the built-in roles.');
        } finally { setBusy(false); }
    };

    const assign = async () => {
        if (!assignFor || !assignGroupId) return;
        setBusy(true); setError(null);
        try {
            await api.assignStaffGroup({
                staffType: assignFor.staffType,
                staffId: assignFor.id,
                groupId: assignGroupId,
                scopeType: assignScope,
                scopeIds: assignScope === 'GLOBAL'
                    ? []
                    : assignScopeIds.split(',').map(s => s.trim()).filter(Boolean),
            });
            setNotice('Role assigned.');
            setAssignFor(null); setAssignGroupId(''); setAssignScope('GLOBAL'); setAssignScopeIds('');
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not assign that role.');
        } finally { setBusy(false); }
    };

    const revoke = async (m: StaffGroupMembership) => {
        const id = m.membershipId ?? m.id;
        if (!id) return;
        if (!window.confirm(`Remove "${m.groupName}"? They lose everything it granted.`)) return;
        setError(null);
        try {
            await api.revokeStaffGroup(id);
            setNotice('Role removed.');
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not remove that role.');
        }
    };

    const createGroup = async () => {
        setBusy(true); setError(null);
        try {
            await api.createPermissionGroup({
                name: ngName, description: ngDescription,
                intendedScope: ngScope, statements: [...ngStatements],
            });
            setNotice('Role created.');
            setNewGroupOpen(false); setNgName(''); setNgDescription(''); setNgStatements(new Set());
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not create that role.');
        } finally { setBusy(false); }
    };

    const removeGroup = async (g: PermissionGroup) => {
        if (!window.confirm(`Delete "${g.name}"? Everyone holding it loses those permissions.`)) return;
        setError(null);
        try {
            await api.deletePermissionGroup(g.id);
            setNotice('Role deleted.');
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not delete that role.');
        }
    };

    const toggleStatement = (st: string) => {
        setNgStatements(prev => {
            const next = new Set(prev);
            if (next.has(st)) next.delete(st); else next.add(st);
            return next;
        });
    };

    return (
        <div className="p-6 max-w-6xl mx-auto" data-testid="permissions-page">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={22} /> Permissions
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    People hold one or more roles. What they can do is everything their roles
                    allow, added together — and a role can be limited to a section, wing,
                    department or session.
                </p>
            </header>

            <div className="flex gap-2 mb-5 flex-wrap">
                <button
                    data-testid="perm-tab-people" data-active={tab === 'people'}
                    onClick={() => setTab('people')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${tab === 'people' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                ><Users size={16} /> People ({people.length})</button>
                <button
                    data-testid="perm-tab-groups" data-active={tab === 'groups'}
                    onClick={() => setTab('groups')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${tab === 'groups' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                ><ShieldCheck size={16} /> Roles ({groups.length})</button>
                <div className="flex-1" />
                {/* `!error` matters: on a failed load `groups` is empty, so
                    this offered "Set up the standard roles" to a school that
                    may already have them — seeding on top of its real ones. */}
                {groups.length === 0 && !error && (
                    <button
                        data-testid="perm-seed-btn" disabled={busy} onClick={() => void seed()}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
                    >Set up the standard roles</button>
                )}
                {tab === 'groups' && groups.length > 0 && (
                    <button
                        data-testid="perm-new-group-btn" onClick={() => setNewGroupOpen(true)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium flex items-center gap-2"
                    ><Plus size={16} /> Custom role</button>
                )}
            </div>

            {error && <div data-testid="perm-error" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
            {notice && <div data-testid="perm-notice" className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{notice}</div>}

            {loading ? <p className="text-slate-500 text-sm">Loading…</p> : tab === 'people' ? (
                <>
                    <div className="relative mb-4">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            data-testid="perm-search"
                            value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Search people or roles…"
                            className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        />
                    </div>

                    <div data-testid="perm-people-list" className="space-y-2">
                        {filtered.map(p => (
                            <div
                                key={`${p.staffType}-${p.id}`}
                                data-testid={`perm-person-${p.id}`}
                                className="p-4 bg-white border border-slate-200 rounded-2xl"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 flex items-center gap-2">
                                            {p.name}
                                            {p.staffType === 'TEACHER' && (
                                                <span className="text-xs px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700">Teacher</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-400">{p.subtitle}</p>
                                    </div>
                                    <button
                                        data-testid={`perm-assign-btn-${p.id}`}
                                        onClick={() => setAssignFor(p)}
                                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                                    >Add role</button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {/* ADMIN and PRINCIPAL are full-access by account, not by role. */}
                                    {(p.role === 'ADMIN' || p.role === 'PRINCIPAL') && (
                                        <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-800 flex items-center gap-1">
                                            <Lock size={12} /> Full access ({p.role})
                                        </span>
                                    )}
                                    {p.groups.length === 0 && p.role !== 'ADMIN' && p.role !== 'PRINCIPAL' && (
                                        <span data-testid={`perm-none-${p.id}`} className="text-xs text-slate-400">
                                            No roles yet — this person can't do anything until you add one.
                                        </span>
                                    )}
                                    {p.groups.map(g => (
                                        <span
                                            key={g.membershipId ?? g.groupId}
                                            data-testid={`perm-chip-${g.groupKey ?? g.groupId}`}
                                            className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1"
                                        >
                                            {g.groupName}
                                            {g.scopeType !== 'GLOBAL' && (
                                                <em className="not-italic text-slate-500">
                                                    · {g.scopeType.toLowerCase()} ×{(g.scopeIds ?? []).length}
                                                </em>
                                            )}
                                            <button
                                                onClick={() => void revoke(g)}
                                                className="ml-1 text-slate-400 hover:text-red-600"
                                                aria-label={`Remove ${g.groupName}`}
                                            ><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div data-testid="perm-groups-list" className="space-y-2">
                    {groups.map(g => (
                        <div key={g.id} data-testid={`perm-group-${g.key ?? g.id}`} className="p-4 bg-white border border-slate-200 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 flex items-center gap-2">
                                        {g.name}
                                        {g.isBuiltIn && (
                                            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">Standard</span>
                                        )}
                                        {g.intendedScope !== 'GLOBAL' && (
                                            <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700">
                                                per {g.intendedScope.toLowerCase()}
                                            </span>
                                        )}
                                    </p>
                                    {g.description && <p className="text-sm text-slate-500 mt-1">{g.description}</p>}
                                    <p className="text-xs text-slate-400 mt-1">{g.statements.length} permissions</p>
                                </div>
                                {!g.isBuiltIn && (
                                    <button
                                        data-testid={`perm-delete-group-${g.id}`}
                                        onClick={() => void removeGroup(g)}
                                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                        aria-label={`Delete ${g.name}`}
                                    ><Trash2 size={16} /></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Assign a role */}
            {assignFor && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div data-testid="perm-assign-modal" className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Add a role for {assignFor.name}</h2>
                            <button onClick={() => setAssignFor(null)} className="p-2 text-slate-400"><X size={18} /></button>
                        </div>

                        <label className="block text-sm text-slate-600 mb-1">Role</label>
                        <select
                            data-testid="perm-assign-group-select"
                            value={assignGroupId}
                            onChange={e => {
                                setAssignGroupId(e.target.value);
                                const g = groups.find(x => x.id === e.target.value);
                                // Pre-select the scope the role is designed for, so a Wing
                                // Coordinator isn't accidentally granted school-wide.
                                if (g) setAssignScope(g.intendedScope);
                            }}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        >
                            <option value="">Choose a role…</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>

                        <label className="block text-sm text-slate-600 mb-1">Applies to</label>
                        <select
                            data-testid="perm-assign-scope-select"
                            value={assignScope}
                            onChange={e => setAssignScope(e.target.value as ScopeType)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        >
                            {SCOPES.map(sc => (
                                <option key={sc} value={sc}>{sc === 'GLOBAL' ? 'The whole school' : `Specific ${sc.toLowerCase()}s`}</option>
                            ))}
                        </select>

                        {assignScope !== 'GLOBAL' && (
                            <>
                                <label className="block text-sm text-slate-600 mb-1">
                                    Which {assignScope.toLowerCase()}s? (comma-separated ids)
                                </label>
                                <input
                                    data-testid="perm-assign-scope-ids"
                                    value={assignScopeIds}
                                    onChange={e => setAssignScopeIds(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4"
                                />
                            </>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setAssignFor(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">Cancel</button>
                            <button
                                data-testid="perm-assign-save-btn"
                                disabled={busy || !assignGroupId}
                                onClick={() => void assign()}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
                            >{busy ? 'Saving…' : 'Add role'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create a custom role */}
            {newGroupOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div data-testid="perm-group-modal" className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">New custom role</h2>
                            <button onClick={() => setNewGroupOpen(false)} className="p-2 text-slate-400"><X size={18} /></button>
                        </div>

                        <input
                            data-testid="perm-group-name" value={ngName} onChange={e => setNgName(e.target.value)}
                            placeholder="Role name" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />
                        <input
                            data-testid="perm-group-description" value={ngDescription} onChange={e => setNgDescription(e.target.value)}
                            placeholder="What is this role for?" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />
                        <select
                            data-testid="perm-group-scope" value={ngScope}
                            onChange={e => setNgScope(e.target.value as ScopeType)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4"
                        >
                            {SCOPES.map(sc => (
                                <option key={sc} value={sc}>{sc === 'GLOBAL' ? 'Applies school-wide' : `Must be limited to ${sc.toLowerCase()}s`}</option>
                            ))}
                        </select>

                        <p className="text-sm text-slate-600 mb-2">
                            Permissions ({ngStatements.size} selected)
                        </p>
                        <div className="space-y-4">
                            {Object.entries(resourceGroups).map(([section, resources]) => (
                                <div key={section}>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{section}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {statements
                                            .filter(st => resources.includes(st.split(':')[0]!))
                                            .map(st => (
                                                <button
                                                    key={st}
                                                    data-testid={`perm-stmt-${st}`}
                                                    onClick={() => toggleStatement(st)}
                                                    className={`text-xs px-2 py-1 rounded-lg border transition ${ngStatements.has(st)
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                                                >{st}</button>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 justify-end mt-5">
                            <button onClick={() => setNewGroupOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">Cancel</button>
                            <button
                                data-testid="perm-group-save-btn"
                                disabled={busy || !ngName.trim() || ngStatements.size === 0}
                                onClick={() => void createGroup()}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
                            >{busy ? 'Saving…' : 'Create role'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
