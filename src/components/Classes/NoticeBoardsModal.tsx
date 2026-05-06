import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, Loader2, ChevronRight, Globe, BookOpen, Users, Eye } from "lucide-react";
import api from "../../api/api";

/**
 * Modal that shows the notice boards visible to a particular class or section.
 *
 * The backend's `/management/notice/boards?classId=…` already filters PUBLIC
 * + CLASS-scoped boards for that class; passing `sectionId` narrows further
 * to that section's boards. Click a board → navigate to /notices?board=<id>
 * so the deep-link opens it directly on the Notice Boards page.
 *
 * Used from ClassDetails ("Notice Boards" button) and SectionDetails (same
 * button, with sectionId passed in).
 */

interface BoardRow {
    id: string;
    name: string;
    description?: string | null;
    visibility: "PUBLIC" | "CLASS" | "SECTION";
    classId?: string | null;
    sectionId?: string | null;
    class?: { id: string; name: string } | null;
    section?: { id: string; name: string } | null;
    stats?: { total?: number; pending?: number; approved?: number };
}

interface Props {
    /** When set, the modal is open. Pass null/undefined to close. */
    open: boolean;
    onClose: () => void;
    /** Scope — exactly one of classId or sectionId. */
    classId?: string;
    sectionId?: string;
    /** Used in the modal header so admin sees which scope they're viewing. */
    scopeLabel: string;
}

const VIS_BADGE: Record<string, { label: string; className: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    PUBLIC:  { label: "School-wide", className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: Globe },
    CLASS:   { label: "Class",       className: "bg-blue-50 text-blue-700 border-blue-200",         Icon: BookOpen },
    SECTION: { label: "Section",     className: "bg-violet-50 text-violet-700 border-violet-200",   Icon: Users },
};

const NoticeBoardsModal = ({ open, onClose, classId, sectionId, scopeLabel }: Props) => {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<BoardRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        const params: { classId?: string; sectionId?: string } = {};
        if (sectionId) params.sectionId = sectionId;
        else if (classId) params.classId = classId;
        api.getNoticeBoards(params)
            .then((res: any) => {
                if (cancelled) return;
                setBoards(res?.boards ?? []);
            })
            .catch((err: any) => {
                if (cancelled) return;
                setError(err?.response?.data?.message ?? "Failed to load notice boards");
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, classId, sectionId]);

    if (!open) return null;

    const handleOpen = (boardId: string) => {
        onClose();
        // Each board has its own detail page at /notices/:boardId.
        navigate(`/notices/${boardId}`);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-boards-modal-title"
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 shrink-0">
                            <Bell size={18} />
                        </div>
                        <div className="min-w-0">
                            <h2 id="notice-boards-modal-title" className="text-sm font-bold truncate">Notice Boards</h2>
                            <p className="text-[11px] text-white/80 truncate">{scopeLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading && (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <Loader2 size={18} className="animate-spin mr-2" />
                            <span className="text-sm">Loading boards…</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2.5">
                            {error}
                        </div>
                    )}

                    {!loading && !error && boards.length === 0 && (
                        <div className="text-center py-10 px-4">
                            <Bell size={28} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No notice boards</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                There are no boards visible to {scopeLabel.toLowerCase()} yet. Create one from the Notice Boards page.
                            </p>
                        </div>
                    )}

                    {!loading && !error && boards.length > 0 && (
                        <ul className="space-y-2" role="list">
                            {boards.map(b => {
                                const cfg = VIS_BADGE[b.visibility] ?? VIS_BADGE.PUBLIC!;
                                const Icon = cfg.Icon;
                                return (
                                    <li key={b.id}>
                                        <button
                                            onClick={() => handleOpen(b.id)}
                                            className="w-full text-left rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm bg-white px-4 py-3 transition-all group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${cfg.className}`}>
                                                    <Icon size={15} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{b.name}</p>
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.className}`}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    {b.description && (
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{b.description}</p>
                                                    )}
                                                    {b.stats && (
                                                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Eye size={10} /> {b.stats.approved ?? 0} active
                                                            </span>
                                                            {(b.stats.pending ?? 0) > 0 && (
                                                                <span className="text-amber-600 font-semibold">
                                                                    {b.stats.pending} pending approval
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <ChevronRight size={15} className="text-slate-300 group-hover:text-amber-500 mt-1 shrink-0 transition-colors" />
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NoticeBoardsModal;
