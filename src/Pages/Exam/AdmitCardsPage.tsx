import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Ban,
    CheckCircle2,
    Loader2,
    Plus,
    RefreshCw,
    Ticket,
    X,
} from "lucide-react";
import api from "../../api/api";
import PageHeader from "../../components/PageHeader";
import ConfirmModal from "../../components/common/ConfirmModal";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import type { AdmitCardRelease, ExamTerm, Session } from "../../api/types";

const TERMS: { value: ExamTerm; label: string }[] = [
    { value: "TERM1", label: "Term 1" },
    { value: "TERM2", label: "Term 2" },
    { value: "TERM3", label: "Term 3" },
];

const termLabel = (term: string) =>
    TERMS.find((t) => t.value === term)?.label ?? term;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const CAN_MUTATE_ROLES = ["PRINCIPAL", "DIRECTOR", "SUPER_ADMIN", "MANAGEMENT_STAFF"];

export default function AdmitCardsPage() {
    const { addToast } = useToast();
    const { role } = useAuth();
    const canMutate = CAN_MUTATE_ROLES.includes(role ?? "");

    const [releases, setReleases] = useState<AdmitCardRelease[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [showPublish, setShowPublish] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [form, setForm] = useState<{ sessionId: string; examTerm: ExamTerm; examName: string; notes: string }>({
        sessionId: "",
        examTerm: "TERM1",
        examName: "",
        notes: "",
    });

    const [revokeTarget, setRevokeTarget] = useState<AdmitCardRelease | null>(null);
    const [revoking, setRevoking] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await api.getAdmitCardReleases();
            setReleases(res?.data ?? []);
        } catch (err: any) {
            setLoadError(err?.response?.data?.message || "Failed to load admit card releases.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);
    useEffect(() => {
        api
            .getSessions()
            .then((d: any) => setSessions(Array.isArray(d) ? d : d?.sessions ?? []))
            .catch(() => setSessions([]));
    }, []);

    const sessionNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const s of sessions) map.set(s.id, s.name);
        return map;
    }, [sessions]);

    const openPublish = () => {
        setForm({
            sessionId: sessions[0]?.id ?? "",
            examTerm: "TERM1",
            examName: "",
            notes: "",
        });
        setShowPublish(true);
    };

    const handlePublish = async () => {
        if (!form.sessionId) {
            addToast("Please select a session", "error");
            return;
        }
        setPublishing(true);
        try {
            const payload: Parameters<typeof api.publishAdmitCardRelease>[0] = {
                sessionId: form.sessionId,
                examTerm: form.examTerm,
            };
            if (form.examName.trim()) payload.examName = form.examName.trim();
            if (form.notes.trim()) payload.notes = form.notes.trim();

            await api.publishAdmitCardRelease(payload);
            addToast("Admit card published", "success", "Students can now download their admit cards.");
            setShowPublish(false);
            await reload();
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 409) {
                addToast(
                    "Already published",
                    "warning",
                    "An active release already exists for this session/term. Revoke it first if you need to re-publish.",
                );
            } else if (status === 404) {
                addToast("Session not found", "error");
            } else {
                addToast("Failed to publish", "error", err?.response?.data?.message);
            }
        } finally {
            setPublishing(false);
        }
    };

    const handleRevoke = async () => {
        if (!revokeTarget) return;
        setRevoking(true);
        try {
            await api.revokeAdmitCardRelease(revokeTarget.id);
            addToast("Admit card revoked", "success", "Students can no longer download this release.");
            setRevokeTarget(null);
            await reload();
        } catch (err: any) {
            addToast("Failed to revoke", "error", err?.response?.data?.message);
        } finally {
            setRevoking(false);
        }
    };

    const active = releases.filter((r) => !r.revokedAt);
    const revoked = releases.filter((r) => r.revokedAt);

    return (
        <div className="flex flex-col min-h-full">
            <PageHeader
                icon={Ticket}
                title="Admit Cards"
                subtitle="Publish and manage admit-card releases for exams"
                gradient="from-violet-600 via-indigo-600 to-blue-600"
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={reload}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5"
                        >
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        {canMutate && (
                            <button
                                onClick={openPublish}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 shadow-sm"
                            >
                                <Plus size={13} />
                                Publish Release
                            </button>
                        )}
                    </div>
                }
            />

            <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4">
                {loadError && (
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <AlertTriangle size={16} />
                        <span className="flex-1">{loadError}</span>
                        <button onClick={reload} className="text-xs font-semibold underline hover:no-underline">
                            Retry
                        </button>
                    </div>
                )}

                {/* Active releases */}
                <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                        <CheckCircle2 size={15} className="text-emerald-500" />
                        <h2 className="text-sm font-semibold text-slate-800">Active releases</h2>
                        <span className="ml-auto text-[11px] text-slate-400 font-mono">{active.length}</span>
                    </header>

                    {loading ? (
                        <div className="py-12 flex items-center justify-center text-slate-400 text-sm gap-2">
                            <RefreshCw size={14} className="animate-spin" /> Loading…
                        </div>
                    ) : active.length === 0 ? (
                        <EmptyState
                            title="No active releases"
                            hint={canMutate ? "Click Publish Release to make admit cards available for a session and term." : "Nothing published yet."}
                        />
                    ) : (
                        <ReleaseTable
                            rows={active}
                            sessionNameById={sessionNameById}
                            canMutate={canMutate}
                            onRevoke={(r) => setRevokeTarget(r)}
                        />
                    )}
                </section>

                {/* Revoked history */}
                {revoked.length > 0 && (
                    <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                        <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                            <Ban size={15} className="text-slate-400" />
                            <h2 className="text-sm font-semibold text-slate-700">Revoked</h2>
                            <span className="ml-auto text-[11px] text-slate-400 font-mono">{revoked.length}</span>
                        </header>
                        <ReleaseTable
                            rows={revoked}
                            sessionNameById={sessionNameById}
                            canMutate={false}
                            onRevoke={() => {}}
                            muted
                        />
                    </section>
                )}
            </div>

            {/* Publish modal */}
            {showPublish && (
                <div
                    className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4"
                    onClick={publishing ? undefined : () => setShowPublish(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Publish admit card release</h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Students of the selected session can download their admit cards once published.
                                    Students with outstanding fees will be blocked automatically.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPublish(false)}
                                disabled={publishing}
                                className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Session *</label>
                                <select
                                    value={form.sessionId}
                                    onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="">Select session…</option>
                                    {sessions.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Exam term *</label>
                                <div className="flex gap-2">
                                    {TERMS.map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, examTerm: t.value }))}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                                form.examTerm === t.value
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Exam name <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.examName}
                                    placeholder="e.g. Mid-Term Examination"
                                    maxLength={128}
                                    onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Leave blank to cover all exams in the selected term.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Notes <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={form.notes}
                                    placeholder="Shown to students on their admit-card list"
                                    maxLength={500}
                                    rows={2}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowPublish(false)}
                                disabled={publishing}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={publishing || !form.sessionId}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
                            >
                                {publishing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Publishing…
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={14} /> Publish
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revoke confirmation */}
            {revokeTarget && (
                <ConfirmModal
                    title="Revoke admit card release?"
                    message="Students will no longer be able to download the admit card for this session/term. You can publish a new release anytime."
                    confirmText="Revoke"
                    loading={revoking}
                    onConfirm={handleRevoke}
                    onCancel={() => (revoking ? null : setRevokeTarget(null))}
                >
                    <div className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-mono text-slate-700">
                        {sessionNameById.get(revokeTarget.sessionId) ?? revokeTarget.sessionId}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {termLabel(revokeTarget.examTerm)}
                        {revokeTarget.examName && (
                            <>
                                <span className="mx-1.5 text-slate-300">·</span>
                                {revokeTarget.examName}
                            </>
                        )}
                    </div>
                </ConfirmModal>
            )}
        </div>
    );
}

