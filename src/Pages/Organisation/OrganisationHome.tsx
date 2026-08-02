import { useEffect, useState, useCallback } from 'react';
import api, { type Wing, type Department } from '../../api/api';
import { Layers, Building2, Plus, Trash2, Pencil, X, UserCheck } from 'lucide-react';

/**
 * Organisation structure — Wings and Departments (FR-014b).
 *
 * These are real school concepts (Primary/Middle/Senior; Science/Humanities),
 * and they are also two of the four axes a staff permission can be scoped to.
 * A "Wing Coordinator" or "Head of Department" role is only expressible once
 * these exist, which is why this screen precedes the permissions work.
 */

type Tab = 'wings' | 'departments';

interface TeacherLite { id: string; name: string }

const slugify = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function OrganisationHome() {
    const [tab, setTab] = useState<Tab>('wings');
    const [wings, setWings] = useState<Wing[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [teachers, setTeachers] = useState<TeacherLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [editing, setEditing] = useState<{ kind: Tab; row: Wing | Department | null } | null>(null);
    const [form, setForm] = useState({ name: '', slug: '', description: '', position: 0, hodTeacherId: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [w, d] = await Promise.all([api.getWings(), api.getDepartments()]);
            setWings(w.wings ?? []);
            setDepartments(d.departments ?? []);
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Could not load the organisation structure.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    // Teachers are only needed for the HOD picker, so they load lazily — the
    // wings tab shouldn't pay for a staff fetch it never uses.
    useEffect(() => {
        if (tab !== 'departments' || teachers.length) return;
        void (async () => {
            try {
                const rows = await api.getTeachers?.();
                const list = Array.isArray(rows) ? rows : (rows as any)?.teachers ?? [];
                setTeachers(list.map((t: any) => ({ id: t.id, name: t.name ?? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() })));
            } catch { /* HOD picker degrades to "no teachers found" — not fatal */ }
        })();
    }, [tab, teachers.length]);

    const openCreate = (kind: Tab) => {
        setForm({ name: '', slug: '', description: '', position: wings.length, hodTeacherId: '' });
        setEditing({ kind, row: null });
    };

    const openEdit = (kind: Tab, row: Wing | Department) => {
        setForm({
            name: row.name,
            slug: row.slug,
            description: row.description ?? '',
            position: (row as Wing).position ?? 0,
            hodTeacherId: (row as Department).hodTeacherId ?? '',
        });
        setEditing({ kind, row });
    };

    const save = async () => {
        if (!editing) return;
        setSaving(true); setError(null);
        try {
            const { kind, row } = editing;
            const slug = form.slug || slugify(form.name);
            if (kind === 'wings') {
                if (row) await api.updateWing(row.id, { name: form.name, slug, description: form.description, position: form.position });
                else await api.createWing({ name: form.name, slug, description: form.description, position: form.position });
            } else {
                const hod = form.hodTeacherId || null;
                if (row) await api.updateDepartment(row.id, { name: form.name, slug, description: form.description, hodTeacherId: hod });
                else await api.createDepartment({ name: form.name, slug, description: form.description, hodTeacherId: hod });
            }
            setNotice(row ? 'Saved.' : 'Created.');
            setEditing(null);
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (kind: Tab, row: Wing | Department) => {
        // Deleting is non-destructive downstream: the FK is ON DELETE SET NULL,
        // so classes/subjects survive and simply become unassigned. Say so, so
        // nobody believes they are about to delete their classes.
        const what = kind === 'wings' ? 'classes' : 'subjects';
        if (!window.confirm(`Delete "${row.name}"? Its ${what} will become unassigned, not deleted.`)) return;
        setError(null);
        try {
            if (kind === 'wings') await api.deleteWing(row.id);
            else await api.deleteDepartment(row.id);
            setNotice('Deleted.');
            await load();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Delete failed.');
        }
    };

    const rows: (Wing | Department)[] = tab === 'wings' ? wings : departments;

    return (
        <div className="p-6 max-w-5xl mx-auto" data-testid="organisation-page">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-800">Organisation structure</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Wings group your classes; departments group your subjects and carry a head.
                    Both can also be used to limit what a staff member can reach.
                </p>
            </header>

            <div className="flex gap-2 mb-5" role="tablist">
                <button
                    data-testid="org-tab-wings"
                    data-active={tab === 'wings'}
                    onClick={() => setTab('wings')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition ${tab === 'wings' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <Layers size={16} /> Wings ({wings.length})
                </button>
                <button
                    data-testid="org-tab-departments"
                    data-active={tab === 'departments'}
                    onClick={() => setTab('departments')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition ${tab === 'departments' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <Building2 size={16} /> Departments ({departments.length})
                </button>
                <div className="flex-1" />
                <button
                    data-testid="org-create-btn"
                    onClick={() => openCreate(tab)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium flex items-center gap-2 hover:bg-slate-900"
                >
                    <Plus size={16} /> New {tab === 'wings' ? 'wing' : 'department'}
                </button>
            </div>

            {error && <div data-testid="org-error" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
            {notice && <div data-testid="org-notice" className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{notice}</div>}

            {loading ? (
                <p className="text-slate-500 text-sm">Loading…</p>
            ) : rows.length === 0 ? (
                <div data-testid="org-empty" className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-500 text-sm">
                        No {tab} yet. {tab === 'wings'
                            ? 'Create Primary, Middle and Senior to group your classes.'
                            : 'Create departments like Science or Languages to group subjects and name a head.'}
                    </p>
                </div>
            ) : (
                <div data-testid="org-list" className="space-y-2">
                    {rows.map((row) => (
                        <div
                            key={row.id}
                            data-testid={`org-row-${row.slug}`}
                            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800">{row.name}</p>
                                <p className="text-xs text-slate-400">{row.slug}</p>
                                {row.description && <p className="text-sm text-slate-500 mt-1">{row.description}</p>}
                            </div>
                            {tab === 'departments' && (
                                <span
                                    data-testid={`org-hod-${row.slug}`}
                                    className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1"
                                >
                                    <UserCheck size={12} />
                                    {(row as Department).hodName ?? 'No head assigned'}
                                </span>
                            )}
                            <button
                                data-testid={`org-edit-${row.slug}`}
                                onClick={() => openEdit(tab, row)}
                                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                aria-label={`Edit ${row.name}`}
                            ><Pencil size={16} /></button>
                            <button
                                data-testid={`org-delete-${row.slug}`}
                                onClick={() => void remove(tab, row)}
                                className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                aria-label={`Delete ${row.name}`}
                            ><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div data-testid="org-modal" className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">
                                {editing.row ? 'Edit' : 'New'} {editing.kind === 'wings' ? 'wing' : 'department'}
                            </h2>
                            <button data-testid="org-modal-close" onClick={() => setEditing(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <label className="block text-sm text-slate-600 mb-1">Name</label>
                        <input
                            data-testid="org-name-input"
                            value={form.name}
                            onChange={(e) => setForm(f => ({
                                ...f,
                                name: e.target.value,
                                // Auto-fill the slug only while creating, so editing a
                                // name never silently changes an established slug that
                                // scoped permissions may already reference.
                                slug: editing.row ? f.slug : slugify(e.target.value),
                            }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                            placeholder={editing.kind === 'wings' ? 'Primary' : 'Science'}
                        />

                        <label className="block text-sm text-slate-600 mb-1">Slug</label>
                        <input
                            data-testid="org-slug-input"
                            value={form.slug}
                            onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                            placeholder={editing.kind === 'wings' ? 'primary' : 'science'}
                        />

                        <label className="block text-sm text-slate-600 mb-1">Description (optional)</label>
                        <input
                            data-testid="org-description-input"
                            value={form.description}
                            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3"
                        />

                        {editing.kind === 'wings' ? (
                            <>
                                <label className="block text-sm text-slate-600 mb-1">Display order</label>
                                <input
                                    data-testid="org-position-input"
                                    type="number"
                                    value={form.position}
                                    onChange={(e) => setForm(f => ({ ...f, position: Number(e.target.value) }))}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4"
                                />
                            </>
                        ) : (
                            <>
                                <label className="block text-sm text-slate-600 mb-1">Head of department</label>
                                <select
                                    data-testid="org-hod-select"
                                    value={form.hodTeacherId}
                                    onChange={(e) => setForm(f => ({ ...f, hodTeacherId: e.target.value }))}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4"
                                >
                                    <option value="">No head assigned</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button
                                data-testid="org-cancel-btn"
                                onClick={() => setEditing(null)}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
                            >Cancel</button>
                            <button
                                data-testid="org-save-btn"
                                disabled={saving || !form.name.trim()}
                                onClick={() => void save()}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                            >{saving ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
