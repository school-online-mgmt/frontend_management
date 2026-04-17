import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell, Plus, Globe, BookOpen, Users,
    CheckCircle2, Clock, AlertTriangle, ChevronRight,
    Loader2, RefreshCcw, Search
} from "lucide-react";
import api from "../../api/api";
import useAuth from "../../hooks/useAuth";

// ─── Visibility badge ─────────────────────────────────────────────────────────
const VIS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
    PUBLIC: { label: "School-Wide", icon: Globe, className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    CLASS:  { label: "Class",       icon: BookOpen, className: "bg-blue-100 text-blue-700 border border-blue-200" },
    SECTION:{ label: "Section",     icon: Users, className: "bg-violet-100 text-violet-700 border border-violet-200" },
};

const VisBadge = ({ v }: { v: string }) => {
    const cfg = VIS_CONFIG[v] ?? { label: v, icon: Globe, className: "bg-slate-100 text-slate-600 border border-slate-200" };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
            <Icon size={11} /> {cfg.label}
        </span>
    );
};

// ─── Create Board Modal ───────────────────────────────────────────────────────
const CreateBoardModal = ({
    open, onClose, onCreate, classes, teachers
}: {
    open: boolean; onClose: () => void; onCreate: () => void;
    classes: unknown[]; teachers: unknown[];
}) => {
    const [form, setForm] = useState({
        name: "", description: "", visibility: "PUBLIC",
        classId: "", sectionId: "", approverId: ""
    });
    const [sections, setSections] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) {
            setForm({ name: "", description: "", visibility: "PUBLIC", classId: "", sectionId: "", approverId: "" });
            setSections([]); setError("");
        }
    }, [open]);

    useEffect(() => {
        if (form.classId) {
            api.getSectionsByClass(form.classId).then(setSections).catch(() => setSections([]));
        } else {
            setSections([]);
            setForm(f => ({ ...f, sectionId: "" }));
        }
    }, [form.classId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return setError("Board name is required");
        if (form.visibility === "CLASS" && !form.classId) return setError("Class is required");
        if (form.visibility === "SECTION" && (!form.classId || !form.sectionId)) return setError("Class and section are required");
        setSaving(true); setError("");
        try {
            await api.createNoticeBoard({
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                visibility: form.visibility,
                classId: form.classId || undefined,
                sectionId: form.sectionId || undefined,
                approverId: form.approverId || undefined,
            });
            onCreate();
            onClose();
        } catch (err: unknown) {
            setError(err?.response?.data?.message ?? "Failed to create board");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg"><Bell size={18} className="text-emerald-400" /></div>
                        <h2 className="text-white font-semibold text-lg">Create Notice Board</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">×</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Board Name <span className="text-red-500">*</span></label>
                        <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                            placeholder="e.g. General Announcements, Class 10 Board..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                            rows={2} placeholder="Optional description..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Visibility <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(VIS_CONFIG).map(([k, v]) => {
                                const Icon = v.icon;
                                return (
                                    <button key={k} type="button"
                                        onClick={() => setForm(f => ({...f, visibility: k, classId: "", sectionId: ""}))}
                                        className={`flex flex-col items-center gap-1 py-3 rounded-lg border-2 text-xs font-medium transition-all ${form.visibility === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                                        <Icon size={18} />
                                        {v.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {(form.visibility === "CLASS" || form.visibility === "SECTION") && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Class <span className="text-red-500">*</span></label>
                            <select value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value, sectionId: ""}))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                                <option value="">Select class...</option>
                                {classes.map((c: unknown) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    {form.visibility === "SECTION" && form.classId && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Section <span className="text-red-500">*</span></label>
                            <select value={form.sectionId} onChange={e => setForm(f => ({...f, sectionId: e.target.value}))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                                <option value="">Select section...</option>
                                {sections.map((s: unknown) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Approver <span className="text-slate-400 font-normal">(optional)</span></label>
                        <select value={form.approverId} onChange={e => setForm(f => ({...f, approverId: e.target.value}))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                            <option value="">Principal approves only</option>
                            {teachers.map((t: unknown) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">If assigned, the teacher can approve/reject notices on this board.</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            {saving ? "Creating…" : "Create Board"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const NoticeBoardHome = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const isPrincipal = role === "PRINCIPAL" || role === "SUPER_ADMIN";

    const [boards, setBoards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [visFilter, setVisFilter] = useState("ALL");
    const [showCreate, setShowCreate] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [pendingNotices, setPendingNotices] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const [boardsData, pendingData] = await Promise.all([
                api.getNoticeBoards(),
                isPrincipal ? api.getPendingNotices() : Promise.resolve({ notices: [] }),
            ]);
            setBoards(boardsData.boards ?? []);
            setPendingNotices(pendingData.notices ?? []);
        } catch (err: unknown) {
            setError(err?.response?.data?.message ?? "Failed to load notice boards");
        } finally {
            setLoading(false);
        }
    }, [isPrincipal]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!isPrincipal) return;
        api.getClasses().then(setClasses).catch(() => {});
        api.getNoticeApproverOptions().then(d => setTeachers(d.teachers ?? [])).catch(() => {});
    }, [isPrincipal]);

    const filtered = boards.filter(b => {
        const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
        const matchVis = visFilter === "ALL" || b.visibility === visFilter;
        return matchSearch && matchVis;
    });

    // Summary stats
    const totalActive = boards.reduce((a, b) => a + (b.stats?.approved ?? 0), 0);
    const totalPending = pendingNotices.length;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell size={24} className="text-emerald-600" /> Notice Boards
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage and publish announcements across the school</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={load}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <RefreshCcw size={18} />
                    </button>
                    {isPrincipal && (
                        <button onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
                            <Plus size={16} /> New Board
                        </button>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Total Boards", value: boards.length, icon: Bell, color: "bg-slate-50 text-slate-700 border-slate-200" },
                    { label: "Active Notices", value: totalActive, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { label: "Pending Approval", value: totalPending, icon: Clock, color: totalPending > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-700 border-slate-200" },
                    { label: "School-Wide Boards", value: boards.filter(b => b.visibility === "PUBLIC").length, icon: Globe, color: "bg-blue-50 text-blue-700 border-blue-200" },
                ].map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium uppercase tracking-wide opacity-70">{card.label}</span>
                                <Icon size={16} className="opacity-60" />
                            </div>
                            <p className="text-2xl font-bold">{card.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Pending approvals banner */}
            {isPrincipal && totalPending > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-amber-800 font-medium text-sm">{totalPending} notice{totalPending > 1 ? "s" : ""} pending your approval</p>
                        <div className="mt-1 space-y-0.5">
                            {pendingNotices.slice(0, 3).map(n => (
                                <p key={n.id} className="text-amber-700 text-xs">
                                    <strong>"{n.title}"</strong> → {n.board?.name}
                                    <span className="text-amber-500 ml-1">by {n.createdByTeacher?.name ?? `${n.createdByMgmt?.firstName} ${n.createdByMgmt?.lastName}`}</span>
                                </p>
                            ))}
                            {pendingNotices.length > 3 && (
                                <p className="text-amber-600 text-xs">+ {pendingNotices.length - 3} more pending…</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search boards…"
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex gap-2">
                    {["ALL", "PUBLIC", "CLASS", "SECTION"].map(v => (
                        <button key={v} onClick={() => setVisFilter(v)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${visFilter === v ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                            {v === "ALL" ? "All" : v === "PUBLIC" ? "School-Wide" : v === "CLASS" ? "Class" : "Section"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Board list */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                </div>
            ) : error ? (
                <div className="text-center py-16">
                    <p className="text-red-600 font-medium">{error}</p>
                    <button onClick={load} className="mt-3 text-emerald-600 text-sm hover:underline">Retry</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-24 text-slate-400">
                    <Bell size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-slate-500">{boards.length === 0 ? "No notice boards yet" : "No boards match your filter"}</p>
                    {isPrincipal && boards.length === 0 && (
                        <button onClick={() => setShowCreate(true)}
                            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                            Create First Board
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(board => (
                        <div key={board.id}
                            onClick={() => navigate(`/notices/${board.id}`)}
                            className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate text-base">
                                        {board.name}
                                    </h3>
                                    {board.description && (
                                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{board.description}</p>
                                    )}
                                </div>
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-0.5 ml-2" />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap mb-3">
                                <VisBadge v={board.visibility} />
                                {board.class && (
                                    <span className="text-xs text-slate-500">{board.class.name}</span>
                                )}
                                {board.section && (
                                    <span className="text-xs text-slate-500">/ {board.section.name}</span>
                                )}
                                {!board.isActive && (
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 border border-red-200">Inactive</span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                    { label: "Active", value: board.stats?.approved ?? 0, color: "text-emerald-600" },
                                    { label: "Pending", value: board.stats?.pending ?? 0, color: board.stats?.pending > 0 ? "text-amber-600" : "text-slate-400" },
                                    { label: "Draft", value: board.stats?.draft ?? 0, color: "text-slate-400" },
                                ].map(stat => (
                                    <div key={stat.label} className="bg-slate-50 rounded-lg py-2">
                                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                                        <p className="text-xs text-slate-500">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {board.approver && (
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                                        {board.approver.name.charAt(0)}
                                    </div>
                                    <p className="text-xs text-slate-500">Approver: <span className="font-medium text-slate-700">{board.approver.name}</span></p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <CreateBoardModal
                open={showCreate} onClose={() => setShowCreate(false)}
                onCreate={load} classes={classes} teachers={teachers}
            />
        </div>
    );
};

export default NoticeBoardHome;

