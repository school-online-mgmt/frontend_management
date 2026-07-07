import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, AlertCircle, Plus, Trash2, Edit3, CheckCircle, CheckCircle2,
    TrendingUp, AlertTriangle, RefreshCw, Save, Eye, Wallet, Download, RotateCcw,
    Users, UserCheck, Receipt, Tag, Globe, Layers,
    GraduationCap, X, Check, ToggleLeft, ToggleRight, School,
    Filter, Loader2,
    // Summary-tab icons
    BookOpen, Calendar, PieChart, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../api/api';
import type { FeeStructureItem } from '../../api/types';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { EmptySessionState } from '../../components/common/SessionGate';
import TabbedSection, { TabPanel } from '../../components/common/TabbedSection';
import LateFeeConfigCard from '../../components/Fees/LateFeeConfigCard';
import useTabState from '../../hooks/useTabState';
import { useSessionId } from '../../context/SessionContext';

/**
 * The fees page has 5 tabs (Summary, Fee Structure, Extra Charges, Invoices,
 * Payments) and every tab is session-scoped. The chosen session is read
 * from the global SessionContext so the picker in the layout topbar drives
 * every tab.
 */
const useFeesSession = () => useSessionId();

type ApiError = { response?: { data?: { message?: string } } };
const apiMsg = (e: unknown, fallback: string) =>
    (e as ApiError)?.response?.data?.message ?? fallback;

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
interface ExtraCharge { id: string; studentId: string; academicId: string; type: string; description?: string; amount: number; month: number; year: number; studentFirstName: string; studentLastName: string; }
interface Invoice { id: string; invoiceNo: string; month: number; year: number; dueDate: string; tuitionFee: number; transportFee: number; extraChargesTotal: number; totalAmount: number; paidAmount: number; status: string; studentId: string; studentFirstName: string; studentLastName: string; studentPhone: string; }
interface Summary {
    totalInvoices: number;
    totalDemand: number; totalCollected: number; outstanding: number;
    pending: number; partiallyPaid: number; paid: number;
    overdue: number; overdueAmount: number;
    waived: number; cancelled: number;
    /** Sub-view of LATE_FEE invoices (already counted in totals above). */
    lateFees: {
        count: number; demand: number; collected: number; outstanding: number; overdueCount: number;
    };
    /** Outstanding rupees bucketed by days past due. */
    aging: { notYetDue: number; d0_30: number; d31_60: number; d61_90: number; d90plus: number };
    agingAmount: { notYetDue: number; d0_30: number; d31_60: number; d61_90: number; d90plus: number };
    /** Money split by line-item type (TUITION / LATE_FEE / …). */
    byItemType: Array<{
        itemType: string; demand: number; collected: number; outstanding: number; count: number; share: number;
    }>;
    /** Money split by class. */
    byClass: Array<{
        classId: string; className: string;
        demand: number; collected: number; outstanding: number;
        students: number; invoices: number; collectionRate: number;
    }>;
    /** Money split by course. */
    byCourse: Array<{
        courseId: string; courseName: string;
        demand: number; collected: number; outstanding: number;
        students: number; invoices: number; collectionRate: number;
    }>;
    /** Top 10 defaulters (highest outstanding). */
    topDefaulters: Array<{
        studentId: string; name: string; phone: string; admissionId: string | null;
        className: string | null; sectionName: string | null;
        outstanding: number; overdueCount: number; oldestOverdueDays: number;
    }>;
    /** Collection by payment method (CASH / CHEQUE / ONLINE / BANK_TRANSFER / DD). */
    byPaymentMode: Array<{
        mode: string; amount: number; count: number; share: number;
    }>;
    /** Invoices due in the next 7 days — proactive follow-up view. */
    upcoming: { count: number; amount: number };
    /** Refunds issued in the current filter — never inflates "collected". */
    refunds:  { count: number; amount: number };
    asOf: string;
}
interface Course { id: string; name: string; slug: string; }
interface Student { id: string; firstName: string; lastName: string; phone: string; }
interface Academic { id: string; studentId: string; courseId?: string; }
interface ClassInfo { id: string; name: string; }
interface SectionInfo { id: string; name: string; classId: string; }
interface BulkPreviewStudent { academicId: string; studentId: string; firstName: string; lastName: string; phone: string; }

