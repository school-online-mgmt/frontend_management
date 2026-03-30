import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, BookOpen, Bus, AlertCircle, Plus, Trash2, Edit3, CheckCircle,
    TrendingUp, DollarSign, AlertTriangle, RefreshCw, Save, Eye,
} from 'lucide-react';
import api from '../../api/api';

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
interface Zone { id: string; name: string; description?: string; price: number; }
interface ExtraCharge { id: string; studentId: string; academicId: string; type: string; description?: string; amount: number; month: number; year: number; studentFirstName: string; studentLastName: string; }
interface Invoice { id: string; invoiceNo: string; month: number; year: number; dueDate: string; tuitionFee: number; transportFee: number; extraChargesTotal: number; totalAmount: number; paidAmount: number; status: string; studentId: string; studentFirstName: string; studentLastName: string; studentPhone: string; }
interface Summary { totalInvoices: number; totalDemand: number; totalCollected: number; outstanding: number; pending: number; partiallyPaid: number; paid: number; overdue: number; waived: number; cancelled: number; }
interface Course { id: string; name: string; slug: string; }
interface Student { id: string; firstName: string; lastName: string; phone: string; }
interface Academic { id: string; studentId: string; courseId?: string; }
interface Session { id: string; name: string; slug: string; }

// ─────────────────────────────────────────────────────────────────────────────
export default function FeesHub() {
    const [tab, setTab] = useState<'summary' | 'course-fees' | 'transport' | 'extra' | 'invoices'>('summary');
    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            <header>
                <h1 className="text-3xl font-bold text-slate-900">Fee Management</h1>
                <p className="text-slate-500 mt-1">Manage tuition fees, transport zones, extra charges and invoices</p>
            </header>

            {/* Tab Bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { key: 'summary', label: 'Summary', icon: TrendingUp },
                    { key: 'course-fees', label: 'Course Fees', icon: BookOpen },
                    { key: 'transport', label: 'Transport Zones', icon: Bus },
                    { key: 'extra', label: 'Extra Charges', icon: AlertCircle },
                    { key: 'invoices', label: 'Invoices', icon: CreditCard },
                ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key as typeof tab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Icon size={16} />{label}
                    </button>
                ))}
            </div>

            {tab === 'summary' && <SummaryTab />}
            {tab === 'course-fees' && <CourseFeesTab />}
            {tab === 'transport' && <TransportTab />}
            {tab === 'extra' && <ExtraChargesTab />}
            {tab === 'invoices' && <InvoicesTab />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY TAB
// ─────────────────────────────────────────────────────────────────────────────
function SummaryTab() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(String(currentYear));
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, unknown> = {};
            if (month) p.month = parseInt(month);
            if (year) p.year = parseInt(year);
            const data = await api.getFeeSummary(p as any);
            setSummary(data.summary);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [month, year]);

    useEffect(() => { fetch(); }, [fetch]);

    const statCards = summary ? [
        { label: 'Total Demand', value: fmt(summary.totalDemand), icon: DollarSign, color: 'bg-blue-50 text-blue-700' },
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
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s]}`}>{s.replace(/_/g,' ')}</span>
                                        <span className="font-bold text-slate-800">{summary[key] as number}</span>
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
    const [fees, setFees] = useState<CourseFee[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [courseId, setCourseId] = useState('');
    const [tuitionFee, setTuitionFee] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        api.getCourseFees().then(d => setFees(d.courseFees || [])).catch(() => {});
        api.getCourses().then(d => setCourses(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    const reload = () => api.getCourseFees().then(d => setFees(d.courseFees || [])).catch(() => {});

    const startEdit = (cf: CourseFee) => {
        setCourseId(cf.courseId); setTuitionFee(String(cf.tuitionFee));
        setEditingId(cf.id); setShowForm(true);
    };

    const save = async () => {
        if (!courseId || !tuitionFee) return;
        setSaving(true);
        try {
            await api.setCourseFee(courseId, parseInt(tuitionFee));
            await reload(); setShowForm(false); setCourseId(''); setTuitionFee(''); setEditingId(null);
        } catch { /* ignore */ }
        finally { setSaving(false); }
    };

    const del = async (id: string) => {
        if (!confirm('Remove this fee?')) return;
        await api.deleteCourseFee(id); await reload();
    };


    return (
        <div className="space-y-4">
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
                                        <button onClick={() => del(f.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
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
// TRANSPORT ZONES TAB
// ─────────────────────────────────────────────────────────────────────────────
function TransportTab() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Zone | null>(null);
    const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [price, setPrice] = useState('');
    const [saving, setSaving] = useState(false);

    const reload = () => api.getTransportZones().then(d => setZones(d.zones || [])).catch(() => {});
    useEffect(() => { reload(); }, []);

    const openCreate = () => { setEditing(null); setName(''); setDesc(''); setPrice(''); setShowForm(true); };
    const openEdit = (z: Zone) => { setEditing(z); setName(z.name); setDesc(z.description || ''); setPrice(String(z.price)); setShowForm(true); };
    const save = async () => {
        if (!name || !price) return;
        setSaving(true);
        try {
            if (editing) await api.updateTransportZone(editing.id, { name, description: desc, price: parseInt(price) });
            else await api.createTransportZone({ name, description: desc, price: parseInt(price) });
            await reload(); setShowForm(false);
        } catch { } finally { setSaving(false); }
    };
    const del = async (id: string) => { if (!confirm('Delete zone?')) return; await api.deleteTransportZone(id); await reload(); };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Each zone has a monthly transport fee charged to opted-in students.</p>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 shadow-sm">
                    <Plus size={16} /> Add Zone
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800">{editing ? 'Edit Zone' : 'New Transport Zone'}</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Zone Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Zone A" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Monthly Price (₹)</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 800" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
                            <Save size={15}/>{saving?'Saving…':'Save'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.length === 0 && <p className="text-slate-400 text-sm col-span-3">No transport zones configured.</p>}
                {zones.map(z => (
                    <div key={z.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div><h3 className="font-bold text-slate-800">{z.name}</h3>
                                {z.description && <p className="text-xs text-slate-500 mt-0.5">{z.description}</p>}</div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(z)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400"><Edit3 size={14}/></button>
                                <button onClick={() => del(z.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        <div className="mt-3 text-xl font-bold text-emerald-700">{fmt(z.price)}<span className="text-sm font-normal text-slate-500">/month</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRA CHARGES TAB
// ─────────────────────────────────────────────────────────────────────────────
function ExtraChargesTab() {
    const [charges, setCharges] = useState<ExtraCharge[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [studentAcademics, setStudentAcademics] = useState<Academic[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ studentId:'', academicId:'', type:'FINE', description:'', amount:'', month:String(new Date().getMonth()+1), year:String(currentYear) });
    const [saving, setSaving] = useState(false);
    const [filterMonth, setFilterMonth] = useState(''); const [filterYear, setFilterYear] = useState(String(currentYear));

    const reload = useCallback(async () => {
        const p: Record<string, unknown> = {};
        if (filterMonth) p.month = parseInt(filterMonth);
        if (filterYear) p.year = parseInt(filterYear);
        api.getExtraCharges(p as any).then(d => setCharges(d.extraCharges || [])).catch(() => {});
    }, [filterMonth, filterYear]);

    useEffect(() => { reload(); }, [reload]);
    useEffect(() => { api.getStudents().then(d => setStudents(Array.isArray(d) ? d : d.students || [])).catch(() => {}); }, []);

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
        if (!form.studentId || !form.amount || !form.academicId) { alert('Please fill all required fields'); return; }
        setSaving(true);
        try {
            await api.addExtraCharge({ ...form, amount: parseInt(form.amount), month: parseInt(form.month), year: parseInt(form.year) });
            await reload(); setShowForm(false); setForm(f => ({ ...f, studentId:'', academicId:'', description:'', amount:'' }));
        } catch { alert('Failed to add charge'); } finally { setSaving(false); }
    };

    const del = async (id: string) => { if (!confirm('Remove this charge?')) return; await api.deleteExtraCharge(id); await reload(); };

    return (
        <div className="space-y-4">
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
                                {EXTRA_CHARGE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
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
                                <td className="px-4 py-3"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">{c.type.replace(/_/g,' ')}</span></td>
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
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showGenerate, setShowGenerate] = useState(false);
    const [gen, setGen] = useState({ month: String(new Date().getMonth()+1), year: String(currentYear), sessionId: '', dueDate: '' });
    const [generating, setGenerating] = useState(false);
    const [filterMonth, setFilterMonth] = useState(''); const [filterYear, setFilterYear] = useState(String(currentYear));
    const [filterStatus, setFilterStatus] = useState('');

    const reload = useCallback(async () => {
        const p: Record<string, unknown> = {};
        if (filterMonth) p.month = parseInt(filterMonth);
        if (filterYear) p.year = parseInt(filterYear);
        if (filterStatus) p.status = filterStatus;
        api.getFeeInvoices(p as any).then(d => setInvoices(d.invoices || [])).catch(() => {});
    }, [filterMonth, filterYear, filterStatus]);

    useEffect(() => { reload(); }, [reload]);
    useEffect(() => { api.getSessions().then(d => setSessions(Array.isArray(d) ? d : d.sessions || [])).catch(() => {}); }, []);

    const generate = async () => {
        if (!gen.sessionId || !gen.dueDate) { alert('Please fill all fields'); return; }
        setGenerating(true);
        try {
            const data = await api.generateInvoices({ month: parseInt(gen.month), year: parseInt(gen.year), sessionId: gen.sessionId, dueDate: gen.dueDate });
            alert(`Done! Generated: ${data.generated}, Skipped (already exist): ${data.skipped}`);
            await reload(); setShowGenerate(false);
        } catch { alert('Generation failed'); }
        finally { setGenerating(false); }
    };

    const markOverdue = async () => {
        if (!confirm('Mark all past-due PENDING invoices as OVERDUE?')) return;
        const d = await api.markOverdueInvoices();
        alert(d.message); await reload();
    };

    const totalOutstanding = invoices.filter(i => !['PAID','WAIVED','CANCELLED'].includes(i.status)).reduce((s,i) => s + (i.totalAmount - i.paidAmount), 0);

    return (
        <div className="space-y-4">
            {/* Filters + Actions */}
            <div className="flex flex-wrap gap-3 items-end justify-between">
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
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <option value="">All Statuses</option>
                            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                        </select></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={markOverdue} className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                        <AlertTriangle size={15}/> Mark Overdue
                    </button>
                    <button onClick={() => setShowGenerate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 shadow-sm">
                        <Plus size={16}/> Generate Invoices
                    </button>
                </div>
            </div>

            {/* Outstanding banner */}
            {totalOutstanding > 0 && (
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
                        <button onClick={generate} disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">
                            <RefreshCw size={15} className={generating?'animate-spin':''}/>{generating?'Generating…':'Generate'}
                        </button>
                        <button onClick={() => setShowGenerate(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                    </div>
                </div>
            )}

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>{['Invoice No','Student','Month/Year','Due','Total','Paid','Balance','Status','Actions'].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {invoices.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No invoices found</td></tr>}
                        {invoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700">{inv.invoiceNo}</td>
                                <td className="px-3 py-3 font-medium">{inv.studentFirstName} {inv.studentLastName}</td>
                                <td className="px-3 py-3 text-slate-500">{MONTHS[inv.month-1]} {inv.year}</td>
                                <td className="px-3 py-3 text-slate-500 text-xs">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                                <td className="px-3 py-3 font-semibold">{fmt(inv.totalAmount)}</td>
                                <td className="px-3 py-3 text-green-700">{fmt(inv.paidAmount)}</td>
                                <td className="px-3 py-3 text-red-600 font-semibold">{fmt(inv.totalAmount - inv.paidAmount)}</td>
                                <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[inv.status]}`}>{inv.status.replace(/_/g,' ')}</span></td>
                                <td className="px-3 py-3">
                                    <button onClick={() => navigate(`/fees/invoice/${inv.id}`)} className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition-colors">
                                        <Eye size={14}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

