import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    BookOpen, Plus, RefreshCcw, Search, ToggleLeft, ToggleRight,
    BookMarked, AlertTriangle, ClipboardList, RotateCcw, X,
} from "lucide-react";
import api from "../../api/api";
import PageHeader from "../../components/PageHeader";

type Tab = "catalog" | "issues" | "requests" | "renewals";

const LibraryHome = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>("catalog");
    const [stats, setStats] = useState<any>(null);
    const [books, setBooks] = useState<any[]>([]);
    const [issues, setIssues] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [renewals, setRenewals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState<any>(null);
    const [showIssueModal, setShowIssueModal] = useState<any>(null);
    const [issueFilter, setIssueFilter] = useState("ISSUED");
    const [requestFilter, setRequestFilter] = useState("PENDING");
    const [renewalFilter, setRenewalFilter] = useState("PENDING");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const showMsg = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const fetchStats = useCallback(async () => {
        try {
            const data = await api.getLibraryStats();
            setStats(data.stats);
        } catch { /* ignore */ }
    }, []);

    const fetchBooks = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getLibraryBooks({ search: search || undefined });
            setBooks(data.books || []);
        } catch { setBooks([]); } finally { setIsLoading(false); }
    }, [search]);

    const fetchIssues = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getLibraryIssues({ status: issueFilter });
            setIssues(data.issues || []);
        } catch { setIssues([]); } finally { setIsLoading(false); }
    }, [issueFilter]);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getLibraryRequests({ status: requestFilter });
            setRequests(data.requests || []);
        } catch { setRequests([]); } finally { setIsLoading(false); }
    }, [requestFilter]);

    const fetchRenewals = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getLibraryRenewals({ status: renewalFilter });
            setRenewals(data.renewals || []);
        } catch { setRenewals([]); } finally { setIsLoading(false); }
    }, [renewalFilter]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        if (tab === "catalog") fetchBooks();
        else if (tab === "issues") fetchIssues();
        else if (tab === "requests") fetchRequests();
        else if (tab === "renewals") fetchRenewals();
    }, [tab, fetchBooks, fetchIssues, fetchRequests, fetchRenewals]);

    const handleToggleBook = async (bookId: string) => {
        try {
            const data = await api.toggleLibraryBook(bookId);
            showMsg("success", data.message);
            fetchBooks();
            fetchStats();
        } catch { showMsg("error", "Failed to toggle book status"); }
    };

    const handleApproveRequest = async (requestId: string) => {
        if (!confirm("Approve this request? The book will be marked as ISSUED immediately.")) return;
        try {
            await api.approveLibraryRequest(requestId);
            showMsg("success", "Request approved and book issued");
            fetchRequests(); fetchStats();
        } catch (e: any) { showMsg("error", e?.response?.data?.message || "Failed to approve"); }
    };

    const handleRejectRequest = async (requestId: string) => {
        const reason = prompt("Rejection reason (optional):");
        try {
            await api.rejectLibraryRequest(requestId, reason || "");
            showMsg("success", "Request rejected");
            fetchRequests(); fetchStats();
        } catch { showMsg("error", "Failed to reject"); }
    };

    const handleRespondRenewal = async (renewalId: string, action: "APPROVED" | "REJECTED") => {
        const remarks = action === "REJECTED" ? (prompt("Remarks:") || "") : "";
        try {
            await api.respondLibraryRenewal(renewalId, action, remarks);
            showMsg("success", `Renewal ${action.toLowerCase()}`);
            fetchRenewals(); fetchStats();
        } catch (e: any) { showMsg("error", e?.response?.data?.message || "Failed to respond"); }
    };

    const handleMarkOverdue = async () => {
        try {
            const data = await api.markLibraryOverdue();
            showMsg("success", data.message);
            fetchIssues(); fetchStats();
        } catch { showMsg("error", "Failed to mark overdue"); }
    };

    const TABS: { key: Tab; label: string; icon: any; badge?: number }[] = [
        { key: "catalog", label: "Book Catalog", icon: BookOpen },
        { key: "issues", label: "Active Issues", icon: BookMarked, badge: stats?.activeIssues },
        { key: "requests", label: "Requests", icon: ClipboardList, badge: stats?.pendingRequests },
        { key: "renewals", label: "Renewals", icon: RotateCcw, badge: stats?.pendingRenewals },
    ];

    const statusColors: Record<string, string> = {
        ISSUED: "bg-blue-100 text-blue-700",
        OVERDUE: "bg-red-100 text-red-700",
        RETURNED: "bg-green-100 text-green-700",
        LOST: "bg-slate-100 text-slate-700",
        PENDING: "bg-amber-100 text-amber-700",
        TEACHER_APPROVED: "bg-indigo-100 text-indigo-700",
        APPROVED: "bg-emerald-100 text-emerald-700",
        REJECTED: "bg-red-100 text-red-700",
        CANCELLED: "bg-slate-100 text-slate-600",
    };

    const daysOverdue = (dueDate: string) => {
        const diff = new Date().getTime() - new Date(dueDate).getTime();
        return Math.max(0, Math.ceil(diff / 86400000));
    };

    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader
                icon={BookOpen}
                title="Library Management"
                subtitle="Manage books, issues, requests & renewals"
                actions={
                    <button onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-white/15 border border-white/25 text-white rounded-xl flex items-center gap-2 hover:bg-white/25 transition-all backdrop-blur-sm">
                        <Plus size={18} /> Add Book
                    </button>
                }
            />
            <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { label: "Total Books", value: stats.totalBooks, icon: BookOpen, color: "text-indigo-600 bg-indigo-50" },
                        { label: "Active Issues", value: stats.activeIssues, icon: BookMarked, color: "text-blue-600 bg-blue-50" },
                        { label: "Overdue", value: stats.overdueIssues, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
                        { label: "Pending Requests", value: stats.pendingRequests, icon: ClipboardList, color: "text-amber-600 bg-amber-50" },
                        { label: "Pending Renewals", value: stats.pendingRenewals, icon: RotateCcw, color: "text-emerald-600 bg-emerald-50" },
                    ].map((s) => (
                        <div key={s.label} className="bg-white rounded-2xl border p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                                <s.icon size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{s.value}</p>
                                <p className="text-xs text-slate-500">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        <t.icon size={15} />
                        {t.label}
                        {t.badge && t.badge > 0 ? (
                            <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{t.badge}</span>
                        ) : null}
                    </button>
                ))}
            </div>

            {/* ── CATALOG ─────────────────────────────────────────────────── */}
            {tab === "catalog" && (
                <div className="bg-white rounded-2xl border shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && fetchBooks()}
                                placeholder="Search title, author, ISBN…"
                                className="pl-9 pr-4 py-2 border rounded-lg text-sm w-72"
                            />
                        </div>
                        <button onClick={fetchBooks} className="p-2 border rounded-lg hover:bg-slate-50">
                            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-4 text-left font-semibold text-slate-600">Book</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Genre</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Copies</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Available</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Approval</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Status</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {books.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-400">No books found</td></tr>
                            ) : books.map((book) => (
                                <tr key={book.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <button
                                            onClick={() => navigate(`/library/books/${book.id}`)}
                                            className="font-semibold text-slate-800 hover:text-indigo-600 text-left"
                                        >
                                            {book.title}
                                        </button>
                                        <p className="text-slate-400 text-xs">{book.author}{book.isbn ? ` · ISBN: ${book.isbn}` : ""}</p>
                                        {book.rackNumber && <p className="text-slate-400 text-xs">Rack: {book.rackNumber}</p>}
                                    </td>
                                    <td className="p-4 text-slate-600">{book.genre || "—"}</td>
                                    <td className="p-4 text-center font-medium">{book.totalCopies}</td>
                                    <td className="p-4 text-center">
                                        <span className={`font-semibold ${book.availableCopies === 0 ? "text-red-600" : "text-emerald-600"}`}>
                                            {book.availableCopies}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {book.requiresApproval ? (
                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Required</span>
                                        ) : (
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">None</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleToggleBook(book.id)} className="flex items-center gap-1 mx-auto text-xs">
                                            {book.isEnabled
                                                ? <><ToggleRight size={20} className="text-emerald-500" /><span className="text-emerald-600">Enabled</span></>
                                                : <><ToggleLeft size={20} className="text-slate-400" /><span className="text-slate-500">Disabled</span></>
                                            }
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => navigate(`/library/books/${book.id}`)}
                                            className="text-xs text-indigo-600 hover:underline"
                                        >
                                            View / Issue
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── ISSUES ───────────────────────────────────────────────────── */}
            {tab === "issues" && (
                <div className="bg-white rounded-2xl border shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b gap-3">
                        <div className="flex gap-2">
                            {["ISSUED", "OVERDUE", "RETURNED", "LOST"].map((s) => (
                                <button key={s} onClick={() => setIssueFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${issueFilter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleMarkOverdue} className="px-3 py-1.5 border border-amber-300 text-amber-700 text-xs rounded-lg hover:bg-amber-50 flex items-center gap-1">
                                <AlertTriangle size={13} /> Mark Overdue
                            </button>
                            <button onClick={fetchIssues} className="p-2 border rounded-lg hover:bg-slate-50">
                                <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-4 text-left font-semibold text-slate-600">Book</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Student</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Issue Date</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Due Date</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Fine</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {issues.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-400">No issues found</td></tr>
                            ) : issues.map((issue) => {
                                const overdueDays = daysOverdue(issue.dueDate);
                                return (
                                    <tr key={issue.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <p className="font-medium">{issue.bookTitle}</p>
                                            <p className="text-slate-400 text-xs">{issue.bookAuthor}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium">{issue.studentName}</p>
                                            <p className="text-slate-400 text-xs">{issue.studentPhone}</p>
                                        </td>
                                        <td className="p-4 text-slate-600">{issue.issueDate}</td>
                                        <td className="p-4">
                                            <p className={overdueDays > 0 && issue.status !== "RETURNED" ? "text-red-600 font-semibold" : "text-slate-600"}>
                                                {issue.dueDate}
                                            </p>
                                            {overdueDays > 0 && issue.status !== "RETURNED" && (
                                                <p className="text-red-500 text-xs">{overdueDays}d overdue · ₹{overdueDays * 3} fine</p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[issue.status] || "bg-slate-100"}`}>
                                                {issue.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {issue.fineAmount > 0 ? (
                                                <span className={`text-sm font-semibold ${issue.finePaid ? "text-green-600" : "text-red-600"}`}>
                                                    ₹{issue.fineAmount}{issue.finePaid ? " (paid)" : ""}
                                                </span>
                                            ) : <span className="text-slate-400 text-xs">—</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            {issue.status !== "RETURNED" && (
                                                <button
                                                    onClick={() => setShowReturnModal(issue)}
                                                    className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700"
                                                >
                                                    Return
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── REQUESTS ─────────────────────────────────────────────────── */}
            {tab === "requests" && (
                <div className="bg-white rounded-2xl border shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex gap-2">
                            {["PENDING", "TEACHER_APPROVED", "APPROVED", "REJECTED", "ISSUED", "CANCELLED"].map((s) => (
                                <button key={s} onClick={() => setRequestFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${requestFilter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchRequests} className="p-2 border rounded-lg hover:bg-slate-50">
                            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-4 text-left font-semibold text-slate-600">Book</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Student</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Note</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {requests.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">No requests found</td></tr>
                            ) : requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <p className="font-medium">{req.bookTitle}</p>
                                        <p className="text-slate-400 text-xs">{req.bookAuthor}</p>
                                        <div className="flex gap-2 items-center mt-1">
                                            <p className="text-xs text-slate-500">Available: {req.availableCopies}</p>
                                            {req.requestedReturnDate && (
                                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-medium">Req: {req.requestedReturnDate}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-medium">{req.studentName}</p>
                                        <p className="text-slate-400 text-xs">{req.studentPhone}</p>
                                    </td>
                                    <td className="p-4 text-slate-600 max-w-xs">
                                        <p className="truncate">{req.requestNote || "—"}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status] || "bg-slate-100"}`}>
                                            {req.status}
                                        </span>
                                        {req.status === "PENDING" && req.requiresApproval && (
                                            <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Awaiting Teacher</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            <div className="flex gap-2 justify-center">
                                                {(req.status === "TEACHER_APPROVED" || (req.status === "PENDING" && !req.requiresApproval)) && (
                                                    <button
                                                        onClick={() => handleApproveRequest(req.id)}
                                                        className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700"
                                                    >
                                                        Approve & Issue
                                                    </button>
                                                )}
                                                {(req.status === "PENDING" || req.status === "TEACHER_APPROVED") && (
                                                    <button
                                                        onClick={() => handleRejectRequest(req.id)}
                                                        className="text-xs border border-red-300 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50"
                                                    >
                                                        Reject
                                                    </button>
                                                )}
                                            </div>
                                            {req.status === "PENDING" && req.requiresApproval && (
                                                <span className="text-[10px] text-slate-400 italic mt-1">Teacher approval needed</span>
                                            )}
                                        </div>
                                        {req.status === "APPROVED" && (
                                            <button
                                                onClick={() => setShowIssueModal(req)}
                                                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 mx-auto block"
                                            >
                                                Issue Book
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── RENEWALS ─────────────────────────────────────────────────── */}
            {tab === "renewals" && (
                <div className="bg-white rounded-2xl border shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex gap-2">
                            {["PENDING", "APPROVED", "REJECTED"].map((s) => (
                                <button key={s} onClick={() => setRenewalFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${renewalFilter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchRenewals} className="p-2 border rounded-lg hover:bg-slate-50">
                            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-4 text-left font-semibold text-slate-600">Book</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Student</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Current Due</th>
                                <th className="p-4 text-left font-semibold text-slate-600">New Due (if approved)</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="p-4 text-center font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {renewals.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-400">No renewal requests</td></tr>
                            ) : renewals.map((renewal) => {
                                const currentDue = new Date(renewal.currentDueDate);
                                const newDue = new Date(currentDue);
                                newDue.setDate(newDue.getDate() + 21);
                                return (
                                    <tr key={renewal.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <p className="font-medium">{renewal.bookTitle}</p>
                                            <p className="text-slate-400 text-xs">{renewal.bookAuthor}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium">{renewal.studentName}</p>
                                            <p className="text-slate-400 text-xs">{renewal.studentPhone}</p>
                                        </td>
                                        <td className="p-4 text-slate-600">{renewal.currentDueDate}</td>
                                        <td className="p-4 text-emerald-600 font-medium">
                                            {renewal.newDueDate || newDue.toISOString().split("T")[0]}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[renewal.status] || "bg-slate-100"}`}>
                                                {renewal.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {renewal.status === "PENDING" && (
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => handleRespondRenewal(renewal.id, "APPROVED")}
                                                        className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespondRenewal(renewal.id, "REJECTED")}
                                                        className="text-xs border border-red-300 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Book Modal */}
            {showAddModal && (
                <AddBookModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={(msg: string) => { showMsg("success", msg); fetchBooks(); fetchStats(); }}
                />
            )}

            {/* Return Modal */}
            {showReturnModal && (
                <InlineReturnModal
                    issue={showReturnModal}
                    onClose={() => setShowReturnModal(null)}
                    onSuccess={(msg: string) => { showMsg("success", msg); setShowReturnModal(null); fetchIssues(); fetchStats(); }}
                />
            )}

            {/* Issue from Request Modal */}
            {showIssueModal && (
                <InlineIssueModal
                    request={showIssueModal}
                    onClose={() => setShowIssueModal(null)}
                    onSuccess={(msg: string) => { showMsg("success", msg); setShowIssueModal(null); fetchRequests(); fetchStats(); fetchIssues(); }}
                />
            )}
            </div>
        </div>
    );
};

/* ── Inline Return Modal ─────────────────────────────────────────────────────── */
const InlineReturnModal = ({ issue, onClose, onSuccess }: { issue: any; onClose: () => void; onSuccess: (msg: string) => void }) => {
    const today = new Date();
    const dueDate = new Date(issue.dueDate);
    const diffDays = Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / 86400000));
    const calculatedFine = diffDays * 3;
    const [overrideFine, setOverrideFine] = useState(String(calculatedFine));
    const [markLost, setMarkLost] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleReturn = async () => {
        setIsSubmitting(true);
        try {
            const data = await api.returnLibraryBook(issue.id, { remarks, markLost, overrideFine: Number.parseInt(overrideFine) || 0 });
            onSuccess(`Book ${markLost ? "marked as lost" : "returned"}. Fine: ₹${data.fineAmount}`);
        } catch (e: any) { setError(e?.response?.data?.message || "Failed"); }
        finally { setIsSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">Process Return</h2><button onClick={onClose}><X size={18} className="text-slate-400" /></button></div>
                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>}
                <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm space-y-1">
                    <p><span className="text-slate-500">Student:</span> <strong>{issue.studentName}</strong></p>
                    <p><span className="text-slate-500">Book:</span> <strong>{issue.bookTitle}</strong></p>
                    <p><span className="text-slate-500">Due Date:</span> <span className={diffDays > 0 ? "text-red-600 font-semibold" : ""}>{issue.dueDate}</span></p>
                    {diffDays > 0 && <p className="text-red-600 font-semibold">⚠ {diffDays} day(s) overdue</p>}
                </div>
                <div className="space-y-3 mb-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Fine (₹) — Calculated: ₹{calculatedFine}</label>
                        <input type="number" min="0" value={overrideFine} onChange={(e) => setOverrideFine(e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
                        <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Optional…" />
                    </div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={markLost} onChange={(e) => setMarkLost(e.target.checked)} /><label className="text-sm text-red-600">Mark as Lost</label></div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 border rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={handleReturn} disabled={isSubmitting} className={`flex-1 text-white rounded-xl py-2 text-sm ${markLost ? "bg-red-600" : "bg-emerald-600"}`}>
                        {isSubmitting ? "Processing…" : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Inline Issue Modal ──────────────────────────────────────────────────────── */
const InlineIssueModal = ({ request, onClose, onSuccess }: { request: any; onClose: () => void; onSuccess: (msg: string) => void }) => {
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleIssue = async () => {
        setIsSubmitting(true);
        try {
            await api.issueLibraryBook({ bookId: request.bookId, studentId: request.studentId, requestId: request.id, remarks });
            onSuccess(`Book issued to ${request.studentName}`);
        } catch (e: any) { setError(e?.response?.data?.message || "Failed to issue"); }
        finally { setIsSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">Issue Book</h2><button onClick={onClose}><X size={18} className="text-slate-400" /></button></div>
                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>}
                <div className="bg-indigo-50 rounded-xl p-4 mb-4 text-sm">
                    <p><span className="text-slate-500">Book:</span> <strong>{request.bookTitle}</strong></p>
                    <p><span className="text-slate-500">Student:</span> <strong>{request.studentName}</strong></p>
                    <p><span className="text-slate-500">Phone:</span> {request.studentPhone}</p>
                </div>
                <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
                    <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Optional…" />
                </div>
                <p className="text-xs text-slate-400 mb-4">Due date: <strong>{new Date(Date.now() + 21 * 86400000).toLocaleDateString()}</strong> (21 days)</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 border rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={handleIssue} disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm">
                        {isSubmitting ? "Issuing…" : "Issue Book"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Add Book Modal ──────────────────────────────────────────────────────────── */
const GENRES = ["Fiction", "Non-Fiction", "Science", "Mathematics", "History", "Geography",
    "Literature", "Reference", "Biography", "Technology", "Arts", "Sports", "Other"];

const AddBookModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) => {
    const [form, setForm] = useState({
        title: "", author: "", isbn: "", publisher: "", publicationYear: "",
        genre: "", description: "", rackNumber: "", totalCopies: "1",
        isEnabled: true, requiresApproval: false,
    });
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getClasses().then((c) => setClasses(c || [])).catch(() => {});
    }, []);

    const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

    const handleSubmit = async () => {
        if (!form.title || !form.author) { setError("Title and author are required"); return; }
        setIsSubmitting(true);
        try {
            await api.createLibraryBook({
                ...form,
                publicationYear: form.publicationYear ? Number.parseInt(form.publicationYear) : undefined,
                totalCopies: Number.parseInt(form.totalCopies) || 1,
                restrictedToClassIds: selectedClasses,
            });
            onSuccess(`"${form.title}" added to library`);
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to add book");
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold">Add New Book</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Title *</label>
                            <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Book title" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Author *</label>
                            <input value={form.author} onChange={(e) => set("author", e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Author name" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">ISBN</label>
                            <input value={form.isbn} onChange={(e) => set("isbn", e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="978-..." />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Publisher</label>
                            <input value={form.publisher} onChange={(e) => set("publisher", e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Publication Year</label>
                            <input type="number" value={form.publicationYear} onChange={(e) => set("publicationYear", e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="2023" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Genre</label>
                            <select value={form.genre} onChange={(e) => set("genre", e.target.value)} className="w-full border rounded-lg p-2 text-sm">
                                <option value="">Select genre</option>
                                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Rack Number</label>
                            <input value={form.rackNumber} onChange={(e) => set("rackNumber", e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="A-12" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Total Copies</label>
                            <input type="number" min="1" value={form.totalCopies} onChange={(e) => set("totalCopies", e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full border rounded-lg p-2 text-sm" placeholder="Brief description…" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-600 block mb-2">Class Restrictions <span className="font-normal text-slate-400">(leave empty = no restriction)</span></label>
                            <div className="flex flex-wrap gap-2">
                                {classes.map((cls) => (
                                    <button key={cls.id} type="button"
                                        onClick={() => setSelectedClasses((prev) => prev.includes(cls.id) ? prev.filter((c) => c !== cls.id) : [...prev, cls.id])}
                                        className={`text-xs px-3 py-1 rounded-full border transition ${selectedClasses.includes(cls.id) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"}`}
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="requiresApproval" checked={form.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} className="w-4 h-4" />
                            <label htmlFor="requiresApproval" className="text-sm text-slate-700">Requires approval to borrow</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="isEnabled" checked={form.isEnabled} onChange={(e) => set("isEnabled", e.target.checked)} className="w-4 h-4" />
                            <label htmlFor="isEnabled" className="text-sm text-slate-700">Enable book immediately</label>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm">Cancel</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
                        {isSubmitting ? "Adding…" : "Add Book"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LibraryHome;

