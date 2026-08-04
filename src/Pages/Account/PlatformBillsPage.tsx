import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Receipt, AlertCircle, Building2, Mail, IndianRupee, CheckCircle,
    Clock, XCircle, Calendar, ChevronDown, Layers,
    ListChecks, CircleDollarSign,
} from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { ErrorState } from "../../components/ui";

declare global {
    interface Window { Razorpay: any; }
}

const fmtINR = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
const fmtDate = (s: string | null | undefined) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const StatusPill = ({ value, isOverdue }: { value: string; isOverdue?: boolean }) => {
    const status = isOverdue && (value === "PENDING") ? "OVERDUE" : value;
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        PENDING:   { bg: "bg-amber-100",   text: "text-amber-700",   icon: <Clock size={12} /> },
        PAID:      { bg: "bg-emerald-100", text: "text-emerald-700", icon: <CheckCircle size={12} /> },
        OVERDUE:   { bg: "bg-rose-100",    text: "text-rose-700",    icon: <AlertCircle size={12} /> },
        WAIVED:    { bg: "bg-slate-200",   text: "text-slate-600",   icon: <XCircle size={12} /> },
        CANCELLED: { bg: "bg-slate-100",   text: "text-slate-500",   icon: <XCircle size={12} /> },
    };
    const s = map[status] ?? map.PENDING!;
    return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${s.bg} ${s.text}`}>{s.icon} {status}</span>;
};

/** Human label for a module code used in invoice line items. */
const MODULE_LABEL: Record<string, string> = {
    PEOPLE: "People", TEACHERS: "Teachers", ACADEMICS: "Academics", STUDIES: "Studies / Exam",
    ATTENDANCE: "Attendance", LIBRARY: "Library", COMMUNICATION: "Communication", FINANCE: "Finance",
    TRANSPORT: "Transport", SPORTS: "Sports", INVENTORY: "Inventory", HOMEWORK: "Homework", TIMETABLE: "Timetable",
};

const StatTile = ({ icon: Icon, label, value, tint, tintText }: { icon: any; label: string; value: React.ReactNode; tint: string; tintText: string }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div className={`w-10 h-10 ${tint} rounded-xl flex items-center justify-center shrink-0`}><Icon size={18} className={tintText} /></div>
        <div className="min-w-0"><p className="text-lg font-bold text-slate-900 tabular-nums leading-none">{value}</p><p className="text-[11px] text-slate-500 mt-1">{label}</p></div>
    </div>
);

/** Renders the per-module line-item breakdown of an invoice. */
const LineItems = ({ items }: { items: any[] }) => {
    if (!items || items.length === 0) return <p className="text-xs text-slate-400 px-4 py-3">No line-item breakdown available for this invoice.</p>;
    return (
        <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><ListChecks size={12} /> Breakdown</p>
            <div className="rounded-xl border border-slate-100 overflow-hidden">
                {items.map((li: any, idx: number) => (
                    <div key={idx} className={`flex items-center justify-between gap-3 px-3 py-2 text-xs ${idx % 2 ? "bg-slate-50/60" : "bg-white"}`}>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-700">{MODULE_LABEL[li.module] ?? li.module ?? "Item"}</p>
                            <p className="text-[11px] text-slate-400">
                                {li.description
                                    ? li.description
                                    : `₹${li.pricePerSeat}/seat × ${li.seats} seats${li.months ? ` × ${li.months} mo` : ""}`}
                            </p>
                        </div>
                        <span className="font-bold text-slate-800 shrink-0">{fmtINR(li.amountINR)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PlatformBillsPage = () => {
    const qc = useQueryClient();
    const { addToast: toast } = useToast();
    const [paying, setPaying] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const query = useQuery({
        queryKey: ["platform-bills"],
        queryFn: () => api.getPlatformBills(),
    });

    const pay = async (invoiceId: string, invoiceNumber: string, amountINR: number) => {
        if (paying) return;
        setPaying(invoiceId);
        try {
            const order = await api.createPlatformBillOrder(invoiceId);
            const rp = new window.Razorpay({
                key: order.keyId,
                amount: order.amountINR * 100,
                currency: "INR",
                order_id: order.orderId,
                name: "EduPilots",
                description: `Invoice ${order.invoiceNumber}`,
                handler: async (response: any) => {
                    try {
                        await api.verifyPlatformBillOrder(invoiceId, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });
                        await qc.invalidateQueries({ queryKey: ["platform-bills"] });
                        await qc.invalidateQueries({ queryKey: ["platform-bills-overdue"] });
                        toast(`Invoice ${invoiceNumber} paid — ${fmtINR(amountINR)}`, "success");
                    } catch (e: any) {
                        toast(e?.response?.data?.message || "Payment verification failed", "error");
                    } finally {
                        setPaying(null);
                    }
                },
                modal: { ondismiss: () => setPaying(null) },
                theme: { color: "#10b981" },
            });
            rp.open();
        } catch (e: any) {
            toast(e?.response?.data?.message || "Failed to start payment", "error");
            setPaying(null);
        }
    };

    if (query.isLoading) return <div className="p-6 text-slate-500">Loading bills…</div>;
    // A flat "Failed to load bills." with no retry, on the screen a school pays
    // us from. Give it the standard error state so it can be retried in place.
    if (query.isError || !query.data) {
        return (
            <div className="p-6">
                <ErrorState
                    message="Could not load your bills."
                    onRetry={() => void query.refetch()}
                    testId="platform-bills-error"
                />
            </div>
        );
    }

    const { rows, totals, activeCycle } = query.data;

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-6">
            <PageHeader
                icon={Receipt}
                title="Platform Bills"
                subtitle="Your school's 12-month contract with EduPilots — installment invoices + monthly email usage bills."
                gradient={MODULE_THEMES.finance}
                onRefresh={() => qc.invalidateQueries({ queryKey: ["platform-bills"] })}
            />

            {/* Summary tiles */}
            {(() => {
                const paidCount = rows.filter(r => r.status === "PAID").length;
                const paidAmount = rows.filter(r => r.status === "PAID").reduce((s, r) => s + r.amount, 0);
                return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatTile icon={Receipt} label="Total invoices" value={rows.length} tint="bg-slate-100" tintText="text-slate-600" />
                        <StatTile icon={CircleDollarSign} label="Outstanding" value={fmtINR(totals.pendingAmountINR)} tint="bg-amber-50" tintText="text-amber-600" />
                        <StatTile icon={CheckCircle} label="Paid" value={`${paidCount} · ${fmtINR(paidAmount)}`} tint="bg-emerald-50" tintText="text-emerald-600" />
                        <StatTile icon={AlertCircle} label="Overdue" value={totals.overdueCount ?? 0} tint="bg-rose-50" tintText="text-rose-600" />
                    </div>
                );
            })()}

            {/* Overdue banner */}
            {totals.overdueCount > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                    <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold text-rose-900">
                            {totals.overdueCount} {totals.overdueCount === 1 ? "invoice is" : "invoices are"} overdue
                        </p>
                        <p className="text-sm text-rose-700 mt-0.5">
                            Please pay outstanding invoices to avoid service disruption.
                        </p>
                    </div>
                </div>
            )}

            {/* Active cycle summary */}
            {activeCycle && (
                <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Current 12-Month Contract</p>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Calendar size={20} className="text-emerald-600" />
                                {fmtDate(activeCycle.startDate)} → {fmtDate(activeCycle.endDate)}
                            </h2>
                        </div>
                        <StatusPill value={activeCycle.status} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="text-[10px] uppercase text-slate-500 tracking-wider">Seats</p><p className="text-lg font-bold">{activeCycle.seatsSnapshot}</p></div>
                        <div><p className="text-[10px] uppercase text-slate-500 tracking-wider">Installments</p><p className="text-lg font-bold">{activeCycle.installments}</p></div>
                        {activeCycle.discountPercent > 0 && <div><p className="text-[10px] uppercase text-slate-500 tracking-wider">Discount</p><p className="text-lg font-bold text-emerald-600">{activeCycle.discountPercent}%</p></div>}
                        <div><p className="text-[10px] uppercase text-slate-500 tracking-wider">Contract</p><p className="text-lg font-bold flex items-center gap-0.5"><IndianRupee size={14} />{activeCycle.totalINR.toLocaleString("en-IN")}</p></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-emerald-100">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-600">Paid so far</span>
                            <span className="font-bold text-emerald-700">{fmtINR(activeCycle.paidINR)} / {fmtINR(activeCycle.totalINR)}</span>
                        </div>
                        <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (activeCycle.paidINR / Math.max(1, activeCycle.totalINR)) * 100)}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Bill list */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                    Invoices ({rows.length}) · {fmtINR(totals.pendingAmountINR)} outstanding
                </h3>
                {rows.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border rounded-xl bg-white">
                        No bills yet. Once your contract is active, invoices will appear here.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rows.map((r) => {
                            const IconEl = r.source === "SUBSCRIPTION" ? Building2 : Mail;
                            const isOpen = expanded === r.id;
                            const lineItems = (r.lineItems as any[]) ?? [];
                            const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;
                            return (
                                <div key={r.id} data-testid="platform-bill-row" data-id={r.id} data-status={r.status} data-source={r.source} data-amount={r.amount} data-invoice-number={r.invoiceNumber} className={`bg-white border rounded-xl overflow-hidden ${r.isOverdue ? "border-rose-200" : "border-slate-200"}`}>
                                    <div className="p-4 flex items-start gap-3">
                                        <button data-testid="account-expanded-btn" onClick={() => setExpanded(isOpen ? null : r.id)}
                                            className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                                            title={isOpen ? "Hide breakdown" : "Show breakdown"}>
                                            <ChevronDown size={15} className={`transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                                        </button>
                                        <div className={`p-2 rounded-lg shrink-0 ${r.source === "SUBSCRIPTION" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                                            <IconEl size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-900">{r.title}</span>
                                                        <StatusPill value={r.status} isOverdue={r.isOverdue} />
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.source === "SUBSCRIPTION" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                                                            {r.source === "SUBSCRIPTION" ? "Contract" : "Email usage"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        <span className="font-mono">{r.invoiceNumber}</span>
                                                        {r.dueDate && ` · Due ${fmtDate(r.dueDate)}`}
                                                        {r.paidAt && ` · Paid ${fmtDate(r.paidAt)}${r.paidVia ? ` via ${r.paidVia}` : ""}`}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-lg font-bold text-slate-900 flex items-center gap-0.5 justify-end">
                                                        <IndianRupee size={14} />{r.amount.toLocaleString("en-IN")}
                                                    </div>
                                                    {r.source === "SUBSCRIPTION" && (r.status === "PENDING" || r.status === "OVERDUE") && (
                                                        <button data-testid="account-pay-btn"
                                                            onClick={() => pay(r.id, r.invoiceNumber, r.amount)}
                                                            disabled={paying === r.id}
                                                            className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-semibold"
                                                        >
                                                            {paying === r.id ? "Opening…" : "Pay now"}
                                                        </button>
                                                    )}
                                                    {r.source === "EMAIL" && r.status === "PENDING" && (
                                                        <p className="text-xs text-slate-400 mt-1">Contact support to settle</p>
                                                    )}
                                                </div>
                                            </div>
                                            {!isOpen && hasLineItems && (
                                                <button data-testid="account-expanded-btn-2" onClick={() => setExpanded(r.id)} className="text-[11px] text-emerald-600 font-semibold mt-1.5 inline-flex items-center gap-1 hover:underline">
                                                    <Layers size={11} /> View {lineItems.length}-item breakdown
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div className="border-t border-slate-100 bg-slate-50/40">
                                            <LineItems items={lineItems} />
                                            <div className="flex items-center justify-between px-4 pb-3 text-xs">
                                                <span className="text-slate-500">Invoice total</span>
                                                <span className="font-bold text-slate-900">{fmtINR(r.amount)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlatformBillsPage;
