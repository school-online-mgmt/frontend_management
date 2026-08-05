import { useState, useEffect, useCallback } from "react";
import { MessageSquareWarning, Loader2, ChevronLeft, Send, Lock, CheckCircle2, Clock } from "lucide-react";
import api from "../../api/api";
import { ErrorState } from "../../components/ui";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
const STATUS_CFG: Record<Status, { bg: string; text: string; label: string }> = {
    OPEN:        { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   label: "Open" },
    IN_PROGRESS: { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    label: "In progress" },
    RESOLVED:    { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Resolved" },
    CLOSED:      { bg: "bg-slate-100 border-slate-200",    text: "text-slate-600",   label: "Closed" },
};
const NEXT_STATUS: Record<Status, Status[]> = {
    OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
    IN_PROGRESS: ["RESOLVED", "CLOSED"],
    RESOLVED: ["CLOSED", "IN_PROGRESS"],
    CLOSED: [],
};

const GrievancesPage = () => {
    const { addToast } = useToast();
    const [filter, setFilter] = useState("");
    const [list, setList] = useState<any[]>([]);
    const [summary, setSummary] = useState({ open: 0, inProgress: 0 });
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);
    const [detail, setDetail] = useState<any | null>(null);
    const [reply, setReply] = useState("");
    const [internal, setInternal] = useState(false);
    const [busy, setBusy] = useState(false);

    const [loadError, setLoadError] = useState<unknown>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try { const r = await api.getGrievances(filter || undefined); setList(r.grievances); setSummary(r.summary); }
        // Swallowing this showed an empty list and "0 open" — a school with
        // unanswered parent complaints looked like a school with none.
        catch (e: unknown) { setLoadError(e); }
        finally { setLoading(false); }
    }, [filter]);
    useEffect(() => { void load(); }, [load]);

    const openDetail = async (id: string) => {
        setOpenId(id); setDetail(null); setReply(""); setInternal(false);
        try { setDetail(await api.getGrievance(id)); }
        catch (e: any) { addToast(e?.response?.data?.message || "Failed to load", "error"); }
    };

    const sendReply = async () => {
        if (!openId || !reply.trim()) return;
        setBusy(true);
        try {
            await api.replyGrievance(openId, reply.trim(), internal);
            setReply(""); setInternal(false);
            setDetail(await api.getGrievance(openId));
            addToast(internal ? "Internal note added" : "Reply sent to the parent", "success");
        } catch (e: any) { addToast(e?.response?.data?.message || "Failed", "error"); }
        finally { setBusy(false); }
    };

    const changeStatus = async (status: Status) => {
        if (!openId) return;
        setBusy(true);
        try {
            await api.setGrievanceStatus(openId, status, status === "IN_PROGRESS");
            setDetail(await api.getGrievance(openId));
            void load();
            addToast(`Marked ${STATUS_CFG[status].label}`, "success");
        } catch (e: any) { addToast(e?.response?.data?.message || "Failed", "error"); }
        finally { setBusy(false); }
    };

    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader icon={MessageSquareWarning} title="Parent Grievances" gradient={MODULE_THEMES.people ?? "from-amber-500 to-rose-500"}
                subtitle="Complaints raised by parents — respond and track to resolution." onRefresh={load} refreshing={loading} />

            <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">
                {openId && detail ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                            <button data-testid="grievance-back-btn" onClick={() => { setOpenId(null); setDetail(null); }} className="p-1 text-slate-400 hover:text-slate-700"><ChevronLeft size={18} /></button>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 truncate">{detail.grievance.subject}</h3>
                                <p className="text-[11px] text-slate-400">{detail.grievance.grievanceNumber} · {detail.grievance.category} · {detail.grievance.priority} · {detail.student?.name}{detail.student?.phone ? ` · ${detail.student.phone}` : ""}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_CFG[detail.grievance.status as Status].bg} ${STATUS_CFG[detail.grievance.status as Status].text}`}>{STATUS_CFG[detail.grievance.status as Status].label}</span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{detail.grievance.description}</div>

                            {/* Status actions */}
                            <div className="flex flex-wrap gap-2">
                                {NEXT_STATUS[detail.grievance.status as Status].map((s) => (
                                    <button key={s} data-testid={`grievance-status-${s}`} onClick={() => changeStatus(s)} disabled={busy}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                                        Mark {STATUS_CFG[s].label}
                                    </button>
                                ))}
                            </div>

                            {/* Thread */}
                            <div className="space-y-2">
                                {detail.replies.map((r: any) => (
                                    <div key={r.id} data-testid="grievance-reply" data-internal={r.isInternal ? "true" : "false"}
                                        className={`rounded-xl p-2.5 text-sm ${r.isInternal ? "bg-amber-50 border border-amber-200" : r.authorType === "PARENT" ? "bg-indigo-50 ml-6" : "bg-emerald-50 mr-6"}`}>
                                        <p className="text-[10px] font-bold text-slate-500 mb-0.5 flex items-center gap-1">
                                            {r.isInternal && <Lock size={9} />}{r.authorName} · {r.authorType === "PARENT" ? "Parent" : r.isInternal ? "Internal note" : "School"}
                                        </p>
                                        <p className="text-slate-700">{r.message}</p>
                                    </div>
                                ))}
                                {detail.replies.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No responses yet.</p>}
                            </div>

                            {/* Reply box */}
                            {detail.grievance.status !== "CLOSED" && (
                                <div className="space-y-2">
                                    <textarea data-testid="grievance-reply-input" value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Type a response…"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                            <input data-testid="grievance-internal-toggle" type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300" />
                                            Internal note (not shown to parent)
                                        </label>
                                        <button data-testid="grievance-reply-send" onClick={sendReply} disabled={busy || !reply.trim()}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                                            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {internal ? "Add note" : "Send"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Filter + summary */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex gap-1.5">
                                {["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(s => (
                                    <button key={s || "all"} data-testid={`grievance-filter-${s || "all"}`} onClick={() => setFilter(s)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${filter === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                                        {s === "" ? "All" : STATUS_CFG[s as Status].label}
                                    </button>
                                ))}
                            </div>
                            <div className="text-xs text-slate-500">
                                <span className="font-bold text-amber-600">{summary.open}</span> open · <span className="font-bold text-blue-600">{summary.inProgress}</span> in progress
                            </div>
                        </div>

                        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={22} /></div>
                        : loadError != null ? <div className="bg-white rounded-2xl border border-slate-100"><ErrorState message="Could not load parent complaints." error={loadError} onRetry={load} testId="grievances-error" /></div>
                        : list.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">No complaints{filter ? ` in "${STATUS_CFG[filter as Status].label}"` : ""}.</div>
                        : (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                                {list.map((g) => (
                                    <button key={g.id} data-testid="grievance-row" onClick={() => openDetail(g.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50/70 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                            {g.status === "RESOLVED" || g.status === "CLOSED" ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Clock size={15} className="text-amber-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{g.subject}</p>
                                            <p className="text-[11px] text-slate-400">{g.grievanceNumber} · {g.category} · {g.studentName}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_CFG[g.status as Status].bg} ${STATUS_CFG[g.status as Status].text}`}>{STATUS_CFG[g.status as Status].label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default GrievancesPage;
