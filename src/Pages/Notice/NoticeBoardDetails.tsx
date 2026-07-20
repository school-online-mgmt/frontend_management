import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Bell, ArrowLeft, Plus, CheckCircle2, XCircle, Archive,
    Globe, BookOpen, Users, User,
    Edit3, Trash2, Loader2, RefreshCcw,
    Calendar
} from "lucide-react";
import api from "../../api/api";
import useAuth from "../../hooks/useAuth";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../context/ToastContext";

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
    LOW:    { label: "Low",    className: "bg-slate-100 text-slate-600 border border-slate-200", dot: "bg-slate-400" },
    NORMAL: { label: "Normal", className: "bg-blue-50 text-blue-600 border border-blue-200",    dot: "bg-blue-500" },
    HIGH:   { label: "High",   className: "bg-amber-50 text-amber-700 border border-amber-200",  dot: "bg-amber-500" },
    URGENT: { label: "Urgent", className: "bg-red-50 text-red-700 border border-red-200",        dot: "bg-red-500" },
};

const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    DRAFT:            { label: "Draft",            className: "bg-slate-100 text-slate-600" },
    PENDING_APPROVAL: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
    APPROVED:         { label: "Approved",         className: "bg-emerald-100 text-emerald-700" },
    REJECTED:         { label: "Rejected",         className: "bg-red-100 text-red-700" },
    ARCHIVED:         { label: "Archived",         className: "bg-slate-100 text-slate-500" },
};

const StatusBadge = ({ status, isActive, isExpired }: { status: string; isActive?: boolean; isExpired?: boolean }) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
    const label = status === "APPROVED" ? (isExpired ? "Expired" : isActive ? "Live" : "Upcoming") : cfg.label;
    const cls = status === "APPROVED"
        ? isExpired ? "bg-slate-100 text-slate-500" : isActive ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"
        : cfg.className;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

