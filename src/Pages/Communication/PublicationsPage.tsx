import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ScrollText, Plus, X, Loader2, Search, CheckCircle2, Sparkles,
    Globe, Lock, Pencil, Trash2, Upload, Undo2, Users, Eye,
    AlertCircle, BadgeCheck, FileText,
} from "lucide-react";
import api from "../../api/api";
import type { ManagedPublication, PublicationAckStats } from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";

/**
 * School documents / publications authoring.
 *
 * Management writes (or seeds) the school's policies, handbooks, T&C and
 * consents, then PUBLISHES them with a signature. PUBLIC docs are view-only in
 * the portals; PRIVATE docs ask each recipient to e-acknowledge the CURRENT
 * version — re-publishing bumps the version and re-requests acknowledgement.
 */

const CATEGORIES = ["GENERAL", "LEGAL", "ACADEMIC", "FINANCE", "SAFETY", "CONDUCT", "TRANSPORT", "HR"];
const AUDIENCES = [
    { value: "BOTH", label: "Students & Teachers" },
    { value: "STUDENT", label: "Students / Parents" },
    { value: "TEACHER", label: "Teachers" },
];

const CATEGORY_STYLE: Record<string, string> = {
    LEGAL:     "bg-rose-50 text-rose-700",
    FINANCE:   "bg-emerald-50 text-emerald-700",
    ACADEMIC:  "bg-blue-50 text-blue-700",
    SAFETY:    "bg-amber-50 text-amber-700",
    CONDUCT:   "bg-violet-50 text-violet-700",
    TRANSPORT: "bg-cyan-50 text-cyan-700",
    HR:        "bg-indigo-50 text-indigo-700",
    GENERAL:   "bg-slate-100 text-slate-600",
};
const catStyle = (c: string) => CATEGORY_STYLE[c] ?? CATEGORY_STYLE.GENERAL;

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

type TabId = "all" | "published" | "draft";

