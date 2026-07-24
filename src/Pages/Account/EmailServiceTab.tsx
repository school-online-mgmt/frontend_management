import { useEffect, useState } from "react";
import {
  Mail, RefreshCw, Send, Receipt, AlertTriangle,
  BarChart3, Sparkles, Globe, AtSign, Pencil, Check, X,
  Info, Eye, EyeOff, Save, Power, CheckCircle2, CircleDashed, ChevronRight,
  GraduationCap, IndianRupee, ClipboardCheck, MessageCircle, BookOpen,
  Bus, FileSpreadsheet, ClipboardList, Megaphone,
} from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import Switch from "../../components/common/Switch";

type EmailSettings = Awaited<ReturnType<typeof api.getEmailSettings>>["email"];
type EmailUsage = Awaited<ReturnType<typeof api.getEmailUsage>>;
type ModuleAddrs = Awaited<ReturnType<typeof api.getEmailModuleAddresses>>;
type EmailModulesGates = Awaited<ReturnType<typeof api.getEmailModules>>;
type EmailActivityGates = Awaited<ReturnType<typeof api.getEmailActivities>>;

const inp =
  "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white placeholder:text-slate-400 transition-colors";
const lbl = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

const fmtNum = (n: number) => n.toLocaleString("en-IN");

const LOCAL_PART_RX = /^[a-z0-9][a-z0-9._-]{0,28}[a-z0-9]$/;

const MODULE_META: Record<string, { label: string; icon: React.ElementType; description: string; tone: string }> = {
  ADMISSION:     { label: "Admission",     icon: GraduationCap,   description: "Confirmation when an applicant submits, and welcome email when admitted.", tone: "violet"  },
  FINANCE:       { label: "Finance",       icon: IndianRupee,     description: "Invoice generated, payment received, payment overdue, refund issued.",     tone: "emerald" },
  ATTENDANCE:    { label: "Attendance",    icon: ClipboardCheck,  description: "Notify the student & guardian when marked absent for the day.",            tone: "amber"   },
  COMMUNICATION: { label: "Communication", icon: MessageCircle,   description: "Custom broadcasts and announcements you trigger from the Communication page.", tone: "indigo" },
  LIBRARY:       { label: "Library",       icon: BookOpen,        description: "Book issued, returned, request approved/rejected, overdue reminders.",      tone: "blue"    },
  TRANSPORT:     { label: "Transport",     icon: Bus,             description: "Route changes, transport fee reminders.",                                  tone: "cyan"    },
  EXAM:          { label: "Exam",          icon: FileSpreadsheet, description: "Exam status transitions (published, conducted, results released).",         tone: "rose"    },
  ASSIGNMENT:    { label: "Assignment",    icon: ClipboardList,   description: "Assignment summary email to the assigned teacher.",                        tone: "fuchsia" },
  NOTICE:        { label: "Notice",        icon: Megaphone,       description: "New notice published to all students & teachers; status change to author.", tone: "orange" },
};

const TONE_BG: Record<string, string> = {
  violet:  "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber:   "bg-amber-50 text-amber-700",
  indigo:  "bg-indigo-50 text-indigo-700",
  blue:    "bg-blue-50 text-blue-700",
  cyan:    "bg-cyan-50 text-cyan-700",
  rose:    "bg-rose-50 text-rose-700",
  fuchsia: "bg-fuchsia-50 text-fuchsia-700",
  orange:  "bg-orange-50 text-orange-700",
};

const MODULE_LABELS: Record<string, string> = {
  ADMISSION: "Admission", FINANCE: "Finance", ATTENDANCE: "Attendance",
  COMMUNICATION: "Communication", LIBRARY: "Library", TRANSPORT: "Transport",
  EXAM: "Exam", ASSIGNMENT: "Assignment", NOTICE: "Notice",
};

