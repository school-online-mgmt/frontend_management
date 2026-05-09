import { useEffect, useMemo, useState } from "react";
import {
  Receipt, RefreshCw, AlertCircle, Building2, Mail, GraduationCap,
  CheckSquare, Square, Wallet, Filter, ExternalLink,
} from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";

declare global {
  interface Window { Razorpay: any; }
}

type Bill = Awaited<ReturnType<typeof api.getPlatformBills>>["bills"][number];

const SOURCE_META: Record<Bill["source"], { label: string; icon: React.ElementType; tone: string }> = {
  ADMISSION_CHARGE: { label: "Admission charge",     icon: GraduationCap, tone: "violet"  },
  EMAIL_BILL:       { label: "Email bill",           icon: Mail,          tone: "indigo"  },
  SAAS_INVOICE:     { label: "SaaS subscription",    icon: Building2,     tone: "emerald" },
};

const TONE_BG: Record<string, string> = {
  violet:  "bg-violet-50 text-violet-700",
  indigo:  "bg-indigo-50 text-indigo-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const STATUS_FILTERS: Array<{ key: string; label: string; tone: string }> = [
  { key: "ALL",     label: "All",     tone: "slate"   },
  { key: "PENDING", label: "Pending", tone: "amber"   },
  { key: "PAID",    label: "Paid",    tone: "emerald" },
  { key: "WAIVED",  label: "Waived",  tone: "slate"   },
];