const EmptyState = ({ title, hint }: { title: string; hint: string }) => (
    <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
        <Ticket size={30} className="text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="text-xs text-slate-400 max-w-sm">{hint}</p>
    </div>
);

const ReleaseTable = ({
    rows,
    sessionNameById,
    canMutate,
    onRevoke,
    muted = false,
}: {
    rows: AdmitCardRelease[];
    sessionNameById: Map<string, string>;
    canMutate: boolean;
    onRevoke: (r: AdmitCardRelease) => void;
    muted?: boolean;
}) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                    {["Session", "Term", "Exam Name", "Published", "Revoked", "Notes", ""].map((h) => (
                        <th
                            key={h}
                            className="px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                    <tr
                        key={r.id}
                        className={`hover:bg-slate-50 transition ${muted ? "opacity-70" : ""}`}
                    >
                        <td className="px-3 py-3 font-medium text-slate-800">
                            {sessionNameById.get(r.sessionId) ?? <span className="font-mono text-xs text-slate-400">{r.sessionId.slice(0, 8)}</span>}
                        </td>
                        <td className="px-3 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100">
                                {termLabel(r.examTerm)}
                            </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{r.examName || <span className="text-slate-300">— All —</span>}</td>
                        <td className="px-3 py-3 text-[11px] text-slate-500 whitespace-nowrap">{formatDate(r.publishedAt)}</td>
                        <td className="px-3 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                            {r.revokedAt ? formatDate(r.revokedAt) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-500 max-w-[280px] truncate" title={r.notes ?? ""}>
                            {r.notes || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                            {canMutate && !r.revokedAt && (
                                <button
                                    onClick={() => onRevoke(r)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg"
                                >
                                    <Ban size={11} /> Revoke
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
