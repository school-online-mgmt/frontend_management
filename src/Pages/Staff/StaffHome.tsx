import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { type StaffAccount } from '../../api/api';
import { ErrorState, Skeleton } from '../../components/ui';
import { UserCog, Plus, Trash2, Pencil, X, Search, ShieldCheck, KeyRound, Wallet } from 'lucide-react';

/**
 * Staff accounts (FR-014e).
 *
 * This page used to own permissions too, via a module x level grid and a
 * per-school role catalogue. Both are gone: what a staff member can DO is now a
 * set of permission-group memberships, managed on /permissions. Here we only
 * handle the account — who exists, how to reach them, their password, and the
 * portal role their account carries.
 *
 * Their roles are still SHOWN, because "who is this person and what can they
 * do" is one question in an admin's head; they're just read-only here, with a
 * link to the screen that changes them.
 *
 * Pay is the same story (BUG-005). It is owned by HR & Payroll, not duplicated
 * here — but a staff member with no salary structure silently drops out of the
 * monthly payroll run, and nobody finds out until payday. So we READ their pay
 * state and flag its absence on the row. Showing the gap is the fix; owning the
 * form in two places is what caused the bug.
 */

/** Portal roles a school can assign. ADMIN is provisioned by support only. */
const ASSIGNABLE_ROLES = ['PRINCIPAL', 'DIRECTOR', 'MANAGEMENT_STAFF', 'ACCOUNTANT'] as const;

/** Roles whose authority is inherent to the account, not granted by a group. */
const FULL_ACCESS = new Set(['ADMIN', 'PRINCIPAL']);

const blankForm = {
    firstName: '', middleName: '', lastName: '',
    phone: '', email: '', password: '', role: 'MANAGEMENT_STAFF' as string,
};