export default function PlatformBillsPage() {
  const { addToast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<{ total: number; pendingAmount: number; paidAmount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getPlatformBills(statusFilter === "ALL" ? undefined : statusFilter);
      setBills(r.bills);
      setSummary(r.summary);
      setSelected(new Set());
    } catch {
      addToast("Failed to load platform bills", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingBills = useMemo(() => bills.filter((b) => b.status === "PENDING"), [bills]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPending = () => {
    if (selected.size === pendingBills.length && pendingBills.every((b) => selected.has(b.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingBills.map((b) => b.id)));
    }
  };

  const selectedTotal = useMemo(
    () => bills.filter((b) => selected.has(b.id)).reduce((s, b) => s + (b.amount ?? 0), 0),
    [bills, selected]
  );

  const onPaySelected = async () => {
    if (selected.size === 0) return;
    if (!window.Razorpay) {
      addToast("Razorpay SDK not loaded — please refresh", "error");
      return;
    }
    const items = bills
      .filter((b) => selected.has(b.id) && b.status === "PENDING")
      .map((b) => ({ source: b.source, id: b.id }));
    if (items.length === 0) {
      addToast("No PENDING bills selected", "warning");
      return;
    }

    setPaying(true);
    try {
      const order = await api.createPlatformBillBulkOrder(items);
      const options = {
        key: order.keyId ?? "",
        amount: order.amount,
        currency: order.currency,
        name: "EduPilots Platform",
        description: `Platform bills — ${order.billsCount} item${order.billsCount > 1 ? "s" : ""}`,
        order_id: order.orderId,
        notes: { tenantBills: items.map((i) => i.id).join(",").slice(0, 200) },
        theme: { color: "#7c3aed" },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setPaying(false);
            addToast("Payment window closed — no charge made", "info");
          },
        },
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.verifyPlatformBillBulkOrder({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
              items,
            });
            addToast(`Payment successful — ${items.length} bill(s) marked paid`, "success");
            await load();
          } catch (err: any) {
            addToast(
              err?.response?.data?.message ?? "Verification failed — contact support if money was deducted",
              "error"
            );
          } finally {
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setPaying(false);
        const desc = resp?.error?.description ?? "Payment failed";
        addToast(`Payment failed: ${desc}`, "error");
      });
      rzp.open();
    } catch (err: any) {
      setPaying(false);
      const msg = err?.response?.data?.message ?? "Failed to start payment";
      addToast(msg, "error");
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        icon={Receipt}
        title="Platform Bills"
        subtitle="Admission charges, email service usage and SaaS subscription — pay one or many at once via Razorpay"
        gradient={MODULE_THEMES.finance}
        onRefresh={load}
        refreshing={loading}
        primaryActions={
          selected.size > 0 ? (
            <button
              type="button"
              disabled={paying}
              onClick={onPaySelected}
              data-testid="pay-selected-btn"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 text-sm font-bold rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-60 disabled:cursor-wait shadow-sm shrink-0"
            >
              <Wallet size={14} />
              {paying ? "Processing…" : `Pay ${selected.size} bill${selected.size > 1 ? "s" : ""} · ${fmt(selectedTotal)}`}
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4">
      {loading && bills.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Loading platform bills…
        </div>
      ) : (<>
      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Receipt size={18} />}
          label="Total bills"
          value={summary?.total ?? 0}
          tone="violet"
        />
        <SummaryCard
          icon={<AlertCircle size={18} />}
          label="Pending"
          value={fmt(summary?.pendingAmount ?? 0)}
          tone="amber"
          highlight
        />
        <SummaryCard
          icon={<CheckSquare size={18} />}
          label="Paid (lifetime)"
          value={fmt(summary?.paidAmount ?? 0)}
          tone="emerald"
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filters</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                statusFilter === f.key
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bills list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {bills.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Receipt size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No bills match this filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                <th className="px-4 py-3 w-10">
                  {pendingBills.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllPending}
                      className="text-slate-400 hover:text-violet-600 transition-colors"
                      title="Select all pending"
                    >
                      {pendingBills.length > 0 && pendingBills.every((b) => selected.has(b.id)) ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  )}
                </th>
                <th className="px-4 py-3">Bill</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => {
                const meta = SOURCE_META[b.source];
                const Icon = meta.icon;
                const canSelect = b.status === "PENDING";
                const isSelected = selected.has(b.id);
                return (
                  <tr key={b.id} className={`border-b border-slate-100 last:border-0 ${isSelected ? "bg-violet-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!canSelect}
                        onClick={() => canSelect && toggleSelect(b.id)}
                        className={`text-slate-400 hover:text-violet-600 transition-colors ${!canSelect ? "opacity-30 cursor-not-allowed" : ""}`}
                      >
                        {isSelected ? <CheckSquare size={16} className="text-violet-600" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 text-sm">{b.label}</p>
                      {b.extra && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {b.source === "EMAIL_BILL" && (b.extra as any).billableEmailCount != null && (
                            <>{(b.extra as any).billableEmailCount} billable emails</>
                          )}
                          {b.source === "SAAS_INVOICE" && (b.extra as any).studentCount != null && (
                            <>{(b.extra as any).studentCount} students × {(b.extra as any).monthsCovered}mo</>
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${TONE_BG[meta.tone] ?? "bg-slate-100 text-slate-700"}`}>
                        <Icon size={10} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(b.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
        <ExternalLink size={11} /> Payments are processed under EduPilots' Razorpay account, not your school's.
      </p>
      </>)}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "violet" | "amber" | "emerald";
  highlight?: boolean;
}) {
  const map = {
    violet: { bg: "bg-violet-50", iconBg: "bg-violet-100 text-violet-700", value: "text-violet-700" },
    amber: { bg: "bg-amber-50", iconBg: "bg-amber-100 text-amber-700", value: "text-amber-700" },
    emerald: { bg: "bg-emerald-50", iconBg: "bg-emerald-100 text-emerald-700", value: "text-emerald-700" },
  };
  const t = map[tone];
  return (
    <div className={`bg-white border ${highlight ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"} rounded-2xl p-4 shadow-sm`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-lg grid place-items-center ${t.iconBg}`}>{icon}</div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold mt-2 ${t.value}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s === "PAID"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "WAIVED"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : s === "CANCELLED"
      ? "bg-rose-50 text-rose-600 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${tone}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {s}
    </span>
  );
}
