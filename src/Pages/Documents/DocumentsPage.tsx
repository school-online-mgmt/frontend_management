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

/* ── Issue / publish modal ─────────────────────────────────────────────────── */
const IssueModal = ({ cert, onClose, onDone }: { cert: any; onClose: () => void; onDone: () => void }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [fields, setFields] = useState<any[]>([]);
    const [values, setValues] = useState<Record<string, any>>({});
    const [prefill, setPrefill] = useState<any>(null);
    const [expiryDate, setExpiryDate] = useState("");
    const [infinityDate, setInfinityDate] = useState("2100-12-31");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getCertificatePrefill(cert.id).then(r => {
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
            await api.publishCertificate(cert.id, { fields: values, expiryDate });
            addToast("Certificate published.", "success");
            onDone();
        } catch (e: any) { setError(e?.response?.data?.message ?? "Failed to publish."); setSaving(false); }
    };

    const s = prefill?.student;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div><h3 className="text-sm font-bold text-slate-800">Issue {humanType(cert.certType)}</h3>
                        <p className="text-[11px] text-slate-500">{cert.firstName} {cert.lastName}</p></div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={16} /></button>
                </div>
                {loading ? <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-400" /></div> : (
                    <div className="p-5 space-y-3.5 overflow-y-auto">
                        {/* Auto-populated summary */}
                        {s && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                                <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Auto-filled from records</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                    <span>Name: <b>{s.fullName}</b></span>
                                    {s.admissionId && <span>Adm: <b>{s.admissionId}</b></span>}
                                    {s.className && <span>Class: <b>{s.className}{s.sectionName ? `-${s.sectionName}` : ""}</b></span>}
                                    {s.sessionName && <span>Session: <b>{s.sessionName}</b></span>}
                                </div>
                            </div>
                        )}
                        {cert.requestNote && <p className="text-[11px] text-slate-500 italic">Student note: "{cert.requestNote}"</p>}

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
                                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                <button type="button" onClick={() => setExpiryDate(infinityDate)}
                                    className="px-3 py-2 text-[11px] font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 whitespace-nowrap">No expiry</button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Defaults to the current session end. "No expiry" sets it to 31 Dec 2100.</p>
                        </div>

                        {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700"><AlertTriangle size={13} className="shrink-0" />{error}</div>}
                    </div>
                )}
                <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button onClick={publish} disabled={saving || loading} className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5">
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
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason…" className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
                <div className="flex justify-end gap-2 mt-3">
                    <button onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button onClick={() => reason.trim().length >= 3 && onConfirm(reason.trim())} disabled={reason.trim().length < 3}
                        className="px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50">Reject</button>
                </div>
            </div>
        </div>
    );
};

/* ── Main page ─────────────────────────────────────────────────────────────── */
const DocumentsPage = () => {
    const { addToast } = useToast();
    const [tab, setTab] = useState<"certificates" | "uploads">("certificates");
    const [certs, setCerts] = useState<any[]>([]);
    const [uploads, setUploads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState<any>(null);
    const [rejecting, setRejecting] = useState<{ kind: "cert" | "upload"; id: string } | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        Promise.allSettled([api.getCertificates(), api.getStudentUploads()])
            .then(([c, u]) => {
                setCerts(c.status === "fulfilled" ? c.value.certificates ?? [] : []);
                setUploads(u.status === "fulfilled" ? u.value.uploads ?? [] : []);
            }).finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    const download = async (id: string) => {
        try { const r = await api.downloadCertificate(id); openUrl(r.url); }
        catch (e: any) { addToast(e?.response?.data?.message ?? "Download failed", "error"); }
    };
    const viewUpload = async (id: string) => {
        try { const r = await api.viewStudentUpload(id); openUrl(r.url); }
        catch (e: any) { addToast(e?.response?.data?.message ?? "Failed", "error"); }
    };
    const verify = async (id: string) => {
        try { await api.verifyStudentUpload(id, "VERIFY"); addToast("Document verified.", "success"); load(); }
        catch (e: any) { addToast(e?.response?.data?.message ?? "Failed", "error"); }
    };
    const doReject = async (reason: string) => {
        if (!rejecting) return;
        try {
            if (rejecting.kind === "cert") await api.rejectCertificate(rejecting.id, reason);
            else await api.verifyStudentUpload(rejecting.id, "REJECT", reason);
            addToast("Rejected.", "success"); setRejecting(null); load();
        } catch (e: any) { addToast(e?.response?.data?.message ?? "Failed", "error"); }
    };

    const pendingCerts = certs.filter(c => c.status === "REQUESTED").length;
    const pendingDocs = uploads.filter(u => u.status === "PENDING").length;

    return (
        <div className="min-h-full bg-slate-50">
            {issuing && <IssueModal cert={issuing} onClose={() => setIssuing(null)} onDone={() => { setIssuing(null); load(); }} />}
            {rejecting && <RejectModal title={rejecting.kind === "cert" ? "Reject request" : "Reject document"} onClose={() => setRejecting(null)} onConfirm={doReject} />}

            <PageHeader icon={FileText} title="Documents & Certificates" gradient={MODULE_THEMES.people}
                subtitle="Issue school certificates and verify student-uploaded documents." onRefresh={load} refreshing={loading} />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">
                {/* Tabs */}
                <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button onClick={() => setTab("certificates")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "certificates" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                        Certificates {pendingCerts > 0 && <span className="ml-1 text-[10px] bg-amber-400 text-amber-900 px-1.5 rounded-full">{pendingCerts}</span>}
                    </button>
                    <button onClick={() => setTab("uploads")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "uploads" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                        Document Verification {pendingDocs > 0 && <span className="ml-1 text-[10px] bg-amber-400 text-amber-900 px-1.5 rounded-full">{pendingDocs}</span>}
                    </button>
                </div>

                {loading ? <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
                : tab === "certificates" ? (
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
                                            <p className="text-[11px] text-slate-500 truncate">{c.firstName} {c.lastName}{c.certificateNumber && ` · ${c.certificateNumber}`}{c.expiryDate && c.status === "PUBLISHED" && ` · exp ${c.expiryDate}`}</p>
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
                    uploads.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">No student documents uploaded yet.</div>
                    : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                            {uploads.map(u => {
                                const st = DOC_STATUS[u.status] ?? DOC_STATUS.PENDING;
                                return (
                                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70">
                                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0"><ShieldCheck size={15} className="text-violet-500" /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{u.customTitle || humanType(u.docType)}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{u.firstName} {u.lastName}{u.fileName && ` · ${u.fileName}`}</p>
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
