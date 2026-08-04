import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CalendarDays, Clock, CheckCircle2, XCircle, Loader2, X,
    Users, Inbox, RefreshCw, Ban, MessageSquare, ChevronRight,
    UserCog,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";
import useTabState from "../../hooks/useTabState";
import { useSessionId } from "../../context/SessionContext";
import { ErrorState } from "../../components/ui";

const useLeaveSession = () => useSessionId();

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
    const [tab, setTab] = useTabState<TabKey>("tab", "student");
    const selectedSessionId = useSessionId();
    const [refreshKey, setRefreshKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = () => {
        setRefreshing(true);
        setRefreshKey(k => k + 1);
        setTimeout(() => setRefreshing(false), 600);
    };
    const TABS = [
        { key: "student" as TabKey, label: "Student Leaves", icon: Users },
        { key: "teacher" as TabKey, label: "Teacher Leaves", icon: UserCog },
    ];
    return (
        <div className="h-full flex flex-col bg-slate-50">
            <PageHeader
                icon={CalendarDays}
                title="Leave Management"
                subtitle="Manage student & teacher leave requests"
                gradient={MODULE_THEMES.leave}
                onRefresh={handleRefresh}
                refreshing={refreshing}
            />
            <div className="flex-1 overflow-y-auto">
                {!selectedSessionId ? (
                    <div className="p-4 sm:p-6 max-w-7xl mx-auto"><EmptySessionState entityPlural="leave requests" /></div>
                ) : (
                    <TabbedSection tabs={TABS} value={tab} onChange={setTab} idPrefix="leave" theme="cyan" flushPanel>
                        <TabPanel tabKey="student" key={`student-${refreshKey}`}><StudentLeavesTab /></TabPanel>
                        <TabPanel tabKey="teacher" key={`teacher-${refreshKey}`}><TeacherLeavesTab /></TabPanel>
                    </TabbedSection>
                )}
            </div>
        </div>
    );
}

// â”€â”€ Student Leaves Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StudentLeavesTab() {
    const sessionId = useLeaveSession();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState("");
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

    const leavesQuery = useQuery({
        queryKey: ["leaves", "student", sessionId, filter],
        queryFn: () => api.getStudentLeaves({
            ...(filter ? { status: filter } : {}),
            ...(sessionId ? { sessionId } : {}),
        }),
        select: (r: any) => r?.leaves ?? [],
    });
    useEffect(() => {
        if (leavesQuery.error) setToast({ type: "error", msg: "Failed to load student leaves" });
    }, [leavesQuery.error]);
    const leaves: any[] = leavesQuery.data ?? [];
    const loading = leavesQuery.isFetching;
    const load = () => queryClient.invalidateQueries({ queryKey: ["leaves", "student"] });

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
                <button data-testid="leave-load-btn" onClick={load} disabled={loading} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
            {loading ? <Spinner /> : leavesQuery.isError ? (
                <ErrorState message="Could not load leave requests."
                    onRetry={() => void leavesQuery.refetch()} />
            ) : leaves.length > 0 ? (
                <div className="space-y-3">
                    {leaves.map((l: any) => {
                        const sc = STATUS_CFG[l.status as LeaveStatus] || STATUS_CFG.PENDING;
                        const name = l.student ? `${l.student.firstName} ${l.student.lastName}` : "Unknown";
                        const mgmtApproval = l.approvals?.find((a: any) => a.approverType === "MANAGEMENT" && a.status === "PENDING");
                        return (
                            <div key={l.id} data-testid="leave-request-card" data-leave-id={l.id} data-status={l.status} data-applicant={name} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
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
                                            <button data-testid="leave-approve-btn" onClick={() => respond(mgmtApproval.id, "APPROVED")} disabled={respondingId === mgmtApproval.id}
                                                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-50">
                                                {respondingId === mgmtApproval.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                                            </button>
                                            <button data-testid="leave-reject-btn" onClick={() => respond(mgmtApproval.id, "REJECTED")} disabled={respondingId === mgmtApproval.id}
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
    const sessionId = useLeaveSession();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState("");
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

    const leavesQuery = useQuery({
        queryKey: ["leaves", "teacher", sessionId, filter],
        queryFn: () => api.getTeacherLeaves({
            ...(filter ? { status: filter } : {}),
            ...(sessionId ? { sessionId } : {}),
        }),
        select: (r: any) => r?.leaves ?? [],
    });
    useEffect(() => {
        if (leavesQuery.error) setToast({ type: "error", msg: "Failed to load teacher leaves" });
    }, [leavesQuery.error]);
    const leaves: any[] = leavesQuery.data ?? [];
    const loading = leavesQuery.isFetching;
    const load = () => queryClient.invalidateQueries({ queryKey: ["leaves", "teacher"] });

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
                <button data-testid="leave-load-btn-2" onClick={load} disabled={loading} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
            {loading ? <Spinner /> : leavesQuery.isError ? (
                <ErrorState message="Could not load leave requests."
                    onRetry={() => void leavesQuery.refetch()} />
            ) : leaves.length > 0 ? (
                <div className="space-y-3">
                    {leaves.map((l: any) => {
                        const sc = STATUS_CFG[l.status as LeaveStatus] || STATUS_CFG.PENDING;
                        const teacherName = l.teacher?.name || "Unknown";
                        return (
                            // Same card contract as the student tab above. A teacher
                            // request is a leave request too, and anything reading this
                            // queue shouldn't have to know which tab it landed on.
                            <div key={l.id} data-testid="leave-request-card" data-leave-id={l.id}
                                data-status={l.status} data-applicant={teacherName}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
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
                                            <button data-testid="leave-approve-btn" onClick={() => respond(l.id, "APPROVED")} disabled={respondingId === l.id}
                                                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-50">
                                                {respondingId === l.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                                            </button>
                                            <button data-testid="leave-reject-btn" onClick={() => respond(l.id, "REJECTED")} disabled={respondingId === l.id}
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
            <button data-testid="leave-close-btn" onClick={onClose} className="ml-auto"><X size={13} /></button>
        </div>
    );
}

function FilterBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(s => (
                <button data-testid="leave-change-btn" key={s} onClick={() => onChange(s)}
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

