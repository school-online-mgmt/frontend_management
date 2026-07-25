import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  CalendarDays, X, CheckCircle2, AlertTriangle, Loader2, ChevronRight,
  Clock, BookOpen, Hourglass, Lock, Users, ArrowLeft,
  Hash, ShieldCheck, Layers, Sparkles, ClipboardCheck, Info,
  UserPlus, Play, CheckCheck, RotateCcw, Rocket,
  Archive, TriangleAlert, ChevronDown, ChevronUp,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import Switch from "../../components/common/Switch";
import { SESSIONS_QUERY_KEY } from "../../context/SessionContext";

/* ═══════════════════════════════════════════════════════════════════════════
 * Types & helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

type LifecycleStatus = "ACTIVE" | "ENDING" | "ENDED" | "CANCELLED";

interface AcademicSession {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  /** Per-tenant subscription status — the status THIS school sees. */
  status: LifecycleStatus;
  acceptAdmission: boolean;
  endInitiatedAt: string | null;
  endedAt: string | null;
  seats: number;
  seatsUsed: number;
  subscriptionId?: string;
}

interface SessionInsight {
  activeStudents: number; classes: number; sections: number;
  courses: number; subjects: number; exams: number;
  attendanceDays: number; elapsedDays: number;
  weekendDays: number; holidayDays: number; workingDays: number;
}

type Toast = { type: "success" | "error"; msg: string };

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diffDays === 0)  return "Today";
  if (diffDays === 1)  return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays < 30)   return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays > -30)  return `${Math.abs(diffDays)} days ago`;
  return fmtDate(iso);
}
function durationLabel(start: string, end: string): string {
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  if (days < 60) return `${days} days`;
  const months = Math.round(days / 30);
  return `${months} months`;
}

/**
 * The "sub-status" tells the story a school actually cares about, not just
 * the raw lifecycle value. `active-preSession` for a school subscribed to
 * a session that hasn't started yet, `active-inProgress` for the one they're
 * currently teaching, `ending` and `ended` for the year-end workflow.
 */