export default function StaffHome() {
    const [staff, setStaff] = useState<StaffAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const [editing, setEditing] = useState<StaffAccount | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ ...blankForm });
    const [busy, setBusy] = useState(false);

    /** staffId -> has a salary structure. Absent id = we couldn't tell. */
    const [paySet, setPaySet] = useState<Record<string, boolean>>({});

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            // Pay state is a nice-to-have on this page; if HR is unreadable for
            // this user (they may lack hr:view) we still show the accounts
            // rather than failing the whole page.
            const [res, hr] = await Promise.all([
                api.getStaff(),
                api.listHrStaff().catch(() => null),
            ]);
            setStaff(res.staff ?? []);
            if (hr) {
                const map: Record<string, boolean> = {};
                for (const row of hr.staff) {
                    if (row.staffType === 'MANAGEMENT') map[row.staffId] = row.hasSalary;
                }
                setPaySet(map);
            }
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not load staff accounts.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return staff;
        return staff.filter(s =>
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
            (s.email ?? '').toLowerCase().includes(q) ||
            (s.phone ?? '').includes(q));
    }, [staff, query]);

    const openCreate = () => { setForm({ ...blankForm }); setCreating(true); };

    const openEdit = (s: StaffAccount) => {
        setForm({
            firstName: s.firstName, middleName: s.middleName ?? '', lastName: s.lastName,
            phone: s.phone, email: s.email, password: '', role: s.role ?? 'MANAGEMENT_STAFF',
        });
        setEditing(s);
    };

    const save = async () => {
        setBusy(true); setError(null);
        try {
            if (editing) {
                await api.updateStaff(editing.id, {
                    firstName: form.firstName, lastName: form.lastName,
                    phone: form.phone, email: form.email, role: form.role,
                    // Only send a password when one was typed — an empty field means
                    // "leave it alone", not "blank the password".
                    ...(form.password ? { password: form.password } : {}),
                });
                setNotice('Account updated.');
            } else {
                await api.createStaff({
                    firstName: form.firstName,
                    ...(form.middleName ? { middleName: form.middleName } : {}),
                    lastName: form.lastName, phone: form.phone,
                    email: form.email, password: form.password, role: form.role,
                });
                setNotice('Account created. Next: assign their roles on Permissions, and their salary in HR & Payroll — both start empty.');
            }
            setEditing(null); setCreating(false);
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Save failed.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (s: StaffAccount) => {
        if (!window.confirm(`Delete ${s.firstName} ${s.lastName}? They are signed out immediately and lose all access.`)) return;
        setError(null);
        try {
            await api.deleteStaff(s.id);
            setNotice('Account deleted.');
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Delete failed.');
        }
    };

    const modalOpen = creating || !!editing;

    return (
        <div className="p-6 max-w-5xl mx-auto" data-testid="staff-page">
            <header className="mb-6 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                        <UserCog size={22} /> Staff accounts
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Who can sign in to the school portal. What each person is allowed to do
                        lives on <Link to="/staff/permissions" className="text-emerald-600 hover:underline">Permissions</Link>.
                    </p>
                </div>
                <button
                    data-testid="staff-create-btn" onClick={openCreate}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium flex items-center gap-2"
                ><Plus size={16} /> New account</button>
            </header>

            {error && <div data-testid="staff-error" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
            {notice && <div data-testid="staff-notice" className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{notice}</div>}

            <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    data-testid="staff-search"
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name, email or phone…"
                    className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
            </div>

            {loading ? (
                <Skeleton rows={4} />
            ) : error ? (
                /* The banner above already names the failure. Without this
                   branch "No staff accounts yet." rendered underneath it,
                   telling an admin their staff list is empty when it is not. */
                <div className="border border-slate-200 rounded-2xl">
                    <ErrorState message={error} onRetry={() => void load()} testId="staff-load-error" />
                </div>
            ) : filtered.length === 0 ? (
                <div data-testid="staff-empty" className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-500 text-sm">No staff accounts yet.</p>
                </div>
            ) : (
                <div data-testid="staff-list" className="space-y-2">
                    {filtered.map(s => (
                        <div key={s.id} data-testid={`staff-row-${s.id}`} className="p-4 bg-white border border-slate-200 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800">
                                        {[s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ')}
                                    </p>
                                    <p className="text-xs text-slate-400">{s.email} · {s.phone}</p>
                                </div>
                                <span data-testid={`staff-role-${s.id}`} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                                    {s.role ?? '—'}
                                </span>
                                <button
                                    data-testid={`staff-edit-${s.id}`} onClick={() => openEdit(s)}
                                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                    aria-label={`Edit ${s.firstName}`}
                                ><Pencil size={16} /></button>
                                <button
                                    data-testid={`staff-delete-${s.id}`} onClick={() => void remove(s)}
                                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                    aria-label={`Delete ${s.firstName}`}
                                ><Trash2 size={16} /></button>
                            </div>

                            {paySet[s.id] === false && (
                                <Link
                                    to={`/hr?tab=staff&q=${encodeURIComponent(`${s.firstName} ${s.lastName}`)}`}
                                    data-testid={`staff-nopay-${s.id}`}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100"
                                >
                                    <Wallet size={12} />
                                    No pay set — they won't appear in payroll. Set it up
                                </Link>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {FULL_ACCESS.has(s.role ?? '') ? (
                                    <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-800">
                                        Full access — this role isn't limited by permission roles
                                    </span>
                                ) : (s.groups ?? []).length === 0 ? (
                                    <span data-testid={`staff-noroles-${s.id}`} className="text-xs text-slate-400">
                                        No permission roles yet — they can sign in but can't do anything.{' '}
                                        <Link to="/staff/permissions" className="text-emerald-600 hover:underline">Assign one</Link>
                                    </span>
                                ) : (
                                    (s.groups ?? []).map(g => (
                                        <span
                                            key={g.membershipId ?? g.groupId}
                                            data-testid={`staff-group-${g.groupKey ?? g.groupId}`}
                                            className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1"
                                        >
                                            <ShieldCheck size={12} />
                                            {g.groupName}
                                            {g.scopeType !== 'GLOBAL' && (
                                                <em className="not-italic text-slate-500">· {g.scopeType.toLowerCase()}</em>
                                            )}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div data-testid="staff-modal" className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">
                                {editing ? 'Edit account' : 'New staff account'}
                            </h2>
                            <button
                                data-testid="staff-modal-close"
                                onClick={() => { setEditing(null); setCreating(false); }}
                                className="p-2 text-slate-400"
                            ><X size={18} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input
                                data-testid="staff-firstname-input" value={form.firstName}
                                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                                placeholder="First name" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            />
                            <input
                                data-testid="staff-lastname-input" value={form.lastName}
                                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                                placeholder="Last name" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            />
                        </div>

                        <input
                            data-testid="staff-phone-input" value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="Phone (10 digits — this is their login)"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />
                        <input
                            data-testid="staff-email-input" value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="Email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />

                        <label className="block text-sm text-slate-600 mb-1">
                            {editing ? 'New password (leave blank to keep the current one)' : 'Password'}
                        </label>
                        <input
                            data-testid="staff-password-input" type="password" value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />

                        <label className="block text-sm text-slate-600 mb-1">Portal role</label>
                        <select
                            data-testid="staff-role-select" value={form.role}
                            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-2"
                        >
                            {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <p className="text-xs text-slate-400 mb-4 flex items-start gap-1">
                            <KeyRound size={12} className="mt-0.5 shrink-0" />
                            <span>
                                PRINCIPAL has full access. Everyone else can do only what their
                                permission roles allow — set those on the Permissions page after saving.
                            </span>
                        </p>

                        <div className="flex gap-2 justify-end">
                            <button
                                data-testid="staff-cancel-btn"
                                onClick={() => { setEditing(null); setCreating(false); }}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm"
                            >Cancel</button>
                            <button
                                data-testid="staff-save-btn"
                                disabled={busy || !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || (!editing && !form.password)}
                                onClick={() => void save()}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
                            >{busy ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
