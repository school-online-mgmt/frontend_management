import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft, Edit2, Trash2, BookOpen, Users, Clock,
    RotateCcw, X, Save,
} from "lucide-react";
import api from "../../api/api";
import { useConfirm } from "../../hooks/useConfirm";

const GENRES = ["Fiction", "Non-Fiction", "Science", "Mathematics", "History", "Geography",
    "Literature", "Reference", "Biography", "Technology", "Arts", "Sports", "Other"];

const statusColors: Record<string, string> = {
    ISSUED: "bg-blue-100 text-blue-700",
    OVERDUE: "bg-red-100 text-red-700",
    RETURNED: "bg-green-100 text-green-700",
    LOST: "bg-slate-100 text-slate-600",
};

const BookDetailsPage = () => {
    const { bookId } = useParams<{ bookId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { confirm, dialog: confirmDialog } = useConfirm();

    const [book, setBook] = useState<any>(null);
    const [activeIssues, setActiveIssues] = useState<any[]>([]);
    const [issueHistory, setIssueHistory] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState<any>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    // Pre-fill from "Issue Book" click on requests tab
    const prefilledRequest = (location.state as any)?.issueStudent || null;

    const showMsg = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const fetchBook = async () => {
        setIsLoading(true);
        try {
            const data = await api.getLibraryBookById(bookId!);
            setBook(data.book);
            setActiveIssues(data.activeIssues || []);
            setIssueHistory(data.issueHistory || []);
            setPendingRequests(data.pendingRequests || []);
        } catch { showMsg("error", "Failed to load book"); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchBook();
        api.getStudents().then((d) => setStudents(d?.students || d || [])).catch(() => {});
        api.getClasses().then((c) => setClasses(c || [])).catch(() => {});
        if (prefilledRequest) setShowIssueModal(true);
    }, [bookId]);

    if (isLoading) return <div className="p-10 text-slate-500">Loading…</div>;
    if (!book) return <div className="p-10 text-slate-500">Book not found</div>;

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
            {confirmDialog}
            <button data-testid="library-navigate-btn" onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm">
                <ArrowLeft size={16} /> Back
            </button>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            {/* Book Header */}
            <div className="bg-white rounded-2xl border p-6">
                {isEditing ? (
                    <EditBookForm
                        book={book}
                        classes={classes}
                        onCancel={() => setIsEditing(false)}
                        onSave={async (data: any) => {
                            try {
                                await api.updateLibraryBook(book.id, data);
                                showMsg("success", "Book updated");
                                setIsEditing(false);
                                fetchBook();
                            } catch (e: any) { showMsg("error", e?.response?.data?.message || "Failed to update"); }
                        }}
                    />
                ) : (
                    <>
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex gap-4">
                                <div className="w-16 h-20 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                    <BookOpen size={28} className="text-indigo-500" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{book.title}</h1>
                                    <p className="text-slate-500 mt-0.5">{book.author}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${book.isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            {book.isEnabled ? "Enabled" : "Disabled"}
                                        </span>
                                        {book.requiresApproval && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Approval Required</span>
                                        )}
                                        {book.genre && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{book.genre}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button data-testid="library-is-editing-btn" onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 border rounded-xl text-sm hover:bg-slate-50">
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button
                                    data-testid="library-delete-book-btn"
                                    onClick={() => confirm({
                                        title: "Delete this book?",
                                        message: `"${book.title}" will be permanently removed from the library. This cannot be undone.`,
                                        confirmText: "Delete",
                                        onConfirm: async () => {
                                            try {
                                                await api.deleteLibraryBook(book.id);
                                                navigate("/library");
                                            } catch (e: any) {
                                                showMsg("error", e?.response?.data?.message || "Failed to delete");
                                                throw e;
                                            }
                                        },
                                    })}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {[
                                { label: "Total Copies", value: book.totalCopies },
                                { label: "Available", value: book.availableCopies, highlight: book.availableCopies === 0 },
                                { label: "ISBN", value: book.isbn || "—" },
                                { label: "Rack", value: book.rackNumber || "—" },
                                { label: "Publisher", value: book.publisher || "—" },
                                { label: "Year", value: book.publicationYear || "—" },
                            ].map((item) => (
                                <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500">{item.label}</p>
                                    <p className={`font-semibold mt-0.5 ${(item as any).highlight ? "text-red-600" : "text-slate-800"}`}>{item.value}</p>
                                </div>
                            ))}
                        </div>
                        {book.description && <p className="text-sm text-slate-600 mt-2">{book.description}</p>}
                        {book.restrictedToClassIds?.length > 0 && (
                            <p className="text-xs text-slate-500 mt-2">
                                Class restrictions: {book.restrictedToClassIds.length} class(es)
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Issue Book button */}
            {!isEditing && book.availableCopies > 0 && (
                <button
                    onClick={() => setShowIssueModal(true)}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Users size={16} /> Issue Book to Student
                </button>
            )}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <Clock size={16} /> Pending Borrow Requests ({pendingRequests.length})
                    </h3>
                    <div className="space-y-2">
                        {pendingRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                                <div>
                                    <p className="font-medium text-sm">{req.studentName}</p>
                                    <p className="text-xs text-slate-500">{req.studentPhone} · {new Date(req.createdAt).toLocaleDateString()}</p>
                                    {req.requestNote && <p className="text-xs text-slate-600 italic mt-0.5">"{req.requestNote}"</p>}
                                </div>
                                <div className="flex gap-2">
                                    {req.status === "PENDING" && book.requiresApproval ? (
                                        <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-lg self-center">Awaiting Teacher</span>
                                    ) : (
                                        <button
                                            onClick={() => confirm({
                                                title: "Approve this request?",
                                                message: "The book will be marked as ISSUED to the student immediately.",
                                                confirmText: "Approve & Issue",
                                                onConfirm: async () => {
                                                    try {
                                                        await api.approveLibraryRequest(req.id);
                                                        showMsg("success", "Request approved and book issued");
                                                        fetchBook();
                                                    } catch (e: any) {
                                                        showMsg("error", e?.response?.data?.message || "Failed");
                                                        throw e;
                                                    }
                                                },
                                            })}
                                            className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700"
                                        >
                                            Approve & Issue
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowIssueModal(true)}
                                        className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
                                    >
                                        Issue Directly
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Issues */}
            <div className="bg-white rounded-2xl border">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2"><Users size={16} /> Active Issues ({activeIssues.length})</h3>
                </div>
                {activeIssues.length === 0 ? (
                    <p className="p-6 text-slate-400 text-sm">No active issues</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-4 text-left font-medium text-slate-600">Student</th>
                                <th className="p-4 text-left font-medium text-slate-600">Issue Date</th>
                                <th className="p-4 text-left font-medium text-slate-600">Due Date</th>
                                <th className="p-4 text-left font-medium text-slate-600">Status</th>
                                <th className="p-4 text-left font-medium text-slate-600">Fine</th>
                                <th className="p-4 text-center font-medium text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {activeIssues.map((issue) => {
                                const todayStr = new Date().toISOString().split("T")[0];
                                const isOverdue = issue.isOverdue ?? (issue.status !== "RETURNED" && issue.status !== "LOST" && (issue.status === "OVERDUE" || issue.dueDate < todayStr));
                                return (
                                    <tr key={issue.id} data-testid="library-row" data-id={issue.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <p className="font-medium">{issue.studentName}</p>
                                            <p className="text-xs text-slate-400">{issue.studentPhone}</p>
                                        </td>
                                        <td className="p-4 text-slate-600">{issue.issueDate}</td>
                                        <td className="p-4">
                                            <p className={isOverdue ? "text-red-600 font-semibold" : "text-slate-600"}>{issue.dueDate}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[issue.status] || "bg-slate-100"}`}>
                                                {issue.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">
                                            {issue.fineAmount > 0 ? `₹${issue.fineAmount}` : "—"}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => setShowReturnModal(issue)}
                                                className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700"
                                            >
                                                Mark Return
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Issue History */}
            {issueHistory.length > 0 && (
                <div className="bg-white rounded-2xl border">
                    <div className="p-4 border-b">
                        <h3 className="font-semibold flex items-center gap-2"><RotateCcw size={16} /> Return History</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="p-4 text-left font-medium text-slate-600">Student</th>
                                <th className="p-4 text-left font-medium text-slate-600">Issued</th>
                                <th className="p-4 text-left font-medium text-slate-600">Due</th>
                                <th className="p-4 text-left font-medium text-slate-600">Returned</th>
                                <th className="p-4 text-left font-medium text-slate-600">Fine</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {issueHistory.map((issue) => (
                                <tr key={issue.id} data-testid="library-row" data-id={issue.id}>
                                    <td className="p-4 font-medium">{issue.studentName}</td>
                                    <td className="p-4 text-slate-500">{issue.issueDate}</td>
                                    <td className="p-4 text-slate-500">{issue.dueDate}</td>
                                    <td className="p-4 text-slate-500">{issue.returnedDate || "—"}</td>
                                    <td className="p-4">
                                        {issue.fineAmount > 0 ? (
                                            <span className={issue.finePaid ? "text-emerald-600" : "text-red-600"}>
                                                ₹{issue.fineAmount}{issue.finePaid ? " ✓" : ""}
                                            </span>
                                        ) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Issue Modal */}
            {showIssueModal && (
                <IssueBookModal
                    book={book}
                    students={students}
                    prefilledStudent={prefilledRequest}
                    onClose={() => setShowIssueModal(false)}
                    onSuccess={(msg: string) => { showMsg("success", msg); fetchBook(); }}
                />
            )}

            {/* Return Modal */}
            {showReturnModal && (
                <ReturnBookModal
                    issue={showReturnModal}
                    onClose={() => setShowReturnModal(null)}
                    onSuccess={(msg: string) => { showMsg("success", msg); setShowReturnModal(null); fetchBook(); }}
                />
            )}
        </div>
    );
};

/* ── Issue Book Modal ────────────────────────────────────────────────────────── */
const IssueBookModal = ({ book, students, prefilledStudent, onClose, onSuccess }: any) => {
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(prefilledStudent || null);
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const filtered = students.filter((s: any) => {
        const q = studentSearch.toLowerCase();
        return (`${s.firstName} ${s.lastName}`).toLowerCase().includes(q) ||
            (s.phone || "").includes(q);
    }).slice(0, 8);

    const handleIssue = async () => {
        if (!selectedStudent) { setError("Select a student"); return; }
        setIsSubmitting(true);
        try {
            await api.issueLibraryBook({ bookId: book.id, studentId: selectedStudent.id, remarks });
            onSuccess(`Book issued to ${selectedStudent.firstName} ${selectedStudent.lastName}`);
            onClose();
        } catch (e: any) { setError(e?.response?.data?.message || "Failed to issue"); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Issue Book</h2>
                    <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
                </div>
                <p className="text-sm text-slate-600 mb-4">Issuing: <strong>{book.title}</strong></p>
                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>}

                {selectedStudent ? (
                    <div className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between mb-4">
                        <div>
                            <p className="font-semibold">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                            <p className="text-xs text-slate-500">{selectedStudent.phone}</p>
                        </div>
                        <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-red-500">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="mb-4">
                        <input
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Search student by name or phone…"
                            className="w-full border rounded-lg p-2 text-sm mb-2"
                        />
                        {studentSearch && (
                            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                                {filtered.length === 0 ? (
                                    <p className="p-3 text-sm text-slate-400">No students found</p>
                                ) : filtered.map((s: any) => (
                                    <button key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(""); }}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">
                                        {s.firstName} {s.lastName} <span className="text-slate-400">· {s.phone}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks (optional)</label>
                    <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Any notes…" />
                </div>
                <p className="text-xs text-slate-500 mb-4">Due date: <strong>{new Date(Date.now() + 21 * 86400000).toLocaleDateString()}</strong> (21 days)</p>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 border rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={handleIssue} disabled={isSubmitting || !selectedStudent}
                        className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm hover:bg-indigo-700 disabled:opacity-50">
                        {isSubmitting ? "Issuing…" : "Issue Book"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Return Book Modal ───────────────────────────────────────────────────────── */
const ReturnBookModal = ({ issue, onClose, onSuccess }: any) => {
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
            const data = await api.returnLibraryBook(issue.id, {
                remarks,
                markLost,
                overrideFine: Number.parseInt(overrideFine) || 0,
            });
            onSuccess(`Book ${markLost ? "marked as lost" : "returned"}. Fine: ₹${data.fineAmount}`);
        } catch (e: any) { setError(e?.response?.data?.message || "Failed to process return"); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Process Return</h2>
                    <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>}

                <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-1 text-sm">
                    <p><span className="text-slate-500">Student:</span> <strong>{issue.studentName}</strong></p>
                    <p><span className="text-slate-500">Issue Date:</span> {issue.issueDate}</p>
                    <p><span className="text-slate-500">Due Date:</span> <span className={diffDays > 0 ? "text-red-600 font-semibold" : ""}>{issue.dueDate}</span></p>
                    {diffDays > 0 && (
                        <p className="text-red-600 font-semibold">⚠ {diffDays} day(s) overdue</p>
                    )}
                </div>

                <div className="space-y-3 mb-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Fine Amount (₹) <span className="font-normal text-slate-400">Calculated: ₹{calculatedFine}</span>
                        </label>
                        <input type="number" min="0" value={overrideFine} onChange={(e) => setOverrideFine(e.target.value)}
                            className="w-full border rounded-lg p-2 text-sm" />
                        {calculatedFine > 0 && (
                            <p className="text-xs text-slate-400 mt-1">Fine will be added to student's monthly charges (₹3/day × {diffDays} days)</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks</label>
                        <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="Optional notes…" />
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="markLost" checked={markLost} onChange={(e) => setMarkLost(e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="markLost" className="text-sm text-red-600 font-medium">Mark as Lost (copy not restored)</label>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 border rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={handleReturn} disabled={isSubmitting}
                        className={`flex-1 text-white rounded-xl py-2 text-sm ${markLost ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                        {isSubmitting ? "Processing…" : markLost ? "Mark as Lost" : "Confirm Return"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Edit Book Form ──────────────────────────────────────────────────────────── */
const EditBookForm = ({ book, classes, onCancel, onSave }: any) => {
    const [form, setForm] = useState({
        title: book.title, author: book.author, isbn: book.isbn || "",
        publisher: book.publisher || "", publicationYear: book.publicationYear || "",
        genre: book.genre || "", description: book.description || "",
        rackNumber: book.rackNumber || "", totalCopies: book.totalCopies,
        requiresApproval: book.requiresApproval,
    });
    const [selectedClasses, setSelectedClasses] = useState<string[]>(book.restrictedToClassIds || []);
    const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold">Edit Book</h2>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1">
                        <X size={14} /> Cancel
                    </button>
                    <button onClick={() => onSave({ ...form, restrictedToClassIds: selectedClasses })}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-1">
                        <Save size={14} /> Save
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Title</label>
                    <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
                </div>
                <div><label className="text-xs font-semibold text-slate-600 block mb-1">Author</label>
                    <input value={form.author} onChange={(e) => set("author", e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600 block mb-1">ISBN</label>
                    <input value={form.isbn} onChange={(e) => set("isbn", e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600 block mb-1">Publisher</label>
                    <input value={form.publisher} onChange={(e) => set("publisher", e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600 block mb-1">Year</label>
                    <input type="number" value={form.publicationYear} onChange={(e) => set("publicationYear", e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600 block mb-1">Genre</label>
                    <select value={form.genre} onChange={(e) => set("genre", e.target.value)} className="w-full border rounded-lg p-2 text-sm">
                        <option value="">Select genre</option>
                        {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-semibold text-slate-600 block mb-1">Rack</label>
                    <input value={form.rackNumber} onChange={(e) => set("rackNumber", e.target.value)} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600 block mb-1">Total Copies</label>
                    <input type="number" min="1" value={form.totalCopies} onChange={(e) => set("totalCopies", Number.parseInt(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div className="col-span-2"><label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                    <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Class Restrictions</label>
                    <div className="flex flex-wrap gap-2">
                        {classes.map((cls: any) => (
                            <button key={cls.id} type="button"
                                onClick={() => setSelectedClasses((p) => p.includes(cls.id) ? p.filter((c) => c !== cls.id) : [...p, cls.id])}
                                className={`text-xs px-3 py-1 rounded-full border transition ${selectedClasses.includes(cls.id) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"}`}>
                                {cls.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="reqApproval" checked={form.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} />
                    <label htmlFor="reqApproval" className="text-sm">Requires approval</label>
                </div>
            </div>
        </div>
    );
};

export default BookDetailsPage;

