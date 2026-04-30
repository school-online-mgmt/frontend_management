import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, Plus, Edit2, Trash2, X, CheckCircle2,
  AlertTriangle, Loader2, ChevronRight, Clock, RefreshCw,
  BookOpen, Info,
} from "lucide-react";
import api from "../../api/api";
import PageHeader from "../../components/PageHeader";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface AcademicSession {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  tenantId: string;
  createdAt?: string;
}

type SessionStatus = "active" | "upcoming" | "expired";

function getStatus(session: AcademicSession): SessionStatus {
  const now = new Date();
  const start = new Date(session.startDate);
  const end = new Date(session.endDate);
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; bg: string; text: string; dot: string }> = {
  active:   { label: "Active",    bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  upcoming: { label: "Upcoming",  bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  expired:  { label: "Expired",   bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-400"   },
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

/* ── Session Card ────────────────────────────────────────────────────────── */
const SessionCard: React.FC<{
  session: AcademicSession;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ session, onEdit, onDelete }) => {
  const status = getStatus(session);
  const cfg = STATUS_CONFIG[status];
  const now = new Date();

  // Progress through session
  const start = new Date(session.startDate).getTime();
  const end = new Date(session.endDate).getTime();
  const progress = status === "active"
    ? Math.round(((now.getTime() - start) / (end - start)) * 100)
    : status === "expired" ? 100 : 0;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group
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
        <div className="flex gap-2">
          <button
            data-testid={`session-edit-btn-${session.id}`}
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            data-testid={`session-delete-btn-${session.id}`}
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-red-500 text-xs font-semibold hover:bg-red-50 hover:border-red-200 transition-all"
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

  // Sort: active first, then upcoming, then expired
  const sorted = [...sessions].sort((a, b) => {
    const order: Record<SessionStatus, number> = { active: 0, upcoming: 1, expired: 2 };
    return order[getStatus(a)] - order[getStatus(b)] || new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const activeCount   = sessions.filter(s => getStatus(s) === "active").length;
  const upcomingCount = sessions.filter(s => getStatus(s) === "upcoming").length;
  const expiredCount  = sessions.filter(s => getStatus(s) === "expired").length;

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
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Active",   count: activeCount,   bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onEdit={() => setEditTarget(session)}
                onDelete={() => setDeleteTarget(session)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsPage;