export default function PublicationsPage() {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [tab, setTab] = useState<TabId>("all");
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState<ManagedPublication | "new" | null>(null);
    const [ackTarget, setAckTarget] = useState<ManagedPublication | null>(null);
    const [seeding, setSeeding] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["publications"],
        queryFn: () => api.listPublications(),
    });
    const docs = data?.documents ?? [];

    const refresh = () => qc.invalidateQueries({ queryKey: ["publications"] });

    const seed = async () => {
        setSeeding(true);
        try {
            const res = await api.seedPublications();
            addToast(res.created > 0
                ? `Added ${res.created} ready-made document(s) as drafts — review and publish them.`
                : "The starter catalogue is already present.", "success");
            refresh();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to seed the catalogue.", "error");
        } finally { setSeeding(false); }
    };

    const publish = async (doc: ManagedPublication) => {
        const republish = doc.status === "PUBLISHED";
        if (republish && !window.confirm(
            `Re-publish "${doc.title}"? This bumps it to version ${doc.version + 1} and everyone will be asked to acknowledge again.`,
        )) return;
        setBusyId(doc.id);
        try {
            await api.publishPublication(doc.id);
            addToast(republish ? "Re-published — a new version is live." : "Published — now visible in the portals.", "success");
            refresh();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to publish.", "error");
        } finally { setBusyId(null); }
    };

    const unpublish = async (doc: ManagedPublication) => {
        if (!window.confirm(`Take "${doc.title}" offline? It will disappear from the portals until re-published.`)) return;
        setBusyId(doc.id);
        try {
            await api.unpublishPublication(doc.id);
            addToast("Document taken offline.", "success");
            refresh();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to unpublish.", "error");
        } finally { setBusyId(null); }
    };

    const remove = async (doc: ManagedPublication) => {
        if (!window.confirm(`Delete "${doc.title}" permanently? Its acknowledgement history is deleted too. This cannot be undone.`)) return;
        setBusyId(doc.id);
        try {
            await api.deletePublication(doc.id);
            addToast("Document deleted.", "success");
            refresh();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to delete.", "error");
        } finally { setBusyId(null); }
    };

    const counts = useMemo(() => ({
        all: docs.length,
        published: docs.filter(d => d.status === "PUBLISHED").length,
        draft: docs.filter(d => d.status === "DRAFT").length,
    }), [docs]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return docs.filter(d => {
            if (tab === "published" && d.status !== "PUBLISHED") return false;
            if (tab === "draft" && d.status !== "DRAFT") return false;
            if (q && !`${d.title} ${d.category} ${d.summary ?? ""}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [docs, tab, search]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <PageHeader
                icon={ScrollText}
                title="School Documents"
                subtitle="Author and publish policies, handbooks, T&C and consents"
                gradient={MODULE_THEMES.communication}
                onRefresh={() => refetch()}
                refreshing={isFetching}
                primaryActions={
                    <div className="flex items-center gap-2">
                        <button data-testid="communication-seed-btn" onClick={seed} disabled={seeding}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white/15 text-white hover:bg-white/25 disabled:opacity-60">
                            {seeding ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Add starter catalogue
                        </button>
                        <button data-testid="communication-editing-btn" onClick={() => setEditing("new")}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-white text-orange-600 hover:bg-orange-50 shadow-sm">
                            <Plus size={15} /> New document
                        </button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="shrink-0 px-4 pt-4 pb-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {([
                        { id: "all", label: "All", count: counts.all },
                        { id: "published", label: "Published", count: counts.published },
                        { id: "draft", label: "Drafts", count: counts.draft },
                    ] as { id: TabId; label: string; count: number }[]).map(({ id, label, count }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                                tab === id ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                                           : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                            {label}
                            <span className={`rounded-full px-1.5 text-xs ${tab === id ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>
                        </button>
                    ))}
                </div>
                <div className="relative sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
                {isLoading ? (
                    <div className="flex justify-center py-24 text-slate-400"><Loader2 className="animate-spin" size={28} /></div>
                ) : docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <FileText size={40} className="text-slate-300 mb-3" />
                        <h3 className="font-semibold text-slate-700">No documents yet</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-md">
                            Start with the ready-made catalogue — brochure, policies, T&C and consents,
                            pre-written for your school — or create a document from scratch.
                        </p>
                        <button onClick={seed} disabled={seeding}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60">
                            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Add starter catalogue
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Search size={32} className="mb-2" /><p>Nothing matches your filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white mt-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                    <th className="px-4 py-3">Document</th>
                                    <th className="px-4 py-3">Audience</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Acks</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(doc => (
                                    <tr key={doc.id} data-testid="publication-row" data-doc-id={doc.id} data-title={doc.title} data-category={doc.category} className="border-b border-slate-50 hover:bg-slate-50/60">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`shrink-0 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${catStyle(doc.category)}`}>{doc.category}</span>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-800 truncate max-w-xs">{doc.title}</p>
                                                    <p className="text-xs text-slate-400">
                                                        v{doc.version}{doc.publishedAt ? ` · ${fmtDate(doc.publishedAt)}` : ""}{doc.publishedByName ? ` · by ${doc.publishedByName}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{AUDIENCES.find(a => a.value === doc.audience)?.label ?? doc.audience}</td>
                                        <td className="px-4 py-3">
                                            {doc.visibility === "PRIVATE"
                                                ? <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600"><Lock size={12} /> Acknowledge</span>
                                                : <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Globe size={12} /> Public</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {doc.status === "PUBLISHED"
                                                ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><BadgeCheck size={12} /> Published</span>
                                                : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Draft</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {doc.visibility === "PRIVATE" ? (
                                                <button onClick={() => setAckTarget(doc)} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
                                                    <Users size={13} /> {doc.acknowledgementCount ?? 0}
                                                </button>
                                            ) : <span className="text-xs text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => setEditing(doc)} title="Edit" className="p-1.5 text-slate-500 hover:text-orange-600"><Pencil size={15} /></button>
                                                {doc.status === "DRAFT" ? (
                                                    <button onClick={() => publish(doc)} disabled={busyId === doc.id} title="Publish" className="p-1.5 text-slate-500 hover:text-emerald-600 disabled:opacity-50">
                                                        {busyId === doc.id ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => publish(doc)} disabled={busyId === doc.id} title="Re-publish (new version)" className="p-1.5 text-slate-500 hover:text-emerald-600 disabled:opacity-50"><Upload size={15} /></button>
                                                        <button onClick={() => unpublish(doc)} disabled={busyId === doc.id} title="Take offline" className="p-1.5 text-slate-500 hover:text-amber-600 disabled:opacity-50"><Undo2 size={15} /></button>
                                                    </>
                                                )}
                                                <button onClick={() => remove(doc)} disabled={busyId === doc.id} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-50"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editing && (
                <EditorModal
                    doc={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); refresh(); }}
                />
            )}
            {ackTarget && <AckStatsModal doc={ackTarget} onClose={() => setAckTarget(null)} />}
        </div>
    );
}

/* ── Create / edit modal ─────────────────────────────────────────────────── */
function EditorModal({ doc, onClose, onSaved }: { doc: ManagedPublication | null; onClose: () => void; onSaved: () => void }) {
    const { addToast } = useToast();
    const [title, setTitle] = useState(doc?.title ?? "");
    const [category, setCategory] = useState(doc?.category ?? "GENERAL");
    const [audience, setAudience] = useState(doc?.audience ?? "BOTH");
    const [visibility, setVisibility] = useState(doc?.visibility ?? "PRIVATE");
    const [summary, setSummary] = useState(doc?.summary ?? "");
    const [content, setContent] = useState(doc?.content ?? "");
    const [saving, setSaving] = useState(false);
    const [publishToo, setPublishToo] = useState(false);

    const save = async () => {
        if (title.trim().length < 2) { addToast("Enter a title.", "error"); return; }
        setSaving(true);
        try {
            let saved: ManagedPublication;
            if (doc) {
                const res = await api.updatePublication(doc.id, { title: title.trim(), category, audience, visibility, summary: summary.trim() || null, content });
                saved = res.document;
            } else {
                const res = await api.createPublication({ title: title.trim(), category, audience, visibility, summary: summary.trim() || null, content });
                saved = res.document;
            }
            if (publishToo) {
                await api.publishPublication(saved.id);
                addToast(doc?.status === "PUBLISHED" ? "Saved and re-published as a new version." : "Saved and published.", "success");
            } else {
                addToast(doc ? "Document updated." : "Draft created.", "success");
            }
            onSaved();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to save the document.", "error");
        } finally { setSaving(false); }
    };

    const isLivePrivateEdit = doc?.status === "PUBLISHED" && visibility === "PRIVATE";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">{doc ? "Edit document" : "New document"}</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block sm:col-span-2">
                            <span className="text-xs font-medium text-slate-600">Title</span>
                            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Category</span>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Audience</span>
                            <select value={audience} onChange={e => setAudience(e.target.value as any)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                                {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                            </select>
                        </label>
                        <div className="sm:col-span-2">
                            <span className="text-xs font-medium text-slate-600">Type</span>
                            <div className="mt-1 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setVisibility("PRIVATE")}
                                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${visibility === "PRIVATE" ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200" : "border-slate-200 hover:border-slate-300"}`}>
                                    <Lock size={16} className={visibility === "PRIVATE" ? "text-indigo-600 mt-0.5" : "text-slate-400 mt-0.5"} />
                                    <span>
                                        <span className="block text-sm font-medium text-slate-800">Requires acknowledgement</span>
                                        <span className="block text-xs text-slate-500">Recipients must confirm "read &amp; accept"</span>
                                    </span>
                                </button>
                                <button type="button" onClick={() => setVisibility("PUBLIC")}
                                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${visibility === "PUBLIC" ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200" : "border-slate-200 hover:border-slate-300"}`}>
                                    <Globe size={16} className={visibility === "PUBLIC" ? "text-indigo-600 mt-0.5" : "text-slate-400 mt-0.5"} />
                                    <span>
                                        <span className="block text-sm font-medium text-slate-800">Information only</span>
                                        <span className="block text-xs text-slate-500">Visible in portals, no confirmation asked</span>
                                    </span>
                                </button>
                            </div>
                        </div>
                        <label className="block sm:col-span-2">
                            <span className="text-xs font-medium text-slate-600">One-line summary <span className="text-slate-400">(shown in lists)</span></span>
                            <input value={summary} onChange={e => setSummary(e.target.value)} maxLength={300}
                                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                        </label>
                        <label className="block sm:col-span-2">
                            <span className="text-xs font-medium text-slate-600">Content <span className="text-slate-400">(Markdown — # headings, **bold**, - lists)</span></span>
                            <textarea value={content} onChange={e => setContent(e.target.value)} rows={14}
                                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg leading-relaxed focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none" />
                        </label>
                    </div>
                    {isLivePrivateEdit && !publishToo && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>This document is live. Saving edits changes it in place <b>without</b> asking recipients to re-acknowledge — tick "publish as new version" below if the change is material.</span>
                        </div>
                    )}
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={publishToo} onChange={e => setPublishToo(e.target.checked)} className="rounded border-slate-300" />
                        {doc?.status === "PUBLISHED" ? "Publish as a new version (recipients re-acknowledge)" : "Publish immediately after saving"}
                    </label>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50">Cancel</button>
                    <button onClick={save} disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-60">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        {publishToo ? "Save & publish" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Acknowledgement stats modal ─────────────────────────────────────────── */
function AckStatsModal({ doc, onClose }: { doc: ManagedPublication; onClose: () => void }) {
    const { data, isLoading } = useQuery<PublicationAckStats>({
        queryKey: ["publication-acks", doc.id],
        queryFn: () => api.getPublicationAcks(doc.id),
    });

    const pct = data && data.expectedCount > 0
        ? Math.round((data.acknowledgedCount / data.expectedCount) * 100)
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{doc.title}</h3>
                        <p className="text-xs text-slate-400">Acknowledgements — version {doc.version}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                    {isLoading || !data ? (
                        <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <StatTile label="Expected" value={data.expectedCount} tone="slate" />
                                <StatTile label="Acknowledged" value={data.acknowledgedCount} tone="emerald" />
                                <StatTile label="Pending" value={data.pendingCount} tone="amber" />
                            </div>
                            <div className="mb-5">
                                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progress</span><span>{pct}%</span></div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                            {data.acknowledgements.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">No acknowledgements for this version yet.</p>
                            ) : (
                                <ul className="divide-y divide-slate-50 border border-slate-100 rounded-lg">
                                    {data.acknowledgements.map((a, i) => (
                                        <li key={`${a.userType}-${a.userId}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span className="flex items-center gap-2 min-w-0">
                                                <Eye size={13} className="text-slate-300 shrink-0" />
                                                <span className="font-medium text-slate-700 truncate">{a.userName ?? "—"}</span>
                                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${a.userType === "STUDENT" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{a.userType}</span>
                                            </span>
                                            <span className="text-xs text-slate-400 shrink-0">{fmtDate(a.acknowledgedAt)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "amber" }) {
    const tones = {
        slate:   "bg-slate-50 text-slate-700",
        emerald: "bg-emerald-50 text-emerald-700",
        amber:   "bg-amber-50 text-amber-700",
    };
    return (
        <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
            <p className="text-[11px] font-medium opacity-70">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
    );
}
