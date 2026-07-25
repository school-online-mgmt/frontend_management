import { useState, useEffect, useCallback } from "react";
import {
    FileText, Loader2, X, CheckCircle2, AlertTriangle, ShieldCheck,
    Download, Eye, FileCheck2, FileClock, Send,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";

const CERT_STATUS: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    REQUESTED: { bg: "bg-amber-50", text: "text-amber-700", label: "Requested", icon: FileClock },
    PUBLISHED: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Published", icon: FileCheck2 },
    REJECTED:  { bg: "bg-rose-50", text: "text-rose-700", label: "Rejected", icon: X },
};
const DOC_STATUS: Record<string, { bg: string; text: string; label: string }> = {
    PENDING:  { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
    VERIFIED: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Verified" },
    REJECTED: { bg: "bg-rose-50", text: "text-rose-700", label: "Rejected" },
};
const humanType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const openUrl = (url: string) => window.open(url, "_blank", "noopener");

type Subject = "students" | "teachers";
// The name to show for a certificate/upload row, whichever subject it is.
const rowName = (r: any): string => r.teacherName ?? [r.firstName, r.lastName].filter(Boolean).join(" ");

// Maps the active subject to its API method set so the page/modals stay generic.
const docApi = (subject: Subject) => subject === "teachers" ? {
    getCertificates: api.getTeacherCertificates,
    getPrefill: api.getTeacherCertificatePrefill,
    publish: api.publishTeacherCertificate,
    rejectCert: api.rejectTeacherCertificate,
    download: api.downloadTeacherCertificate,
    getUploads: api.getTeacherUploads,
    viewUpload: api.viewTeacherUpload,
    verifyUpload: api.verifyTeacherUpload,
} : {
    getCertificates: api.getCertificates,
    getPrefill: api.getCertificatePrefill,
    publish: api.publishCertificate,
    rejectCert: api.rejectCertificate,
    download: api.downloadCertificate,
    getUploads: api.getStudentUploads,
    viewUpload: api.viewStudentUpload,
    verifyUpload: api.verifyStudentUpload,
};

/* ── Issue / publish modal ─────────────────────────────────────────────────── */
const IssueModal = ({ cert, subject, onClose, onDone }: { cert: any; subject: Subject; onClose: () => void; onDone: () => void }) => {
    const { addToast } = useToast();
    const A = docApi(subject);
    const [loading, setLoading] = useState(true);
    const [fields, setFields] = useState<any[]>([]);
    const [values, setValues] = useState<Record<string, any>>({});
    const [prefill, setPrefill] = useState<any>(null);
    const [expiryDate, setExpiryDate] = useState("");
    const [infinityDate, setInfinityDate] = useState("2100-12-31");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        A.getPrefill(cert.id).then(r => {
            setFields(r.fields ?? []);
            setPrefill(r.prefill);
            setExpiryDate(r.defaultExpiryDate);
            setInfinityDate(r.infinityDate);
            const init: Record<string, any> = {};
            (r.fields ?? []).forEach((f: any) => { if (f.default) init[f.name] = f.default; });
            setValues(init);
        }).catch(() => setError("Failed to load form")).finally(() => setLoading(false));
    }, [cert.id]);

    const publish = async () => {
        for (const f of fields) if (f.required && !values[f.name] && values[f.name] !== 0) { setError(`"${f.label}" is required.`); return; }
        if (!expiryDate) { setError("Expiry date is required."); return; }
        setSaving(true); setError("");
        try {
            await A.publish(cert.id, { fields: values, expiryDate });
            addToast("Certificate published.", "success");
            onDone();
        } catch (e: any) { setError(e?.response?.data?.message ?? "Failed to publish."); setSaving(false); }
    };

    // Auto-fill summary: students carry a `student`, teachers a `teacher`.
    const s = prefill?.student;
    const tch = prefill?.teacher;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div><h3 className="text-sm font-bold text-slate-800">Issue {humanType(cert.certType)}</h3>
                        <p className="text-[11px] text-slate-500">{rowName(cert)}</p></div>
                    <button data-testid="documents-close-btn" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={16} /></button>
                </div>
                {loading ? <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-400" /></div> : (
                    <div className="p-5 space-y-3.5 overflow-y-auto">
                        {/* Auto-populated summary */}
                        {(s || tch) && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                                <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Auto-filled from records</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                    <span>Name: <b>{(s ?? tch).fullName}</b></span>
                                    {s?.admissionId && <span>Adm: <b>{s.admissionId}</b></span>}
                                    {s?.className && <span>Class: <b>{s.className}{s.sectionName ? `-${s.sectionName}` : ""}</b></span>}
                                    {s?.sessionName && <span>Session: <b>{s.sessionName}</b></span>}
                                    {tch?.qualification && <span>Qualification: <b>{tch.qualification}</b></span>}
                                </div>
                            </div>
                        )}
                        {cert.requestNote && <p className="text-[11px] text-slate-500 italic">Note: "{cert.requestNote}"</p>}

                        {fields.map(f => (
                            <div key={f.name}>
                                <label className="text-xs font-semibold text-slate-600">{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
                                {f.type === "textarea" ? (
                                    <textarea rows={2} value={values[f.name] ?? ""} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} placeholder={f.placeholder}
                                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
                                ) : f.type === "select" ? (
                                    <select value={values[f.name] ?? ""} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                                        <option value="">— Select —</option>
                                        {(f.options ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                                        value={values[f.name] ?? ""} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} placeholder={f.placeholder}
                                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                )}
                            </div>
                        ))}

                        {/* Expiry */}
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Expiry date <span className="text-rose-500">*</span></label>
                            <div className="flex items-center gap-2 mt-1">
                                <input data-testid="documents-expiry-date-input" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                <button data-testid="documents-expiry-date-btn" type="button" onClick={() => setExpiryDate(infinityDate)}
                                    className="px-3 py-2 text-[11px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 whitespace-nowrap">No expiry</button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Defaults to the current session end. "No expiry" sets it to 31 Dec 2100.</p>
                        </div>

                        {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700"><AlertTriangle size={13} className="shrink-0" />{error}</div>}
                    </div>
                )}
                <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                    <button data-testid="documents-close-btn-2" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button data-testid="documents-publish-btn" onClick={publish} disabled={saving || loading} className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Publish PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Reject modal (shared) ─────────────────────────────────────────────────── */
