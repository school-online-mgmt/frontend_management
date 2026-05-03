import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, Plus, Edit2, Trash2, X, CheckCircle2,
  AlertTriangle, Loader2, ChevronRight, Clock, RefreshCw,
  BookOpen, Info, GraduationCap, Hourglass, RotateCcw, Lock, Users,
  ArrowLeft, Save, Hash, ShieldCheck,
} from "lucide-react";
import api from "../../api/api";
import PageHeader from "../../components/PageHeader";

/* ── Types ───────────────────────────────────────────────────────────────── */
type LifecycleStatus = "ACTIVE" | "ENDING" | "ENDED";

interface AcademicSession {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  tenantId: string;
  status: LifecycleStatus;
  endInitiatedAt: string | null;
  endedAt: string | null;
  createdAt?: string;
}

type SessionStatus = "active" | "upcoming" | "expired" | "ending" | "ended";

function getStatus(session: AcademicSession): SessionStatus {
  if (session.status === "ENDED") return "ended";
  if (session.status === "ENDING") return "ending";
  const now = new Date();
  const start = new Date(session.startDate);
  const end = new Date(session.endDate);
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; bg: string; text: string; dot: string }> = {
  active:   { label: "Active",       bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  upcoming: { label: "Upcoming",     bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  expired:  { label: "Expired",      bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-400"   },
  ending:   { label: "Ending",       bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-500"   },
  ended:    { label: "Ended",        bg: "bg-slate-200",   text: "text-slate-600",   dot: "bg-slate-500"   },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function durationLabel(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const months = Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
  return months >= 12 ? `${Math.floor(months / 12)}yr ${months % 12}mo` : `${months} months`;
}

function toInputDate(iso: string) {
  return iso.split("T")[0];
}

/* ── Confirm Delete Dialog ───────────────────────────────────────────────── */
const DeleteConfirmDialog: React.FC<{
  sessionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ sessionName, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trash2 size={24} className="text-red-600" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">Delete Session?</h3>
      <p className="text-sm text-slate-500 mb-5">
        <span className="font-semibold text-slate-700">"{sessionName}"</span> will be permanently deleted.
        All courses, exams, and attendance linked to this session may be affected.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

/* ── Session Form Modal ───────────────────────────────────────────────────── */
interface FormState {
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormState = { name: "", slug: "", startDate: "", endDate: "" };

const SessionFormModal: React.FC<{
  mode: "create" | "edit";
  initial?: FormState;
  onClose: () => void;
  onSave: (data: FormState) => Promise<void>;
}> = ({ mode, initial = EMPTY_FORM, onClose, onSave }) => {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleNameChange = (v: string) => {
    set("name", v);
    if (mode === "create") {
      set("slug", v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  // Auto-suggest academic year date range when slug looks like "YYYY-YY"
  useEffect(() => {
    if (mode !== "create") return;
    const m = form.name.match(/^(\d{4})[–\-\/](\d{2,4})$/);
    if (m && !form.startDate) {
      const yr = parseInt(m[1]);
      set("startDate", `${yr}-04-01`);
      set("endDate", `${yr + 1}-03-31`);
    }
  }, [form.name]);

  const validate = (): string | null => {
    if (!form.name.trim()) return "Session name is required.";
    if (!form.slug.trim() || form.slug.length < 4) return "Slug must be at least 4 characters.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return "Slug must be lowercase letters, numbers and hyphens only.";
    if (!form.startDate) return "Start date is required.";
    if (!form.endDate) return "End date is required.";
    if (new Date(form.endDate) <= new Date(form.startDate)) return "End date must be after start date.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError("");
    try {
      await onSave(form);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to save session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isCreate = mode === "create";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${isCreate ? "bg-gradient-to-r from-indigo-600 to-violet-600" : "bg-gradient-to-r from-amber-500 to-orange-500"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              {isCreate ? <Plus size={18} className="text-white" /> : <Edit2 size={18} className="text-white" />}
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">{isCreate ? "New Academic Session" : "Edit Session"}</h2>
              <p className="text-white/70 text-xs">{isCreate ? "Define the academic year date range" : "Update session details"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info banner for create */}
          {isCreate && (
            <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-3">
              <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-700">
                Enter the academic year name (e.g. <strong>2025-26</strong>) — start &amp; end dates will auto-fill for a typical April–March year.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Session Name <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="session-name-input"
              type="text"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. 2025-26 or Academic Year 2025–2026"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 placeholder-slate-400 transition"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="session-slug-input"
              type="text"
              value={form.slug}
              onChange={e => set("slug", e.target.value)}
              placeholder="e.g. 2025-26"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 placeholder-slate-400 transition"
            />
            <p className="text-[10px] text-slate-400 mt-1">Lowercase letters, numbers and hyphens only. Min 4 characters.</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                data-testid="session-start-date-input"
                type="date"
                value={form.startDate}
                onChange={e => set("startDate", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                data-testid="session-end-date-input"
                type="date"
                value={form.endDate}
                onChange={e => set("endDate", e.target.value)}
                min={form.startDate || undefined}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50 transition"
              />
            </div>
          </div>

          {/* Duration preview */}
          {form.startDate && form.endDate && new Date(form.endDate) > new Date(form.startDate) && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
              <Clock size={13} className="text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700">
                Duration: <strong>{durationLabel(form.startDate + "T00:00:00", form.endDate + "T00:00:00")}</strong>
                &nbsp;·&nbsp;{fmtDate(form.startDate + "T00:00:00")} → {fmtDate(form.endDate + "T00:00:00")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              data-testid="session-submit-btn"
              disabled={saving}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition disabled:opacity-50 flex items-center justify-center gap-2
                ${isCreate ? "bg-indigo-600 hover:bg-indigo-700" : "bg-amber-500 hover:bg-amber-600"}`}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : isCreate ? <Plus size={15} /> : <CheckCircle2 size={15} />}
              {saving ? (isCreate ? "Creating…" : "Saving…") : (isCreate ? "Create Session" : "Save Changes")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Section Review Subview (per-section student grid) ──────────────────── */
const SectionReviewView: React.FC<{
  sessionId: string;
  sectionId: string;
  onBack: () => void;
  onAcknowledge: () => void | Promise<void>;
  showToast: (m: string, t: "success" | "error") => void;
}> = ({ sessionId, sectionId, onBack, onAcknowledge, showToast }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getEndSessionSectionDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Map<string, { decision: "PROMOTE" | "HOLD_BACK" | "PENDING"; note: string }>>(new Map());
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getEndSessionSectionDetail(sessionId, sectionId);
      setData(d);
      setEdits(new Map());
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to load section.", "error");
    } finally { setLoading(false); }
  }, [sessionId, sectionId, showToast]);

  useEffect(() => { load(); }, [load]);

  const setRow = (academicId: string, decision: "PROMOTE" | "HOLD_BACK" | "PENDING", note?: string) => {
    setEdits(prev => {
      const next = new Map(prev);
      const orig = data?.students.find(s => s.academicId === academicId);
      const cur  = next.get(academicId) ?? { decision: orig?.promotionStatus ?? "PENDING", note: orig?.decisionNote ?? "" };
      const newVal = { decision, note: note ?? cur.note };
      // If both decision + note match the persisted row, drop the edit.
      if (orig && orig.promotionStatus === newVal.decision && (orig.decisionNote ?? "") === (newVal.note ?? "")) {
        next.delete(academicId);
      } else {
        next.set(academicId, newVal);
      }
      return next;
    });
  };

  const setRowNote = (academicId: string, note: string) => {
    const orig = data?.students.find(s => s.academicId === academicId);
    const cur  = edits.get(academicId);
    setRow(academicId, cur?.decision ?? orig?.promotionStatus ?? "PENDING", note);
  };

  const dirtyCount = edits.size;
  const pendingCount = (data?.students ?? []).filter(s => {
    const e = edits.get(s.academicId);
    const dec = e?.decision ?? s.promotionStatus;
    return dec === "PENDING";
  }).length;

  const save = async () => {
    if (dirtyCount === 0) return;
    setSaving(true);
    try {
      const updates = Array.from(edits.entries()).map(([academicId, v]) => ({
        academicId,
        decision: v.decision,
        note: v.note?.trim() ? v.note.trim() : undefined,
      }));
      await api.bulkUpdateSectionDecisions(sessionId, sectionId, { updates });
      showToast(`Saved ${updates.length} decision${updates.length === 1 ? "" : "s"}.`, "success");
      setSavedOnce(true);
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to save.", "error");
    } finally { setSaving(false); }
  };

  const acknowledge = async () => {
    if (dirtyCount > 0) {
      if (!confirm("You have unsaved changes. Discard them and acknowledge?")) return;
    }
    if (pendingCount > 0) {
      showToast(`Cannot acknowledge: ${pendingCount} student${pendingCount === 1 ? " is" : "s are"} still pending.`, "error");
      return;
    }
    await onAcknowledge();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-4xl sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 shrink-0">
          <button onClick={onBack} aria-label="Back" className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/15">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm truncate">
              {data?.section.className ?? "—"}{data?.section.name ? ` · ${data.section.name}` : ""}
            </p>
            {data?.section.teacherName && <p className="text-white/80 text-[11px] truncate">Section incharge: {data.section.teacherName}</p>}
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white text-[10px] font-bold">
            <Users size={10} /> {data?.students.length ?? 0}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading || !data ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          ) : data.students.length === 0 ? (
            <div className="text-center py-12">
              <Info size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No students with decisions in this section.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Student</th>
                    <th className="px-3 py-2 font-semibold hidden sm:table-cell">Decided by</th>
                    <th className="px-3 py-2 font-semibold">Decision</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map(s => {
                    const edit = edits.get(s.academicId);
                    const decision = edit?.decision ?? s.promotionStatus;
                    const note = edit?.note ?? s.decisionNote ?? "";
                    const isDirty = !!edit;
                    const cfg = DECISION_CFG[decision];
                    return (
                      <tr key={s.academicId} className={isDirty ? "bg-amber-50/40" : ""}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-violet-600 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {s.firstName.charAt(0)}{(s.lastName ?? "").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{s.firstName} {s.lastName}</p>
                              {s.rollNo && <p className="text-[10px] text-slate-400 inline-flex items-center gap-0.5"><Hash size={9} />{s.rollNo}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden sm:table-cell">
                          <p className="text-[11px] text-slate-600 truncate max-w-[120px]">{s.decidedByName ?? <span className="italic text-slate-400">unset</span>}</p>
                          {s.decidedAt && <p className="text-[10px] text-slate-400">{new Date(s.decidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(["PROMOTE", "HOLD_BACK", "PENDING"] as const).map(d => {
                              const dc = DECISION_CFG[d];
                              const active = decision === d;
                              return (
                                <button key={d} onClick={() => setRow(s.academicId, d)}
                                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all ${
                                    active ? `${dc.cls} ring-1 ${dc.ring} border-transparent` : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                  }`}>
                                  {dc.label}
                                </button>
                              );
                            })}
                            {isDirty && <span className="text-[9px] text-amber-700 font-bold ml-0.5">●</span>}
                          </div>
                          {/* Show on small screens since note column is hidden */}
                          <input
                            type="text"
                            value={note}
                            onChange={e => setRowNote(s.academicId, e.target.value)}
                            placeholder="Add note (optional)"
                            className="md:hidden mt-1.5 w-full px-2 py-1 border border-slate-200 rounded text-[11px] bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <p className="md:hidden mt-0.5 text-[9px] text-slate-400">
                            <span className={cfg.cls + " px-1 rounded"}>{cfg.label}</span>
                          </p>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <input
                            type="text"
                            value={note}
                            onChange={e => setRowNote(s.academicId, e.target.value)}
                            placeholder="Add note (optional)"
                            className="w-full max-w-[220px] px-2 py-1 border border-slate-200 rounded text-[11px] bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                <AlertTriangle size={11} /> {pendingCount} pending
              </span>
            )}
            {dirtyCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                <Edit2 size={11} /> {dirtyCount} unsaved
              </span>
            )}
            {pendingCount === 0 && dirtyCount === 0 && data?.students.length! > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 size={11} /> All decided
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onBack} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-white">
              Back
            </button>
            <button onClick={save} disabled={dirtyCount === 0 || saving}
              className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save changes
            </button>
            <button onClick={acknowledge} disabled={pendingCount > 0 || (!savedOnce && dirtyCount > 0)}
              title={pendingCount > 0 ? "Resolve pending decisions first" : ""}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <ShieldCheck size={12} /> I acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── End Session Modal ───────────────────────────────────────────────────── */
type EndProgress = Awaited<ReturnType<typeof api.getEndSessionProgress>>;
type EndSections = Awaited<ReturnType<typeof api.getEndSessionSections>>;
type Decision = "PROMOTE" | "HOLD_BACK" | "PENDING";

const DECISION_CFG: Record<Decision, { label: string; cls: string; ring: string; dot: string }> = {
  PROMOTE:   { label: "Promote",    cls: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  HOLD_BACK: { label: "Don't Promote", cls: "bg-rose-50 text-rose-700",    ring: "ring-rose-200",    dot: "bg-rose-500"    },
  PENDING:   { label: "Pending",    cls: "bg-amber-50 text-amber-700",     ring: "ring-amber-200",   dot: "bg-amber-500"   },
};

const EndSessionModal: React.FC<{
  session: AcademicSession;
  onClose: () => void;
  onChanged: () => void;
  showToast: (m: string, t: "success" | "error") => void;
}> = ({ session, onClose, onChanged, showToast }) => {
  const [progress, setProgress] = useState<EndProgress | null>(null);
  const [sectionsData, setSectionsData] = useState<EndSections | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  // Acknowledged sections — purely client-side; resets when modal is closed.
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"" | "init" | "cancel" | "end">("");

  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api.getEndSessionProgress(session.id),
        session.status === "ENDING" ? api.getEndSessionSections(session.id) : Promise.resolve(null),
      ]);
      setProgress(p);
      setSectionsData(s as EndSections | null);
    } catch {
      showToast("Failed to load end-session data.", "error");
    }
  }, [session.id, session.status, showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const initiate = async () => {
    setBusy("init");
    try {
      await api.initiateEndSession(session.id);
      // Refresh the parent session list so the card flips to the ENDING state,
      // then close this dialog — re-opening the card now lands on the section-review flow.
      onChanged();
      showToast(`Session end initiated for "${session.name}". Teachers can now mark promotion decisions from their portal.`, "success");
      onClose();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to initiate end.", "error");
    } finally { setBusy(""); }
  };

  const cancel = async () => {
    if (!confirm("Cancel end-session? All teacher decisions so far will be cleared.")) return;
    setBusy("cancel");
    try {
      await api.cancelEndSession(session.id);
      showToast("Session end cancelled.", "success");
      setAcknowledged(new Set());
      await refresh();
      onChanged();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to cancel.", "error");
    } finally { setBusy(""); }
  };

  const finalize = async () => {
    if (!confirm(`End "${session.name}"? Once ended, no more changes can be made.`)) return;
    setBusy("end");
    try {
      await api.endSession(session.id);
      showToast(`Session "${session.name}" has been ended.`, "success");
      onChanged();
      onClose();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to end session.", "error");
    } finally { setBusy(""); }
  };

  const totals = progress?.totals ?? { pending: 0, promote: 0, holdBack: 0, total: 0 };
  const percent = totals.total > 0 ? Math.round(((totals.total - totals.pending) / totals.total) * 100) : 0;

  const sectionList = sectionsData?.sections ?? [];
  const allAcknowledged = sectionList.length > 0 && sectionList.every(s => acknowledged.has(s.sectionId));
  const noPending = (progress?.totals.pending ?? 0) === 0 && (progress?.totals.total ?? 0) > 0;
  const canFinalize = allAcknowledged && noPending && progress?.canEnd === true;

  // ── Section detail subview ────────────────────────────────────────────
  if (activeSectionId && session.status === "ENDING") {
    return (
      <SectionReviewView
        sessionId={session.id}
        sectionId={activeSectionId}
        onBack={() => setActiveSectionId(null)}
        onAcknowledge={async () => {
          setAcknowledged(prev => { const next = new Set(prev); next.add(activeSectionId); return next; });
          await refresh();
          setActiveSectionId(null);
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-sm truncate">End Session: {session.name}</h2>
              <p className="text-white/80 text-xs">Review and acknowledge each section before ending the year</p>
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/20"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ACTIVE — pre-initiate intro */}
          {session.status === "ACTIVE" && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Hourglass size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">Ready to start ending this session?</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Once initiated, every active student in this session is queued for a teacher decision: <strong>Promote</strong> or <strong>Don't Promote</strong>. Section incharges (or class incharges as fallback) make the call from their portal. You'll then review each section, optionally edit decisions, and acknowledge before finalizing.
                </p>
              </div>
            </div>
          )}

          {/* ENDING — section list with progress + acknowledgement state */}
          {session.status === "ENDING" && (
            <>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Overall decision progress</span>
                  <span className="text-xs font-bold text-slate-700">{percent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all duration-700 ${percent === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${percent}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                    <p className="text-lg font-black text-amber-600">{totals.pending}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Pending</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                    <p className="text-lg font-black text-emerald-600">{totals.promote}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Promote</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                    <p className="text-lg font-black text-rose-600">{totals.holdBack}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Hold Back</p>
                  </div>
                </div>
              </div>

              {/* Section list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sections to review</h4>
                  <span className="text-[10px] font-bold text-emerald-700">{acknowledged.size} / {sectionList.length} acknowledged</span>
                </div>
                {sectionList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No sections with decisions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sectionList.map(s => {
                      const done = s.total - s.pending;
                      const pct  = s.total > 0 ? Math.round((done / s.total) * 100) : 0;
                      const acked = acknowledged.has(s.sectionId);
                      return (
                        <button key={s.sectionId} onClick={() => setActiveSectionId(s.sectionId)}
                          className="w-full text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-amber-300 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-slate-800">{s.className ?? "—"}{s.sectionName ? ` · ${s.sectionName}` : ""}</p>
                                {acked && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                    <ShieldCheck size={10} /> Acknowledged
                                  </span>
                                )}
                              </div>
                              {s.teacherName && <p className="text-[10px] text-slate-400">Section incharge: {s.teacherName}</p>}
                            </div>
                            <ChevronRight size={14} className="text-slate-300 mt-1 shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] mb-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-700 font-bold">{s.pending} pending</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold">{s.promote} promote</span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 font-bold">{s.holdBack} hold back</span>
                            <span className="ml-auto text-slate-500 font-bold">{done}/{s.total} ({pct}%)</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!noPending && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                  <span><strong>Some students are still pending.</strong> Click into a section to set decisions for them, then acknowledge.</span>
                </div>
              )}
            </>
          )}

          {/* ENDED */}
          {session.status === "ENDED" && (
            <div className="flex items-start gap-3 bg-slate-100 border border-slate-200 rounded-xl p-4">
              <Lock size={18} className="text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-700">Session ended</p>
                <p className="text-xs text-slate-500 mt-1">Ended on {session.endedAt ? fmtDate(session.endedAt) : "—"}.</p>
              </div>
            </div>
          )}
        </div>

        {session.status !== "ENDED" && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2 justify-end shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-white">Close</button>
            {session.status === "ACTIVE" && (
              <button data-testid="initiate-end-btn" onClick={initiate} disabled={busy === "init"}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                {busy === "init" ? <Loader2 size={14} className="animate-spin" /> : <Hourglass size={14} />}
                Initiate End Session
              </button>
            )}
            {session.status === "ENDING" && (
              <>
                <button onClick={cancel} disabled={busy === "cancel"}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-white disabled:opacity-50 flex items-center gap-2">
                  {busy === "cancel" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Cancel
                </button>
                <button data-testid="end-session-btn" onClick={finalize}
                  disabled={!canFinalize || busy === "end"}
                  title={
                    !noPending ? "Some students still pending" :
                    !allAcknowledged ? `Acknowledge all ${sectionList.length} sections first` :
                    ""
                  }
                  className={`px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed
                    ${canFinalize ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-400"}`}>
                  {busy === "end" ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  End Session
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Session Card ────────────────────────────────────────────────────────── */
const SessionCard: React.FC<{
  session: AcademicSession;
  onEdit: () => void;
  onDelete: () => void;
  onEnd: () => void;
}> = ({ session, onEdit, onDelete, onEnd }) => {
  const status = getStatus(session);
  const cfg = STATUS_CONFIG[status];
  const now = new Date();
  const isLocked = session.status === "ENDED";
  const isEnding = session.status === "ENDING";

  // Progress through session
  const start = new Date(session.startDate).getTime();
  const end = new Date(session.endDate).getTime();
  const progress = status === "active"
    ? Math.round(((now.getTime() - start) / (end - start)) * 100)
    : status === "expired" ? 100 : 0;

  return (
    <div data-testid={`session-card-${session.slug}`} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group
      ${status === "active" ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200"}`}>
      {/* Top stripe */}
      <div className={`h-1 ${status === "active" ? "bg-gradient-to-r from-emerald-400 to-teal-400" : status === "upcoming" ? "bg-gradient-to-r from-blue-400 to-indigo-400" : "bg-slate-200"}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${status === "active" ? "bg-emerald-50" : status === "upcoming" ? "bg-blue-50" : "bg-slate-50"}`}>
              <CalendarDays size={18} className={status === "active" ? "text-emerald-500" : status === "upcoming" ? "text-blue-500" : "text-slate-400"} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">{session.name}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{session.slug}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text} shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-600">
          <span className="font-medium">{fmtDate(session.startDate)}</span>
          <ChevronRight size={12} className="text-slate-400" />
          <span className="font-medium">{fmtDate(session.endDate)}</span>
          <span className="ml-auto text-[10px] text-slate-400 font-medium">
            {durationLabel(session.startDate, session.endDate)}
          </span>
        </div>

        {/* Progress bar (only for active/expired) */}
        {status !== "upcoming" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400">Year progress</span>
              <span className="text-[10px] font-bold text-slate-600">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${status === "active" ? "bg-emerald-500" : "bg-slate-300"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upcoming countdown */}
        {status === "upcoming" && (
          <div className="mb-4 bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <Clock size={12} className="text-blue-500 shrink-0" />
            <p className="text-[10px] text-blue-700">
              Starts in <strong>{Math.ceil((new Date(session.startDate).getTime() - now.getTime()) / 86400000)} days</strong>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            data-testid={`session-edit-btn-${session.id}`}
            onClick={onEdit}
            disabled={isLocked}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Edit2 size={12} /> Edit
          </button>
          {!isLocked && (
            <button
              data-testid={`session-end-btn-${session.id}`}
              onClick={onEnd}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all
                ${isEnding
                  ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                  : "bg-amber-600 text-white hover:bg-amber-700"}`}
            >
              {isEnding ? <Hourglass size={12} /> : <GraduationCap size={12} />}
              {isEnding ? "End Session" : "Initiate End Session"}
            </button>
          )}
          {isLocked && (
            <button onClick={onEnd}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
              <Lock size={12} /> View End Status
            </button>
          )}
          <button
            data-testid={`session-delete-btn-${session.id}`}
            onClick={onDelete}
            disabled={isLocked || isEnding}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-red-500 text-xs font-semibold hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title={isLocked ? "Ended sessions cannot be deleted" : isEnding ? "Cancel end first" : ""}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicSession | null>(null);
  const [endTarget, setEndTarget] = useState<AcademicSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load sessions.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: FormState) => {
    await api.createSession({
      name: form.name,
      slug: form.slug,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    });
    showToast(`Session "${form.name}" created successfully.`, "success");
    setShowForm(false);
    load();
  };

  const handleEdit = async (form: FormState) => {
    if (!editTarget) return;
    await api.updateSession(editTarget.id, {
      name: form.name,
      slug: form.slug,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    });
    showToast(`Session "${form.name}" updated.`, "success");
    setEditTarget(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSession(deleteTarget.id);
      showToast(`Session "${deleteTarget.name}" deleted.`, "success");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to delete session.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Sort: ending first, then active, upcoming, expired, ended
  const sorted = [...sessions].sort((a, b) => {
    const order: Record<SessionStatus, number> = { ending: 0, active: 1, upcoming: 2, expired: 3, ended: 4 };
    return order[getStatus(a)] - order[getStatus(b)] || new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const activeCount   = sessions.filter(s => getStatus(s) === "active").length;
  const upcomingCount = sessions.filter(s => getStatus(s) === "upcoming").length;
  const expiredCount  = sessions.filter(s => getStatus(s) === "expired").length;
  const endingCount   = sessions.filter(s => getStatus(s) === "ending").length;
  const endedCount    = sessions.filter(s => getStatus(s) === "ended").length;

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-bold
          ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <SessionFormModal
          mode="create"
          onClose={() => setShowForm(false)}
          onSave={handleCreate}
        />
      )}
      {editTarget && (
        <SessionFormModal
          mode="edit"
          initial={{
            name: editTarget.name,
            slug: editTarget.slug,
            startDate: toInputDate(editTarget.startDate),
            endDate: toInputDate(editTarget.endDate),
          }}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          sessionName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      {endTarget && (
        <EndSessionModal
          session={endTarget}
          onClose={() => setEndTarget(null)}
          onChanged={load}
          showToast={showToast}
        />
      )}

      <PageHeader
        icon={CalendarDays}
        title="Academic Sessions"
        subtitle="Define and manage academic year date ranges — all courses, exams, and attendance are linked to a session"
        gradient="from-indigo-600 via-violet-600 to-purple-600"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition backdrop-blur-sm">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              data-testid="create-session-btn"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-50 transition shadow-sm"
            >
              <Plus size={15} /> New Session
            </button>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Active",   count: activeCount,   bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
            { label: "Ending",   count: endingCount,   bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-700",   dot: "bg-amber-500"   },
            { label: "Ended",    count: endedCount,    bg: "bg-rose-50",    border: "border-rose-100",    text: "text-rose-700",    dot: "bg-rose-500"    },
            { label: "Upcoming", count: upcomingCount, bg: "bg-blue-50",    border: "border-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
            { label: "Expired",  count: expiredCount,  bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-500",   dot: "bg-slate-400"   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4 flex items-center gap-3`}>
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot} shrink-0`} />
              <div>
                <p className={`text-2xl font-black ${s.text}`}>{s.count}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <BookOpen size={28} className="text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Academic Sessions Yet</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
              Create your first academic session to start managing courses, exams, and attendance.
            </p>
            <button
              data-testid="create-session-empty-btn"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm"
            >
              <Plus size={15} /> Create First Session
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-400/50" />
          </div>
        )}

        {/* Session grid */}
        {!loading && sessions.length > 0 && (
          <div data-testid="session-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onEdit={() => setEditTarget(session)}
                onDelete={() => setDeleteTarget(session)}
                onEnd={() => setEndTarget(session)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsPage;