export default function EmailServiceTab() {
  const { addToast } = useToast();
  const [settings, setSettings]       = useState<EmailSettings | null>(null);
  const [usage, setUsage]             = useState<EmailUsage | null>(null);
  const [moduleAddrs, setModuleAddrs] = useState<ModuleAddrs | null>(null);
  const [moduleGates, setModuleGates] = useState<EmailModulesGates | null>(null);
  const [loading, setLoading] = useState(true);

  // Self-service config form (BYO/shared, auth key, domain, from-name)
  const [mode, setMode]             = useState<"shared" | "byo">("shared");
  const [emailDomain, setEmailDomain] = useState("");
  const [emailAuthKey, setEmailAuthKey] = useState("");
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [fromName, setFromName]     = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingEnable, setSavingEnable] = useState(false);

  // Per-module gate save tracker
  const [savingGateKey, setSavingGateKey] = useState<string | null>(null);
  // Per-module address save tracker
  const [savingModuleKey, setSavingModuleKey] = useState<string | null>(null);

  // Test email
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, u, m, g] = await Promise.all([
        api.getEmailSettings(),
        api.getEmailUsage(),
        api.getEmailModuleAddresses(),
        api.getEmailModules(),
      ]);
      setSettings(s.email);
      setUsage(u);
      setModuleAddrs(m);
      setModuleGates(g);
      setMode(s.email.useOwnCredentials ? "byo" : "shared");
      setEmailDomain(s.email.emailDomain ?? "");
      setFromName(s.email.emailFromName ?? "");
      setEmailAuthKey("");
    } catch {
      addToast("Failed to load email settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save mode + creds + display name ────────────────────────────────────
  // If the configuration becomes complete after this save, also flip the
  // master switch ON in the same call. Saving and then having to flip a
  // separate toggle was confusing — users assumed "Save" meant "use this".
  const onSaveConfig = async () => {
    if (!settings) return;
    setSavingConfig(true);
    try {
      const payload: Parameters<typeof api.updateEmailSettings>[0] = {
        useOwnCredentials: mode === "byo",
      };
      if (mode === "byo") {
        if (emailDomain && emailDomain !== settings.emailDomain) payload.emailDomain = emailDomain;
        if (emailAuthKey) payload.emailAuthKey = emailAuthKey;
      }
      if (fromName !== (settings.emailFromName ?? "")) payload.emailFromName = fromName;

      // Decide if this save makes the service "ready to enable":
      //   BYO    → must have a domain AND (existing key OR a new key in the form)
      //   Shared → platform must be configured server-side (env vars present)
      const willBeReady = mode === "byo"
        ? !!(payload.emailDomain ?? settings.emailDomain) &&
          (settings.hasAuthKey || !!payload.emailAuthKey)
        : settings.platformAvailable;

      // Auto-enable on first successful configure so users don't need a second click.
      if (!settings.enabled && willBeReady) payload.enabled = true;

      const r = await api.updateEmailSettings(payload);
      addToast(
        payload.enabled === true
          ? "Email service enabled"
          : "Sender configuration saved",
        "success",
        r.message && r.message !== "Email settings updated" ? r.message : undefined,
      );
      setEmailAuthKey("");
      await load();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg  = err?.response?.data?.message ?? "Failed to save configuration";
      if (code === "INCOMPLETE_BYO_CREDENTIALS") {
        addToast(msg, "warning", "Fill in both auth key and sender domain, then save again.");
      } else {
        addToast(msg, "error");
      }
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Toggle service on/off — self-service ────────────────────────────────
  const onToggleEnabled = async (next: boolean) => {
    setSavingEnable(true);
    try {
      const r = await api.updateEmailSettings({ enabled: next });
      addToast(r.message ?? (next ? "Email service enabled" : "Email service disabled"), "success");
      await load();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg  = err?.response?.data?.message ?? "Failed to toggle email service";
      // Surface actionable detail when the backend complains about missing creds
      if (code === "INCOMPLETE_BYO_CREDENTIALS") {
        addToast(msg, "warning", "Fill in your auth key and sender domain below, then click Save.");
      } else {
        addToast(msg, "error");
      }
    } finally {
      setSavingEnable(false);
    }
  };

  // ── Per-module gate toggle ──────────────────────────────────────────────
  const onToggleGate = async (key: string, next: boolean) => {
    if (!moduleGates) return;
    setSavingGateKey(key);
    setModuleGates({ ...moduleGates, modules: { ...moduleGates.modules, [key]: next } });
    try {
      await api.updateEmailModules({ [key]: next });
      addToast(`${MODULE_LABELS[key] ?? key} emails ${next ? "enabled" : "disabled"}`, "success");
    } catch (err: any) {
      // Revert
      setModuleGates({ ...moduleGates, modules: { ...moduleGates.modules, [key]: !next } });
      addToast(err?.response?.data?.message ?? "Failed to update module", "error");
    } finally {
      setSavingGateKey(null);
    }
  };

  // ── Test email ──────────────────────────────────────────────────────────
  const onSendTest = async () => {
    if (!testTo.trim()) return addToast("Please enter a recipient email", "warning");
    setTesting(true);
    try {
      const r = await api.sendTestEmail({ to: { email: testTo.trim() } });
      if (r.result.status === "SENT") {
        addToast(`Test email sent to ${testTo}`, "success", `Provider id: ${r.result.providerMessageId ?? "(none)"}`);
      } else {
        addToast("Test email failed — check the email logs", "error");
      }
      await load();
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? "Test send failed", "error");
    } finally {
      setTesting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <RefreshCw size={18} className="animate-spin mr-2" /> Loading email settings…
      </div>
    );
  if (!settings || !usage || !moduleAddrs || !moduleGates) return null;

  // BYO is "ready" if the form has both fields OR the tenant already had them
  const byoReady = mode === "byo"
    ? (!!emailDomain && (settings.hasAuthKey || emailAuthKey.length > 0))
    : true;

  const enabledOnReady = settings.enabled || (mode === "byo" ? byoReady : settings.platformAvailable);

  // Compute diagnostic strip values: how many modules silenced, sender ready, master state
  const silencedModules = moduleGates.availableModules.filter(k => moduleGates.modules[k] === false);
  const senderReady = mode === "byo" ? byoReady : settings.platformAvailable;
  const masterOn = settings.enabled;

  // Hero status: tri-state. "live" = master on AND fully configured AND no silenced modules.
  // "partial" = master on but something's off (config incomplete or modules silenced).
  // "off" = master off.
  type HeroState = "live" | "partial" | "off";
  const heroState: HeroState =
    !masterOn ? "off"
    : (settings.isFullyConfigured && silencedModules.length === 0) ? "live"
    : "partial";

  return (
    <div className="space-y-3">
      {/* ── HERO: master power switch + status diagnostic ────────────────── */}
      <HeroPanel
        state={heroState}
        masterOn={masterOn}
        senderReady={senderReady}
        silencedCount={silencedModules.length}
        totalModules={moduleGates.availableModules.length}
        canEnable={enabledOnReady}
        savingEnable={savingEnable}
        onToggle={() => onToggleEnabled(!masterOn)}
        pricingMessage={settings.pricingMessage}
      />

      {/* ── Sender configuration (self-service) ─────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Sender configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose how your school sends email. You can change this anytime.
          </p>
        </div>

        {/* Mode picker */}
        <div className="grid sm:grid-cols-2 gap-3">
          <ModeCard
            selected={mode === "shared"}
            available={settings.platformAvailable}
            onClick={() => setMode("shared")}
            title="Platform-shared"
            badge="Easiest"
            description={
              <>
                Use EduPilots' Zepto Mail account. Charged at{" "}
                <strong>₹{settings.pricing.pricePerBlock} per {settings.pricing.emailsPerBlock} emails</strong>. Billed monthly.
              </>
            }
          />
          <ModeCard
            selected={mode === "byo"}
            available={true}
            onClick={() => setMode("byo")}
            title="Bring your own (BYO)"
            badge="Self-managed"
            description={<>You pay Zepto Mail (Zoho) directly; we don't bill. Use your own verified sender domain.</>}
          />
        </div>

        {/* Mode-specific fields */}
        {mode === "shared" ? (
          <div className="rounded-xl bg-violet-50/40 border border-violet-100 p-3 text-xs text-violet-800 inline-flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 shrink-0" />
            <p>
              Your sender slug{" "}
              <strong className="font-mono">
                {settings.schoolEmailSlug ?? "(auto-assigned on enable)"}
              </strong>{" "}
              is used to build per-module email addresses (see preview below).
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>
                <Globe size={11} className="inline mr-1" /> Sender domain
              </label>
              <input data-testid="account-email-domain-input"
                type="text"
                className={inp}
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value.trim().toLowerCase())}
                placeholder="mail.yourschool.in"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Must be verified in your Zepto Mail account before sends will succeed.
              </p>
            </div>
            <div>
              <label className={lbl}>
                Zepto auth key{" "}
                {settings.hasAuthKey && (
                  <span className="ml-1 text-emerald-600 normal-case font-mono tracking-normal text-[10px]">
                    current: {settings.authKeyMask}
                  </span>
                )}
              </label>
              <div className="relative">
                <input data-testid="account-email-auth-key-input"
                  type={showAuthKey ? "text" : "password"}
                  className={inp + " pr-9 font-mono"}
                  value={emailAuthKey}
                  onChange={(e) => setEmailAuthKey(e.target.value)}
                  placeholder={settings.hasAuthKey ? "•••••••••• (leave blank to keep)" : "Zoho-enczapikey token"}
                />
                <button data-testid="account-show-auth-key-btn"
                  type="button"
                  onClick={() => setShowAuthKey(!showAuthKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  {showAuthKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* From name */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Display from-name (optional)</label>
            <input data-testid="account-from-name-input"
              type="text"
              className={inp}
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your School Name"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              The "from" name recipients see in their inbox. Defaults to "EduPilots" if left blank.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <button data-testid="account-save-config-btn"
            type="button"
            disabled={savingConfig}
            onClick={onSaveConfig}
            className="px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2"
          >
            {savingConfig ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {savingConfig ? "Saving…" : "Save configuration"}
          </button>
          {settings.configuredByName && (
            <p className="text-[11px] text-slate-400">Last updated by {settings.configuredByName}</p>
          )}
        </div>
      </div>

      {/* ── Modules: gate + sender address per tile ──────────────────────── */}
      <ModuleTilesPanel
        moduleGates={moduleGates}
        moduleAddrs={moduleAddrs}
        savingGateKey={savingGateKey}
        savingAddrKey={savingModuleKey}
        isShared={!settings.useOwnCredentials}
        onToggleGate={onToggleGate}
        onSaveAddr={async (key, value) => {
          setSavingModuleKey(key);
          try {
            await api.updateEmailModuleAddresses({ [key]: value });
            addToast(
              `${MODULE_LABELS[key] ?? key} sender updated`,
              "success",
              value ? `Now sending as ${value}` : "Reverted to default",
            );
            await load();
          } catch (err: any) {
            addToast(err?.response?.data?.errors?.formErrors?.[0] ?? err?.response?.data?.message ?? "Failed to save", "error");
          } finally {
            setSavingModuleKey(null);
          }
        }}
      />

      {/* ── Usage + bills ───────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
            <BarChart3 size={16} className="text-violet-500" /> Email usage
          </div>
          <UsageBlock label="This month" data={usage.usage.thisMonth} usingShared={usage.usage.usingShared} />
          <div className="border-t border-slate-100 my-4" />
          <UsageBlock label="Last month" data={usage.usage.lastMonth} usingShared={usage.usage.usingShared} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
            <Receipt size={16} className="text-emerald-500" /> Recent bills
          </div>
          {usage.bills.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              {usage.usage.usingShared
                ? "No bills yet — usage is metered monthly."
                : "BYO mode — billing handled by you & Zepto Mail."}
            </p>
          ) : (
            <div className="space-y-2">
              {usage.bills.slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{b.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-400">
                      {fmtNum(b.billableEmailCount)} billable / {fmtNum(b.emailCount)} sent
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">₹{fmtNum(b.amount)}</p>
                    <p
                      className={`text-[10px] font-semibold ${
                        b.status === "PAID" ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {b.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Test email ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
          <Sparkles size={14} className="text-violet-500" /> Send a test email
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Verify your setup. The test goes from the COMMUNICATION module's sender address.
          {!settings.enabled && enabledOnReady && (
            <span className="text-violet-600 font-medium"> You can test before enabling the service — useful for confirming credentials work.</span>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input data-testid="account-test-to-input"
            type="email"
            className={inp + " flex-1"}
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="recipient@example.com"
          />
          <button data-testid="account-send-test-btn"
            type="button"
            disabled={testing || !enabledOnReady}
            onClick={onSendTest}
            className="px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2 justify-center"
          >
            {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {testing ? "Sending…" : "Send test"}
          </button>
        </div>
        {!enabledOnReady && (
          <p className="text-[11px] text-amber-600 mt-2">
            {mode === "byo"
              ? "Add your Zepto auth key and verified sender domain above first."
              : "Platform-shared Zepto isn't configured on this server. Contact support."}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Top-of-page hero with the prominent master power switch.
 *
 * The previous version had a tiny 12px pill-toggle in the corner that was easy
 * to miss — users couldn't find "the master switch" the diagnostic logs
 * referred to. This version makes it the clear focal point: a big colored
 * card, a giant labeled button ("Turn email on" / "Turn email off"), a status
 * dot, and a diagnostic strip showing all three gates.
 */
function HeroPanel({
  state,
  masterOn,
  senderReady,
  silencedCount,
  totalModules,
  canEnable,
  savingEnable,
  onToggle,
  pricingMessage,
}: {
  state: "live" | "partial" | "off";
  masterOn: boolean;
  senderReady: boolean;
  silencedCount: number;
  totalModules: number;
  canEnable: boolean;
  savingEnable: boolean;
  onToggle: () => void;
  pricingMessage: string;
}) {
  const palette = state === "live"
    ? { ring: "ring-emerald-200", bg: "from-emerald-50 to-white", iconBg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", label: "Email service is LIVE" }
    : state === "partial"
    ? { ring: "ring-amber-200", bg: "from-amber-50 to-white",   iconBg: "bg-amber-100 text-amber-700",     dot: "bg-amber-500",   label: "Email service is ON (with issues)" }
    : { ring: "ring-slate-200", bg: "from-slate-50 to-white",   iconBg: "bg-slate-200 text-slate-600",     dot: "bg-slate-400",   label: "Email service is OFF" };

  const subtitle = state === "live"
    ? "All modules are sending. Recipients are receiving emails as expected."
    : state === "partial"
    ? `Service is on but ${silencedCount > 0 ? `${silencedCount} of ${totalModules} module${silencedCount === 1 ? "" : "s"} silenced` : "setup incomplete"} — see the diagnostic below.`
    : "No emails are being sent. Click the button to turn the service on.";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${palette.bg} border border-slate-200 ring-4 ${palette.ring} ring-opacity-30 shadow-sm`}
    >
      <div className="p-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
          {/* Status icon + label */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-2xl grid place-items-center shrink-0 ${palette.iconBg}`}>
              <Power size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${palette.dot} ${state !== "off" ? "animate-pulse" : ""}`} />
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  Master switch — {masterOn ? "ON" : "OFF"}
                </p>
              </div>
              <h2 className="text-m font-bold text-slate-900 leading-tight">{palette.label}</h2>
              <p className="text-xs text-slate-600 mt-1">{subtitle}</p>
            </div>
          </div>

          {/* Big primary CTA */}
          <button
            type="button"
            disabled={savingEnable || !canEnable}
            onClick={onToggle}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2.5 transition-all shadow-sm ${
              masterOn
                ? "bg-white border-2 border-slate-300 text-slate-700 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50"
                : "bg-violet-600 text-white border-2 border-violet-600 hover:bg-violet-700 hover:border-violet-700 disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500"
            } ${savingEnable ? "opacity-60 cursor-wait" : ""} disabled:cursor-not-allowed`}
            title={!canEnable && !masterOn ? "Configure sender below before enabling" : ""}
          >
            {savingEnable ? <RefreshCw size={16} className="animate-spin" /> : <Power size={16} />}
            <span>
              {savingEnable
                ? (masterOn ? "Disabling…" : "Enabling…")
                : (masterOn ? "Turn email OFF" : "Turn email ON")}
            </span>
          </button>
        </div>

        {/* Diagnostic strip — shows the three gates at-a-glance */}
        <div className="mt-2 pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DiagnosticPill
            label="Master switch"
            ok={masterOn}
            okText="Service is ON"
            badText="Service is OFF — emails will NOT fire"
          />
          <DiagnosticPill
            label="Sender configuration"
            ok={senderReady}
            okText="Credentials ready"
            badText="Missing credentials — see Sender configuration"
          />
          <DiagnosticPill
            label="Module triggers"
            ok={silencedCount === 0}
            okText={`All ${totalModules} modules active`}
            badText={`${silencedCount} of ${totalModules} module${silencedCount === 1 ? "" : "s"} silenced`}
          />
        </div>

        {/* Helpful nudges */}
        {!masterOn && !canEnable && (
          <div className="mt-4 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>
              Can't turn on yet — finish <span className="font-semibold">Sender configuration</span> below first.
              Once your auth key + sender domain are filled in (BYO) or the platform is reachable (shared),
              the button above will become clickable.
            </p>
          </div>
        )}
        {masterOn && silencedCount > 0 && (
          <div className="mt-4 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>
              {silencedCount} module{silencedCount === 1 ? " is" : "s are"} silenced. Scroll to the{" "}
              <span className="font-semibold">Modules</span> section below and toggle them back on.
            </p>
          </div>
        )}
        {!masterOn && canEnable && (
          <p className="mt-4 text-xs text-slate-500 italic">
            <ChevronRight size={11} className="inline -mt-0.5" /> {pricingMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function DiagnosticPill({
  label, ok, okText, badText,
}: {
  label: string; ok: boolean; okText: string; badText: string;
}) {
  return (
    <div className={`rounded-xl p-1.5 border text-xs ${
      ok ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"
    }`}>
      <div className="flex items-center gap-2 mb-0.5">
        {ok
          ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
          : <CircleDashed size={13} className="text-rose-600 shrink-0" />}
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</p>
      </div>
      <p className={`font-semibold leading-snug ${ok ? "text-emerald-800" : "text-rose-800"}`}>
        {ok ? okText : badText}
      </p>
    </div>
  );
}

function ModeCard({
  selected, available, onClick, title, description, badge,
}: {
  selected: boolean; available: boolean; onClick: () => void;
  title: string; description: React.ReactNode; badge: string;
}) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition-all ${
        selected
          ? "border-violet-500 bg-violet-50/60 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      } ${!available ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`w-7 h-7 rounded-lg grid place-items-center ${
            selected ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Mail size={14} />
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            selected ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className={`text-sm font-bold mb-1 ${selected ? "text-violet-800" : "text-slate-800"}`}>{title}</p>
      <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
    </button>
  );
}

/**
 * Unified per-module tile panel. Each module gets ONE card showing:
 *   - Icon + name
 *   - ON/OFF gate toggle (formerly "Email triggers per module")
 *   - Trigger description
 *   - Editable sender local-part with full-address preview (formerly "Module sender addresses")
 *
 * Previously these were two separate sections, requiring two scrolls + two
 * mental models for the same module. Now everything you can configure for a
 * module lives in one tile.
 */
function ModuleTilesPanel({
  moduleGates,
  moduleAddrs,
  savingGateKey,
  savingAddrKey,
  isShared,
  onToggleGate,
  onSaveAddr,
}: {
  moduleGates: EmailModulesGates;
  moduleAddrs: ModuleAddrs;
  savingGateKey: string | null;
  savingAddrKey: string | null;
  isShared: boolean;
  onToggleGate: (key: string, next: boolean) => void | Promise<void>;
  onSaveAddr: (key: string, value: string) => void | Promise<void>;
}) {
  const silenced = moduleGates.availableModules.filter(k => moduleGates.modules[k] === false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-2 mb-1">
        <MessageCircle size={16} className="text-violet-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Modules</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            One tile per module. Toggle the trigger on/off and customize the sender
            address — both controls live together so you can configure a module at a glance.
          </p>
        </div>
      </div>

      {silenced.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">
              {silenced.length} module{silenced.length === 1 ? " is" : "s are"} silenced — no emails will fire for{" "}
              {silenced.map(k => MODULE_LABELS[k] ?? k).join(", ")}.
            </p>
            <p className="mt-1 text-amber-700">
              The module's actions still run (admissions still admit, attendance still records) but
              the related email notifications are suppressed.
            </p>
          </div>
        </div>
      )}

      {isShared && (
        <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <Info size={12} className="mt-0.5 shrink-0 text-slate-400" />
          <p>
            On platform-shared mode, all emails are sent <span className="font-semibold">from</span>{" "}
            <code className="font-mono text-slate-700">noreply@edupilots.in</code> (Zepto only delivers
            from registered sender addresses). The per-module addresses you set below appear as{" "}
            <span className="font-semibold">Reply-To</span> and in the from-name, so recipients still
            see your school + department identity.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {moduleGates.availableModules.map((key) => (
          <ModuleTile
            key={key}
            moduleKey={key}
            enabled={moduleGates.modules[key] !== false}
            gateBusy={savingGateKey === key}
            onToggleGate={(v) => onToggleGate(key, v)}
            currentLocalPart={moduleAddrs.modules[key]?.localPart ?? moduleAddrs.defaults[key] ?? "hello"}
            defaultLocalPart={moduleAddrs.defaults[key] ?? "hello"}
            preview={moduleAddrs.preview?.[key]?.email ?? null}
            isOverride={!!moduleAddrs.modules[key]?.isOverride}
            addrBusy={savingAddrKey === key}
            onSaveAddr={(v) => onSaveAddr(key, v)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
        <Info size={12} className="mt-0.5 shrink-0 text-slate-400" />
        <p>
          Sender prefixes use 2–30 lowercase characters, optionally with periods, hyphens, or underscores.
          Leave blank to revert to the default (e.g. <code className="font-mono text-slate-700">finance</code>,{" "}
          <code className="font-mono text-slate-700">attendance</code>).
        </p>
      </div>

      <ActivityGatesSection />
    </div>
  );
}

/**
 * Per-trigger email gates (#8). A module can stay ON while ONE email inside it
 * is muted — e.g. keep Finance on for new invoices but stop the overdue
 * chasers. A trigger with no override of its own "follows" its module, and we
 * say exactly that rather than showing a misleading hard ON.
 */
function ActivityGatesSection() {
  const { addToast } = useToast();
  const [data, setData] = useState<EmailActivityGates | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    try {
      setData(await api.getEmailActivities());
    } catch {
      setData(null);
    }
  };
  useEffect(() => { void load(); }, []);

  /** `next === null` drops the override so the trigger follows its module. */
  const apply = async (moduleKey: string, activityKey: string, next: boolean | null) => {
    const gateKey = `${moduleKey}:${activityKey}`;
    setSavingKey(gateKey);
    try {
      const res = await api.updateEmailActivities({ [gateKey]: next });
      setData(res);
      addToast(
        next === null ? "Trigger now follows its module"
          : next ? "Trigger enabled" : "Trigger muted",
        "success",
      );
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? "Could not update trigger", "error");
    } finally {
      setSavingKey(null);
    }
  };

  if (!data) return null;

  const mutedCount = data.modules.reduce(
    (n, m) => n + m.activities.filter((a) => !a.inherited && !a.enabled).length, 0,
  );

  return (
    <div className="mt-6 pt-5 border-t border-slate-200" data-testid="email-activity-gates">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-sm font-bold text-slate-800">Individual email triggers</h4>
        {mutedCount > 0 && (
          <span data-testid="email-activity-muted-count"
            className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
            {mutedCount} muted
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mb-4">
        Finer control than the module switches above. Muting a trigger stops only that one email —
        the module keeps sending everything else, and the underlying action still happens.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {data.modules.map((m) => (
          <div key={m.module} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-slate-700">{MODULE_LABELS[m.module] ?? m.module}</p>
              {!m.enabled && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                  module off
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {m.activities.map((a) => {
                const gateKey = `${m.module}:${a.key}`;
                const busy = savingKey === gateKey;
                return (
                  <div key={a.key}
                    data-testid="email-activity-row"
                    data-activity-key={gateKey}
                    data-enabled={a.enabled ? "true" : "false"}
                    data-inherited={a.inherited ? "true" : "false"}
                    className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-600 truncate">{a.label}</p>
                      {a.inherited ? (
                        <p className="text-[10px] text-slate-400">following module</p>
                      ) : (
                        <button data-testid="email-activity-reset-btn"
                          onClick={() => apply(m.module, a.key, null)}
                          disabled={busy}
                          className="text-[10px] text-indigo-500 hover:underline disabled:opacity-50">
                          reset to module
                        </button>
                      )}
                    </div>
                    <button data-testid="email-activity-toggle-btn"
                      onClick={() => apply(m.module, a.key, !a.enabled)}
                      disabled={busy || !m.enabled}
                      title={!m.enabled ? "Turn the module on first" : undefined}
                      className={`shrink-0 text-[10px] font-bold rounded-full px-2.5 py-1 border transition-colors disabled:opacity-50 ${
                        a.enabled
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                      }`}>
                      {busy ? "…" : a.enabled ? "On" : "Muted"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleTile({
  moduleKey,
  enabled,
  gateBusy,
  onToggleGate,
  currentLocalPart,
  defaultLocalPart,
  preview,
  isOverride,
  addrBusy,
  onSaveAddr,
}: {
  moduleKey: string;
  enabled: boolean;
  gateBusy: boolean;
  onToggleGate: (next: boolean) => void;
  currentLocalPart: string;
  defaultLocalPart: string;
  preview: string | null;
  isOverride: boolean;
  addrBusy: boolean;
  onSaveAddr: (next: string) => void;
}) {
  const meta = MODULE_META[moduleKey] ?? { label: moduleKey, icon: MessageCircle, description: "", tone: "slate" };
  const Icon = meta.icon;

  // Address editor state — local because expanding the editor is per-tile.
  const [editingAddr, setEditingAddr] = useState(false);
  const [draft, setDraft] = useState(currentLocalPart);

  useEffect(() => { setDraft(currentLocalPart); }, [currentLocalPart]);

  const isValid = draft === "" || LOCAL_PART_RX.test(draft);

  return (
    <div
      className={`rounded-2xl border-2 p-4 shadow-sm transition-all ${
        enabled
          ? (isOverride ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-white")
          : "border-slate-200 bg-slate-50/50"
      }`}
    >
      {/* Header row: icon + name + ON/OFF pill + Switch */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${TONE_BG[meta.tone] ?? "bg-slate-100 text-slate-700"} ${enabled ? "" : "opacity-50"}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <p id={`module-${moduleKey}-label`} className={`text-sm font-bold ${enabled ? "text-slate-900" : "text-slate-500"}`}>
                {meta.label}
              </p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                enabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                {enabled ? "ON" : "OFF"}
              </span>
              {isOverride && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  customized
                </span>
              )}
            </div>
            <Switch
              size="lg"
              tone="emerald"
              checked={enabled}
              loading={gateBusy}
              onChange={onToggleGate}
              ariaLabelledBy={`module-${moduleKey}-label`}
            />
          </div>
          <p className={`text-xs leading-relaxed mt-1 ${enabled ? "text-slate-500" : "text-slate-400"}`}>
            {meta.description}
          </p>
        </div>
      </div>

      {/* Sender address row: full-width below the header */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-1.5">
          <AtSign size={11} className="text-slate-400 shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Sender address
          </p>
        </div>

        {editingAddr ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={draft}
              maxLength={30}
              onChange={(e) => setDraft(e.target.value.toLowerCase())}
              placeholder={defaultLocalPart}
              autoFocus
              className={`flex-1 min-w-0 px-2.5 py-1.5 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 ${
                isValid ? "border-slate-200 focus:ring-violet-300" : "border-rose-300 focus:ring-rose-300"
              }`}
              aria-label={`${meta.label} sender prefix`}
            />
            <button
              type="button"
              disabled={!isValid || addrBusy}
              onClick={() => { onSaveAddr(draft); setEditingAddr(false); }}
              className="text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed p-1.5 hover:bg-emerald-50 rounded-lg shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              title="Save sender prefix"
              aria-label="Save sender prefix"
            >
              {addrBusy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              onClick={() => { setDraft(currentLocalPart); setEditingAddr(false); }}
              className="text-slate-500 p-1.5 hover:bg-slate-100 rounded-lg shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
              title="Cancel"
              aria-label="Cancel sender prefix edit"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 group">
            <p
              className="text-sm font-mono text-slate-700 truncate flex-1 min-w-0"
              title={preview ?? undefined}
            >
              {preview ?? <span className="text-slate-400 italic text-xs">{currentLocalPart}@…</span>}
            </p>
            <button
              type="button"
              onClick={() => setEditingAddr(true)}
              className="text-violet-600 p-1.5 hover:bg-violet-100 rounded-lg shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
              title="Edit sender prefix"
              aria-label={`Edit ${meta.label} sender prefix`}
            >
              <Pencil size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function UsageBlock({
  label,
  data,
  usingShared,
}: {
  label: string;
  data: { totalSent: number; billableSent: number; failed: number; bounced: number; estimatedAmount: number };
  usingShared: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat value={data.totalSent} label="Sent" />
        <Stat value={data.failed + data.bounced} label="Failed" tone="rose" />
        <Stat value={data.billableSent} label="Billable" tone="amber" />
        <Stat
          value={usingShared ? data.estimatedAmount : 0}
          label={usingShared ? "Charge" : "—"}
          prefix="₹"
          tone="emerald"
        />
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  prefix = "",
  tone = "slate",
}: {
  value: number;
  label: string;
  prefix?: string;
  tone?: "slate" | "rose" | "amber" | "emerald";
}) {
  const toneMap = {
    slate: "text-slate-900",
    rose: "text-rose-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="bg-slate-50 rounded-lg px-2.5 py-2">
      <p className={`text-base font-bold ${toneMap[tone]}`}>
        {prefix}
        {fmtNum(value)}
      </p>
      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}