const RejectModal = ({ title, onClose, onConfirm }: { title: string; onClose: () => void; onConfirm: (reason: string) => void }) => {
    const [reason, setReason] = useState("");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-500 mt-1">Provide a reason (shown to the student).</p>
                <textarea data-testid="documents-reason-input" value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason…" className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
                <div className="flex justify-end gap-2 mt-3">
                    <button data-testid="documents-close-btn-3" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button onClick={() => reason.trim().length >= 3 && onConfirm(reason.trim())} disabled={reason.trim().length < 3}
                        className="px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50">Reject</button>
                </div>
            </div>
        </div>
    );
};

/* ── Main page ─────────────────────────────────────────────────────────────── */
/* ── Board / UDISE+ returns (P0-SAF-08) ─────────────────────────────────── */
function BoardReturnsPanel() {
    const { addToast } = useToast();
    const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);
    const [sessionId, setSessionId] = useState("");
    const [data, setData] = useState<Awaited<ReturnType<typeof api.getBoardReturns>> | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.getSessions().then((s: any) => {
            const list = Array.isArray(s) ? s : (s?.sessions ?? []);
            setSessions(list);
            if (list[0]) setSessionId(list[0].id);
        }).catch(() => {});
    }, []);
    useEffect(() => {
        if (!sessionId) { setData(null); return; }
        setLoading(true);
        api.getBoardReturns(sessionId).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
    }, [sessionId]);

    const download = async () => {
        setBusy(true);
        try { await api.downloadBoardReturns(sessionId, data?.sessionName ?? "session"); }
        catch (e: any) { addToast(e?.response?.data?.message ?? "Download failed", "error"); }
        finally { setBusy(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" data-testid="documents-board-returns">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Board / UDISE+ return</h3>
                    <p className="text-[11px] text-slate-400">Class-wise enrolment + staff summary for annual filing. Downloads as CSV.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={sessionId} onChange={e => setSessionId(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button data-testid="board-returns-download" onClick={download} disabled={busy || !data}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} CSV
                    </button>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-14"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
            : !data ? <div className="py-14 text-center text-slate-400 text-sm">No data for this session.</div>
            : (
                <div className="p-4 space-y-4">
                    <div className="text-[11px] text-slate-500">
                        {data.school.name}{data.school.udiseCode ? ` · UDISE ${data.school.udiseCode}` : ""}{data.school.affiliationNumber ? ` · Aff. ${data.school.affiliationNumber}` : ""}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-3 py-2">Class</th><th className="px-3 py-2 text-right">Boys</th><th className="px-3 py-2 text-right">Girls</th>
                                    <th className="px-3 py-2 text-right">Other</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">CWSN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.enrolment.classes.map(c => (
                                    <tr key={c.classId} className="hover:bg-slate-50/60">
                                        <td className="px-3 py-2 text-slate-700">{c.className}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{c.male}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{c.female}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{c.other}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{c.total}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{c.cwsn}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-semibold">
                                    <td className="px-3 py-2">Total</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{data.enrolment.totals.male}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{data.enrolment.totals.female}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{data.enrolment.totals.other}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{data.enrolment.totals.total}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{data.enrolment.totals.cwsn}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="text-xs text-slate-600">
                        <span className="font-semibold">Teaching staff:</span> {data.staff.total} total · {data.staff.male} male · {data.staff.female} female{data.staff.other ? ` · ${data.staff.other} other` : ""}
                    </div>
                </div>
            )}
        </div>
    );
}

const DocumentsPage = () => {
    const { addToast } = useToast();
    const [subject, setSubject] = useState<Subject>("students");
    const [tab, setTab] = useState<"certificates" | "uploads" | "tc-register" | "board-returns">("certificates");
    const [certs, setCerts] = useState<any[]>([]);
    const [uploads, setUploads] = useState<any[]>([]);
    const [tcRegister, setTcRegister] = useState<Awaited<ReturnType<typeof api.getTcRegister>>["entries"]>([]);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState<any>(null);
    const [rejecting, setRejecting] = useState<{ kind: "cert" | "upload"; id: string } | null>(null);
    const A = docApi(subject);

    const load = useCallback(() => {
        setLoading(true);
        const api2 = docApi(subject);
        // TC register is a student-only, tenant-wide serial log (not per subject).
        Promise.allSettled([api2.getCertificates(), api2.getUploads(), subject === "students" ? api.getTcRegister() : Promise.resolve({ total: 0, entries: [] })])
            .then(([c, u, tc]) => {
                setCerts(c.status === "fulfilled" ? c.value.certificates ?? [] : []);
                setUploads(u.status === "fulfilled" ? u.value.uploads ?? [] : []);
                setTcRegister(tc.status === "fulfilled" ? (tc.value as any).entries ?? [] : []);
            }).finally(() => setLoading(false));
    }, [subject]);
    useEffect(() => { load(); }, [load]);
    // TC register + board returns are student-only; snap back when on teachers.
    useEffect(() => { if (subject === "teachers" && (tab === "tc-register" || tab === "board-returns")) setTab("certificates"); }, [subject, tab]);

    const download = async (id: string) => {
        try { const r = await A.download(id); openUrl(r.url); }
        catch (e: any) { addToast(e?.response?.data?.message ?? "Download failed", "error"); }
    };
    const viewUpload = async (id: string) => {
        try { const r = await A.viewUpload(id); openUrl(r.url); }
        catch (e: any) { addToast(e?.response?.data?.message ?? "Failed", "error"); }
    };
    const verify = async (id: string) => {
        try { await A.verifyUpload(id, "VERIFY"); addToast("Document verified.", "success"); load(); }
        catch (e: any) { addToast(e?.response?.data?.message ?? "Failed", "error"); }
    };
    const doReject = async (reason: string) => {
        if (!rejecting) return;
        try {
            if (rejecting.kind === "cert") await A.rejectCert(rejecting.id, reason);
            else await A.verifyUpload(rejecting.id, "REJECT", reason);
            addToast("Rejected.", "success"); setRejecting(null); load();
        } catch (e: any) { addToast(e?.response?.data?.message ?? "Failed", "error"); }
    };

    const pendingCerts = certs.filter(c => c.status === "REQUESTED").length;
    const pendingDocs = uploads.filter(u => u.status === "PENDING").length;

    return (
        <div className="min-h-full bg-slate-50">
            {issuing && <IssueModal cert={issuing} subject={subject} onClose={() => setIssuing(null)} onDone={() => { setIssuing(null); load(); }} />}
            {rejecting && <RejectModal title={rejecting.kind === "cert" ? "Reject request" : "Reject document"} onClose={() => setRejecting(null)} onConfirm={doReject} />}

            <PageHeader icon={FileText} title="Documents & Certificates" gradient={MODULE_THEMES.people}
                subtitle="Issue certificates and verify uploaded documents for students and teachers." onRefresh={load} refreshing={loading} />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">
                {/* Subject switch — students vs teachers */}
                <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button onClick={() => setSubject("students")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${subject === "students" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700"}`}>Students</button>
                    <button onClick={() => setSubject("teachers")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${subject === "teachers" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700"}`}>Teachers</button>
                </div>

                {/* Tabs */}
                <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm ml-2">
                    <button onClick={() => setTab("certificates")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "certificates" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                        Certificates {pendingCerts > 0 && <span className="ml-1 text-[10px] bg-amber-400 text-amber-900 px-1.5 rounded-full">{pendingCerts}</span>}
                    </button>
                    <button onClick={() => setTab("uploads")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "uploads" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                        Document Verification {pendingDocs > 0 && <span className="ml-1 text-[10px] bg-amber-400 text-amber-900 px-1.5 rounded-full">{pendingDocs}</span>}
                    </button>
                    {subject === "students" && (
                        <button data-testid="documents-tc-register-tab" onClick={() => setTab("tc-register")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "tc-register" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                            TC Register {tcRegister.length > 0 && <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1.5 rounded-full">{tcRegister.length}</span>}
                        </button>
                    )}
                    {subject === "students" && (
                        <button data-testid="documents-board-returns-tab" onClick={() => setTab("board-returns")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "board-returns" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                            Board Returns
                        </button>
                    )}
                </div>

                {loading ? <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
                : tab === "board-returns" ? (
                    <BoardReturnsPanel />
                ) : tab === "tc-register" ? (
                    tcRegister.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">No Transfer Certificates issued yet.</div>
                    : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" data-testid="documents-tc-register">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">Transfer Certificate register</h3>
                                <span className="text-[11px] text-slate-400">{tcRegister.length} issued · serial order</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                            <th className="px-4 py-2.5">Serial No.</th>
                                            <th className="px-4 py-2.5">Student</th>
                                            <th className="px-4 py-2.5">Issue date</th>
                                            <th className="px-4 py-2.5 text-right">Certificate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {tcRegister.map(t => (
                                            <tr key={t.id} data-testid="documents-tc-row" data-serial={t.serialNo ?? ""} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-slate-700">{t.serialNo ?? "—"}</td>
                                                <td className="px-4 py-2.5 text-slate-700">{t.studentName || "—"}</td>
                                                <td className="px-4 py-2.5 tabular-nums text-slate-500">{t.issueDate ?? "—"}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <button onClick={() => download(t.id)} className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1"><Download size={11} /> PDF</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : tab === "certificates" ? (
                    certs.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">No certificate requests yet.</div>
                    : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                            {certs.map(c => {
                                const st = CERT_STATUS[c.status] ?? CERT_STATUS.REQUESTED;
                                const StIcon = st.icon;
                                return (
                                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><FileText size={15} className="text-indigo-500" /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{humanType(c.certType)}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{rowName(c)}{c.certificateNumber && ` · ${c.certificateNumber}`}{c.expiryDate && c.status === "PUBLISHED" && ` · exp ${c.expiryDate}`}</p>
                                            {c.status === "REJECTED" && c.rejectedReason && <p className="text-[11px] text-rose-600">Rejected: {c.rejectedReason}</p>}
                                        </div>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text} shrink-0`}><StIcon size={10} /> {st.label}</span>
                                        <div className="flex gap-1.5 shrink-0">
                                            {c.status === "REQUESTED" && <>
                                                <button onClick={() => setIssuing(c)} className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Issue</button>
                                                <button onClick={() => setRejecting({ kind: "cert", id: c.id })} className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50">Reject</button>
                                            </>}
                                            {c.status === "PUBLISHED" && <button onClick={() => download(c.id)} className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1"><Download size={11} /> PDF</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    uploads.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">No {subject === "teachers" ? "teacher" : "student"} documents uploaded yet.</div>
                    : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                            {uploads.map(u => {
                                const st = DOC_STATUS[u.status] ?? DOC_STATUS.PENDING;
                                return (
                                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70">
                                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0"><ShieldCheck size={15} className="text-violet-500" /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{u.customTitle || humanType(u.docType)}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{rowName(u)}{u.fileName && ` · ${u.fileName}`}</p>
                                            {u.status === "REJECTED" && u.rejectedReason && <p className="text-[11px] text-rose-600">Rejected: {u.rejectedReason}</p>}
                                        </div>
                                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text} shrink-0`}>{st.label}</span>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button onClick={() => viewUpload(u.id)} className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1"><Eye size={11} /> View</button>
                                            {u.status !== "VERIFIED" && <button onClick={() => verify(u.id)} className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 inline-flex items-center gap-1"><CheckCircle2 size={11} /> Verify</button>}
                                            {u.status !== "REJECTED" && <button onClick={() => setRejecting({ kind: "upload", id: u.id })} className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50">Reject</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default DocumentsPage;
