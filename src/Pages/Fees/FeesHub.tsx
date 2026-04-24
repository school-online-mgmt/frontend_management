import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, BookOpen, AlertCircle, Plus, Trash2, Edit3, CheckCircle, CheckCircle2,
    TrendingUp, AlertTriangle, RefreshCw, Save, Eye, Wallet, Download, RotateCcw,
} from 'lucide-react';
import api from '../../api/api';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';

/** Tiny card used inside the invoice-generation completion summary. */
const ResultStat = ({ label, value, className = '' }: { label: string; value: number; className?: string }) => (
    <div className={`rounded-lg border px-3 py-2 flex flex-col items-start ${className}`}>
        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">{label}</span>
        <span className="text-base font-bold leading-tight">{value}</span>
    </div>
);

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EXTRA_CHARGE_TYPES = ['FINE','LATE_FEE','ADMIT_CARD','ID_CARD','BOOKS','UNIFORM','SPORTS','LAB_FEE','LIBRARY_FEE','EXAM_FEE','DEVELOPMENT_FEE','COMPUTER_FEE','OTHER'];
const STATUSES = ['PENDING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED','CANCELLED'];

const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    WAIVED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-slate-100 text-slate-500',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const currentYear = new Date().getFullYear();

// ── types ─────────────────────────────────────────────────────────────────────
interface CourseFee { id: string; courseId: string; courseName: string; courseSlug: string; tuitionFee: number; }
interface ExtraCharge { id: string; studentId: string; academicId: string; type: string; description?: string; amount: number; month: number; year: number; studentFirstName: string; studentLastName: string; }
interface Invoice { id: string; invoiceNo: string; month: number; year: number; dueDate: string; tuitionFee: number; transportFee: number; extraChargesTotal: number; totalAmount: number; paidAmount: number; status: string; studentId: string; studentFirstName: string; studentLastName: string; studentPhone: string; }
interface Summary { totalInvoices: number; totalDemand: number; totalCollected: number; outstanding: number; pending: number; partiallyPaid: number; paid: number; overdue: number; waived: number; cancelled: number; }
interface Course { id: string; name: string; slug: string; }
interface Student { id: string; firstName: string; lastName: string; phone: string; }
interface Academic { id: string; studentId: string; courseId?: string; }
interface Session { id: string; name: string; slug: string; }

