import { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Send, RefreshCw, Users, GraduationCap, Eye,
  AlertCircle, CheckCircle2, Sparkles, Filter,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../context/ToastContext";

type AudienceType =
  | "ALL" | "SESSION" | "CLASS" | "SECTION" | "COURSE" | "SUBJECT"
  | "TRANSPORT_ZONE" | "INDIVIDUAL" | "ALUMNI";
type RecipientType = "STUDENTS" | "TEACHERS" | "BOTH";

interface SimpleOption { id: string; name: string; }

const AUDIENCE_TYPES: Array<{ key: AudienceType; label: string; needsIds: boolean; description: string }> = [
  { key: "ALL",            label: "Everyone",          needsIds: false, description: "All active students and/or teachers" },
  { key: "SESSION",        label: "By session",        needsIds: true,  description: "All students/teachers tied to specific sessions" },
  { key: "CLASS",          label: "By class",          needsIds: true,  description: "Students in selected classes; their teachers" },
  { key: "SECTION",        label: "By section",        needsIds: true,  description: "Students in selected sections; their teachers" },
  { key: "COURSE",         label: "By course",         needsIds: true,  description: "Students enrolled in selected courses" },
  { key: "SUBJECT",        label: "By subject",        needsIds: true,  description: "Subject teachers; students whose course includes the subject" },
  { key: "TRANSPORT_ZONE", label: "By transport zone", needsIds: true,  description: "Students who opted into the selected transport zones" },
  { key: "INDIVIDUAL",     label: "Individual people", needsIds: true,  description: "Pick specific students or teachers by id" },
  // Alumni are never in the other options — those all resolve through a current
  // enrolment, which by definition a leaver has none of. `needsIds: false`
  // because the audience is "everyone who opted in", optionally narrowed by
  // batch year rather than by picking people.
  { key: "ALUMNI",         label: "Alumni",            needsIds: false, description: "Former students who opted in to hear from the school" },
];

const inp = "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white placeholder:text-slate-400 transition-colors";
const lbl = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

export default function CommunicationPage() {
  const { addToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType>("ALL");
  const [recipientType, setRecipientType] = useState<RecipientType>("STUDENTS");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Option lists for the picker
  const [options, setOptions] = useState<SimpleOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ count: number; sample: Array<{ name: string; email: string; role: string }> } | null>(null);

  const [sending, setSending] = useState(false);

  const audienceMeta = useMemo(() => AUDIENCE_TYPES.find((a) => a.key === audienceType)!, [audienceType]);

  // Load option list when audience type changes
  useEffect(() => {
    setSelectedIds([]);
    setPreview(null);
    if (!audienceMeta.needsIds) return;

    setOptionsLoading(true);
    const loader = (async () => {
      try {
        switch (audienceType) {
          case "SESSION": {
            const sessions = await api.getSessions();
            return (sessions ?? []).map((s: any) => ({ id: s.id, name: s.name }));
          }
          case "CLASS": {
            const classes = await api.getClasses();
            return (classes ?? []).map((c: any) => ({ id: c.id, name: c.name }));
          }
          case "SECTION": {
            const sections = await api.getSections();
            return (sections ?? []).map((s: any) => ({ id: s.id, name: `${s.className ?? ""} ${s.name}`.trim() }));
          }
          case "COURSE": {
            const courses = await api.getCourses();
            return (courses ?? []).map((c: any) => ({ id: c.id, name: c.name }));
          }
          case "SUBJECT": {
            const subjects = await api.getSubjects();
            return (subjects ?? []).map((s: any) => ({ id: s.id, name: s.name }));
          }
          case "TRANSPORT_ZONE": {
            const zones = await api.getTransportZones();
            return (zones ?? []).map((z: any) => ({ id: z.id, name: z.name }));
          }
          case "INDIVIDUAL":
            // Individual mode requires the user to type ids; left as a textarea fallback below.
            return [];
          default:
            return [];
        }
      } catch (err) {
        addToast("Failed to load options", "error");
        return [];
      }
    })();
    loader.then((data) => setOptions(data)).finally(() => setOptionsLoading(false));
  }, [audienceType]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPreview = async () => {
    if (audienceMeta.needsIds && selectedIds.length === 0 && audienceType !== "INDIVIDUAL") {
      return addToast("Pick at least one option for this audience", "warning");
    }
    setPreviewing(true);
    try {
      const r = await api.previewEmailBroadcast({
        type: audienceType,
        recipientType,
        ids: selectedIds.length > 0 ? selectedIds : undefined,
      });
      setPreview({ count: r.recipientCount, sample: r.sample });
      if (r.recipientCount === 0) addToast("No recipients matched — try a different filter", "warning");
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? "Preview failed", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const onSend = () => {
    if (!subject.trim()) return addToast("Subject is required", "warning");
    if (!body.trim()) return addToast("Body is required", "warning");
    if (!preview || preview.count === 0) return addToast("Run a preview first", "warning");
    // A broadcast cannot be recalled once sent, so the recipient count is
    // confirmed in-page rather than through a native dialog the browser may
    // suppress entirely — silently skipping the check on a send-to-everyone.
    return confirm({
      title: `Send to ${preview.count} recipient${preview.count > 1 ? "s" : ""}?`,
      message: "Emails cannot be recalled once sent.",
      confirmText: "Send now",
      onConfirm: doSend,
    });
  };

  const doSend = async () => {
    setSending(true);
    try {
      const r = await api.sendEmailBroadcast({
        subject: subject.trim(),
        body: body.trim(),
        audience: {
          type: audienceType,
          recipientType,
          ids: selectedIds.length > 0 ? selectedIds : undefined,
        },
      });
      if (r.skipped) {
        addToast("Broadcast skipped — Communication module is disabled in settings", "warning");
      } else {
        addToast(
          `Broadcast complete — ${r.sent} sent, ${r.failed} failed`,
          r.failed === 0 ? "success" : "warning"
        );
        setSubject("");
        setBody("");
        setPreview(null);
      }
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? "Broadcast failed", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {dialog}
      <PageHeader
        icon={Megaphone}
        title="Email Blast"
        subtitle="Send a custom email to a filtered group of students and/or teachers"
        gradient={MODULE_THEMES.communication}
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto w-full space-y-4 flex-1">

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Compose */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <label className={lbl}>Subject</label>
            <input data-testid="communication-subject-input"
              type="text"
              className={inp}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. School closed tomorrow"
              maxLength={200}
            />
          </div>

          <div>
            <label className={lbl}>Body</label>
            <textarea data-testid="communication-body-input"
              className={inp + " min-h-[200px] font-sans"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              maxLength={20000}
            />
            <p className="text-[10px] text-slate-400 mt-1">{body.length} / 20,000 characters</p>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button data-testid="communication-preview-btn"
              type="button"
              disabled={previewing}
              onClick={onPreview}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Eye size={14} />
              {previewing ? "Calculating…" : "Preview audience"}
            </button>
            <button data-testid="communication-send-btn"
              type="button"
              disabled={sending || !preview}
              onClick={onSend}
              className="px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Send size={14} />
              {sending ? "Sending…" : preview ? `Send to ${preview.count}` : "Send"}
            </button>
          </div>
        </div>

        {/* Audience picker */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 sticky top-6">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Audience</h3>
          </div>

          {/* Recipient type */}
          <div>
            <label className={lbl}>Send to</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["STUDENTS", "TEACHERS", "BOTH"] as const).map((rt) => (
                <button data-testid="communication-recipient-type-btn"
                  key={rt}
                  type="button"
                  onClick={() => setRecipientType(rt)}
                  className={`px-2 py-2 text-[11px] font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${
                    recipientType === rt
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rt === "STUDENTS" && <GraduationCap size={11} />}
                  {rt === "TEACHERS" && <Users size={11} />}
                  {rt === "BOTH" && <Users size={11} />}
                  {rt === "BOTH" ? "Both" : rt[0]! + rt.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Audience type */}
          <div>
            <label className={lbl}>Filter by</label>
            <select data-testid="communication-audience-type-select"
              className={inp}
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value as AudienceType)}
            >
              {AUDIENCE_TYPES.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">{audienceMeta.description}</p>
          </div>

          {/* Multi-select picker */}
          {audienceMeta.needsIds && audienceType !== "INDIVIDUAL" && (
            <div>
              <label className={lbl}>Pick</label>
              {optionsLoading ? (
                <div className="flex items-center text-slate-400 text-xs gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Loading…
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/40">
                  {options.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">No options found.</p>
                  )}
                  {options.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(o.id)}
                        onChange={(e) => {
                          setSelectedIds((s) =>
                            e.target.checked ? [...s, o.id] : s.filter((x) => x !== o.id)
                          );
                          setPreview(null);
                        }}
                        className="rounded text-violet-600 focus:ring-violet-400"
                      />
                      <span className="text-slate-700">{o.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedIds.length > 0 && (
                <p className="text-[10px] text-violet-600 mt-1.5 font-semibold">
                  {selectedIds.length} selected
                </p>
              )}
            </div>
          )}

          {audienceType === "INDIVIDUAL" && (
            <div>
              <label className={lbl}>UUIDs (one per line)</label>
              <textarea data-testid="communication-00000000-0000-0000-0000-input"
                className={inp + " min-h-[80px] font-mono text-xs"}
                placeholder="00000000-0000-0000-0000-000000000000"
                onChange={(e) => {
                  const ids = e.target.value
                    .split(/[\s,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  setSelectedIds(ids);
                  setPreview(null);
                }}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Up to 500 ids. Match recipientType — use student or teacher ids accordingly.
              </p>
            </div>
          )}

          {/* Preview result */}
          {preview && (
            <div data-testid="communication-preview-count" data-count={preview.count} className={`rounded-xl p-3 border ${preview.count > 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <p className={`text-xs font-bold inline-flex items-center gap-1.5 ${preview.count > 0 ? "text-emerald-800" : "text-amber-800"}`}>
                {preview.count > 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {preview.count} {preview.count === 1 ? "recipient" : "recipients"}
              </p>
              {preview.sample.length > 0 && (
                <div className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
                  {preview.sample.map((s, i) => (
                    <div key={i} className="text-[10px] text-slate-600 flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full ${s.role === "STUDENT" ? "bg-violet-500" : "bg-blue-500"}`} />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono">{s.email}</span>
                    </div>
                  ))}
                  {preview.count > preview.sample.length && (
                    <p className="text-[10px] text-slate-400 italic mt-1">+ {preview.count - preview.sample.length} more</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            <Sparkles size={10} className="mt-0.5 shrink-0" />
            <p>Recipients without an email on file are skipped. Each person receives one copy regardless of overlap.</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