// ─────────────────────────────────────────────────────────────────────────────
export default function FeesHub() {
    const [tab, setTab] = useTabState<'summary' | 'fee-structure' | 'extra' | 'invoices' | 'payments'>('tab', 'summary');
    const selectedSessionId = useSessionId();
    const [refreshKey, setRefreshKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = () => {
        setRefreshing(true);
        setRefreshKey(k => k + 1);
        setTimeout(() => setRefreshing(false), 600);
    };
    return (
        <div className="min-h-full bg-slate-50">
            <PageHeader
                icon={CreditCard}
                title="Fee Management"
                subtitle="Manage tuition, ad-hoc charges &amp; fines, and invoices"
                gradient={MODULE_THEMES.finance}
                onRefresh={handleRefresh}
                refreshing={refreshing}
            />
            {!selectedSessionId ? (
                <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"><EmptySessionState entityPlural="fees" /></div>
            ) : (
                <TabbedSection
                    idPrefix="fees"
                    value={tab}
                    onChange={(k) => setTab(k as typeof tab)}
                    theme="emerald"
                    flushPanel
                    tabs={[
                        { key: 'summary',       label: 'Summary',        icon: TrendingUp },
                        { key: 'fee-structure', label: 'Fee Structure',  icon: Receipt },
                        // "Extra Charges" was ambiguous — this tab actually
                        // hosts per-student ad-hoc levies (fines, damages,
                        // exam/library/uniform/development fees, etc.).
                        // Renamed for clarity.
                        { key: 'extra',         label: 'Charges & Fines', icon: AlertCircle },
                        { key: 'invoices',      label: 'Invoices',        icon: CreditCard },
                        { key: 'payments',      label: 'Payments',        icon: Wallet },
                    ]}
                >
                    <TabPanel tabKey="summary"       key={`summary-${refreshKey}`}><SummaryTab /></TabPanel>
                    <TabPanel tabKey="fee-structure" key={`fs-${refreshKey}`}><FeeStructureTab /></TabPanel>
                    <TabPanel tabKey="extra"         key={`extra-${refreshKey}`}><ExtraChargesTab /></TabPanel>
                    <TabPanel tabKey="invoices"      key={`inv-${refreshKey}`}><InvoicesTab /></TabPanel>
                    <TabPanel tabKey="payments"      key={`pay-${refreshKey}`}><PaymentsTab /></TabPanel>
                </TabbedSection>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY TAB
// ─────────────────────────────────────────────────────────────────────────────
function SummaryTab() {
    const { addToast } = useToast();
    const [summary, setSummary] = useState<Summary | null>(null);

    // ── Filter state ────────────────────────────────────────────────
    // Default on load = no filters applied. The Indian academic session
    // straddles two calendar years (Apr → Mar), so any default year filter
    // silently hides part of the cohort — better to show operators the full
    // picture and let them narrow down from there.
    const [month,       setMonth]       = useState('');
    const [year,        setYear]        = useState('');
    const [classId,     setClassId]     = useState('');
    const [courseId,    setCourseId]    = useState('');
    const [status,      setStatus]      = useState('');
    const [invoiceType, setInvoiceType] = useState('');
    const [loading, setLoading] = useState(false);

    // Load classes / courses once for the slicer selects.
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const selectedSessionId = useFeesSession();
    useEffect(() => {
        if (!selectedSessionId) return;
        api.getClasses(selectedSessionId)
            .then((d: { classes?: ClassInfo[] } | ClassInfo[]) =>
                setClasses(Array.isArray(d) ? d : d.classes ?? []))
            .catch(() => setClasses([]));
        api.getCourses({ sessionId: selectedSessionId })
            .then((c: Course[]) => setCourses(Array.isArray(c) ? c : []))
            .catch(() => setCourses([]));
    }, [selectedSessionId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        const params: Record<string, string | number> = {};
        if (month)       params.month       = Number.parseInt(month);
        if (year)        params.year        = Number.parseInt(year);
        if (classId)     params.classId     = classId;
        if (courseId)    params.courseId    = courseId;
        if (status)      params.status      = status;
        if (invoiceType) params.invoiceType = invoiceType;
        api.getFeeSummary(params)
            .then(data => setSummary(data.summary))
            .catch((err: unknown) => addToast(apiMsg(err, 'Failed to load fee summary'), 'error'))
            .finally(() => setLoading(false));
    }, [month, year, classId, courseId, status, invoiceType, addToast]);

    // Collection rate — percent of demand that's actually been received.
    // Guarded against divide-by-zero when there are no invoices yet.
    const collectionRate = summary && summary.totalDemand > 0
        ? Math.round((summary.totalCollected / summary.totalDemand) * 100)
        : 0;

    // Active-filter count for the header pill.
    const activeFilters =
        (month ? 1 : 0) + (year ? 1 : 0) +
        (classId ? 1 : 0) + (courseId ? 1 : 0) +
        (status ? 1 : 0) + (invoiceType ? 1 : 0);
    const clearFilters = () => {
        setMonth(''); setYear('');
        setClassId(''); setCourseId('');
        setStatus(''); setInvoiceType('');
    };
    const nowMonth = String(new Date().getMonth() + 1);
    const nowYear  = String(currentYear);
    const isAllTime   = activeFilters === 0;
    const isThisYear  = !month && year === nowYear && !classId && !courseId && !status && !invoiceType;
    const isThisMonth = month === nowMonth && year === nowYear && !classId && !courseId && !status && !invoiceType;

    return (
        <div className="p-4 sm:p-5 md:p-6 space-y-6">
            {/* Filters — production-grade pill UI matching the rest of the app.
                Replaces the old bare row of selects + duplicated refresh
                (header already has refresh). */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filters</span>
                    {activeFilters > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">{activeFilters}</span>
                    )}
                    {loading && <Loader2 size={12} className="text-slate-400 animate-spin ml-1" />}
                    {activeFilters > 0 && (
                        <button onClick={clearFilters} className="ml-auto text-xs text-slate-400 hover:text-red-500 font-semibold">Clear</button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Presets — meaningful for a real school finance officer.
                        Default (page load) is All-time so numbers match the
                        Invoices tab's default. */}
                    <button
                        onClick={() => { setMonth(''); setYear(''); }}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                            isAllTime
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}>
                        All-time
                    </button>
                    <button
                        onClick={() => { setMonth(''); setYear(nowYear); }}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                            isThisYear
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}>
                        This year
                    </button>
                    <button
                        onClick={() => { setMonth(nowMonth); setYear(nowYear); }}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                            isThisMonth
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}>
                        This month
                    </button>
                    <button
                        onClick={() => {
                            // "Last month" — walks back from today's month.
                            const now = new Date();
                            const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            setMonth(String(prev.getMonth() + 1));
                            setYear(String(prev.getFullYear()));
                        }}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                            (() => {
                                const now = new Date();
                                const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                return month === String(prev.getMonth() + 1) && year === String(prev.getFullYear());
                            })()
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}>
                        Last month
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <select value={month} onChange={e => setMonth(e.target.value)}
                        aria-label="Month"
                        className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                        <option value="">All months</option>
                        {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(e.target.value)}
                        aria-label="Year"
                        className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                        <option value="">All years</option>
                        {[currentYear-2, currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                </div>

                {/* ── Slicers — cohort + type + status. Wrapped in a subtle
                    band so it's visually distinct from the time presets above. */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Slice by</span>
                    <select value={classId} onChange={e => setClassId(e.target.value)}
                        aria-label="Class"
                        className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors max-w-[10rem] truncate">
                        <option value="">All classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)}
                        aria-label="Course"
                        className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors max-w-[10rem] truncate">
                        <option value="">All courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={status} onChange={e => setStatus(e.target.value)}
                        aria-label="Status"
                        className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                        <option value="">All statuses</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="PARTIALLY_PAID">Partially paid</option>
                        <option value="OVERDUE">Overdue</option>
                        <option value="WAIVED">Waived</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <select value={invoiceType} onChange={e => setInvoiceType(e.target.value)}
                        aria-label="Invoice type"
                        className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors">
                        <option value="">All types</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ANNUAL">Annual</option>
                        <option value="ADMISSION">Admission</option>
                        <option value="EXTRA_CHARGE">Charges &amp; fines</option>
                        <option value="LATE_FEE">Late fees</option>
                    </select>
                </div>
            </div>

            {summary && (
                <>
                    {/* ── Money row — three big cards with consistent visual weight ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MoneyCard
                            icon={Wallet}
                            label="Total Demand"
                            value={summary.totalDemand}
                            accent="blue"
                            note={`${summary.totalInvoices} invoice${summary.totalInvoices === 1 ? '' : 's'} in scope · CANCELLED excluded`}
                        />
                        <MoneyCard
                            icon={CheckCircle}
                            label="Collected"
                            value={summary.totalCollected}
                            accent="emerald"
                            note={
                                <>
                                    <span className="font-bold tabular-nums text-emerald-800">{collectionRate}%</span>
                                    <span className="text-emerald-700"> of demand received</span>
                                </>
                            }
                            progress={collectionRate}
                        />
                        <MoneyCard
                            icon={TrendingUp}
                            label="Outstanding"
                            value={summary.outstanding}
                            accent={summary.overdueAmount > 0 ? 'rose' : 'amber'}
                            note={
                                summary.overdueAmount > 0
                                    ? <>Includes <span className="font-bold tabular-nums text-rose-700">{fmt(summary.overdueAmount)}</span> overdue</>
                                    : <>All outstanding is current — nothing past due</>
                            }
                        />
                    </div>

                    {/* ── Forward-looking pair: due-next-7-days + refunds ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ForecastCard
                            icon={Calendar}
                            title="Due in next 7 days"
                            subtitle="Proactive follow-up window"
                            amount={summary.upcoming.amount}
                            count={summary.upcoming.count}
                            countLabel={`invoice${summary.upcoming.count === 1 ? '' : 's'}`}
                            tone="sky"
                            emptyText="No dues coming up in the next week."
                        />
                        <ForecastCard
                            icon={RotateCcw}
                            title="Refunds issued"
                            subtitle="Not counted in collected"
                            amount={summary.refunds.amount}
                            count={summary.refunds.count}
                            countLabel={`refund${summary.refunds.count === 1 ? '' : 's'}`}
                            tone="slate"
                            emptyText="No refunds in this period."
                        />
                    </div>

                    {/* ── Late fines callout — subset of the money row above ── */}
                    <LateFinesRow lateFees={summary.lateFees} totalDemand={summary.totalDemand} />

                    {/* ── Status breakdown pills — counts only, aligned columns ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Invoice status breakdown</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Live view — invoices past their due date are counted as <strong>Overdue</strong> even if the nightly sweep hasn't flipped their status yet.
                                </p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                                as of {new Date(summary.asOf).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {[
                                { key: 'paid',          label: 'Paid',          value: summary.paid,          color: 'emerald' },
                                { key: 'pending',       label: 'Pending',       value: summary.pending,       color: 'sky' },
                                { key: 'partiallyPaid', label: 'Partial',       value: summary.partiallyPaid, color: 'amber' },
                                { key: 'overdue',       label: 'Overdue',       value: summary.overdue,       color: 'rose' },
                                { key: 'waived',        label: 'Waived',        value: summary.waived,        color: 'slate' },
                                { key: 'cancelled',     label: 'Cancelled',     value: summary.cancelled,     color: 'slate' },
                            ].map(({ key, ...b }) => <StatusPill key={key} {...b} />)}
                        </div>
                    </div>

                    {/* ── Aging distribution — how old is the outstanding? ── */}
                    <AgingDistribution
                        aging={summary.aging}
                        agingAmount={summary.agingAmount}
                        totalOutstanding={summary.outstanding}
                    />

                    {/* ── Composition row: by line-item / by payment mode ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ByItemTypeCard rows={summary.byItemType} totalDemand={summary.totalDemand} />
                        <PaymentModeCard rows={summary.byPaymentMode} />
                    </div>

                    {/* ── Cohort row: by class / by course ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ByClassCard rows={summary.byClass} />
                        <ByCourseCard rows={summary.byCourse} />
                    </div>

                    {/* ── Top defaulters — actionable follow-up list ── */}
                    {summary.topDefaulters.length > 0 && <TopDefaultersCard rows={summary.topDefaulters} />}
                </>
            )}
        </div>
    );
}

// ── Summary-tab visual primitives ────────────────────────────────────────
type MoneyAccent = 'blue' | 'emerald' | 'amber' | 'rose';
const MONEY_ACCENT: Record<MoneyAccent, { bg: string; border: string; icon: string; label: string; note: string; progressBg: string; progressFill: string }> = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200/70',    icon: 'text-blue-600',    label: 'text-blue-700',    note: 'text-blue-700',    progressBg: 'bg-blue-100',    progressFill: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200/70', icon: 'text-emerald-600', label: 'text-emerald-700', note: 'text-emerald-700', progressBg: 'bg-emerald-100', progressFill: 'bg-emerald-500' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200/70',   icon: 'text-amber-600',   label: 'text-amber-700',   note: 'text-amber-700',   progressBg: 'bg-amber-100',   progressFill: 'bg-amber-500' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200/70',    icon: 'text-rose-600',    label: 'text-rose-700',    note: 'text-rose-700',    progressBg: 'bg-rose-100',    progressFill: 'bg-rose-500' },
};
const MoneyCard: React.FC<{
    icon: LucideIcon;
    label: string;
    value: number;
    accent: MoneyAccent;
    note?: React.ReactNode;
    /** 0-100 — draws a progress bar under the amount if provided. */
    progress?: number;
}> = ({ icon: Icon, label, value, accent, note, progress }) => {
    const cfg = MONEY_ACCENT[accent];
    return (
        <div className={`p-5 rounded-2xl border ${cfg.bg} ${cfg.border} shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
                <Icon size={16} className={cfg.icon} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.label}`}>{label}</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black tabular-nums leading-tight ${cfg.label}`}>{fmt(value)}</div>
            {progress !== undefined && (
                <div className={`h-1.5 rounded-full overflow-hidden mt-3 ${cfg.progressBg}`}>
                    <div className={`h-full transition-all duration-500 ${cfg.progressFill}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
                </div>
            )}
            {note && <div className={`text-[11px] mt-2 ${cfg.note}`}>{note}</div>}
        </div>
    );
};

/**
 * Late-fines callout — a horizontal band between the money row and the
 * status pills. Late-fee invoices are already reflected in Total Demand /
 * Collected / Outstanding above; this row surfaces how much of those totals
 * is late fines specifically, so the operator can gauge the impact of the
 * overdue-sweep policy at a glance.
 *
 * Rendered as a subtle amber band when there are late fines, and hidden
 * entirely when there aren't (avoids a distracting zero-state).
 */
/* ── Aging distribution ─────────────────────────────────────────────────
 * How old is the outstanding money? Standard finance-team view: 0-30 /
 * 31-60 / 61-90 / 90+ days past due. Also surfaces the "not yet due" bucket
 * so operators can see how much revenue is booked but hasn't hit its due
 * date yet.
 */