// ─────────────────────────────────────────────────────────────────────────────
export default function FeesHub() {
    const [tab, setTab] = useState<'summary' | 'course-fees' | 'extra' | 'invoices' | 'payments'>('summary');
    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader
                icon={CreditCard}
                title="Fee Management"
                subtitle="Manage tuition fees, extra charges and invoices"
            />
            <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

            {/* Tab Bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap" data-testid="fees-tabs">
                {[
                    { key: 'summary', label: 'Summary', icon: TrendingUp },
                    { key: 'course-fees', label: 'Course Fees', icon: BookOpen },
                    { key: 'extra', label: 'Extra Charges', icon: AlertCircle },
                    { key: 'invoices', label: 'Invoices', icon: CreditCard },
                    { key: 'payments', label: 'Payments', icon: Wallet },
                ].map(({ key, label, icon: Icon }) => (
                    <button key={key} data-testid={`fees-tab-${key}`} onClick={() => setTab(key as typeof tab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Icon size={16} />{label}
                    </button>
                ))}
            </div>

            {tab === 'summary' && <SummaryTab />}
            {tab === 'course-fees' && <CourseFeesTab />}
            {tab === 'extra' && <ExtraChargesTab />}
            {tab === 'invoices' && <InvoicesTab />}
            {tab === 'payments' && <PaymentsTab />}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY TAB
// ─────────────────────────────────────────────────────────────────────────────
function SummaryTab() {
    const { addToast } = useToast();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(String(currentYear));
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, unknown> = {};
            if (month) p.month = Number.parseInt(month);
            if (year) p.year = Number.parseInt(year);
            const data = await api.getFeeSummary(p as any);
            setSummary(data.summary);
        } catch (err: any) {
            addToast(err?.response?.data?.message || 'Failed to load fee summary', 'error');
        } finally { setLoading(false); }
    }, [month, year]);

    useEffect(() => { fetch(); }, [fetch]);

    const statCards = summary ? [
        { label: 'Total Demand', value: fmt(summary.totalDemand), icon: Wallet, color: 'bg-blue-50 text-blue-700' },
        { label: 'Collected', value: fmt(summary.totalCollected), icon: CheckCircle, color: 'bg-green-50 text-green-700' },
        { label: 'Outstanding', value: fmt(summary.outstanding), icon: TrendingUp, color: 'bg-orange-50 text-orange-700' },
        { label: 'Overdue', value: summary.overdue, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
        { label: 'Total Invoices', value: summary.totalInvoices, icon: CreditCard, color: 'bg-slate-50 text-slate-700' },
        { label: 'Paid', value: summary.paid, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700' },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex gap-3 items-end flex-wrap">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                    <select value={month} onChange={e => setMonth(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        <option value="">All Months</option>
                        {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                    <select value={year} onChange={e => setYear(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                </div>
                <button onClick={fetch} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {summary && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        {statCards.map(c => (
                            <div key={c.label} className={`p-4 rounded-2xl ${c.color} flex flex-col gap-1`}>
                                <c.icon size={20} />
                                <div className="text-2xl font-bold">{c.value}</div>
                                <div className="text-xs font-medium opacity-75">{c.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Status breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Invoice Status Breakdown</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {STATUSES.map(s => {
                                const key = s === 'PARTIALLY_PAID' ? 'partiallyPaid' : s.toLowerCase() as keyof Summary;
                                return (
                                    <div key={s} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s]}`}>{s.replaceAll('_', ' ')}</span>
                                        <span className="font-bold text-slate-800">{summary[key]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE FEES TAB
// ─────────────────────────────────────────────────────────────────────────────
function CourseFeesTab() {
    const { addToast } = useToast();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const [fees, setFees] = useState<CourseFee[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [courseId, setCourseId] = useState('');
    const [tuitionFee, setTuitionFee] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        api.getCourseFees().then(d => setFees(d.courseFees || [])).catch((err: any) => {
            addToast(err?.response?.data?.message || 'Failed to load course fees', 'error');
        });
        api.getCourses().then(d => setCourses(Array.isArray(d) ? d : [])).catch((err: any) => {
            addToast(err?.response?.data?.message || 'Failed to load courses', 'error');
        });
    }, []);

    const reload = () => api.getCourseFees().then(d => setFees(d.courseFees || [])).catch((err: any) => {
        addToast(err?.response?.data?.message || 'Failed to reload course fees', 'error');
    });

    const startEdit = (cf: CourseFee) => {
        setCourseId(cf.courseId); setTuitionFee(String(cf.tuitionFee));
        setEditingId(cf.id); setShowForm(true);
    };

    const save = async () => {
        if (!courseId || !tuitionFee) return;
        setSaving(true);
        try {
            await api.setCourseFee(courseId, Number.parseInt(tuitionFee));
            await reload(); setShowForm(false); setCourseId(''); setTuitionFee(''); setEditingId(null);
            addToast('Course fee saved', 'success');
        } catch (err: any) {
            addToast(err?.response?.data?.message || 'Failed to save course fee', 'error');
        } finally { setSaving(false); }
    };

    const del = (id: string, courseName?: string) => {
        confirm({
            title: 'Remove course fee?',
            message: courseName
                ? `Students in ${courseName} will no longer be billed tuition automatically.`
                : 'This course will no longer be billed tuition automatically.',
            confirmText: 'Remove',
            onConfirm: async () => {
                try {
                    await api.deleteCourseFee(id);
                    await reload();
                    addToast('Course fee removed', 'success');
                } catch (err: any) {
                    addToast('Failed to remove fee', 'error', err?.response?.data?.message);
                    throw err;
                }
            },
        });
    };


    return (
        <div className="space-y-4">
            {confirmDialog}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Set monthly tuition fee per course. One fee per course.</p>
                <button onClick={() => { setShowForm(true); setEditingId(null); setCourseId(''); setTuitionFee(''); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 shadow-sm">
                    <Plus size={16} /> Set Fee
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800">{editingId ? 'Edit Course Fee' : 'Set Course Fee'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Course</label>
                            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                <option value="">Select course…</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Fee (₹)</label>
                            <input type="number" value={tuitionFee} onChange={e => setTuitionFee(e.target.value)} placeholder="e.g. 2500"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                            <Save size={15} />{saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            {['Course','Slug','Monthly Fee','Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {fees.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No course fees set yet</td></tr>}
                        {fees.map(f => (
                            <tr key={f.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-800">{f.courseName}</td>
                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{f.courseSlug}</td>
                                <td className="px-4 py-3 font-semibold text-emerald-700">{fmt(f.tuitionFee)}/mo</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        <button onClick={() => startEdit(f)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"><Edit3 size={14}/></button>
                                        <button onClick={() => del(f.id, f.courseName)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentRow {
    id: string; amount: number; paymentMode: string; paymentStatus: string;
    referenceNo?: string; paymentDate: string; remarks?: string;
    razorpayPaymentId?: string; razorpayOrderId?: string;
    invoiceId: string; invoiceNo: string; invoiceMonth: number; invoiceYear: number;
    studentId: string; studentFirstName: string; studentLastName: string; studentPhone: string;
    receivedByName?: string;
}

const paymentStatusColor: Record<string, string> = {
    CREATED: 'bg-slate-100 text-slate-600',
    AUTHORIZED: 'bg-blue-100 text-blue-700',
    CAPTURED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-orange-100 text-orange-700',
};

function PaymentsTab() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [mode, setMode] = useState('');
    const [status, setStatus] = useState('');
    const [exporting, setExporting] = useState(false);
    const [refunding, setRefunding] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (from) params.from = from;
            if (to) params.to = to;
            if (mode) params.paymentMode = mode;
            if (status) params.paymentStatus = status;
            const data = await api.getFeePayments(params);
            setPayments(data.payments || []);
        } catch (err: any) {
            addToast(err?.response?.data?.message || 'Failed to load payments', 'error');
        } finally { setLoading(false); }
    }, [from, to, mode, status, addToast]);

    useEffect(() => { reload(); }, [reload]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const params: Record<string, string> = {};
            if (from) params.from = from;
            if (to) params.to = to;
            if (mode) params.paymentMode = mode;
            if (status) params.paymentStatus = status;
            await api.exportFeePayments(params);
            addToast('Export started', 'success', 'Your download should begin momentarily.');
        } catch (err: any) { addToast('Export failed', 'error', err?.response?.data?.message); }
        finally { setExporting(false); }
    };

    const handleRefund = (p: PaymentRow) => {
        confirm({
            title: `Refund ${fmt(p.amount)}?`,
            message: `A full refund will be issued via Razorpay to ${p.studentFirstName} ${p.studentLastName}. This cannot be undone.`,
            confirmText: 'Refund',
            onConfirm: async () => {
                setRefunding(p.id);
                try {
                    const data = await api.refundPayment(p.id);
                    addToast(data.message || 'Refund successful', 'success');
                    await reload();
                } catch (err: any) {
                    addToast('Refund failed', 'error', err?.response?.data?.message);
                    throw err;
                } finally { setRefunding(null); }
            },
        });
    };

    const totalAmount = payments.reduce((s, p) => s + (['CAPTURED', 'AUTHORIZED'].includes(p.paymentStatus) ? p.amount : 0), 0);
    const totalRefunded = payments.filter(p => p.paymentStatus === 'REFUNDED').reduce((s, p) => s + p.amount, 0);
    const totalFailed = payments.filter(p => p.paymentStatus === 'FAILED').reduce((s, p) => s + p.amount, 0);

    return (
        <div className="space-y-4">
            {confirmDialog}
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end justify-between">
                <div className="flex gap-3 items-end flex-wrap">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
                        <select value={mode} onChange={e => setMode(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">All Modes</option>
                            {['CASH','CHEQUE','ONLINE','BANK_TRANSFER','DD'].map(m => <option key={m} value={m}>{m.replaceAll('_', ' ')}</option>)}
                        </select></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">All Statuses</option>
                            {['CREATED','AUTHORIZED','CAPTURED','FAILED','REFUNDED'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select></div>
                    <button onClick={reload} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
                <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 shadow-sm">
                    <Download size={15} />{exporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-wrap">
                <div className="bg-green-50 text-green-800 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                    <span className="text-xs font-medium opacity-70">Total Collected</span>
                    <span className="text-lg font-bold">{fmt(totalAmount)}</span>
                </div>
                <div className="bg-orange-50 text-orange-800 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                    <span className="text-xs font-medium opacity-70">Total Refunded</span>
                    <span className="text-lg font-bold">{fmt(totalRefunded)}</span>
                </div>
                <div className="bg-red-50 text-red-800 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                    <span className="text-xs font-medium opacity-70">Failed</span>
                    <span className="text-lg font-bold">{fmt(totalFailed)}</span>
                </div>
                <div className="bg-slate-50 text-slate-700 rounded-xl px-4 py-3 flex flex-col gap-0.5">
                    <span className="text-xs font-medium opacity-70">Transactions</span>
                    <span className="text-lg font-bold">{payments.length}</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>{['Date','Invoice','Student','Mode','Reference','Status','Amount','Actions'].map(h =>
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        )}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No payment transactions found</td></tr>
                        ) : payments.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                                <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                <td className="px-3 py-3">
                                    <button onClick={() => navigate(`/fees/invoice/${p.invoiceId}`)} className="font-mono text-xs text-blue-600 hover:underline">
                                        {p.invoiceNo}
                                    </button>
                                </td>
                                <td className="px-3 py-3 font-medium">{p.studentFirstName} {p.studentLastName}</td>
                                <td className="px-3 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{p.paymentMode.replaceAll('_', ' ')}</span></td>
                                <td className="px-3 py-3 text-slate-400 font-mono text-xs">{p.referenceNo || p.razorpayPaymentId || '—'}</td>
                                <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusColor[p.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>{p.paymentStatus}</span></td>
                                <td className="px-3 py-3 font-semibold text-right whitespace-nowrap">
                                    <span className={p.paymentStatus === 'REFUNDED' ? 'text-orange-600 line-through' : 'text-green-700'}>{fmt(p.amount)}</span>
                                </td>
                                <td className="px-3 py-3">
                                    {p.paymentMode === 'ONLINE' && p.paymentStatus === 'CAPTURED' && (
                                        <button onClick={() => handleRefund(p)} disabled={refunding === p.id}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-50">
                                            <RotateCcw size={12} />{refunding === p.id ? 'Processing…' : 'Refund'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}



// ─────────────────────────────────────────────────────────────────────────────
// EXTRA CHARGES TAB
// ─────────────────────────────────────────────────────────────────────────────
function ExtraChargesTab() {
    const { addToast } = useToast();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const [charges, setCharges] = useState<ExtraCharge[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [studentAcademics, setStudentAcademics] = useState<Academic[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ studentId:'', academicId:'', type:'FINE', description:'', amount:'', month:String(new Date().getMonth()+1), year:String(currentYear) });
    const [saving, setSaving] = useState(false);
    const [filterMonth, setFilterMonth] = useState(''); const [filterYear, setFilterYear] = useState(String(currentYear));

    const reload = useCallback(async () => {
        const p: Record<string, unknown> = {};
        if (filterMonth) p.month = Number.parseInt(filterMonth);
        if (filterYear) p.year = Number.parseInt(filterYear);
        api.getExtraCharges(p as any).then(d => setCharges(d.extraCharges || [])).catch((err: any) => {
            addToast(err?.response?.data?.message || 'Failed to load extra charges', 'error');
        });
    }, [filterMonth, filterYear, addToast]);

    useEffect(() => { reload(); }, [reload]);
    useEffect(() => { api.getStudents().then(d => setStudents(Array.isArray(d) ? d : d.students || [])).catch((err: any) => {
        addToast(err?.response?.data?.message || 'Failed to load students', 'error');
    }); }, [addToast]);

    // When student changes, load their academic records
    useEffect(() => {
        if (!form.studentId) { setStudentAcademics([]); return; }
        api.getStudentById(form.studentId).then((d: any) => {
            const acads = d.academics || [];
            setStudentAcademics(acads);
            if (acads.length > 0) setForm(f => ({ ...f, academicId: acads[0].id }));
        }).catch(() => setStudentAcademics([]));
    }, [form.studentId]);

    const save = async () => {
        if (!form.studentId || !form.amount || !form.academicId) {
            addToast('Please fill all required fields', 'warning');
            return;
        }
        setSaving(true);
        try {
            await api.addExtraCharge({ ...form, amount: Number.parseInt(form.amount), month: Number.parseInt(form.month), year: Number.parseInt(form.year) });
            await reload();
            setShowForm(false);
            setForm(f => ({ ...f, studentId:'', academicId:'', description:'', amount:'' }));
            addToast('Charge added', 'success');
        } catch (err: any) {
            addToast('Failed to add charge', 'error', err?.response?.data?.message);
        } finally { setSaving(false); }
    };

    const del = (id: string) => {
        confirm({
            title: 'Remove this charge?',
            message: 'The student will no longer be billed for this extra charge.',
            confirmText: 'Remove',
            onConfirm: async () => {
                try {
                    await api.deleteExtraCharge(id);
                    await reload();
                    addToast('Charge removed', 'success');
                } catch (err: any) {
                    addToast('Failed to remove charge', 'error', err?.response?.data?.message);
                    throw err;
                }
            },
        });
    };

    return (
        <div className="space-y-4">
            {confirmDialog}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-3 items-end flex-wrap">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">All</option>
                            {MONTHS.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                        </select></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </select></div>
                </div>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 shadow-sm">
                    <Plus size={16}/> Add Charge
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800">Add Extra Charge</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Student <span className="text-red-500">*</span></label>
                            <select value={form.studentId} onChange={e => setForm(f=>({...f, studentId: e.target.value, academicId:''}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                <option value="">Select…</option>
                                {students.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.phone})</option>)}
                            </select>
                        </div>
                        {studentAcademics.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Academic Session <span className="text-red-500">*</span></label>
                                <select value={form.academicId} onChange={e => setForm(f=>({...f, academicId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                    {studentAcademics.map((a: any) => <option key={a.id} value={a.id}>{a.sessionName || a.id.slice(0,8)}</option>)}
                                </select>
                            </div>
                        )}
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Charge Type</label>
                            <select value={form.type} onChange={e => setForm(f=>({...f, type:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {EXTRA_CHARGE_TYPES.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                            <input type="number" value={form.amount} onChange={e => setForm(f=>({...f, amount:e.target.value}))} placeholder="e.g. 500" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                            <input value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} placeholder="Optional note" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                            <select value={form.month} onChange={e => setForm(f=>({...f, month:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {MONTHS.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                            <select value={form.year} onChange={e => setForm(f=>({...f, year:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
                            <Save size={15}/>{saving?'Saving…':'Add Charge'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>{['Student','Type','Description','Amount','Month/Year','Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {charges.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No extra charges for selected period</td></tr>}
                        {charges.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{c.studentFirstName} {c.studentLastName}</td>
                                <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">{c.type.replaceAll('_', ' ')}</span></td>
                                <td className="px-4 py-3 text-slate-500">{c.description || '—'}</td>
                                <td className="px-4 py-3 font-semibold text-red-600">{fmt(c.amount)}</td>
                                <td className="px-4 py-3 text-slate-500">{MONTHS[c.month-1]} {c.year}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES TAB
// ─────────────────────────────────────────────────────────────────────────────
function InvoicesTab() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showGenerate, setShowGenerate] = useState(false);
    const [gen, setGen] = useState({ month: String(new Date().getMonth()+1), year: String(currentYear), sessionId: '', dueDate: '' });
    const [generating, setGenerating] = useState(false);
    const [genResult, setGenResult] = useState<{ generated: number; skipped: number; total: number; lateFeesApplied: number; errors: number } | null>(null);
    // Default year to '' so ALL invoices load on first visit
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const p: Record<string, unknown> = {};
            if (filterMonth) p.month = Number.parseInt(filterMonth);
            if (filterYear) p.year = Number.parseInt(filterYear);
            if (filterStatus) p.status = filterStatus;
            const data = await api.getFeeInvoices(p as any);
            setInvoices(data.invoices || []);
        } catch (err: any) {
            setLoadError(err?.response?.data?.message || 'Failed to load invoices. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [filterMonth, filterYear, filterStatus]);

    useEffect(() => { reload(); }, [reload]);
    useEffect(() => { api.getSessions().then(d => setSessions(Array.isArray(d) ? d : d.sessions || [])).catch(() => {}); }, []);

    const generate = async () => {
        if (!gen.sessionId || !gen.dueDate) {
            addToast('Please fill all required fields', 'warning');
            return;
        }
        setGenerating(true);
        setGenResult(null);
        try {
            const data = await api.generateInvoices({
                month: Number.parseInt(gen.month),
                year: Number.parseInt(gen.year),
                sessionId: gen.sessionId,
                dueDate: gen.dueDate,
            });
            setGenResult({
                generated: data.generated,
                skipped: data.skipped,
                total: data.total,
                lateFeesApplied: data.lateFeesApplied,
                errors: data.errors,
            });
            await reload();
            addToast(
                data.errors > 0 ? 'Generation finished with errors' : 'Invoices generated',
                data.errors > 0 ? 'warning' : 'success',
                `${data.generated} new · ${data.skipped} skipped · ${data.lateFeesApplied} late fees · ${data.errors} errors`,
            );
        } catch (err: any) {
            addToast('Generation failed', 'error', err?.response?.data?.message);
        } finally {
            setGenerating(false);
        }
    };

    const markOverdue = () => {
        confirm({
            title: 'Mark past-due invoices as overdue?',
            message: 'All PENDING and PARTIALLY_PAID invoices with a due date in the past will be flipped to OVERDUE. Students with overdue invoices will be charged a ₹100 late fee on their next monthly invoice.',
            confirmText: 'Mark Overdue',
            onConfirm: async () => {
                try {
                    const d = await api.markOverdueInvoices();
                    addToast(d.message || 'Invoices updated', 'success');
                    await reload();
                } catch (err: any) {
                    addToast('Failed to mark overdue', 'error', err?.response?.data?.message);
                    throw err;
                }
            },
        });
    };

    const totalOutstanding = invoices.filter(i => !['PAID','WAIVED','CANCELLED'].includes(i.status)).reduce((s,i) => s + (i.totalAmount - i.paidAmount), 0);

    return (
        <div className="space-y-4">
            {confirmDialog}
            {/* Filters + Actions */}
            <div className="flex flex-wrap gap-3 items-end justify-between">
                <div className="flex gap-3 items-end flex-wrap">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">All Months</option>
                            {MONTHS.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                        </select></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">All Years</option>
                            {[currentYear-2, currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </select></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">All Statuses</option>
                            {STATUSES.map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
                        </select></div>
                    {(filterMonth || filterYear || filterStatus) && (
                        <button
                            onClick={() => { setFilterMonth(''); setFilterYear(''); setFilterStatus(''); }}
                            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-500 rounded-lg text-sm hover:bg-slate-50"
                        >
                            <RotateCcw size={13}/> Clear
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => reload()} disabled={loading} className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh
                    </button>
                    <button onClick={markOverdue} className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                        <AlertTriangle size={15}/> Mark Overdue
                    </button>
                    <button onClick={() => setShowGenerate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 shadow-sm">
                        <Plus size={16}/> Generate Invoices
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {loadError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                    <AlertTriangle size={16} className="shrink-0"/>
                    <span className="flex-1">{loadError}</span>
                    <button onClick={() => reload()} className="text-xs font-semibold underline hover:no-underline">Retry</button>
                </div>
            )}

            {/* Outstanding banner */}
            {!loading && totalOutstanding > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
                    <AlertTriangle size={16}/>
                    <span>Outstanding balance: <strong>{fmt(totalOutstanding)}</strong> across {invoices.filter(i => !['PAID','WAIVED','CANCELLED'].includes(i.status)).length} invoice(s)</span>
                </div>
            )}

            {/* Generate Modal */}
            {showGenerate && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800">Generate Monthly Invoices</h3>
                    <p className="text-xs text-slate-500">Generates one invoice per student in the session for the selected month. Already-generated invoices are skipped.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                            <select value={gen.month} onChange={e => setGen(g=>({...g,month:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {MONTHS.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                            <select value={gen.year} onChange={e => setGen(g=>({...g,year:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Session</label>
                            <select value={gen.sessionId} onChange={e => setGen(g=>({...g,sessionId:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                <option value="">Select session…</option>
                                {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                            <input type="date" value={gen.dueDate} onChange={e => setGen(g=>({...g,dueDate:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={generate} disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-60">
                            <RefreshCw size={15} className={generating?'animate-spin':''}/>{generating?'Generating…':'Generate'}
                        </button>
                        <button onClick={() => { setShowGenerate(false); setGenResult(null); }} disabled={generating} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">
                            {genResult ? 'Close' : 'Cancel'}
                        </button>
                    </div>

                    {/* Loading pulse while request is in flight */}
                    {generating && (
                        <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                            <RefreshCw size={13} className="animate-spin text-emerald-500" />
                            <span>Generating invoices — this may take a moment for large sessions…</span>
                        </div>
                    )}

                    {/* Completion summary with the new counters */}
                    {!generating && genResult && (
                        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                                <CheckCircle2 size={15} /> Generation complete
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                <ResultStat label="Total Students" value={genResult.total} className="bg-white text-slate-700 border-slate-200" />
                                <ResultStat label="Generated"    value={genResult.generated} className="bg-emerald-100 text-emerald-800 border-emerald-200" />
                                <ResultStat label="Skipped"      value={genResult.skipped}   className="bg-slate-100 text-slate-600 border-slate-200" />
                                <ResultStat label="Late Fees"    value={genResult.lateFeesApplied} className={genResult.lateFeesApplied > 0 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"} />
                                <ResultStat label="Errors"       value={genResult.errors}     className={genResult.errors > 0 ? "bg-red-100 text-red-800 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200"} />
                            </div>
                            {genResult.lateFeesApplied > 0 && (
                                <p className="text-[11px] text-amber-700">
                                    ₹100 late fee was added to {genResult.lateFeesApplied} invoice{genResult.lateFeesApplied === 1 ? '' : 's'} where a previous invoice is still unpaid.
                                </p>
                            )}
                            {genResult.errors > 0 && (
                                <p className="text-[11px] text-red-700">
                                    {genResult.errors} invoice{genResult.errors === 1 ? '' : 's'} failed. Check server logs for details.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
                        <RefreshCw size={18} className="animate-spin" />
                        <span className="text-sm">Loading invoices…</span>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>{['Invoice No','Student','Month/Year','Due','Total','Paid','Balance','Status','Actions'].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm text-slate-400 font-medium">No invoices found</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {filterMonth || filterYear || filterStatus
                                                ? 'Try clearing the filters above.'
                                                : 'Generate invoices using the button above.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                            {invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700">{inv.invoiceNo}</td>
                                    <td className="px-3 py-3 font-medium">{inv.studentFirstName} {inv.studentLastName}</td>
                                    <td className="px-3 py-3 text-slate-500">{MONTHS[inv.month-1]} {inv.year}</td>
                                    <td className="px-3 py-3 text-slate-500 text-xs">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                                    <td className="px-3 py-3 font-semibold">{fmt(inv.totalAmount)}</td>
                                    <td className="px-3 py-3 text-green-700">{fmt(inv.paidAmount)}</td>
                                    <td className="px-3 py-3 text-red-600 font-semibold">{fmt(inv.totalAmount - inv.paidAmount)}</td>
                                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[inv.status]}`}>{inv.status.replaceAll('_', ' ')}</span></td>
                                    <td className="px-3 py-3">
                                        <button onClick={() => navigate(`/fees/invoice/${inv.id}`)} className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition-colors">
                                            <Eye size={14}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {!loading && invoices.length > 0 && (
                <p className="text-xs text-slate-400 text-right">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} shown</p>
            )}
        </div>
    );
}