// ─── Create / Edit Notice Modal ───────────────────────────────────────────────
const NoticeModal = ({
    open, onClose, onSave, boardId, editNotice
}: {
    open: boolean; onClose: () => void; onSave: () => void;
    boardId: string; editNotice?: any;
}) => {
    const [form, setForm] = useState({
        title: "", body: "", startDateTime: "", endDateTime: "",
        priority: "NORMAL", publishDirectly: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            if (editNotice) {
                setForm({
                    title: editNotice.title, body: editNotice.body,
                    startDateTime: editNotice.startDateTime?.slice(0, 16) ?? "",
                    endDateTime: editNotice.endDateTime?.slice(0, 16) ?? "",
                    priority: editNotice.priority, publishDirectly: false,
                });
            } else {
                const now = new Date();
                const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 7);
                setForm({
                    title: "", body: "",
                    startDateTime: now.toISOString().slice(0, 16),
                    endDateTime: tomorrow.toISOString().slice(0, 16),
                    priority: "NORMAL", publishDirectly: true,
                });
            }
            setError("");
        }
    }, [open, editNotice]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return setError("Title is required");
        if (!form.body.trim()) return setError("Body is required");
        if (!form.startDateTime || !form.endDateTime) return setError("Dates are required");
        if (new Date(form.endDateTime) <= new Date(form.startDateTime)) return setError("End date must be after start date");

        setSaving(true); setError("");
        try {
            if (editNotice) {
                await api.updateNotice(editNotice.id, {
                    title: form.title, body: form.body,
                    startDateTime: form.startDateTime, endDateTime: form.endDateTime,
                    priority: form.priority,
                });
            } else {
                await api.createNotice(boardId, {
                    title: form.title, body: form.body,
                    startDateTime: form.startDateTime, endDateTime: form.endDateTime,
                    priority: form.priority, publishDirectly: form.publishDirectly,
                });
            }
            onSave(); onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Failed to save notice");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
                    <h2 className="text-white font-semibold text-lg">{editNotice ? "Edit Notice" : "Create Notice"}</h2>
                    <button data-testid="notice-close-btn" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
                        <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                            placeholder="Notice title…"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Body <span className="text-red-500">*</span></label>
                        <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))}
                            rows={5} placeholder="Write the full notice content here…"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date/Time <span className="text-red-500">*</span></label>
                            <input type="datetime-local" value={form.startDateTime}
                                onChange={e => setForm(f => ({...f, startDateTime: e.target.value}))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Date/Time <span className="text-red-500">*</span></label>
                            <input type="datetime-local" value={form.endDateTime}
                                onChange={e => setForm(f => ({...f, endDateTime: e.target.value}))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                        <div className="flex gap-2">
                            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                                <button key={k} type="button"
                                    onClick={() => setForm(f => ({...f, priority: k}))}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.priority === k ? v.className : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {!editNotice && (
                        <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
                            <input type="checkbox" checked={form.publishDirectly}
                                onChange={e => setForm(f => ({...f, publishDirectly: e.target.checked}))}
                                className="w-4 h-4 text-emerald-600 rounded" />
                            <div>
                                <p className="text-sm font-medium text-emerald-800">Publish immediately</p>
                                <p className="text-xs text-emerald-600">Notice will be visible right away without waiting for approval</p>
                            </div>
                        </label>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button data-testid="notice-close-btn-2" type="button" onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            {saving ? "Saving…" : editNotice ? "Save Changes" : "Create Notice"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Reject Modal ─────────────────────────────────────────────────────────────
const RejectModal = ({ open, onClose, onConfirm, saving }: any) => {
    const [reason, setReason] = useState("");
    useEffect(() => { if (!open) setReason(""); }, [open]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><XCircle size={20} className="text-red-500" /> Reject Notice</h3>
                <textarea data-testid="notice-reason-input" value={reason} onChange={e => setReason(e.target.value)}
                    rows={3} placeholder="Provide a reason for rejection (required)…"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400" />
                <div className="flex gap-3 mt-4">
                    <button data-testid="notice-close-btn-3" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium">Cancel</button>
                    <button data-testid="notice-confirm-btn" onClick={() => onConfirm(reason)} disabled={!reason.trim() || saving}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-700 flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : null} Reject
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Notice Card ──────────────────────────────────────────────────────────────
const NoticeCard = ({
    notice, onApprove, onReject, onArchive, onDelete, onEdit, canApprove, isPrincipal
}: any) => {
    const pc = PRIORITY_CONFIG[notice.priority] ?? PRIORITY_CONFIG.NORMAL;
    return (
        <div className={`bg-white rounded-xl border p-5 transition-all hover:shadow-sm
            ${notice.status === "PENDING_APPROVAL" ? "border-amber-200 bg-amber-50/30" : "border-slate-100"}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`} />
                        <h4 className="font-semibold text-slate-900 text-sm">{notice.title}</h4>
                        <StatusBadge status={notice.status} isActive={notice.isActive} isExpired={notice.isExpired} />
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${pc.className}`}>{pc.label}</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed mt-1 line-clamp-3">{notice.body}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(notice.startDateTime).toLocaleDateString()} – {new Date(notice.endDateTime).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                            <User size={12} /> {notice.createdByName ?? "Unknown"}
                        </span>
                    </div>
                    {notice.status === "REJECTED" && notice.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-xs"><strong>Rejection reason:</strong> {notice.rejectionReason}</p>
                        </div>
                    )}
                    {notice.status === "APPROVED" && notice.approvedAt && (
                        <p className="text-emerald-600 text-xs mt-1">
                            ✓ Approved by {notice.approvedByTeacher?.name ?? (notice.approvedByMgmt ? `${notice.approvedByMgmt.firstName} ${notice.approvedByMgmt.lastName}` : "—")} on {new Date(notice.approvedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                {(notice.status === "PENDING_APPROVAL" || notice.status === "DRAFT") && (canApprove || isPrincipal) && (
                    <>
                        <button data-testid="notice-approve-btn" onClick={() => onApprove(notice.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                            <CheckCircle2 size={13} /> {notice.status === "DRAFT" ? "Publish" : "Approve"}
                        </button>
                        {notice.status === "PENDING_APPROVAL" && (
                            <button data-testid="notice-reject-btn" onClick={() => onReject(notice)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
                                <XCircle size={13} /> Reject
                            </button>
                        )}
                    </>
                )}
                {notice.status === "APPROVED" && isPrincipal && (
                    <button data-testid="notice-archive-btn" onClick={() => onArchive(notice.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
                        <Archive size={13} /> Archive
                    </button>
                )}
                {["DRAFT", "REJECTED", "PENDING_APPROVAL"].includes(notice.status) && isPrincipal && (
                    <button data-testid="notice-edit-btn" onClick={() => onEdit(notice)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
                        <Edit3 size={13} /> Edit
                    </button>
                )}
                {isPrincipal && (
                    <button data-testid="notice-delete-btn" onClick={() => onDelete(notice.id, notice.title)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors ml-auto">
                        <Trash2 size={13} /> Delete
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const NoticeBoardDetails = () => {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const { hasModuleAdmin } = useAuth();
    const { addToast } = useToast();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const isPrincipal = hasModuleAdmin('COMMUNICATION');

    const [board, setBoard] = useState<any>(null);
    const [notices, setNotices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("ALL");
    const [showCreate, setShowCreate] = useState(false);
    const [editNotice, setEditNotice] = useState<any>(null);
    const [rejectTarget, setRejectTarget] = useState<any>(null);
    const [actionSaving, setActionSaving] = useState(false);

    const load = useCallback(async () => {
        if (!boardId) return;
        setLoading(true); setError("");
        try {
            const [boardData, noticesData] = await Promise.all([
                api.getNoticeBoardById(boardId),
                api.getNoticeBoardNotices(boardId),
            ]);
            setBoard(boardData.board);
            setNotices(noticesData.notices ?? []);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (noticeId: string) => {
        setActionSaving(true);
        try {
            await api.approveNotice(noticeId);
            await load();
        } finally { setActionSaving(false); }
    };

    const handleRejectConfirm = async (reason: string) => {
        if (!rejectTarget) return;
        setActionSaving(true);
        try {
            await api.rejectNotice(rejectTarget.id, reason);
            setRejectTarget(null);
            await load();
        } finally { setActionSaving(false); }
    };

    const handleArchive = async (noticeId: string) => {
        setActionSaving(true);
        try {
            await api.archiveNotice(noticeId);
            await load();
        } finally { setActionSaving(false); }
    };

    const handleDelete = (noticeId: string, title?: string) => {
        confirm({
            title: "Delete this notice?",
            message: title
                ? `"${title}" will be permanently removed from this board.`
                : "The notice will be permanently removed from this board.",
            confirmText: "Delete",
            onConfirm: async () => {
                setActionSaving(true);
                try {
                    await api.deleteNotice(noticeId);
                    await load();
                    addToast("Notice deleted", "success");
                } catch (err: any) {
                    addToast("Failed to delete notice", "error", err?.response?.data?.message);
                    throw err;
                } finally { setActionSaving(false); }
            },
        });
    };

    // Filter notices by tab
    const tabCounts = {
        ALL:     notices.length,
        PENDING: notices.filter(n => n.status === "PENDING_APPROVAL").length,
        ACTIVE:  notices.filter(n => n.isActive).length,
        DRAFT:   notices.filter(n => n.status === "DRAFT").length,
        ARCHIVED:notices.filter(n => n.status === "ARCHIVED").length,
    };

    const filtered = notices
        .filter(n => {
            if (activeTab === "ALL") return n.status !== "ARCHIVED";
            if (activeTab === "PENDING") return n.status === "PENDING_APPROVAL";
            if (activeTab === "ACTIVE") return n.isActive;
            if (activeTab === "DRAFT") return n.status === "DRAFT";
            if (activeTab === "ARCHIVED") return n.status === "ARCHIVED";
            return true;
        })
        .sort((a, b) => {
            const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 2;
            const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 2;
            return pa - pb || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
        </div>
    );
    if (error) return (
        <div className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button data-testid="notice-navigate-btn" onClick={() => navigate(-1)} className="mt-3 text-emerald-600 hover:underline text-sm">Back</button>
        </div>
    );
    if (!board) return null;

    const VIS = { PUBLIC: { icon: Globe, label: "School-Wide" }, CLASS: { icon: BookOpen, label: "Class" }, SECTION: { icon: Users, label: "Section" } } as any;
    const visInfo = VIS[board.visibility] ?? VIS.PUBLIC;
    const VisIcon = visInfo.icon;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {confirmDialog}
            {/* Header */}
            <div className="mb-6">
                <button data-testid="notice-navigate-btn-2" onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors">
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-emerald-100 rounded-xl"><Bell size={20} className="text-emerald-600" /></div>
                            <h1 className="text-2xl font-bold text-slate-900">{board.name}</h1>
                        </div>
                        {board.description && <p className="text-slate-500 text-sm ml-12">{board.description}</p>}
                        <div className="flex items-center gap-3 mt-2 ml-12 flex-wrap">
                            <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                <VisIcon size={14} className="text-slate-400" /> {visInfo.label}
                            </span>
                            {board.class && <span className="text-sm text-slate-500">• {board.class.name}</span>}
                            {board.section && <span className="text-sm text-slate-500">/ {board.section.name}</span>}
                            {board.approver && (
                                <span className="text-sm text-slate-500">• Approver: <strong>{board.approver.name}</strong></span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button data-testid="notice-load-btn" onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <RefreshCcw size={16} />
                        </button>
                        {isPrincipal && (
                            <button onClick={() => { setEditNotice(null); setShowCreate(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors">
                                <Plus size={16} /> New Notice
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                    { label: "Total", value: notices.filter(n => n.status !== "ARCHIVED").length, color: "text-slate-700" },
                    { label: "Live Now", value: notices.filter(n => n.isActive).length, color: "text-emerald-600" },
                    { label: "Pending", value: tabCounts.PENDING, color: tabCounts.PENDING > 0 ? "text-amber-600" : "text-slate-400" },
                    { label: "Draft",   value: tabCounts.DRAFT,   color: "text-slate-400" },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 overflow-x-auto">
                {[
                    { key: "ALL", label: "All Active" },
                    { key: "PENDING", label: `Pending${tabCounts.PENDING > 0 ? ` (${tabCounts.PENDING})` : ""}` },
                    { key: "ACTIVE", label: "Live" },
                    { key: "DRAFT", label: "Drafts" },
                    { key: "ARCHIVED", label: "Archived" },
                ].map(tab => (
                    <button data-testid="notice-active-tab-btn" key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                            ${activeTab === tab.key ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notices */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Bell size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-slate-500">No notices in this view</p>
                    {isPrincipal && activeTab === "ALL" && (
                        <button data-testid="notice-show-create-btn" onClick={() => setShowCreate(true)}
                            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
                            Create First Notice
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(notice => (
                        <NoticeCard
                            key={notice.id}
                            notice={notice}
                            isPrincipal={isPrincipal}
                            canApprove={false}
                            onApprove={handleApprove}
                            onReject={(n: any) => setRejectTarget(n)}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            onEdit={(n: any) => { setEditNotice(n); setShowCreate(true); }}
                        />
                    ))}
                </div>
            )}

            <NoticeModal
                open={showCreate} boardId={boardId!}
                editNotice={editNotice}
                onClose={() => { setShowCreate(false); setEditNotice(null); }}
                onSave={load}
            />
            <RejectModal
                open={!!rejectTarget}
                onClose={() => setRejectTarget(null)}
                onConfirm={handleRejectConfirm}
                saving={actionSaving}
            />
        </div>
    );
};

export default NoticeBoardDetails;