type SubStatus = "upcoming" | "active" | "ending" | "ended";
function getSubStatus(s: AcademicSession): SubStatus {
  if (s.status === "ENDED")   return "ended";
  if (s.status === "ENDING")  return "ending";
  const now = Date.now();
  const start = new Date(s.startDate).getTime();
  return now < start ? "upcoming" : "active";
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SectionReviewView — teacher-by-teacher promotion decisions (read + edit).
 * Retained largely as-is from the previous implementation because it works
 * well and the API contract hasn't changed.
 * ═══════════════════════════════════════════════════════════════════════════ */

type Decision = "PROMOTE" | "HOLD_BACK" | "PENDING";
const DECISION_CFG: Record<Decision, { label: string; cls: string; ring: string; dot: string }> = {
  PROMOTE:   { label: "Promote",       cls: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  HOLD_BACK: { label: "Hold back",     cls: "bg-rose-50 text-rose-700",       ring: "ring-rose-200",    dot: "bg-rose-500"    },
  PENDING:   { label: "Awaiting",      cls: "bg-amber-50 text-amber-700",     ring: "ring-amber-200",   dot: "bg-amber-500"   },
};

const SectionReviewView: React.FC<{
  sessionId: string; sectionId: string;
  onBack: () => void;
  onAcknowledge: () => void | Promise<void>;
  showToast: (m: string, t: "success" | "error") => void;
}> = ({ sessionId, sectionId, onBack, onAcknowledge, showToast }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getEndSessionSectionDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Map<string, { decision: Decision; note: string }>>(new Map());
  const [saving, setSaving] = useState(false);

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

  const setRow = (academicId: string, decision: Decision, note?: string) => {
    setEdits(prev => {
      const next = new Map(prev);
      const orig = data?.students.find(s => s.academicId === academicId);
      const currentNote = note ?? next.get(academicId)?.note ?? orig?.decisionNote ?? "";
      const currentDecision: Decision = decision;
      const original: Decision = (orig?.promotionStatus ?? "PENDING") as Decision;
      const originalNote = orig?.decisionNote ?? "";
      if (currentDecision === original && currentNote === originalNote) {
        next.delete(academicId);
      } else {
        next.set(academicId, { decision: currentDecision, note: currentNote });
      }
      return next;
    });
  };

  const save = async () => {
    if (edits.size === 0) return;
    setSaving(true);
    try {
      await api.bulkUpdateSectionDecisions(sessionId, sectionId, {
        updates: Array.from(edits.entries()).map(([academicId, v]) => ({
          academicId, decision: v.decision, note: v.note || undefined,
        })),
      });
      showToast(`Saved ${edits.size} decision${edits.size === 1 ? "" : "s"}.`, "success");
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Save failed.", "error");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-400" /></div>;
  if (!data)   return <div className="text-center py-16 text-slate-500 text-sm">Nothing to review.</div>;

  const totals = data.students.reduce((acc, s) => {
    const d = (edits.get(s.academicId)?.decision ?? s.promotionStatus ?? "PENDING") as Decision;
    acc[d] = (acc[d] ?? 0) + 1; return acc;
  }, { PROMOTE: 0, HOLD_BACK: 0, PENDING: 0 } as Record<Decision, number>);

  const allDecided = totals.PENDING === 0 && data.students.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button data-testid="sessions-back-btn" onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{data.section.className} · Section {data.section.name}</h3>
          <p className="text-[11px] text-slate-500">Class teacher: {data.section.teacherName ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {(["PROMOTE", "HOLD_BACK", "PENDING"] as Decision[]).map(k => (
          <div key={k} className={`p-2.5 rounded-lg border ${DECISION_CFG[k].cls}`}>
            <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${DECISION_CFG[k].dot}`} /><span className="font-bold">{totals[k]}</span></div>
            <p className="text-[10px] uppercase tracking-wider mt-0.5 opacity-80">{DECISION_CFG[k].label}</p>
          </div>
        ))}
      </div>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {data.students.map((s, i) => {
          const editRow = edits.get(s.academicId);
          const currentDecision = (editRow?.decision ?? s.promotionStatus ?? "PENDING") as Decision;
          const currentNote = editRow?.note ?? s.decisionNote ?? "";
          const dirty = !!editRow;
          return (
            <div key={s.academicId} className={`p-3 ${i !== 0 ? "border-t border-slate-100" : ""} ${dirty ? "bg-amber-50/50" : ""}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-[11px] text-slate-500">Roll {s.rollNo ?? "—"}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(["PROMOTE", "HOLD_BACK"] as Decision[]).map(d => (
                    <button data-testid="sessions-row-btn" key={d} onClick={() => setRow(s.academicId, d)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                        currentDecision === d
                          ? `${DECISION_CFG[d].cls} ${DECISION_CFG[d].ring} ring-2`
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                      {DECISION_CFG[d].label}
                    </button>
                  ))}
                </div>
              </div>
              {currentDecision === "HOLD_BACK" && (
                <input data-testid="sessions-row-input" value={currentNote}
                  onChange={(e) => setRow(s.academicId, "HOLD_BACK", e.target.value)}
                  placeholder="Reason (optional but recommended)"
                  className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1 text-xs" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500">
          {edits.size > 0 ? `${edits.size} unsaved change${edits.size === 1 ? "" : "s"}` : "Saved"}
          {" · "}
          {allDecided ? <span className="text-emerald-600 font-semibold">All students decided</span> : <span className="text-amber-600 font-semibold">{totals.PENDING} pending</span>}
        </span>
        <div className="flex gap-2">
          <button data-testid="sessions-save-btn" onClick={save} disabled={saving || edits.size === 0}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
            Save decisions
          </button>
          {allDecided && edits.size === 0 && (
            <button data-testid="sessions-acknowledge-btn" onClick={() => onAcknowledge()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * EndSessionWorkflow — the state machine for ACTIVE → ENDING → ENDED.
 * Rendered inline as a page card, not as a modal. States:
 *   ACTIVE  → confirm-to-initiate CTA
 *   ENDING  → progress + per-section review + finalize button
 *   ENDED   → completion state (rendered by parent, not here)
 * ═══════════════════════════════════════════════════════════════════════════ */

const EndSessionWorkflow: React.FC<{
  session: AcademicSession;
  onChanged: () => void;
  showToast: (m: string, t: "success" | "error") => void;
}> = ({ session, onChanged, showToast }) => {
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof api.getEndSessionProgress>> | null>(null);
  const [sectionsData, setSectionsData] = useState<Awaited<ReturnType<typeof api.getEndSessionSections>> | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"" | "init" | "cancel" | "end">("");
  const [confirmInitiate, setConfirmInitiate] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmCancel,   setConfirmCancel]   = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api.getEndSessionProgress(session.id),
        session.status === "ENDING" ? api.getEndSessionSections(session.id) : Promise.resolve(null),
      ]);
      setProgress(p);
      setSectionsData(s as typeof sectionsData);
    } catch { showToast("Failed to load end-session data.", "error"); }
  }, [session.id, session.status, showToast]);
  useEffect(() => { refresh(); }, [refresh]);

  const initiate = async () => {
    setBusy("init");
    try {
      const res = await api.initiateEndSession(session.id);
      showToast(res.message, "success");
      setConfirmInitiate(false);
      onChanged();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to initiate end.", "error");
    } finally { setBusy(""); }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      await api.cancelEndSession(session.id);
      showToast("Cancelled. Session is back to ACTIVE.", "success");
      setAcknowledged(new Set());
      setConfirmCancel(false);
      await refresh();
      onChanged();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to cancel.", "error");
    } finally { setBusy(""); }
  };

  const finalize = async () => {
    setBusy("end");
    try {
      const res = await api.endSession(session.id);
      showToast(res.message, "success");
      setConfirmFinalize(false);
      onChanged();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to finalise.", "error");
    } finally { setBusy(""); }
  };

  /* ── Sub-view: per-section teacher review ───────────────────────────── */
  if (activeSectionId && session.status === "ENDING") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
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
      </div>
    );
  }

  /* ── ACTIVE state — offer to initiate the workflow ───────────────────── */
  if (session.status === "ACTIVE") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck size={16} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">Year-end promotion</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          When your academic year is over, initiate the year-end workflow. Every active student's promotion status
          switches to <strong>pending</strong> and teachers see the students they need to decide about in their portal.
          Once every student has a decision, you can finalise the session and open admissions to the next session.
        </p>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex gap-2 items-start">
          <Info size={12} className="text-amber-600 mt-0.5 shrink-0" />
          <span>Once initiated, new admissions to this session are closed automatically. You can cancel the workflow anytime before finalising.</span>
        </div>
        <button data-testid="sessions-confirm-initiate-btn" onClick={() => setConfirmInitiate(true)}
          className="mt-4 w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
          <Play size={14} /> Initiate End of Session
        </button>

        {confirmInitiate && (
          <ConfirmDialog
            title="Initiate End of Session?"
            body={`This will close admissions to "${session.name}" and prompt every teacher to record promote / hold-back decisions for their students. You can cancel this before finalising if needed.`}
            confirmLabel="Yes, initiate" tone="amber"
            confirming={busy === "init"}
            onCancel={() => setConfirmInitiate(false)}
            onConfirm={initiate}
          />
        )}
      </div>
    );
  }

  /* ── ENDING state — teacher progress + finalize gate ─────────────────── */
  const totals = progress?.totals ?? { pending: 0, promote: 0, holdBack: 0, total: 0 };
  const percent = totals.total > 0 ? Math.round(((totals.total - totals.pending) / totals.total) * 100) : 0;
  const sectionList = sectionsData?.sections ?? [];
  const allAcknowledged = sectionList.length > 0 && sectionList.every(s => acknowledged.has(s.sectionId));
  const canFinalise = totals.pending === 0 && totals.total > 0 && (progress?.canEnd === true);
  const teacherRows = progress?.teachers ?? [];

  return (
    <div className="space-y-4">
      {/* Progress banner */}
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Hourglass size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Year-end promotion in progress</p>
              <h3 className="text-base font-bold text-slate-900">{session.name} · closing out</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Started {fmtDate(session.endInitiatedAt ?? "")}</p>
            </div>
          </div>
          <button data-testid="sessions-confirm-cancel-btn" onClick={() => setConfirmCancel(true)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1">
            <RotateCcw size={12} /> Cancel workflow
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-semibold">{totals.total - totals.pending} of {totals.total} decisions made</span>
            <span className={`font-bold tabular-nums ${percent === 100 ? "text-emerald-600" : "text-amber-600"}`}>{percent}%</span>
          </div>
          <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-amber-100">
            <div className={`h-full transition-all duration-500 ${percent === 100 ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}
              style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <StatPill label="Promoted"  value={totals.promote}  tone="emerald" />
          <StatPill label="Held back" value={totals.holdBack} tone="rose" />
          <StatPill label="Pending"   value={totals.pending}  tone="amber" />
        </div>
      </div>

      {/* Insights */}
      {progress?.insights && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" data-testid="sessions-insights">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">Insights</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">To collect before next session</p>
              <p className="text-lg font-black text-slate-800 tabular-nums mt-0.5">₹{progress.insights.totalOutstanding.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Promoted, blocked by dues</p>
              <p className={`text-lg font-black tabular-nums mt-0.5 ${progress.insights.promotedBlockedByDues > 0 ? "text-amber-600" : "text-slate-800"}`}>
                {progress.insights.promotedBlockedByDues}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Avg. marks of held-back</p>
              <p className="text-lg font-black text-slate-800 tabular-nums mt-0.5">
                {progress.insights.avgHeldBackPct === null ? "—" : `${progress.insights.avgHeldBackPct}%`}
              </p>
            </div>
          </div>
          {progress.insights.promotedBlockedByDues > 0 && (
            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{progress.insights.promotedBlockedByDues} promoted student(s) still carry unpaid dues and cannot be admitted to the next session until cleared.</span>
            </div>
          )}
          {progress.insights.perClass.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-2">Promote rate by class</p>
              <div className="space-y-1.5">
                {progress.insights.perClass.map((c) => (
                  <div key={c.classId ?? c.className ?? "—"} data-testid="sessions-insights-class" className="flex items-center gap-2 text-[11px]">
                    <span className="w-28 truncate text-slate-700 font-semibold">{c.className ?? "—"}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${c.promoteRate}%` }} />
                    </div>
                    <span className="w-24 text-right tabular-nums text-slate-500">{c.promoteRate}% · {c.promote}/{c.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Per-teacher progress */}
      {teacherRows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Teacher progress</h3>
            <span className="text-[10px] text-slate-500 ml-auto">{teacherRows.length} teacher{teacherRows.length === 1 ? "" : "s"}</span>
          </div>
          <div className="space-y-2">
            {teacherRows.map(t => {
              const done = t.total - t.pending;
              const pct = t.total > 0 ? Math.round((done / t.total) * 100) : 0;
              return (
                <div key={t.teacherId ?? "unassigned"} className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-800 truncate">{t.teacherName ?? "Unassigned"}</span>
                    <span className={`text-[11px] font-bold tabular-nums ${pct === 100 ? "text-emerald-600" : "text-slate-600"}`}>
                      {done}/{t.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-section review shortcuts */}
      {sectionList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Review by section</h3>
            <span className="text-[10px] text-slate-500 ml-auto">
              {acknowledged.size}/{sectionList.length} acknowledged
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {sectionList.map(sec => {
              const done = sec.total - sec.pending;
              const pct = sec.total > 0 ? Math.round((done / sec.total) * 100) : 0;
              const isAck = acknowledged.has(sec.sectionId);
              return (
                <button key={sec.sectionId}
                  onClick={() => setActiveSectionId(sec.sectionId)}
                  className={`p-3 rounded-xl border text-left transition-all group ${
                    isAck ? "border-emerald-300 bg-emerald-50/50" :
                    sec.pending === 0 ? "border-amber-200 bg-amber-50/40 hover:border-amber-300" :
                    "border-slate-200 bg-white hover:border-slate-300"
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{sec.className} · {sec.sectionName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{sec.teacherName ?? "Unassigned"}</p>
                    </div>
                    {isAck && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={`font-bold ${pct === 100 ? "text-emerald-600" : "text-slate-600"}`}>{done}/{sec.total}</span>
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <ChevronRight size={11} className="text-slate-400 group-hover:text-slate-700" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Finalize gate */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Rocket size={14} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">Finalise session</h3>
        </div>
        {!canFinalise ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex gap-2 items-start">
            <Clock size={12} className="text-slate-400 mt-0.5 shrink-0" />
            <span>
              Waiting on <strong>{totals.pending} teacher decision{totals.pending === 1 ? "" : "s"}</strong>. Once every
              student has a decision, this button unlocks.
            </span>
          </div>
        ) : !allAcknowledged ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex gap-2 items-start">
            <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
            <span>
              All decisions in — <strong>please review each section above</strong> and acknowledge before finalising.
            </span>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex gap-2 items-start mb-3">
            <CheckCircle2 size={12} className="text-emerald-600 mt-0.5 shrink-0" />
            <span>Every decision is made and every section reviewed. You're ready to finalise.</span>
          </div>
        )}
        <button onClick={() => setConfirmFinalize(true)}
          disabled={!canFinalise || !allAcknowledged}
          className="mt-3 w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
          <CheckCheck size={14} /> Finalise "{session.name}"
        </button>
      </div>

      {confirmFinalize && (
        <ConfirmDialog
          title="Finalise the session?"
          body={`This closes "${session.name}" for your school and unlocks admissions for the next academic year. Students marked "promote" will move up; "hold back" will repeat. This action can't be undone.`}
          confirmLabel="Yes, finalise" tone="emerald"
          confirming={busy === "end"}
          onCancel={() => setConfirmFinalize(false)}
          onConfirm={finalize}
        />
      )}
      {confirmCancel && (
        <ConfirmDialog
          title="Cancel the workflow?"
          body="This reverts the session to ACTIVE and clears all teacher decisions so far. Nothing else changes."
          confirmLabel="Yes, cancel" tone="rose"
          confirming={busy === "cancel"}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={cancel}
        />
      )}
    </div>
  );
};

const StatPill: React.FC<{ label: string; value: number; tone: "emerald" | "rose" | "amber" }> = ({ label, value, tone }) => {
  const cls = tone === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : tone === "rose"    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <div className={`p-2.5 rounded-lg border ${cls}`}>
      <p className="text-lg font-black tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-1 opacity-80">{label}</p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Cards: CurrentSessionCard, NextSessionCard, ArchivedList
 * ═══════════════════════════════════════════════════════════════════════════ */

const CurrentSessionCard: React.FC<{
  session: AcademicSession;
  insight?: SessionInsight;
  onToggleAdmission: (next: boolean) => Promise<void>;
  showToast: (m: string, t: "success" | "error") => void;
  onChanged: () => void;
}> = ({ session, insight, onToggleAdmission, showToast, onChanged }) => {
  const [togglingAdmission, setTogglingAdmission] = useState(false);
  const isEnding = session.status === "ENDING";

  const daysLeft = Math.max(0, Math.round((new Date(session.endDate).getTime() - Date.now()) / 86400000));
  const startMs = new Date(session.startDate).getTime();
  const totalDays = Math.max(1, Math.round((new Date(session.endDate).getTime() - startMs) / 86400000));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((Date.now() - startMs) / 86400000)));
  const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  return (
    <div className="space-y-4">
      {/* Session hero */}
      <div className={`relative bg-gradient-to-br border rounded-2xl p-6 shadow-sm overflow-hidden
        ${isEnding
          ? "from-amber-50 via-white to-orange-50 border-amber-200/80"
          : "from-emerald-50 via-white to-teal-50 border-emerald-200/80"}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/40 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md text-white
                ${isEnding ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                <CalendarDays size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${isEnding ? "text-amber-700" : "text-emerald-700"}`}>
                    Current session
                  </span>
                  <StatusChip status={session.status} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 truncate">{session.name}</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">#{session.slug}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Dates</p>
              <p className="text-sm font-semibold text-slate-800">
                {fmtDate(session.startDate)} <ChevronRight size={12} className="inline text-slate-400 -mt-0.5" /> {fmtDate(session.endDate)}
              </p>
              <p className="text-[11px] text-slate-500">{durationLabel(session.startDate, session.endDate)}</p>
            </div>
          </div>

          {/* Progress rail */}
          {!isEnding && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-600">Session progress</span>
                <span className="tabular-nums font-bold text-slate-700">{daysLeft} days remaining</span>
              </div>
              <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden border border-emerald-100">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                  style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] mt-1 text-slate-500">
                <span>{fmtDate(session.startDate)}</span>
                <span className="font-semibold text-emerald-700">{progress}% complete</span>
                <span>{fmtDate(session.endDate)}</span>
              </div>
            </div>
          )}

          {/* Admissions toggle — per-tenant knob */}
          {!isEnding && (
            <div className="mt-5 flex items-center justify-between gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${session.acceptAdmission ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                  <UserPlus size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Accepting admissions</p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {session.acceptAdmission
                      ? "Public admission form is live and reachable by families."
                      : "Admission form is closed. Existing applicants can still complete their onboarding."}
                  </p>
                </div>
              </div>
              <Switch checked={session.acceptAdmission} disabled={togglingAdmission}
                onChange={async (v) => {
                  setTogglingAdmission(true);
                  try { await onToggleAdmission(v); } finally { setTogglingAdmission(false); }
                }} />
            </div>
          )}
        </div>
      </div>

      {/* Insights grid — only when ACTIVE */}
      {!isEnding && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">This year's snapshot</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <InsightTile label="Seats used" value={session.seatsUsed} total={session.seats} icon={Users} tone="indigo" />
            <InsightTile label="Students"   value={insight?.activeStudents ?? 0} icon={Users} tone="emerald" />
            <InsightTile label="Classes"    value={insight?.classes ?? 0}        icon={Layers} tone="violet" />
            <InsightTile label="Sections"   value={insight?.sections ?? 0}       icon={Hash} tone="cyan" />
            <InsightTile label="Courses"    value={insight?.courses ?? 0}        icon={BookOpen} tone="teal" />
            <InsightTile label="Exams"      value={insight?.exams ?? 0}          icon={ShieldCheck} tone="rose" />
          </div>
          {insight && insight.workingDays > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <MiniStat label="Working days"   value={`${insight.attendanceDays}/${insight.workingDays}`}
                sub={`${Math.round((insight.attendanceDays / insight.workingDays) * 100)}% attendance coverage`} />
              <MiniStat label="Elapsed"      value={`${insight.elapsedDays} days`} sub={`Days since ${fmtDate(session.startDate)}`} />
              <MiniStat label="Weekends"     value={`${insight.weekendDays}`} sub="No classes" />
              <MiniStat label="Holidays"     value={`${insight.holidayDays}`} sub="Marked in calendar" />
            </div>
          )}
        </div>
      )}

      {/* End-of-session workflow (inline card) */}
      <EndSessionWorkflow session={session} onChanged={onChanged} showToast={showToast} />
    </div>
  );
};

const NextSessionCard: React.FC<{
  session: AcademicSession;
  onToggleAdmission: (next: boolean) => Promise<void>;
  hasEndedPrior: boolean;
}> = ({ session, onToggleAdmission, hasEndedPrior }) => {
  const nav = useNavigate();
  const [toggling, setToggling] = useState(false);
  const isUpcoming = getSubStatus(session) === "upcoming";
  const daysToStart = Math.max(0, Math.round((new Date(session.startDate).getTime() - Date.now()) / 86400000));

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200/80 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Rocket size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700">Next session</span>
              <StatusChip status={session.status} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 truncate">{session.name}</h2>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">#{session.slug}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            {isUpcoming ? "Begins" : "Started"}
          </p>
          <p className="text-sm font-semibold text-slate-800">{fmtRelativeDate(session.startDate)}</p>
          <p className="text-[11px] text-slate-500">{fmtDate(session.startDate)} → {fmtDate(session.endDate)}</p>
        </div>
      </div>

      {hasEndedPrior && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-2 items-start">
          <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Ready for new admissions</p>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Your previous session is closed. Promoted students need to be admitted to this session before it starts —
              hold-back students are re-admitted to the same class.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${session.acceptAdmission ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
            <UserPlus size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Accepting admissions</p>
            <p className="text-[11px] text-slate-500 leading-tight">
              {session.acceptAdmission
                ? "New applicants can apply for this session via your public admission form."
                : "Admission form for this session is closed."}
            </p>
          </div>
        </div>
        <Switch checked={session.acceptAdmission} disabled={toggling}
          onChange={async (v) => { setToggling(true); try { await onToggleAdmission(v); } finally { setToggling(false); } }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <InsightTile label="Seats"          value={session.seats} icon={Users} tone="indigo" />
        <InsightTile label="Enrolled"       value={session.seatsUsed} total={session.seats} icon={UserPlus} tone="emerald" />
        <InsightTile label={isUpcoming ? "Starts in" : "Days in"} value={Math.abs(daysToStart)} suffix="days" icon={Clock} tone="cyan" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => nav("/students")}
          className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
          <UserPlus size={14} /> Admit Students
        </button>
        <button onClick={() => nav("/classes")}
          className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
          <Layers size={14} /> Review Classes
        </button>
      </div>
    </div>
  );
};

const ArchivedList: React.FC<{
  sessions: AcademicSession[];
}> = ({ sessions }) => {
  const [expanded, setExpanded] = useState(false);
  if (sessions.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <button data-testid="sessions-expand-btn" data-expanded={expanded} onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          <Archive size={16} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-slate-800">Past sessions</p>
          <p className="text-[11px] text-slate-500">{sessions.length} session{sessions.length === 1 ? "" : "s"} closed</p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {sessions.map(s => (
            <div key={s.id} data-testid="session-row" data-session-id={s.id} data-session-name={s.name} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Lock size={13} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {fmtDate(s.startDate)} — {fmtDate(s.endDate)}
                    {s.endedAt ? ` · closed ${fmtDate(s.endedAt)}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-slate-500">Students</p>
                <p className="text-sm font-bold text-slate-800 tabular-nums">{s.seatsUsed} / {s.seats}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Small building blocks
 * ═══════════════════════════════════════════════════════════════════════════ */

const StatusChip: React.FC<{ status: LifecycleStatus }> = ({ status }) => {
  const cfg = {
    ACTIVE:    { label: "Active",           bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
    ENDING:    { label: "Year-end review",  bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-500" },
    ENDED:     { label: "Closed",           bg: "bg-slate-200",   text: "text-slate-600",   dot: "bg-slate-500" },
    CANCELLED: { label: "Cancelled",        bg: "bg-slate-200",   text: "text-slate-500",   dot: "bg-slate-400" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const InsightTile: React.FC<{
  label: string; value: number; total?: number;
  suffix?: string; icon: typeof Users; tone: "emerald" | "indigo" | "violet" | "cyan" | "teal" | "rose";
}> = ({ label, value, total, suffix, icon: Icon, tone }) => {
  const cfg = {
    emerald: "text-emerald-600 bg-emerald-50",
    indigo:  "text-indigo-600 bg-indigo-50",
    violet:  "text-violet-600 bg-violet-50",
    cyan:    "text-cyan-600 bg-cyan-50",
    teal:    "text-teal-600 bg-teal-50",
    rose:    "text-rose-600 bg-rose-50",
  }[tone];
  return (
    <div className="rounded-lg border border-slate-100 p-2.5">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${cfg} mb-1.5`}>
        <Icon size={13} />
      </div>
      <p className="text-lg font-black text-slate-800 tabular-nums leading-none">
        {value}
        {total !== undefined && <span className="text-xs text-slate-500 font-semibold"> / {total}</span>}
        {suffix && <span className="text-xs text-slate-500 font-semibold ml-1">{suffix}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-1">{label}</p>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
    <p className="text-base font-black text-slate-800 tabular-nums leading-tight mt-0.5">{value}</p>
    <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
  </div>
);

const ConfirmDialog: React.FC<{
  title: string; body: string;
  confirmLabel: string;
  tone: "amber" | "emerald" | "rose";
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ title, body, confirmLabel, tone, confirming, onCancel, onConfirm }) => {
  const btnCls = tone === "amber" ? "bg-amber-600 hover:bg-amber-700"
    : tone === "emerald" ? "bg-emerald-600 hover:bg-emerald-700"
    : "bg-rose-600 hover:bg-rose-700";
  const iconCls = tone === "amber" ? "text-amber-500 bg-amber-100"
    : tone === "emerald" ? "text-emerald-500 bg-emerald-100"
    : "text-rose-500 bg-rose-100";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
            <TriangleAlert size={18} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{body}</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={14} /></button>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onCancel} disabled={confirming}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={confirming}
            className={`px-4 py-2 ${btnCls} text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60`}>
            {confirming ? <Loader2 size={12} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Page — the single entry point.
 * ═══════════════════════════════════════════════════════════════════════════ */

const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [insights, setInsights] = useState<Record<string, SessionInsight>>({});
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<Toast | null>(null);
  const queryClient = useQueryClient();

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4200);
  }, []);
  const invalidateSessionsCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  }, [queryClient]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, insightsList] = await Promise.all([
        // api.getSessions() already returns response.data.sessions — the array
        // itself, not a wrapper object. Guard so a malformed payload doesn't
        // crash the whole page.
        api.getSessions() as Promise<AcademicSession[] | { sessions?: AcademicSession[] } | null | undefined>,
        api.getSessionInsights().catch(() => [] as SessionInsight[] as any),
      ]);
      const sessionRows: AcademicSession[] = Array.isArray(list)
        ? list
        : (list && Array.isArray((list as { sessions?: AcademicSession[] }).sessions)
            ? (list as { sessions: AcademicSession[] }).sessions
            : []);
      setSessions(sessionRows);
      const map: Record<string, SessionInsight> = {};
      if (Array.isArray(insightsList)) {
        for (const row of insightsList) {
          if (row && typeof row === "object" && "id" in row) {
            map[(row as { id: string }).id] = row as SessionInsight;
          }
        }
      }
      setInsights(map);
      invalidateSessionsCache();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to load sessions.", "error");
    } finally { setLoading(false); }
  }, [showToast, invalidateSessionsCache]);
  useEffect(() => { load(); }, [load]);

  /* Categorise sessions relative to lifecycle status */
  const { current, next, archived } = useMemo(() => {
    // Sort by start date desc so most recent comes first.
    const sorted = [...sessions].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const active  = sorted.find(s => s.status === "ACTIVE" || s.status === "ENDING") ?? null;
    const ended   = sorted.filter(s => s.status === "ENDED");
    // "Next" is the newest session that is ACTIVE / upcoming AND not the current one being taught.
    // Once the current session is ENDING or ENDED, the newest ACTIVE session is a candidate for next.
    let nextCandidate: AcademicSession | null = null;
    if (active) {
      // A future session (starts after current's end) OR one already active but newer than current.
      const activeIdx = sorted.findIndex(s => s.id === active.id);
      const upcomingOrLater = sorted.slice(0, activeIdx).filter(s => s.status === "ACTIVE" || s.status === "ENDING");
      nextCandidate = upcomingOrLater[0] ?? null;
    } else if (ended.length > 0) {
      nextCandidate = sorted.find(s => s.status === "ACTIVE" || s.status === "ENDING") ?? null;
    }
    return { current: active, next: nextCandidate, archived: ended };
  }, [sessions]);

  const hasEndedPrior = archived.length > 0;

  const toggleAdmission = async (session: AcademicSession, next: boolean) => {
    try {
      await api.updateAcceptAdmission(session.id, next);
      showToast(next ? `Admissions opened for ${session.name}.` : `Admissions closed for ${session.name}.`, "success");
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, acceptAdmission: next } : s));
      invalidateSessionsCache();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to update admissions.", "error");
    }
  };

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-bold
          ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          {toast.msg}
        </div>
      )}

      <PageHeader
        icon={CalendarDays}
        title="Academic Sessions"
        subtitle="Sessions are shared across the EduPilots platform. Below is your school's view — the year you're teaching, what's next, and the archive."
        gradient={MODULE_THEMES.classes}
        onRefresh={load}
        refreshing={loading}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-6">
        {loading && !current && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <BookOpen size={28} className="text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Not subscribed to any session yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Academic sessions and seat allocations are provisioned by the EduPilots platform team. Contact your
              platform administrator to subscribe your school and buy seats.
            </p>
          </div>
        )}

        {current && (
          <CurrentSessionCard
            session={current}
            insight={insights[current.id]}
            onToggleAdmission={(v) => toggleAdmission(current, v)}
            showToast={showToast}
            onChanged={load}
          />
        )}

        {next && next.id !== current?.id && (
          <NextSessionCard
            session={next}
            onToggleAdmission={(v) => toggleAdmission(next, v)}
            hasEndedPrior={hasEndedPrior}
          />
        )}

        <ArchivedList sessions={archived} />
      </div>
    </div>
  );
};

export default SessionsPage;
