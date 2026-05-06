import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, AlertCircle, Plus, Trash2, Edit3, CheckCircle, CheckCircle2,
    TrendingUp, AlertTriangle, RefreshCw, Save, Eye, Wallet, Download, RotateCcw,
    Users, UserCheck, Receipt, Tag, Globe, Layers,
    GraduationCap, X, Check, ToggleLeft, ToggleRight, School,
    Filter, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../api/api';
import type { FeeStructureItem } from '../../api/types';
import PageHeader, { MODULE_THEMES } from '../../components/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { EmptySessionState } from '../../components/common/SessionGate';
import TabbedSection, { TabPanel } from '../../components/common/TabbedSection';
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
interface Summary { totalInvoices: number; totalDemand: number; totalCollected: number; outstanding: number; pending: number; partiallyPaid: number; paid: number; overdue: number; waived: number; cancelled: number; }
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
                subtitle="Manage tuition fees, extra charges and invoices"
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
                        { key: 'summary',       label: 'Summary',       icon: TrendingUp },
                        { key: 'fee-structure', label: 'Fee Structure', icon: Receipt },
                        { key: 'extra',         label: 'Extra Charges', icon: AlertCircle },
                        { key: 'invoices',      label: 'Invoices',      icon: CreditCard },
                        { key: 'payments',      label: 'Payments',      icon: Wallet },
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
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(String(currentYear));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        const params: Record<string, number> = {};
        if (month) params.month = Number.parseInt(month);
        if (year) params.year = Number.parseInt(year);
        api.getFeeSummary(params)
            .then(data => setSummary(data.summary))
            .catch((err: unknown) => addToast(apiMsg(err, 'Failed to load fee summary'), 'error'))
            .finally(() => setLoading(false));
    }, [month, year, addToast]);

    const statCards = summary ? [
        { label: 'Total Demand', value: fmt(summary.totalDemand), icon: Wallet, color: 'bg-blue-50 text-blue-700' },
        { label: 'Collected', value: fmt(summary.totalCollected), icon: CheckCircle, color: 'bg-green-50 text-green-700' },
        { label: 'Outstanding', value: fmt(summary.outstanding), icon: TrendingUp, color: 'bg-orange-50 text-orange-700' },
        { label: 'Overdue', value: summary.overdue, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
        { label: 'Total Invoices', value: summary.totalInvoices, icon: CreditCard, color: 'bg-slate-50 text-slate-700' },
        { label: 'Paid', value: summary.paid, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700' },
    ] : [];

    const activeFilters = (month ? 1 : 0) + (year !== String(currentYear) ? 1 : 0);
    const clearFilters = () => { setMonth(''); setYear(String(currentYear)); };

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
                    {/* Quick presets */}
                    <button
                        onClick={() => { setMonth(''); setYear(String(currentYear)); }}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                            !month && year === String(currentYear)
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}>
                        Year to date
                    </button>
                    <button
                        onClick={() => { setMonth(String(new Date().getMonth() + 1)); setYear(String(currentYear)); }}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                            month === String(new Date().getMonth() + 1) && year === String(currentYear)
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}>
                        This month
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
                        {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                </div>
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
        if (!structureId) { setItems([]); return; }
        api.getFeeStructureById(structureId)
            .then(d => setItems(d.structure.items ?? []))
            .catch(() => setItems([]));
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
            .catch((err: unknown) => addToast(apiMsg(err, 'Failed to load extra charges'), 'error'));
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
            message: 'The student will no longer be billed for this extra charge.',
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

