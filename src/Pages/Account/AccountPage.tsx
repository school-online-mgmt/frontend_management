import { useState, useEffect } from "react";
import {
  Building2, Globe, Hash, Calendar, CreditCard, Clock,
  AlertTriangle, XCircle, TrendingUp, Receipt,
  Shield, User, Phone, Mail, ExternalLink, RefreshCw
} from "lucide-react";
import api from "../../api/api";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  trial:    { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Free Trial" },
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  expired:  { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Expired" },
  cancelled:{ bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Cancelled" },
};

const INV_STATUS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  waived:  "bg-slate-100 text-slate-600 border-slate-200",
};

const PLAN_LABEL: Record<string, string> = {
  monthly: "Monthly",
  semi_annual: "Semi-Annual (6 months)",
  annual: "Annual (12 months)",
};

const PLAN_DISCOUNT: Record<string, string> = {
  monthly: "No discount",
  semi_annual: "10% off",
  annual: "25% off",
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAccount()
      .then(setData)
      .catch(() => setError("Failed to load account details."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <RefreshCw size={20} className="animate-spin" />
        <p className="text-sm">Loading account details…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="p-8 text-center text-red-500 text-sm">{error ?? "Failed to load."}</div>
  );

  const { tenant, subscription: sub, invoices, user, trialDaysRemaining } = data;
  const statusStyle = sub ? (STATUS_STYLES[sub.status] ?? STATUS_STYLES.cancelled) : null;

  const totalPaid = (invoices as any[]).filter(i => i.status === 'paid').reduce((s: number, i: any) => s + i.totalAmount, 0);
  const pendingDues = (invoices as any[]).filter(i => i.status === 'pending').reduce((s: number, i: any) => s + i.totalAmount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Account & Subscription</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your school's EduPilots account details and billing information</p>
      </div>

      {/* Trial Banner */}
      {sub?.status === 'trial' && trialDaysRemaining !== null && (
        <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${trialDaysRemaining <= 5 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          {trialDaysRemaining <= 5
            ? <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            : <Clock size={18} className="text-blue-500 shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-bold ${trialDaysRemaining <= 5 ? 'text-red-800' : 'text-blue-800'}`}>
              {trialDaysRemaining === 0 ? 'Trial ends today!' : `Free trial: ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`}
            </p>
            <p className={`text-xs mt-0.5 ${trialDaysRemaining <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
              Contact us at <a href="mailto:hello@edupilots.in" className="underline font-medium">hello@edupilots.in</a> to upgrade your plan before trial ends. Your data is safe.
            </p>
          </div>
        </div>
      )}

      {/* Expired Banner */}
      {sub?.status === 'expired' && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border bg-red-50 border-red-200">
          <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Subscription Expired</p>
            <p className="text-xs text-red-600 mt-0.5">
              Please contact <a href="mailto:hello@edupilots.in" className="underline font-medium">hello@edupilots.in</a> to renew your subscription and restore full access.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* School Info */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
              <Building2 size={16} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">School Information</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Building2, label: "School Name", value: tenant.name },
                { icon: Hash, label: "Slug / ID", value: tenant.slug, mono: true },
                { icon: Globe, label: "Portal URL", value: tenant.origin, link: true },
                { icon: Calendar, label: "Member Since", value: new Date(tenant.createdAt).toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric' }) },
              ].map(({ icon: Icon, label, value, mono, link }) => (
                <div key={label} className="flex gap-3">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                    {link ? (
                      <a href={value} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 mt-0.5 truncate">
                        {value} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <p className={`text-sm font-semibold text-slate-900 mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
              <CreditCard size={16} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Subscription</h2>
            </div>
            {!sub ? (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-sm">No subscription configured yet.</p>
                <p className="text-xs text-slate-400 mt-1">Contact <a href="mailto:hello@edupilots.in" className="text-violet-600">hello@edupilots.in</a> to set up your plan.</p>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {statusStyle && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusStyle.label}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-violet-700">{fmt(sub.monthlyAmount)}</p>
                    <p className="text-xs text-slate-400">per month</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  {[
                    { label: "Plan", value: PLAN_LABEL[sub.planDuration] ?? sub.planDuration },
                    { label: "Students", value: sub.studentCount.toLocaleString() },
                    { label: "Rate", value: `₹${sub.pricePerStudent}/student` },
                    { label: "Discount", value: PLAN_DISCOUNT[sub.planDuration] ?? 'None' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {sub.trialEndDate && sub.status === 'trial' && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500">Trial ends on: <strong className="text-slate-800">{new Date(sub.trialEndDate).toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                  </div>
                )}
                {sub.subscriptionEndDate && sub.status === 'active' && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500">Subscription valid until: <strong className="text-slate-800">{new Date(sub.subscriptionEndDate).toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoice History */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Invoice History</h2>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">{(invoices as any[]).length}</span>
              </div>
            </div>
            {(invoices as any[]).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No invoices yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(invoices as any[]).map((inv: any) => (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                      <Receipt size={15} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-slate-600">{inv.invoiceNumber}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(inv.periodStart).toLocaleDateString("en-IN", { month: 'short', year: 'numeric' })} –{" "}
                        {new Date(inv.periodEnd).toLocaleDateString("en-IN", { month: 'short', year: 'numeric' })}
                        {" · "}{inv.studentCount} students · {inv.monthsCovered} month{inv.monthsCovered > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${INV_STATUS[inv.status] ?? ''}`}>
                        {inv.status}
                      </span>
                      <p className="text-sm font-bold text-slate-900">{fmt(inv.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* My Profile */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
              <User size={16} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">My Profile</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                  <span className="text-violet-700 font-bold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-violet-600 font-medium capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail size={13} className="text-slate-400" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={13} className="text-slate-400" />
                  {user?.phone}
                </div>
              </div>
            </div>
          </div>

          {/* Billing Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
              <TrendingUp size={16} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Billing Summary</h2>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "Total Paid", value: fmt(totalPaid), color: "text-emerald-600" },
                { label: "Pending Dues", value: fmt(pendingDues), color: pendingDues > 0 ? "text-amber-600" : "text-slate-400" },
                { label: "Total Invoices", value: String((invoices as any[]).length), color: "text-slate-900" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
              <div className="pt-2 text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
                <strong className="text-slate-600">Payment mode:</strong> Offline only (bank transfer / UPI). All invoices are raised by the EduPilots team.
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-violet-600" />
              <h3 className="text-sm font-bold text-slate-900">Need Help?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For billing queries, plan upgrades, or account issues — our team is here to help.
            </p>
            <a href="mailto:hello@edupilots.in"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors">
              <Mail size={13} /> hello@edupilots.in
            </a>
            <p className="text-center text-[10px] text-slate-400 mt-2">Response within 4 business hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}

