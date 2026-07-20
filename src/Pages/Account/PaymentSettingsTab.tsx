import { useEffect, useState } from "react";
import {
  CreditCard, ShieldCheck, AlertTriangle, RefreshCw, Copy, Check, Eye, EyeOff,
  ExternalLink, Info,
} from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import Switch from "../../components/common/Switch";

type PaymentSettings = Awaited<ReturnType<typeof api.getPaymentSettings>>["payments"];

const inp =
  "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white placeholder:text-slate-400 transition-colors font-mono";
const lbl = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

export default function PaymentSettingsTab() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields — secrets are write-only; key id is editable, secrets blank when present (existing values masked)
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () =>
    api
      .getPaymentSettings()
      .then((r) => {
        setSettings(r.payments);
        setKeyId(r.payments.keyId ?? "");
      })
      .catch(() => addToast("Failed to load payment settings", "error"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: Parameters<typeof api.updatePaymentSettings>[0] = {};
      if (keyId !== (settings.keyId ?? "")) payload.keyId = keyId;
      if (keySecret) payload.keySecret = keySecret;
      if (webhookSecret) payload.webhookSecret = webhookSecret;
      await api.updatePaymentSettings(payload);
      addToast("Payment credentials saved", "success");
      setKeySecret("");
      setWebhookSecret("");
      await load();
    } catch (err: any) {
      addToast(
        err?.response?.data?.message ?? "Failed to save payment settings",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const onToggleEnabled = async (next: boolean) => {
    setSaving(true);
    try {
      await api.updatePaymentSettings({ enabled: next });
      addToast(next ? "Online payments enabled" : "Online payments disabled", "success");
      await load();
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? "Failed to toggle online payments", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = async () => {
    if (!settings?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(settings.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast("Could not copy URL", "error");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <RefreshCw size={18} className="animate-spin mr-2" /> Loading payment settings…
      </div>
    );
  if (!settings) return null;

  const envBadge = settings.keyIdEnvironment;

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl grid place-items-center ${
                settings.enabled && settings.isFullyConfigured
                  ? "bg-emerald-50 text-emerald-600"
                  : settings.isFullyConfigured
                  ? "bg-amber-50 text-amber-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <CreditCard size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Razorpay payments</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {settings.enabled
                  ? "Students can pay fees online via Razorpay checkout."
                  : "Students can only pay offline. Enable to accept online payments."}
              </p>
              {settings.configuredByName && settings.configuredAt && (
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Last updated by {settings.configuredByName} on{" "}
                  {new Date(settings.configuredAt).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {envBadge && (
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  envBadge === "live"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                <ShieldCheck size={10} /> {envBadge} mode
              </span>
            )}
            <Switch
              size="md"
              tone="emerald"
              checked={settings.enabled}
              loading={saving}
              disabled={!settings.isFullyConfigured && !settings.enabled}
              onChange={(v) => onToggleEnabled(v)}
              ariaLabel={settings.enabled ? "Disable online payments" : "Enable online payments"}
              testId="payment-toggle-enabled"
            />
          </div>
        </div>

        {!settings.isFullyConfigured && (
          <div className="mt-5 flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>
              Razorpay credentials are not fully configured. Add your Key ID and Key Secret below
              to start accepting online payments.
            </p>
          </div>
        )}
      </div>

      {/* Credentials form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Razorpay credentials</h3>
        <p className="text-xs text-slate-500 mb-5">
          From your Razorpay dashboard → Account & Settings → API Keys. Secrets are never displayed
          after saving — re-enter to rotate.
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={lbl}>Key ID</label>
            <input data-testid="account-key-id-input"
              type="text"
              className={inp}
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_test_xxxxxxxxxx"
            />
            <p className="text-[10px] text-slate-400 mt-1">Starts with rzp_test_ or rzp_live_</p>
          </div>

          <div>
            <label className={lbl}>
              Key Secret{" "}
              {settings.hasKeySecret && (
                <span className="ml-1 text-emerald-600 normal-case font-mono tracking-normal text-[10px]">
                  current: {settings.keySecretMask}
                </span>
              )}
            </label>
            <div className="relative">
              <input data-testid="account-key-secret-input"
                type={showKeySecret ? "text" : "password"}
                className={inp + " pr-9"}
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder={settings.hasKeySecret ? "•••••••••• (leave blank to keep)" : "Enter secret"}
              />
              <button data-testid="account-show-key-secret-btn"
                type="button"
                onClick={() => setShowKeySecret(!showKeySecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                {showKeySecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className={lbl}>
              Webhook Secret{" "}
              {settings.hasWebhookSecret && (
                <span className="ml-1 text-emerald-600 normal-case font-mono tracking-normal text-[10px]">
                  current: {settings.webhookSecretMask}
                </span>
              )}
            </label>
            <div className="relative">
              <input data-testid="account-webhook-secret-input"
                type={showWebhookSecret ? "text" : "password"}
                className={inp + " pr-9"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={settings.hasWebhookSecret ? "•••••••••• (leave blank to keep)" : "Optional but recommended"}
              />
              <button data-testid="account-show-webhook-secret-btn"
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                {showWebhookSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Configure the URL below in your Razorpay dashboard webhook settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button data-testid="account-save-btn"
            type="button"
            disabled={saving}
            onClick={onSave}
            className="px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {saving ? "Saving…" : "Save credentials"}
          </button>
          <button
            type="button"
            onClick={() => {
              setKeyId(settings.keyId ?? "");
              setKeySecret("");
              setWebhookSecret("");
            }}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Webhook URL card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-2 mb-3">
          <Info size={14} className="text-slate-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Webhook URL</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste this in Razorpay → Account → Webhooks to receive payment events.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <code className="text-xs text-slate-700 font-mono truncate flex-1">
            {settings.webhookUrl || "(set APP_BASE_URL in backend env)"}
          </code>
          <button data-testid="account-copy-webhook-btn"
            type="button"
            onClick={copyWebhook}
            disabled={!settings.webhookUrl}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <a
            href="https://dashboard.razorpay.com/app/webhooks"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:text-violet-700"
            title="Open Razorpay dashboard"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
