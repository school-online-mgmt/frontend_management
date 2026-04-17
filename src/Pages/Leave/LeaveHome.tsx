import { useState, useEffect, useCallback } from "react";
import {
    CalendarDays, Clock, CheckCircle2, XCircle, Loader2, X,
    Users, Inbox, RefreshCw, Ban, MessageSquare, ChevronRight,
    UserCog,
} from "lucide-react";
import api from "../../api/api";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type LeaveType = "SICK" | "PERSONAL" | "FAMILY" | "OTHER";
type TabKey = "student" | "teacher";

const STATUS_CFG: Record<LeaveStatus, { bg: string; text: string; border: string; icon: any; label: string }> = {
    PENDING:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   icon: Clock,        label: "Pending" },
    APPROVED:  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2, label: "Approved" },
    REJECTED:  { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     icon: XCircle,      label: "Rejected" },
    CANCELLED: { bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200",   icon: Ban,          label: "Cancelled" },
};
const TYPE_LABELS: Record<LeaveType, string> = { SICK: "ðŸ¤’ Sick", PERSONAL: "ðŸ  Personal", FAMILY: "ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Family", OTHER: "ðŸ“‹ Other" };
const STATUS_FILTERS = ["", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function fmtRelative(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function LeaveHome() {
    const [tab, setTab] = useState<TabKey>("student");
    return (
        <div className="h-full flex flex-col bg-slate-50">
            <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <CalendarDays size={19} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-800">Leave Management</h1>
                            <p className="text-[11px] text-slate-400">Manage student & teacher leave requests</p>
                        </div>
                    </div>
                    <nav className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                        {([
                            { key: "student" as TabKey, label: "Student Leaves", icon: Users },
                            { key: "teacher" as TabKey, label: "Teacher Leaves", icon: UserCog },
                        ]).map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                                    tab === t.key ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"
                                }`}>
                                <t.icon size={13} />{t.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto">
                {tab === "student" ? <StudentLeavesTab /> : <TeacherLeavesTab />}
            </div>
        </div>
    );
}

// â”€â”€ Student Leaves Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StudentLeavesTab() {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.getStudentLeaves(filter ? { status: filter } : undefined);
            setLeaves(r.leaves ?? []);
        } catch { setToast({ type: "error", msg: "Failed to load student leaves" }); }
        finally { setLoading(false); }
    }, [filter]);
    useEffect(() => { load(); }, [load]);

    const respond = async (approvalId: string, action: string) => {
        setRespondingId(approvalId);
        try {
            await api.respondStudentLeaveApproval(approvalId, { action });
            setToast({ type: "success", msg: `Leave ${action.toLowerCase()} successfully` });
            load();
        } catch { setToast({ type: "error", msg: "Failed to respond" }); }
        finally { setRespondingId(null); }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-4">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <FilterBar value={filter} onChange={setFilter} />
                <button onClick={load} disabled={loading} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
            {loading ? <Spinner /> : leaves.length > 0 ? (
                <div className="space-y-3">
                    {leaves.map((l: any) => {
                        const sc = STATUS_CFG[l.status as LeaveStatus] || STATUS_CFG.PENDING;
                        const name = l.student ? `${l.student.firstName} ${l.student.lastName}` : "Unknown";
                        const mgmtApproval = l.approvals?.find((a: any) => a.approverType === "MANAGEMENT" && a.status === "PENDING");
                        return (
                            <div key={l.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-0.5 p-2 rounded-xl border ${sc.bg} ${sc.border}`}>
                                        <sc.icon size={16} className={sc.text} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-slate-800">{name}</span>
                                            {l.className && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">{l.className}</span>}
                                            {l.sectionName && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">{l.sectionName}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                {sc.label}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{TYPE_LABELS[l.type as LeaveType] || l.type}</span>
                                            <span className="text-[10px] text-slate-400">{l.days} day{l.days > 1 ? "s" : ""}</span>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 mb-0.5">
                                            {fmtDate(l.fromDate)}{l.days > 1 && <><ChevronRight size={11} className="inline mx-0.5 text-slate-300" />{fmtDate(l.toDate)}</>}
                                        </p>
                                        <p className="text-xs text-slate-500">{l.reason}</p>
                                        {l.approvals?.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {l.approvals.map((a: any) => {
                                                    const ac = STATUS_CFG[a.status as LeaveStatus] || STATUS_CFG.PENDING;
                                                    return (
                                                        <span key={a.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ac.bg} ${ac.text} ${ac.border}`}>
                                                            <ac.icon size={9} />{a.approverType.replaceAll("_", " ")} ({ac.label})
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-300 mt-2">Applied {fmtRelative(l.createdAt)}</p>
                                    </div>
                                    {mgmtApproval && (
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => respond(mgmtApproval.id, "APPROVED")} disabled={respondingId === mgmtApproval.id}
                                                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-50">
                                                {respondingId === mgmtApproval.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                                            </button>
                                            <button onClick={() => respond(mgmtApproval.id, "REJECTED")} disabled={respondingId === mgmtApproval.id}
                                                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold hover:bg-red-100 disabled:opacity-50">
                                                {respondingId === mgmtApproval.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : <EmptyState />}
        </div>
    );
}

// â”€â”€ Teacher Leaves Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TeacherLeavesTab() {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.getTeacherLeaves(filter ? { status: filter } : undefined);
            setLeaves(r.leaves ?? []);
        } catch { setToast({ type: "error", msg: "Failed to load teacher leaves" }); }
        finally { setLoading(false); }
    }, [filter]);
    useEffect(() => { load(); }, [load]);

    const respond = async (leaveId: string, action: string) => {
        setRespondingId(leaveId);
        try {
            await api.respondTeacherLeave(leaveId, { action });
            setToast({ type: "success", msg: `Leave ${action.toLowerCase()} successfully` });
            load();
        } catch { setToast({ type: "error", msg: "Failed to respond" }); }
        finally { setRespondingId(null); }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-4">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <FilterBar value={filter} onChange={setFilter} />
                <button onClick={load} disabled={loading} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
            {loading ? <Spinner /> : leaves.length > 0 ? (
                <div className="space-y-3">
                    {leaves.map((l: any) => {
                        const sc = STATUS_CFG[l.status as LeaveStatus] || STATUS_CFG.PENDING;
                        const teacherName = l.teacher?.name || "Unknown";
                        return (
                            <div key={l.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-0.5 p-2 rounded-xl border ${sc.bg} ${sc.border}`}>
                                        <sc.icon size={16} className={sc.text} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-slate-800">{teacherName}</span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                {sc.label}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{TYPE_LABELS[l.type as LeaveType] || l.type}</span>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 mb-0.5">
                                            {fmtDate(l.fromDate)}{l.days > 1 && <><ChevronRight size={11} className="inline mx-0.5 text-slate-300" />{fmtDate(l.toDate)}</>}
                                            <span className="text-slate-400 ml-1">({l.days} day{l.days > 1 ? "s" : ""})</span>
                                        </p>
                                        <p className="text-xs text-slate-500">{l.reason}</p>
                                        {l.reviewRemarks && (
                                            <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                                                <MessageSquare size={11} className="text-slate-400 mt-0.5 shrink-0" />
                                                <p className="text-xs text-slate-600">{l.reviewRemarks}</p>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-300 mt-2">Applied {fmtRelative(l.createdAt)}</p>
                                    </div>
                                    {l.status === "PENDING" && (
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => respond(l.id, "APPROVED")} disabled={respondingId === l.id}
                                                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-50">
                                                {respondingId === l.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                                            </button>
                                            <button onClick={() => respond(l.id, "REJECTED")} disabled={respondingId === l.id}
                                                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold hover:bg-red-100 disabled:opacity-50">
                                                {respondingId === l.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : <EmptyState />}
        </div>
    );
}

// â”€â”€ Shared Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Toast({ toast, onClose }: { toast: { type: string; msg: string }; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [toast, onClose]);
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-sm ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
            {toast.type === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{toast.msg}</span>
            <button onClick={onClose} className="ml-auto"><X size={13} /></button>
        </div>
    );
}

function FilterBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(s => (
                <button key={s} onClick={() => onChange(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        value === s ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}>
                    {s || "All"}
                </button>
            ))}
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-emerald-400" size={32} />
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-20">
            <Inbox size={44} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">No leave requests found</p>
        </div>
    );
}