const AgingDistribution: React.FC<{
    aging: Summary['aging'];
    agingAmount: Summary['agingAmount'];
    totalOutstanding: number;
}> = ({ aging, agingAmount, totalOutstanding }) => {
    const buckets = [
        { key: 'notYetDue', label: 'Not yet due',   sub: 'Future dated',   color: 'sky',   count: aging.notYetDue, amount: agingAmount.notYetDue },
        { key: 'd0_30',     label: '0-30 days',     sub: 'Recently late',  color: 'amber', count: aging.d0_30,     amount: agingAmount.d0_30 },
        { key: 'd31_60',    label: '31-60 days',    sub: 'Follow up',      color: 'orange', count: aging.d31_60,    amount: agingAmount.d31_60 },
        { key: 'd61_90',    label: '61-90 days',    sub: 'Escalate',       color: 'rose',  count: aging.d61_90,    amount: agingAmount.d61_90 },
        { key: 'd90plus',   label: '90+ days',      sub: 'Write-off risk', color: 'rose',  count: aging.d90plus,   amount: agingAmount.d90plus },
    ] as const;
    // Anything left after the "not yet due" bucket is the true overdue pool.
    const overdueAmount = agingAmount.d0_30 + agingAmount.d31_60 + agingAmount.d61_90 + agingAmount.d90plus;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Aging distribution</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Outstanding balance bucketed by days past due. Older buckets need more urgent follow-up.
                    </p>
                </div>
                {overdueAmount > 0 && (
                    <span className="text-[11px] text-slate-500">
                        Overdue pool: <span className="font-bold text-rose-700 tabular-nums">{fmt(overdueAmount)}</span>
                    </span>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {buckets.map(b => {
                    const share = totalOutstanding > 0 ? Math.round((b.amount / totalOutstanding) * 100) : 0;
                    const cfg = AGING_COLOR[b.color];
                    return (
                        <div key={b.key} className={`p-3 rounded-xl border ${cfg.bg} ${cfg.border} flex flex-col`}>
                            <span className={`text-[10px] uppercase tracking-wider font-bold ${cfg.text}`}>{b.label}</span>
                            <span className={`tabular-nums text-lg font-black leading-tight mt-1 ${cfg.number}`}>{fmt(b.amount)}</span>
                            <span className={`text-[10px] mt-0.5 ${cfg.text}`}>
                                {b.count} invoice{b.count === 1 ? '' : 's'} · {share}%
                            </span>
                            <span className={`text-[9px] mt-1 opacity-70 ${cfg.text}`}>{b.sub}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
const AGING_COLOR: Record<string, { bg: string; border: string; text: string; number: string }> = {
    sky:    { bg: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-700',    number: 'text-sky-900' },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  number: 'text-amber-900' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', number: 'text-orange-900' },
    rose:   { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   number: 'text-rose-900' },
};

/* ── By line-item type ────────────────────────────────────────────────────
 * Which categories of fees drive the demand and collection? Helps answer
 * "how much of our revenue is tuition vs transport vs late fines?"
 */
const ITEM_LABEL: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
    TUITION:      { label: 'Tuition',           icon: GraduationCap, tone: 'text-blue-600 bg-blue-50 border-blue-200' },
    TRANSPORT:    { label: 'Transport',         icon: Wallet,        tone: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    LATE_FEE:     { label: 'Late fees',         icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 border-amber-200' },
    EXTRA_CHARGE: { label: 'Charges & fines',   icon: AlertCircle,   tone: 'text-rose-600 bg-rose-50 border-rose-200' },
    LIBRARY:      { label: 'Library',           icon: Layers,        tone: 'text-violet-600 bg-violet-50 border-violet-200' },
    LAB:          { label: 'Lab',               icon: Layers,        tone: 'text-purple-600 bg-purple-50 border-purple-200' },
    SPORTS:       { label: 'Sports',            icon: Layers,        tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    COMPUTER:     { label: 'Computer',          icon: Layers,        tone: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    DEVELOPMENT:  { label: 'Development',       icon: Layers,        tone: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
    EXAM:         { label: 'Exam',              icon: Layers,        tone: 'text-orange-600 bg-orange-50 border-orange-200' },
    ADMISSION:    { label: 'Admission',         icon: Layers,        tone: 'text-teal-600 bg-teal-50 border-teal-200' },
    BOOKS:        { label: 'Books',             icon: Layers,        tone: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    UNIFORM:      { label: 'Uniform',           icon: Layers,        tone: 'text-lime-600 bg-lime-50 border-lime-200' },
    ID_CARD:      { label: 'ID card',           icon: Layers,        tone: 'text-slate-600 bg-slate-50 border-slate-200' },
    MISC:         { label: 'Miscellaneous',     icon: Layers,        tone: 'text-slate-600 bg-slate-50 border-slate-200' },
    OTHER:        { label: 'Other',             icon: Layers,        tone: 'text-slate-600 bg-slate-50 border-slate-200' },
};
const ByItemTypeCard: React.FC<{
    rows: Summary['byItemType'];
    totalDemand: number;
}> = ({ rows, totalDemand }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
            <Layers size={14} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">By line item</h3>
            <span className="text-[10px] text-slate-500 ml-auto">
                {rows.length} categor{rows.length === 1 ? 'y' : 'ies'}
            </span>
        </div>
        {rows.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No line items yet.</p>
        ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {rows.map(r => {
                    const cfg = ITEM_LABEL[r.itemType] ?? ITEM_LABEL.OTHER!;
                    const collectRate = r.demand > 0 ? Math.round((r.collected / r.demand) * 100) : 0;
                    return (
                        <div key={r.itemType} className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-slate-50/30 transition-colors">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg.tone}`}>
                                        <cfg.icon size={10} /> {cfg.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{r.count} line{r.count === 1 ? '' : 's'}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{fmt(r.demand)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${collectRate}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] mt-1 text-slate-500">
                                <span>Collected <span className="font-bold text-emerald-700 tabular-nums">{fmt(r.collected)}</span></span>
                                <span>Outstanding <span className="font-bold text-rose-700 tabular-nums">{fmt(r.outstanding)}</span></span>
                                <span className="font-bold">{totalDemand > 0 ? Math.round((r.demand / totalDemand) * 100) : 0}% of total</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

/* ── By class ─────────────────────────────────────────────────────────────
 * Which classes are the healthiest financially? Which are the collection
 * hotspots? A class with collection rate < 60% is usually where a fee
 * officer should focus their week.
 */
const ByClassCard: React.FC<{ rows: Summary['byClass'] }> = ({ rows }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
            <School size={14} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">By class</h3>
            <span className="text-[10px] text-slate-500 ml-auto">
                {rows.length} class{rows.length === 1 ? '' : 'es'}
            </span>
        </div>
        {rows.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No class-level data yet.</p>
        ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {rows.map(r => <ByGroupRow key={r.classId}
                    name={r.className}
                    demand={r.demand}
                    collected={r.collected}
                    outstanding={r.outstanding}
                    collectionRate={r.collectionRate}
                    students={r.students}
                    invoices={r.invoices} />)}
            </div>
        )}
    </div>
);

/* ── By course ────────────────────────────────────────────────────────── */
/* ── Forecast card (upcoming due / refunds) ────────────────────────────── */
const FORECAST_TONE: Record<string, { bg: string; border: string; icon: string; label: string; amount: string }> = {
    sky:   { bg: 'bg-sky-50',   border: 'border-sky-200/70',   icon: 'text-sky-600',   label: 'text-sky-700',   amount: 'text-sky-900' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-200/70', icon: 'text-slate-600', label: 'text-slate-700', amount: 'text-slate-900' },
};
const ForecastCard: React.FC<{
    icon: LucideIcon;
    title: string;
    subtitle: string;
    amount: number;
    count: number;
    countLabel: string;
    tone: 'sky' | 'slate';
    emptyText: string;
}> = ({ icon: Icon, title, subtitle, amount, count, countLabel, tone, emptyText }) => {
    const cfg = FORECAST_TONE[tone] ?? FORECAST_TONE.slate!;
    return (
        <div className={`p-4 rounded-2xl border ${cfg.bg} ${cfg.border} shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={cfg.icon} />
                <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.label}`}>{title}</p>
                    <p className="text-[10px] text-slate-500">{subtitle}</p>
                </div>
            </div>
            {count === 0 ? (
                <p className="text-xs text-slate-500 py-1">{emptyText}</p>
            ) : (
                <div className="flex items-baseline justify-between gap-3">
                    <span className={`text-2xl font-black tabular-nums ${cfg.amount}`}>{fmt(amount)}</span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                        <span className="font-bold text-slate-700">{count}</span> {countLabel}
                    </span>
                </div>
            )}
        </div>
    );
};

/* ── Collection by payment mode ────────────────────────────────────────
 * Real-world reconciliation view. Ops team's answer to "how much cash
 * came in?" — matches the daily cash-drawer close-out and cheque bank
 * deposits, plus tells them if online payments are working.
 */
const PAYMENT_MODE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    CASH:          { label: 'Cash',          icon: Wallet,        color: 'emerald' },
    CHEQUE:        { label: 'Cheque',        icon: Receipt,       color: 'amber' },
    ONLINE:        { label: 'Online',        icon: CreditCard,    color: 'indigo' },
    BANK_TRANSFER: { label: 'Bank transfer', icon: Activity,      color: 'sky' },
    DD:            { label: 'DD',            icon: Receipt,       color: 'violet' },
};
const PAYMENT_MODE_COLOR: Record<string, { bar: string; badge: string }> = {
    emerald: { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
    amber:   { bar: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700' },
    indigo:  { bar: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700' },
    sky:     { bar: 'bg-sky-500',     badge: 'bg-sky-100 text-sky-700' },
    violet:  { bar: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-700' },
    slate:   { bar: 'bg-slate-500',   badge: 'bg-slate-100 text-slate-600' },
};
const PaymentModeCard: React.FC<{ rows: Summary['byPaymentMode'] }> = ({ rows }) => {
    const totalReceived = rows.reduce((s, r) => s + r.amount, 0);
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <PieChart size={14} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Collection by payment mode</h3>
                <span className="text-[10px] text-slate-500 ml-auto tabular-nums">
                    Total received <span className="font-bold text-slate-700">{fmt(totalReceived)}</span>
                </span>
            </div>
            {rows.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No payments received in this period.</p>
            ) : (
                <div className="space-y-2">
                    {rows.map(r => {
                        const meta = PAYMENT_MODE_META[r.mode] ?? { label: r.mode, icon: Wallet, color: 'slate' };
                        const cfg = PAYMENT_MODE_COLOR[meta.color] ?? PAYMENT_MODE_COLOR.slate!;
                        return (
                            <div key={r.mode} className="p-3 border border-slate-100 rounded-xl">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${cfg.badge}`}>
                                            <meta.icon size={10} /> {meta.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {r.count} payment{r.count === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                    <span className="text-sm font-black tabular-nums text-slate-800 shrink-0">
                                        {fmt(r.amount)}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all ${cfg.bar}`} style={{ width: `${r.share}%` }} />
                                </div>
                                <div className="flex items-center justify-end text-[10px] mt-1 text-slate-500">
                                    <span><span className="font-bold text-slate-700">{r.share}%</span> of collected</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ByCourseCard: React.FC<{ rows: Summary['byCourse'] }> = ({ rows }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">By course</h3>
            <span className="text-[10px] text-slate-500 ml-auto">
                {rows.length} course{rows.length === 1 ? '' : 's'}
            </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rows.map(r => <ByGroupRow key={r.courseId}
                name={r.courseName}
                demand={r.demand}
                collected={r.collected}
                outstanding={r.outstanding}
                collectionRate={r.collectionRate}
                students={r.students}
                invoices={r.invoices} />)}
        </div>
    </div>
);

const ByGroupRow: React.FC<{
    name: string;
    demand: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
    students: number;
    invoices: number;
}> = ({ name, demand, collected, outstanding, collectionRate, students, invoices }) => {
    const health = collectionRate >= 90 ? 'emerald' : collectionRate >= 75 ? 'sky' : collectionRate >= 60 ? 'amber' : 'rose';
    const bar = health === 'emerald' ? 'bg-emerald-500' : health === 'sky' ? 'bg-sky-500' : health === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
    const pill = health === 'emerald' ? 'bg-emerald-100 text-emerald-700' : health === 'sky' ? 'bg-sky-100 text-sky-700' : health === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
    return (
        <div className="p-3 border border-slate-100 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                    <p className="text-[10px] text-slate-500">
                        {students} student{students === 1 ? '' : 's'} · {invoices} invoice{invoices === 1 ? '' : 's'}
                    </p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${pill}`}>
                    {collectionRate}%
                </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                <div className={`h-full transition-all ${bar}`} style={{ width: `${collectionRate}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                <span><span className="text-slate-400">Demand</span> <span className="font-bold text-slate-700">{fmt(demand)}</span></span>
                <span><span className="text-slate-400">Coll'd</span> <span className="font-bold text-emerald-700">{fmt(collected)}</span></span>
                <span><span className="text-slate-400">O/S</span> <span className={`font-bold ${outstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{fmt(outstanding)}</span></span>
            </div>
        </div>
    );
};

/* ── Top defaulters ───────────────────────────────────────────────────────
 * The people who owe the most money right now. Rendered as an actionable
 * table with click-through to the student's fee history (via /students/:id).
 */
const TopDefaultersCard: React.FC<{ rows: Summary['topDefaulters'] }> = ({ rows }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-rose-500" />
            <h3 className="text-sm font-bold text-slate-800">Top defaulters</h3>
            <span className="text-[10px] text-slate-500">Highest outstanding — priority follow-up</span>
            <span className="text-[10px] text-slate-500 ml-auto font-bold">Top {rows.length}</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="text-left py-2 px-2">Student</th>
                        <th className="text-left py-2 px-2">Class · Section</th>
                        <th className="text-right py-2 px-2">Overdue</th>
                        <th className="text-right py-2 px-2">Oldest</th>
                        <th className="text-right py-2 px-2">Outstanding</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={r.studentId} className="border-b border-slate-100 hover:bg-slate-50/60">
                            <td className="py-2 px-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                                        <p className="text-[10px] text-slate-500">#{r.admissionId ?? '—'} · {r.phone}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-2 px-2 text-slate-600">
                                {r.className ?? '—'}{r.sectionName ? ` · ${r.sectionName}` : ''}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${r.overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {r.overdueCount}
                                </span>
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-600">
                                {r.oldestOverdueDays > 0 ? `${r.oldestOverdueDays}d` : '—'}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums font-black text-rose-700">
                                {fmt(r.outstanding)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const LateFinesRow: React.FC<{
    lateFees: Summary['lateFees'];
    totalDemand: number;
}> = ({ lateFees, totalDemand }) => {
    if (lateFees.count === 0) return null;
    const shareOfDemand = totalDemand > 0
        ? Math.max(0, Math.min(100, Math.round((lateFees.demand / totalDemand) * 100)))
        : 0;
    return (
        <div className="bg-gradient-to-r from-amber-50 via-amber-50/60 to-white border border-amber-200/70 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Late fines · included in totals above</span>
                </div>
                <span className="text-[11px] text-amber-700 tabular-nums">
                    <span className="font-bold">{lateFees.count}</span> invoice{lateFees.count === 1 ? '' : 's'} ·
                    {' '}<span className="font-bold">{shareOfDemand}%</span> of total demand
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LateFinesStat label="Total charged" value={lateFees.demand} accent="strong" />
                <LateFinesStat label="Collected"     value={lateFees.collected} accent="normal" />
                <LateFinesStat label="Outstanding"   value={lateFees.outstanding}
                    hint={lateFees.overdueCount > 0
                        ? `${lateFees.overdueCount} late-fine invoice${lateFees.overdueCount === 1 ? '' : 's'} themselves overdue`
                        : undefined}
                    accent={lateFees.outstanding > 0 ? 'strong' : 'normal'} />
            </div>
        </div>
    );
};

const LateFinesStat: React.FC<{
    label: string;
    value: number;
    hint?: string;
    accent: 'strong' | 'normal';
}> = ({ label, value, hint, accent }) => (
    <div className="rounded-xl bg-white/70 border border-amber-100 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">{label}</p>
        <p className={`tabular-nums leading-tight mt-0.5 ${accent === 'strong' ? 'text-lg font-black text-amber-900' : 'text-lg font-bold text-amber-800'}`}>
            {fmt(value)}
        </p>
        {hint && <p className="text-[10px] text-amber-700 mt-0.5">{hint}</p>}
    </div>
);

type PillColor = 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
const PILL_COLOR: Record<PillColor, { bg: string; text: string; dot: string; number: string }> = {
    emerald: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', number: 'text-emerald-800' },
    sky:     { bg: 'bg-sky-50 border-sky-200',         text: 'text-sky-700',     dot: 'bg-sky-500',     number: 'text-sky-800' },
    amber:   { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   dot: 'bg-amber-500',   number: 'text-amber-800' },
    rose:    { bg: 'bg-rose-50 border-rose-200',       text: 'text-rose-700',    dot: 'bg-rose-500',    number: 'text-rose-800' },
    slate:   { bg: 'bg-slate-100 border-slate-200',    text: 'text-slate-600',   dot: 'bg-slate-400',   number: 'text-slate-700' },
};
const StatusPill: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
    const cfg = PILL_COLOR[color as PillColor] ?? PILL_COLOR.slate;
    return (
        <div className={`p-3 rounded-xl border ${cfg.bg}`}>
            <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className={`text-[10px] uppercase tracking-wider font-bold ${cfg.text}`}>{label}</span>
            </div>
            <div className={`text-xl font-black tabular-nums mt-1 leading-none ${cfg.number}`}>{value.toLocaleString('en-IN')}</div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// FEE STRUCTURE TAB
// ─────────────────────────────────────────────────────────────────────────────
const FEE_TYPES_LIST = ['TUITION','TRANSPORT','LIBRARY','LAB','SPORTS','COMPUTER','DEVELOPMENT','EXAM','ADMISSION','BOOKS','UNIFORM','ID_CARD','MISC'] as const;
const FREQ_LIST = ['MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL','ONE_TIME'] as const;
const FREQ_LABELS: Record<string, string> = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', SEMI_ANNUAL: 'Semi-Annual', ANNUAL: 'Annual', ONE_TIME: 'One-Time' };
const FREQ_COLORS: Record<string, string> = {
    MONTHLY:    'bg-blue-100 text-blue-700',
    QUARTERLY:  'bg-cyan-100 text-cyan-700',
    SEMI_ANNUAL:'bg-violet-100 text-violet-700',
    ANNUAL:     'bg-emerald-100 text-emerald-700',
    ONE_TIME:   'bg-amber-100 text-amber-700',
};

const SCOPE_CONFIG: Record<string, { label: string; desc: string; icon: LucideIcon; bg: string; text: string; border: string }> = {
    GLOBAL: { label: 'Global', desc: 'Applies to all students', icon: Globe,        bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    CLASS:  { label: 'Class-Specific', desc: 'Applies to a specific class', icon: School,       bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    COURSE: { label: 'Course-Specific', desc: 'Applies to a specific course', icon: GraduationCap, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

interface StructureMeta { id: string; name: string; sessionId: string; sessionName: string; isActive: boolean; itemCount: number; }
type ItemScope = 'GLOBAL' | 'CLASS' | 'COURSE';

const blankItem = () => ({ name: '', feeType: 'TUITION' as string, scope: 'GLOBAL' as ItemScope, classId: '', courseId: '', frequency: 'MONTHLY' as string, amount: '', isOptional: false });

function FeeStructureTab() {
    const { addToast } = useToast();
    const { confirm, dialog: confirmDialog } = useConfirm();
    // Session is published by FeesHub via context; this tab reads it.
    const sessionId = useFeesSession();

    const [structures, setStructures] = useState<StructureMeta[]>([]);
    const [structureId, setStructureId] = useState('');
    const [items, setItems] = useState<FeeStructureItem[]>([]);
    const [structureConfig, setStructureConfig] = useState<{
        lateFeeEnabled?: boolean; lateFeeGraceDays?: number;
        lateFeeFlatAmount?: number; lateFeePercent?: number;
        lateFeeMaxAmount?: number; lateFeeCompound?: boolean;
    } | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);

    const [showForm, setShowForm] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [form, setForm] = useState(blankItem());
    const [saving, setSaving] = useState(false);

    const [showCreateStructure, setShowCreateStructure] = useState(false);
    const [structureName, setStructureName] = useState('Main Fee Structure');
    const [creatingStructure, setCreatingStructure] = useState(false);

    useEffect(() => {
        api.getCourses().then((c: Course[]) => setCourses(Array.isArray(c) ? c : [])).catch(() => {});
        if (!sessionId) { setClasses([]); return; }
        api.getClasses(sessionId).then((d: { classes?: ClassInfo[] } | ClassInfo[]) => setClasses(Array.isArray(d) ? d : d.classes ?? [])).catch(() => {});
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        api.getFeeStructures(sessionId).then(d => {
            const list = d.structures ?? [];
            setStructures(list);
            const active = list.find((s: StructureMeta) => s.isActive) ?? list[0];
            if (active) setStructureId(active.id);
            else setStructureId('');
        }).catch(() => { setStructures([]); setStructureId(''); });
    }, [sessionId]);

    const [itemsTick, setItemsTick] = useState(0);
    const refreshItems = useCallback(() => setItemsTick(t => t + 1), []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!structureId) { setItems([]); setStructureConfig(null); return; }
        api.getFeeStructureById(structureId)
            .then(d => {
                setItems(d.structure.items ?? []);
                setStructureConfig({
                    lateFeeEnabled:    d.structure.lateFeeEnabled,
                    lateFeeGraceDays:  d.structure.lateFeeGraceDays,
                    lateFeeFlatAmount: d.structure.lateFeeFlatAmount,
                    lateFeePercent:    d.structure.lateFeePercent,
                    lateFeeMaxAmount:  d.structure.lateFeeMaxAmount,
                    lateFeeCompound:   d.structure.lateFeeCompound,
                });
            })
            .catch(() => { setItems([]); setStructureConfig(null); });
    }, [structureId, itemsTick]);

    const handleCreateStructure = async () => {
        if (!sessionId || !structureName.trim()) return;
        setCreatingStructure(true);
        try {
            const d = await api.createFeeStructure({ sessionId, name: structureName.trim(), isActive: true });
            setStructureId(d.structure.id);
            setShowCreateStructure(false);
            setStructureName('Main Fee Structure');
            const refreshed = await api.getFeeStructures(sessionId);
            setStructures(refreshed.structures ?? []);
            addToast('Fee structure created', 'success');
        } catch (err: unknown) {
            addToast(apiMsg(err, 'Failed to create fee structure'), 'error');
        } finally { setCreatingStructure(false); }
    };

    const handleToggleActive = async () => {
        const meta = structures.find(s => s.id === structureId);
        if (!meta) return;
        try {
            await api.updateFeeStructure(structureId, { isActive: !meta.isActive });
            const refreshed = await api.getFeeStructures(sessionId);
            setStructures(refreshed.structures ?? []);
            addToast(`Structure ${meta.isActive ? 'deactivated' : 'activated'}`, 'success');
        } catch (err: unknown) {
            addToast(apiMsg(err, 'Failed to update structure'), 'error');
        }
    };

    const saveItem = async () => {
        if (!structureId || !form.name.trim() || !form.amount) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(), feeType: form.feeType,
                scope: form.scope, frequency: form.frequency,
                amount: parseInt(String(form.amount), 10) || 0,
                isOptional: form.isOptional,
                ...(form.scope === 'CLASS'  && form.classId  ? { classId:  form.classId  } : {}),
                ...(form.scope === 'COURSE' && form.courseId ? { courseId: form.courseId } : {}),
            };
            if (editingItemId) {
                await api.updateFeeStructureItem(structureId, editingItemId, payload as Partial<{ name: string; amount: number; frequency: string; description: string; }>);
            } else {
                await api.createFeeStructureItem(structureId, payload as { name: string; feeType: string; scope: 'GLOBAL' | 'COURSE'; amount: number; frequency: string; courseId?: string; });
            }
            refreshItems();
            setShowForm(false); setEditingItemId(null); setForm(blankItem());
            addToast(editingItemId ? 'Fee item updated' : 'Fee item added', 'success');
        } catch (err: unknown) {
            addToast(apiMsg(err, 'Failed to save fee item'), 'error');
        } finally { setSaving(false); }
    };

    const startEdit = (item: FeeStructureItem) => {
        setForm({
            name: item.name, feeType: item.feeType, scope: item.scope as ItemScope,
            classId: item.classId ?? '', courseId: item.courseId ?? '',
            frequency: item.frequency, amount: String(item.amount), isOptional: item.isOptional,
        });
        setEditingItemId(item.id);
        setShowForm(true);
    };

    const deleteItem = (item: FeeStructureItem) => {
        confirm({
            title: 'Remove fee item?',
            message: `"${item.name}" will be permanently removed from this fee structure.`,
            confirmText: 'Remove',
            onConfirm: async () => {
                try {
                    await api.deleteFeeStructureItem(structureId, item.id);
                    refreshItems();
                    addToast('Fee item removed', 'success');
                } catch (err: unknown) {
                    addToast('Failed to remove item', 'error', apiMsg(err, ''));
                    throw err;
                }
            },
        });
    };

    const currentStructure = structures.find(s => s.id === structureId);

    // Group items by scope
    const byScope: Record<ItemScope, FeeStructureItem[]> = { GLOBAL: [], CLASS: [], COURSE: [] };
    for (const item of items) {
        const s = (item.scope as ItemScope);
        if (byScope[s]) byScope[s].push(item);
    }
    const scopeOrder: ItemScope[] = ['GLOBAL', 'CLASS', 'COURSE'];
    const activeScopeGroups = scopeOrder.filter(s => byScope[s].length > 0);

    // Subtotal per frequency across all items (for the structure overview)
    const totalByFreq = FREQ_LIST.reduce((acc, f) => {
        const total = items.filter(i => i.frequency === f).reduce((s, i) => s + i.amount, 0);
        if (total > 0) acc[f] = total;
        return acc;
    }, {} as Record<string, number>);

    const ItemRow = ({ item, hideScopeCol = false }: { item: FeeStructureItem; hideScopeCol?: boolean }) => (
        <tr className="hover:bg-slate-50/60 group transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{item.name}</span>
                    {item.isOptional && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded">Optional</span>
                    )}
                </div>
                {item.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{item.description}</p>}
            </td>
            <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{item.feeType.replace(/_/g, ' ')}</span>
            </td>
            {!hideScopeCol && (
                <td className="px-4 py-3">
                    {(item.courseName || item.className) ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${item.scope === 'COURSE' ? 'bg-orange-50 text-orange-700' : 'bg-violet-50 text-violet-700'}`}>
                            {item.scope === 'COURSE' ? <GraduationCap size={11}/> : <School size={11}/>}
                            {item.scope === 'COURSE' ? item.courseName : item.className}
                        </span>
                    ) : (
                        <span className="text-slate-300 text-xs">—</span>
                    )}
                </td>
            )}
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${FREQ_COLORS[item.frequency] ?? 'bg-slate-100 text-slate-600'}`}>
                    {FREQ_LABELS[item.frequency] ?? item.frequency}
                </span>
            </td>
            <td className="px-4 py-3 font-bold text-emerald-700 text-sm">{fmt(item.amount)}</td>
            <td className="px-4 py-3">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(item)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                        <Edit3 size={13}/>
                    </button>
                    <button onClick={() => deleteItem(item)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 size={13}/>
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="space-y-5">
            {confirmDialog}

            {/* Session is selected at the FeesHub level (above the tabs) and
                shared via context. Only structure-level selectors live here. */}
            <div className="flex flex-wrap items-end gap-3">
                {structures.length > 1 && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fee Structure</label>
                        <select value={structureId} onChange={e => setStructureId(e.target.value)}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm min-w-[220px] focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 outline-none">
                            {structures.map(s => <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' ✓ Active' : ''}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {!sessionId && (
                <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
                    <Layers size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-600 font-semibold mb-1">Select an Academic Session</p>
                    <p className="text-slate-400 text-sm">Choose a session above to view and manage its fee structure.</p>
                </div>
            )}

            {sessionId && structures.length === 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
                    <Receipt size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-700 font-semibold mb-1">No fee structure defined</p>
                    <p className="text-slate-400 text-sm mb-6">Create a fee structure to define tuition, transport, and other charges for this session.</p>
                    {!showCreateStructure ? (
                        <button onClick={() => setShowCreateStructure(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm">
                            <Plus size={16}/> Create Fee Structure
                        </button>
                    ) : (
                        <div className="max-w-sm mx-auto space-y-3 text-left">
                            <input value={structureName} onChange={e => setStructureName(e.target.value)}
                                placeholder="e.g. Main Fee Structure 2025-26"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 outline-none" />
                            <div className="flex gap-2">
                                <button onClick={handleCreateStructure} disabled={creatingStructure}
                                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                    {creatingStructure ? 'Creating…' : 'Create'}
                                </button>
                                <button onClick={() => setShowCreateStructure(false)}
                                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {sessionId && structureId && currentStructure && (
                <>
                    {/* Structure header card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                    <Receipt size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800">{currentStructure.name}</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentStructure.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {currentStructure.isActive ? '● Active' : '○ Inactive'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{currentStructure.itemCount} line item{currentStructure.itemCount !== 1 ? 's' : ''} · {currentStructure.sessionName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleToggleActive}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                    {currentStructure.isActive ? <ToggleRight size={14} className="text-emerald-600"/> : <ToggleLeft size={14}/>}
                                    {currentStructure.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => { setShowForm(true); setEditingItemId(null); setForm(blankItem()); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors">
                                    <Plus size={15}/> Add Fee Item
                                </button>
                            </div>
                        </div>
                        {/* Frequency summary pills */}
                        {Object.keys(totalByFreq).length > 0 && (
                            <div className="flex flex-wrap gap-3 px-5 py-3">
                                {FREQ_LIST.filter(f => totalByFreq[f]).map(f => (
                                    <div key={f} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${FREQ_COLORS[f]}`}>
                                        <span>{FREQ_LABELS[f]}</span>
                                        <span className="opacity-60">·</span>
                                        <span>{fmt(totalByFreq[f])}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Late fee configuration */}
                    {structureConfig && (
                        <LateFeeConfigCard
                            structureId={structureId}
                            initial={structureConfig}
                            onSaved={refreshItems}
                        />
                    )}

                    {/* Add / Edit form */}
                    {showForm && (
                        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="font-bold text-slate-800">{editingItemId ? 'Edit Fee Item' : 'Add New Fee Item'}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Fill in the details for this fee line item</p>
                                </div>
                                <button onClick={() => { setShowForm(false); setEditingItemId(null); setForm(blankItem()); }}
                                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={16}/>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="sm:col-span-2 lg:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Item Name *</label>
                                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                                        placeholder="e.g. Tuition Fee, Library Charges"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                                    <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                                        placeholder="0"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fee Type</label>
                                    <select value={form.feeType} onChange={e => setForm(f => ({...f, feeType: e.target.value}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none">
                                        {FEE_TYPES_LIST.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Frequency</label>
                                    <select value={form.frequency} onChange={e => setForm(f => ({...f, frequency: e.target.value}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none">
                                        {FREQ_LIST.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Scope</label>
                                    <select value={form.scope} onChange={e => setForm(f => ({...f, scope: e.target.value as ItemScope, classId: '', courseId: ''}))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none">
                                        <option value="GLOBAL">Global — All Students</option>
                                        <option value="CLASS">Class-Specific</option>
                                        <option value="COURSE">Course-Specific</option>
                                    </select>
                                </div>
                                {form.scope === 'CLASS' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Class *</label>
                                        <select value={form.classId} onChange={e => setForm(f => ({...f, classId: e.target.value}))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none">
                                            <option value="">Select class…</option>
                                            {classes.map((c: ClassInfo) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {form.scope === 'COURSE' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Course *</label>
                                        <select value={form.courseId} onChange={e => setForm(f => ({...f, courseId: e.target.value}))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none">
                                            <option value="">Select course…</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                                    <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                                        <input type="checkbox" checked={form.isOptional}
                                            onChange={e => setForm(f => ({...f, isOptional: e.target.checked}))}
                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400 cursor-pointer" />
                                        <span className="text-sm text-slate-700 group-hover:text-slate-900">Mark as optional (student can opt out)</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-slate-100 mt-5">
                                <button onClick={saveItem} disabled={saving || !form.name.trim() || !form.amount}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors">
                                    {saving ? <><RefreshCw size={14} className="animate-spin"/>Saving…</> : <><Check size={14}/>{editingItemId ? 'Update Item' : 'Add Item'}</>}
                                </button>
                                <button onClick={() => { setShowForm(false); setEditingItemId(null); setForm(blankItem()); }}
                                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Items grouped by scope */}
                    {items.length === 0 && !showForm ? (
                        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
                            <Tag size={32} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-600 font-semibold mb-1">No fee items yet</p>
                            <p className="text-slate-400 text-sm">Add tuition, transport, and other charges using the button above.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeScopeGroups.map(scope => {
                                const cfg = SCOPE_CONFIG[scope];
                                const ScopeIcon = cfg.icon;
                                const scopeItems = byScope[scope];
                                const scopeTotal = scopeItems.reduce((s, i) => s + i.amount, 0);

                                // For COURSE / CLASS scopes: build ordered subgroups by entity name
                                type SubGroup = { key: string; label: string; items: FeeStructureItem[] };
                                const subgroups: SubGroup[] = [];
                                if (scope === 'COURSE' || scope === 'CLASS') {
                                    const seen = new Map<string, SubGroup>();
                                    for (const item of scopeItems) {
                                        const key = scope === 'COURSE'
                                            ? (item.courseId ?? 'unknown')
                                            : (item.classId ?? 'unknown');
                                        const label = scope === 'COURSE'
                                            ? (item.courseName ?? 'Unknown Course')
                                            : (item.className ?? 'Unknown Class');
                                        if (!seen.has(key)) {
                                            const g: SubGroup = { key, label, items: [] };
                                            seen.set(key, g);
                                            subgroups.push(g);
                                        }
                                        seen.get(key)!.items.push(item);
                                    }
                                }

                                return (
                                    <div key={scope} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                        {/* Scope group header */}
                                        <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 ${cfg.bg}`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                                                <ScopeIcon size={14} className={cfg.text} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
                                                <span className="text-xs text-slate-500 ml-2">— {cfg.desc}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>{scopeItems.length} item{scopeItems.length !== 1 ? 's' : ''}</span>
                                                <span className={`font-bold ${cfg.text}`}>{fmt(scopeTotal)}</span>
                                            </div>
                                        </div>

                                        {scope === 'GLOBAL' ? (
                                            /* Global: flat table */
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-50">
                                                        {['Name & Description', 'Fee Type', 'Frequency', 'Amount', ''].map(h => (
                                                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {scopeItems.map(item => <ItemRow key={item.id} item={item} hideScopeCol />)}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-50/50 border-t border-slate-100">
                                                        <td colSpan={3} className="px-4 py-2 text-xs text-slate-400 font-medium">Applies to all enrolled students</td>
                                                        <td className={`px-4 py-2 text-xs font-bold ${cfg.text}`}>{fmt(scopeTotal)}</td>
                                                        <td />
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        ) : (
                                            /* Course / Class: subgroup tables */
                                            <div className="divide-y divide-slate-100">
                                                {subgroups.map((grp, gi) => {
                                                    const grpTotal = grp.items.reduce((s, i) => s + i.amount, 0);
                                                    const SubIcon = scope === 'COURSE' ? GraduationCap : School;
                                                    return (
                                                        <div key={grp.key}>
                                                            {/* Sub-group header */}
                                                            <div className={`flex items-center gap-2.5 px-5 py-2.5 ${gi > 0 ? '' : ''} bg-slate-50/70`}>
                                                                <SubIcon size={13} className={cfg.text} />
                                                                <span className={`text-xs font-bold ${cfg.text}`}>{grp.label}</span>
                                                                <span className="text-xs text-slate-400 ml-1">
                                                                    · {grp.items.length} item{grp.items.length !== 1 ? 's' : ''}
                                                                </span>
                                                                <span className={`ml-auto text-xs font-bold ${cfg.text}`}>{fmt(grpTotal)}</span>
                                                            </div>
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="border-b border-slate-50">
                                                                        {['Name & Description', 'Fee Type', 'Frequency', 'Amount', ''].map(h => (
                                                                            <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {grp.items.map(item => <ItemRow key={item.id} item={item} hideScopeCol />)}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    );
                                                })}
                                                {/* Scope footer total */}
                                                <div className={`flex items-center justify-between px-5 py-2.5 ${cfg.bg} border-t ${cfg.border}`}>
                                                    <span className="text-xs text-slate-500">
                                                        {subgroups.length} {scope === 'COURSE' ? 'course' : 'class'}{subgroups.length !== 1 ? 's' : ''} · {scopeItems.length} items total
                                                    </span>
                                                    <span className={`text-xs font-bold ${cfg.text}`}>{fmt(scopeTotal)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
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

    const [tick, setTick] = useState(0);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (mode) params.paymentMode = mode;
        if (status) params.paymentStatus = status;
        api.getFeePayments(params)
            .then(data => setPayments(data.payments || []))
            .catch((err: unknown) => addToast(apiMsg(err, 'Failed to load payments'), 'error'))
            .finally(() => setLoading(false));
    }, [from, to, mode, status, tick, addToast]);

    const reload = useCallback(() => setTick(t => t + 1), []);

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
        } catch (err: unknown) { addToast('Export failed', 'error', apiMsg(err, '')); }
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
                } catch (err: unknown) {
                    addToast('Refund failed', 'error', apiMsg(err, ''));
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
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState(String(currentYear));
    // Mode: 'single' = individual student, 'bulk' = bulk apply
    const [mode, setMode] = useState<'single' | 'bulk'>('single');

    // ── Single mode state ──────────────────────────────────────────────────────
    const [showSingleForm, setShowSingleForm] = useState(false);
    const [singleStudents, setSingleStudents] = useState<Student[]>([]);
    const [studentAcademics, setStudentAcademics] = useState<Academic[]>([]);
    const [singleForm, setSingleForm] = useState({ studentId:'', academicId:'', type:'FINE', description:'', amount:'', month:String(new Date().getMonth()+1), year:String(currentYear) });
    const [saving, setSaving] = useState(false);

    // ── Bulk mode state ────────────────────────────────────────────────────────
    const pageSessionId = useFeesSession();
    const [bulkClasses, setBulkClasses] = useState<ClassInfo[]>([]);
    const [bulkSections, setBulkSections] = useState<SectionInfo[]>([]);
    const [bulkCourses, setBulkCourses] = useState<Course[]>([]);
    const [previewStudents, setPreviewStudents] = useState<BulkPreviewStudent[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [previewLoading, setPreviewLoading] = useState(false);
    const [bulkApplying, setBulkApplying] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [bulkFilters, setBulkFilters] = useState({ sessionId: pageSessionId, classId:'', sectionId:'', courseId:'' });
    // Keep bulk session in lockstep with the page-level one — the operator
    // shouldn't be able to pick a different session here than at the top.
    useEffect(() => {
        setBulkFilters(f => ({ ...f, sessionId: pageSessionId, classId: '', sectionId: '', courseId: '' }));
    }, [pageSessionId]);
    const [bulkCharge, setBulkCharge] = useState({ type:'FINE', description:'', amount:'', month:String(new Date().getMonth()+1), year:String(currentYear) });

    const [chargeTick, setChargeTick] = useState(0);
    const reload = useCallback(() => setChargeTick(t => t + 1), []);

    useEffect(() => {
        const p: Record<string, number> = {};
        if (filterMonth) p.month = Number.parseInt(filterMonth);
        if (filterYear) p.year = Number.parseInt(filterYear);
        api.getExtraCharges(p)
            .then(d => setCharges(d.extraCharges || []))
            .catch((err: unknown) => addToast(apiMsg(err, 'Failed to load charges &amp; fines'), 'error'));
    }, [filterMonth, filterYear, chargeTick, addToast]);

    // Load students for single mode
    useEffect(() => {
        if (mode === 'single' && showSingleForm && singleStudents.length === 0) {
            api.getStudents().then(d => setSingleStudents(Array.isArray(d) ? d : d.students || [])).catch(() => {});
        }
    }, [mode, showSingleForm, singleStudents.length]);

    // Load student academics on student change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!singleForm.studentId) { setStudentAcademics([]); return; }
        api.getStudentById(singleForm.studentId).then((d: { academics?: Academic[] }) => {
            const acads = d.academics || [];
            setStudentAcademics(acads);
            if (acads.length > 0) setSingleForm(f => ({ ...f, academicId: acads[0].id }));
        }).catch(() => setStudentAcademics([]));
    }, [singleForm.studentId]);

    // Load classes/courses for bulk mode (sessions come from context).
    useEffect(() => {
        if (mode === 'bulk' && showBulkForm) {
            if (bulkClasses.length === 0 && pageSessionId) api.getClasses(pageSessionId).then((d: { classes?: ClassInfo[] } | ClassInfo[]) => setBulkClasses(Array.isArray(d) ? d : d.classes || [])).catch(() => {});
            if (bulkCourses.length === 0) api.getCourses().then((c: Course[]) => setBulkCourses(Array.isArray(c) ? c : [])).catch(() => {});
        }
    }, [mode, showBulkForm, bulkClasses.length, bulkCourses.length, pageSessionId]);

    // Load sections when class changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!bulkFilters.classId) { setBulkSections([]); return; }
        api.getSectionsByClass(bulkFilters.classId).then((d: { sections?: SectionInfo[] } | SectionInfo[]) => setBulkSections(Array.isArray(d) ? d : d.sections || [])).catch(() => {});
    }, [bulkFilters.classId]);

    // Preview students when filters change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!bulkFilters.sessionId) { setPreviewStudents([]); return; }
        setPreviewLoading(true);
        const params: { sessionId: string; classId?: string; sectionId?: string; courseId?: string } = { sessionId: bulkFilters.sessionId };
        if (bulkFilters.classId) params.classId = bulkFilters.classId;
        if (bulkFilters.sectionId) params.sectionId = bulkFilters.sectionId;
        if (bulkFilters.courseId) params.courseId = bulkFilters.courseId;
        api.previewBulkExtraCharge(params)
            .then(data => {
                setPreviewStudents(data.students);
                setSelectedStudentIds(new Set(data.students.map((s: BulkPreviewStudent) => s.studentId)));
            })
            .catch((err: unknown) => addToast(apiMsg(err, 'Failed to load preview'), 'error'))
            .finally(() => setPreviewLoading(false));
    }, [bulkFilters, addToast]);

    // ── Single save ─────────────────────────────────────────────────────────────
    const saveSingle = async () => {
        if (!singleForm.studentId || !singleForm.amount || !singleForm.academicId) {
            addToast('Please fill all required fields', 'warning');
            return;
        }
        setSaving(true);
        try {
            await api.addExtraCharge({ ...singleForm, amount: Number.parseInt(singleForm.amount), month: Number.parseInt(singleForm.month), year: Number.parseInt(singleForm.year) });
            reload();
            setShowSingleForm(false);
            setSingleForm(f => ({ ...f, studentId:'', academicId:'', description:'', amount:'' }));
            addToast('Charge added', 'success');
        } catch (err: unknown) {
            addToast('Failed to add charge', 'error', apiMsg(err, ''));
        } finally { setSaving(false); }
    };

    // ── Bulk apply ──────────────────────────────────────────────────────────────
    const applyBulk = async () => {
        if (!bulkFilters.sessionId || !bulkCharge.amount) {
            addToast('Session and amount are required', 'warning');
            return;
        }
        if (selectedStudentIds.size === 0) {
            addToast('No students selected', 'warning');
            return;
        }
        setBulkApplying(true);
        try {
            const studentIds = Array.from(selectedStudentIds);
            const result = await api.addBulkExtraCharge({
                ...bulkCharge,
                amount: Number.parseInt(bulkCharge.amount),
                month: Number.parseInt(bulkCharge.month),
                year: Number.parseInt(bulkCharge.year),
                sessionId: bulkFilters.sessionId,
                studentIds,
            });
            reload();
            addToast(result.message, 'success');
            setShowBulkForm(false);
            setPreviewStudents([]);
            setSelectedStudentIds(new Set());
            setBulkFilters({ sessionId:'', classId:'', sectionId:'', courseId:'' });
        } catch (err: unknown) {
            addToast(apiMsg(err, 'Bulk apply failed'), 'error');
        } finally { setBulkApplying(false); }
    };

    const del = (id: string) => {
        confirm({
            title: 'Remove this charge?',
            message: 'The student will no longer be billed for this charge.',
            confirmText: 'Remove',
            onConfirm: async () => {
                try {
                    await api.deleteExtraCharge(id);
                    reload();
                    addToast('Charge removed', 'success');
                } catch (err: unknown) {
                    addToast('Failed to remove charge', 'error', apiMsg(err, ''));
                    throw err;
                }
            },
        });
    };

    const selCls = "border border-slate-200 rounded-lg px-3 py-2 text-sm w-full";

    return (
        <div className="space-y-4">
            {confirmDialog}

            {/* Top bar */}
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
                <div className="flex gap-2">
                    <button onClick={() => { setMode('single'); setShowSingleForm(s => !s); }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 shadow-sm">
                        <UserCheck size={15}/> Single Student
                    </button>
                    <button onClick={() => { setMode('bulk'); setShowBulkForm(s => !s); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 shadow-sm">
                        <Users size={15}/> Bulk Apply
                    </button>
                </div>
            </div>

            {/* Single-student form */}
            {mode === 'single' && showSingleForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800">Add Charge — Individual Student</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Student <span className="text-red-500">*</span></label>
                            <select value={singleForm.studentId} onChange={e => setSingleForm(f=>({...f, studentId: e.target.value, academicId:''}))} className={selCls}>
                                <option value="">Select…</option>
                                {singleStudents.map((s: Student) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.phone})</option>)}
                            </select>
                        </div>
                        {studentAcademics.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Session <span className="text-red-500">*</span></label>
                                <select value={singleForm.academicId} onChange={e => setSingleForm(f=>({...f, academicId: e.target.value}))} className={selCls}>
                                    {studentAcademics.map((a: Academic) => <option key={a.id} value={a.id}>{(a as Academic & { sessionName?: string }).sessionName || a.id.slice(0,8)}</option>)}
                                </select>
                            </div>
                        )}
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Charge Type</label>
                            <select value={singleForm.type} onChange={e => setSingleForm(f=>({...f, type:e.target.value}))} className={selCls}>
                                {EXTRA_CHARGE_TYPES.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                            <input type="number" value={singleForm.amount} onChange={e => setSingleForm(f=>({...f, amount:e.target.value}))} placeholder="e.g. 500" className={selCls}/></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                            <input value={singleForm.description} onChange={e => setSingleForm(f=>({...f, description:e.target.value}))} placeholder="Optional note" className={selCls}/></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                            <select value={singleForm.month} onChange={e => setSingleForm(f=>({...f, month:e.target.value}))} className={selCls}>
                                {MONTHS.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                            <select value={singleForm.year} onChange={e => setSingleForm(f=>({...f, year:e.target.value}))} className={selCls}>
                                {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={saveSingle} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
                            <Save size={15}/>{saving?'Saving…':'Add Charge'}
                        </button>
                        <button onClick={() => setShowSingleForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                    </div>
                </div>
            )}

            {/* Bulk apply form */}
            {mode === 'bulk' && showBulkForm && (
                <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Users size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Bulk Charge Application</h3>
                            <p className="text-xs text-slate-500">Apply a fine/charge to multiple students at once using scope filters</p>
                        </div>
                    </div>

                    {/* Scope filters — session is locked to the page-level
                        selection (above the tabs), so only refinement filters
                        live here. */}
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Step 1 — Select Scope</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Class (optional)</label>
                                <select value={bulkFilters.classId} onChange={e => setBulkFilters(f=>({...f, classId:e.target.value, sectionId:''}))} className={selCls}>
                                    <option value="">All classes</option>
                                    {bulkClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Section (optional)</label>
                                <select value={bulkFilters.sectionId} onChange={e => setBulkFilters(f=>({...f, sectionId:e.target.value}))} className={selCls} disabled={!bulkFilters.classId}>
                                    <option value="">All sections</option>
                                    {bulkSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Course (optional)</label>
                                <select value={bulkFilters.courseId} onChange={e => setBulkFilters(f=>({...f, courseId:e.target.value}))} className={selCls}>
                                    <option value="">All courses</option>
                                    {bulkCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Preview student list */}
                    {bulkFilters.sessionId && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Step 2 — Review Students
                                    {previewLoading && <span className="ml-2 text-indigo-500">Loading…</span>}
                                    {!previewLoading && <span className="ml-2 text-slate-400">({previewStudents.length} matched)</span>}
                                </p>
                                {previewStudents.length > 0 && (
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={() => setSelectedStudentIds(new Set(previewStudents.map(s => s.studentId)))}
                                            className="text-indigo-600 hover:underline font-medium">Select All</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={() => setSelectedStudentIds(new Set())}
                                            className="text-slate-500 hover:underline">Deselect All</button>
                                    </div>
                                )}
                            </div>
                            {previewStudents.length > 0 && (
                                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-50">
                                    {previewStudents.map(s => (
                                        <label key={s.studentId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                                            <input type="checkbox"
                                                checked={selectedStudentIds.has(s.studentId)}
                                                onChange={e => {
                                                    const next = new Set(selectedStudentIds);
                                                    if (e.target.checked) next.add(s.studentId); else next.delete(s.studentId);
                                                    setSelectedStudentIds(next);
                                                }}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                                            <span className="text-sm font-medium text-slate-800">{s.firstName} {s.lastName}</span>
                                            <span className="text-xs text-slate-400 ml-auto font-mono">{s.phone}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {!previewLoading && previewStudents.length === 0 && (
                                <div className="text-center py-6 text-slate-400 text-sm border border-slate-100 rounded-xl">
                                    No students found for the selected filters
                                </div>
                            )}
                        </div>
                    )}

                    {/* Charge details */}
                    {bulkFilters.sessionId && selectedStudentIds.size > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Step 3 — Charge Details
                                <span className="ml-2 text-indigo-500 font-semibold normal-case">({selectedStudentIds.size} students selected)</span>
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Charge Type</label>
                                    <select value={bulkCharge.type} onChange={e => setBulkCharge(f=>({...f, type:e.target.value}))} className={selCls}>
                                        {EXTRA_CHARGE_TYPES.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                                    </select></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                                    <input type="number" value={bulkCharge.amount} onChange={e => setBulkCharge(f=>({...f, amount:e.target.value}))} placeholder="e.g. 200" className={selCls}/></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                                    <input value={bulkCharge.description} onChange={e => setBulkCharge(f=>({...f, description:e.target.value}))} placeholder="Optional note" className={selCls}/></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                                    <select value={bulkCharge.month} onChange={e => setBulkCharge(f=>({...f, month:e.target.value}))} className={selCls}>
                                        {MONTHS.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                                    </select></div>
                                <div><label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                                    <select value={bulkCharge.year} onChange={e => setBulkCharge(f=>({...f, year:e.target.value}))} className={selCls}>
                                        {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                                    </select></div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={applyBulk} disabled={bulkApplying}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                                    <Users size={15}/>{bulkApplying ? 'Applying…' : `Apply to ${selectedStudentIds.size} Students`}
                                </button>
                                <button onClick={() => setShowBulkForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Charges list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>{['Student','Type','Description','Amount','Month/Year','Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {charges.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No charges or fines for the selected period</td></tr>}
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
    const pageSessionId = useFeesSession();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showGenerate, setShowGenerate] = useState(false);
    // Bulk-generate inherits the page-level session — operator can only
    // generate invoices for the session they're currently viewing.
    const [gen, setGen] = useState({ month: String(new Date().getMonth()+1), year: String(currentYear), sessionId: pageSessionId, dueDate: '' });
    useEffect(() => {
        setGen(g => ({ ...g, sessionId: pageSessionId }));
    }, [pageSessionId]);
    const [generating, setGenerating] = useState(false);
    const [genResult, setGenResult] = useState<{ generated: number; skipped: number; total: number; lateFeesApplied: number; errors: number } | null>(null);
    const [genProgress, setGenProgress] = useState<{ processed: number; total: number; percentage: number; generated: number; skipped: number; errors: number } | null>(null);
    // Default year to '' so ALL invoices load on first visit
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [invTick, setInvTick] = useState(0);
    const reload = useCallback(() => setInvTick(t => t + 1), []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setLoadError(null);
        const p: Record<string, string | number> = {};
        if (filterMonth) p.month = Number.parseInt(filterMonth);
        if (filterYear) p.year = Number.parseInt(filterYear);
        if (filterStatus) p.status = filterStatus;
        api.getFeeInvoices(p)
            .then(data => setInvoices(data.invoices || []))
            .catch((err: unknown) => setLoadError(apiMsg(err, 'Failed to load invoices. Please try again.')))
            .finally(() => setLoading(false));
    }, [filterMonth, filterYear, filterStatus, invTick]);

    // Sessions come from FeesSessionContext now; nothing to fetch here.

    const generate = async () => {
        if (!gen.sessionId || !gen.dueDate) {
            addToast('Please fill all required fields', 'warning');
            return;
        }
        setGenerating(true);
        setGenResult(null);
        setGenProgress(null);
        try {
            const baseUrl = (import.meta.env.VITE_BACKEND_HOST as string) ?? '';
            const response = await fetch(`${baseUrl}/management/fees/invoices/generate/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month: Number.parseInt(gen.month),
                    year: Number.parseInt(gen.year),
                    sessionId: gen.sessionId,
                    dueDate: gen.dueDate,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                // SSE events are separated by double newlines
                const parts = buffer.split('\n\n');
                buffer = parts.pop() ?? '';
                for (const chunk of parts) {
                    const dataLine = chunk.replace(/^data:\s*/m, '').trim();
                    if (!dataLine) continue;
                    try {
                        const event = JSON.parse(dataLine) as {
                            type: string;
                            processed?: number; total?: number; percentage?: number;
                            generated?: number; skipped?: number; errors?: number;
                            lateFeesApplied?: number; message?: string;
                        };
                        if (event.type === 'progress') {
                            setGenProgress({
                                processed: event.processed ?? 0,
                                total: event.total ?? 0,
                                percentage: event.percentage ?? 0,
                                generated: event.generated ?? 0,
                                skipped: event.skipped ?? 0,
                                errors: event.errors ?? 0,
                            });
                        } else if (event.type === 'done') {
                            setGenResult({
                                generated: event.generated ?? 0,
                                skipped: event.skipped ?? 0,
                                total: event.total ?? 0,
                                lateFeesApplied: event.lateFeesApplied ?? 0,
                                errors: event.errors ?? 0,
                            });
                            reload();
                            addToast(
                                (event.errors ?? 0) > 0 ? 'Generation finished with errors' : 'Invoices generated',
                                (event.errors ?? 0) > 0 ? 'warning' : 'success',
                                `${event.generated ?? 0} new · ${event.skipped ?? 0} skipped · ${event.lateFeesApplied ?? 0} late fees · ${event.errors ?? 0} errors`,
                            );
                        } else if (event.type === 'error') {
                            throw new Error(event.message ?? 'Generation failed');
                        }
                    } catch (parseErr) {
                        // skip malformed chunks
                    }
                }
            }
        } catch (err: unknown) {
            addToast('Generation failed', 'error', apiMsg(err, ''));
        } finally {
            setGenerating(false);
            setGenProgress(null);
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
                    reload();
                } catch (err: unknown) {
                    addToast('Failed to mark overdue', 'error', apiMsg(err, ''));
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
                    {/* Refresh lives on the page header (parent FeesHub) —
                        no need for a duplicate here. */}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Session is fixed to the page-level selection. */}
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                            <select value={gen.month} onChange={e => setGen(g=>({...g,month:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {MONTHS.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                            <select value={gen.year} onChange={e => setGen(g=>({...g,year:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                            <input type="date" value={gen.dueDate} onChange={e => setGen(g=>({...g,dueDate:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={generate} disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-60">
                            <RefreshCw size={15} className={generating?'animate-spin':''}/>{generating?'Generating…':'Generate'}
                        </button>
                        <button onClick={() => { setShowGenerate(false); setGenResult(null); setGenProgress(null); }} disabled={generating} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">
                            {genResult ? 'Close' : 'Cancel'}
                        </button>
                    </div>

                    {/* Real-time progress bar (streams from SSE) */}
                    {generating && genProgress && (
                        <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                            <div className="flex justify-between items-center text-xs text-slate-600">
                                <span className="font-medium">Generating invoices…</span>
                                <span className="tabular-nums">{genProgress.processed} / {genProgress.total} students ({genProgress.percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all duration-200"
                                    style={{ width: `${genProgress.percentage}%` }}
                                />
                            </div>
                            <div className="flex gap-4 text-[11px] text-slate-500">
                                <span className="text-emerald-700 font-medium">{genProgress.generated} generated</span>
                                <span>{genProgress.skipped} skipped</span>
                                {genProgress.errors > 0 && <span className="text-red-600">{genProgress.errors} errors</span>}
                            </div>
                        </div>
                    )}

                    {/* Waiting for first event */}
                    {generating && !genProgress && (
                        <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                            <RefreshCw size={13} className="animate-spin text-emerald-500" />
                            <span>Connecting — this may take a moment for large sessions…</span>
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

