import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, User, CheckCircle, AlertTriangle, Printer } from 'lucide-react';
import api from '../../api/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-800 border-blue-200',
    PAID: 'bg-green-100 text-green-800 border-green-200',
    OVERDUE: 'bg-red-100 text-red-800 border-red-200',
    WAIVED: 'bg-purple-100 text-purple-800 border-purple-200',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface InvoiceDetail {
    id: string; invoiceNo: string; month: number; year: number; dueDate: string;
    tuitionFee: number; transportFee: number; extraChargesTotal: number;
    totalAmount: number; paidAmount: number; status: string; remarks?: string; createdAt: string;
    studentId: string; studentFirstName: string; studentMiddleName?: string; studentLastName: string;
    studentPhone: string; studentEmail: string;
}
interface Item { id: string; description: string; amount: number; itemType: string; }
interface Payment { id: string; amount: number; paymentMode: string; referenceNo?: string; paymentDate: string; remarks?: string; receivedByName?: string; }

export default function FeeInvoiceDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment form
    const [showPayment, setShowPayment] = useState(false);
    const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'CASH', referenceNo: '', paymentDate: new Date().toISOString().split('T')[0], remarks: '' });
    const [saving, setSaving] = useState(false);

    // Waive/Cancel form
    const [showWaive, setShowWaive] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [actionRemarks, setActionRemarks] = useState('');

    const reload = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await api.getFeeInvoiceById(id);
            setInvoice(data.invoice); setItems(data.items); setPayments(data.payments);
        } catch { navigate('/fees'); }
        finally { setLoading(false); }
    };

    useEffect(() => { reload(); }, [id]);

    const recordPayment = async () => {
        if (!id || !payForm.amount) return;
        setSaving(true);
        try {
            await api.recordPayment(id, { ...payForm, amount: parseFloat(payForm.amount) });
            await reload(); setShowPayment(false); setPayForm(p => ({ ...p, amount: '', referenceNo: '', remarks: '' }));
        } catch { alert('Payment recording failed'); }
        finally { setSaving(false); }
    };

    const waive = async () => {
        if (!id) { return; } await api.waiveInvoice(id, actionRemarks);
        await reload(); setShowWaive(false); setActionRemarks('');
    };

    const cancel = async () => {
        if (!id) { return; } await api.cancelInvoice(id, actionRemarks);
        await reload(); setShowCancel(false); setActionRemarks('');
    };

    const printInvoice = () => {
        if (!invoice) return;
        const win = window.open('', '_blank', 'width=800,height=900');
        if (!win) return;
        const balance = invoice.totalAmount - invoice.paidAmount;
        win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Invoice ${invoice.invoiceNo}</title>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #059669; padding-bottom: 20px; }
  .school-name { font-size: 24px; font-weight: bold; color: #059669; }
  .invoice-title { font-size: 20px; font-weight: bold; color: #1e293b; text-align: right; }
  .invoice-no { color: #64748b; font-size: 14px; }
  .section { margin-bottom: 25px; }
  .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-item label { font-size: 11px; color: #64748b; display: block; }
  .info-item span { font-weight: 600; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; border: 1px solid #e2e8f0; }
  td { padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 14px; }
  .total-row td { font-weight: bold; background: #f0fdf4; }
  .amount { text-align: right; font-weight: 600; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .status-PAID { background: #dcfce7; color: #166534; }
  .status-PENDING { background: #fef9c3; color: #854d0e; }
  .status-OVERDUE { background: #fee2e2; color: #991b1b; }
  .status-PARTIALLY_PAID { background: #dbeafe; color: #1e40af; }
  .status-WAIVED { background: #f3e8ff; color: #6b21a8; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #94a3b8; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div><div class="school-name">School Management System</div><div style="color:#64748b;font-size:13px">Fee Invoice</div></div>
  <div><div class="invoice-title">${invoice.invoiceNo}</div>
  <div class="invoice-no">${MONTHS[invoice.month-1]} ${invoice.year}</div>
  <div class="invoice-no" style="margin-top:4px"><span class="status status-${invoice.status}">${invoice.status.replaceAll('_', ' ')}</span></div></div>
</div>

<div class="section">
  <div class="section-title">Student Details</div>
  <div class="info-grid">
    <div class="info-item"><label>Name</label><span>${invoice.studentFirstName} ${invoice.studentMiddleName || ''} ${invoice.studentLastName}</span></div>
    <div class="info-item"><label>Phone</label><span>${invoice.studentPhone}</span></div>
    <div class="info-item"><label>Email</label><span>${invoice.studentEmail || '—'}</span></div>
    <div class="info-item"><label>Due Date</label><span>${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Fee Breakdown</div>
  <table>
    <thead><tr><th>Description</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${items.map(it => `<tr><td>${it.description}</td><td>${it.itemType.replaceAll('_', ' ')}</td><td class="amount">₹${it.amount.toLocaleString('en-IN')}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="2"><strong>Total Amount</strong></td><td class="amount">₹${invoice.totalAmount.toLocaleString('en-IN')}</td></tr>
      <tr><td colspan="2">Amount Paid</td><td class="amount" style="color:#16a34a">₹${invoice.paidAmount.toLocaleString('en-IN')}</td></tr>
      <tr class="total-row"><td colspan="2"><strong>Balance Due</strong></td><td class="amount" style="color:#dc2626">₹${balance.toLocaleString('en-IN')}</td></tr>
    </tbody>
  </table>
</div>

${payments.length > 0 ? `
<div class="section">
  <div class="section-title">Payment History</div>
  <table>
    <thead><tr><th>Date</th><th>Mode</th><th>Reference</th><th>Received By</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${payments.map(p => `<tr><td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td><td>${p.paymentMode}</td><td>${p.referenceNo || '—'}</td><td>${p.receivedByName || '—'}</td><td class="amount" style="color:#16a34a">₹${p.amount.toLocaleString('en-IN')}</td></tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">This is a computer-generated invoice. No signature required. | Generated on ${new Date().toLocaleDateString('en-IN', {year:'numeric',month:'long',day:'numeric'})}</div>
</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
    };

    if (loading) return <div className="p-8 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"/></div>;
    if (!invoice) return null;

    const balance = invoice.totalAmount - invoice.paidAmount;
    const canPay = !['PAID', 'WAIVED', 'CANCELLED'].includes(invoice.status);

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><ArrowLeft size={18}/></button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{invoice.invoiceNo}</h1>
                        <p className="text-slate-500 text-sm mt-0.5">{MONTHS[invoice.month-1]} {invoice.year} Fee Invoice</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColor[invoice.status]}`}>{invoice.status.replaceAll('_', ' ')}</span>
                    <button onClick={printInvoice} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                        <Printer size={15}/> Print / PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Student Info */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold"><User size={16}/> Student</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><div className="text-xs text-slate-400">Name</div><div className="font-semibold">{invoice.studentFirstName} {invoice.studentMiddleName || ''} {invoice.studentLastName}</div></div>
                            <div><div className="text-xs text-slate-400">Phone</div><div className="font-semibold">{invoice.studentPhone}</div></div>
                            <div><div className="text-xs text-slate-400">Email</div><div className="font-semibold">{invoice.studentEmail || '—'}</div></div>
                            <div><div className="text-xs text-slate-400">Due Date</div><div className="font-semibold">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div></div>
                        </div>
                    </div>

                    {/* Fee Breakdown */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold"><CreditCard size={16}/> Fee Breakdown</div>
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50"><th className="px-3 py-2 text-left text-xs text-slate-500 uppercase">Description</th><th className="px-3 py-2 text-left text-xs text-slate-500 uppercase">Type</th><th className="px-3 py-2 text-right text-xs text-slate-500 uppercase">Amount</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map(it => (
                                    <tr key={it.id}><td className="px-3 py-2.5">{it.description}</td><td className="px-3 py-2.5 text-slate-500 text-xs">{it.itemType.replaceAll('_', ' ')}</td><td className="px-3 py-2.5 text-right font-semibold">{fmt(it.amount)}</td></tr>
                                ))}
                                <tr className="bg-slate-50 font-bold"><td colSpan={2} className="px-3 py-2.5">Total</td><td className="px-3 py-2.5 text-right">{fmt(invoice.totalAmount)}</td></tr>
                                <tr><td colSpan={2} className="px-3 py-2.5 text-green-700">Paid</td><td className="px-3 py-2.5 text-right text-green-700 font-semibold">{fmt(invoice.paidAmount)}</td></tr>
                                <tr className="bg-red-50 font-bold"><td colSpan={2} className="px-3 py-2.5 text-red-700">Balance Due</td><td className="px-3 py-2.5 text-right text-red-700">{fmt(balance)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Payment History */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold"><CheckCircle size={16}/> Payment History</div>
                        {payments.length === 0 ? <p className="text-slate-400 text-sm">No payments recorded yet.</p> : (
                            <table className="w-full text-sm">
                                <thead><tr className="bg-slate-50">{['Date','Mode','Reference','Received By','Amount'].map(h => <th key={h} className="px-3 py-2 text-left text-xs text-slate-500 uppercase">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {payments.map(p => (
                                        <tr key={p.id}>
                                            <td className="px-3 py-2.5">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                            <td className="px-3 py-2.5"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{p.paymentMode}</span></td>
                                            <td className="px-3 py-2.5 text-slate-500">{p.referenceNo || '—'}</td>
                                            <td className="px-3 py-2.5 text-slate-500">{p.receivedByName || '—'}</td>
                                            <td className="px-3 py-2.5 text-right font-bold text-green-700">{fmt(p.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right Column – Actions */}
                <div className="space-y-4">
                    {/* Amount Summary Card */}
                    <div className="bg-slate-900 text-white rounded-2xl p-5">
                        <div className="text-xs text-slate-400 uppercase tracking-wide">Total Amount</div>
                        <div className="text-3xl font-bold mt-1">{fmt(invoice.totalAmount)}</div>
                        <div className="mt-3 space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-slate-400">Paid</span><span className="text-green-400">{fmt(invoice.paidAmount)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Balance</span><span className="text-red-400 font-bold">{fmt(balance)}</span></div>
                        </div>
                    </div>

                    {/* Record Payment */}
                    {canPay && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <button onClick={() => setShowPayment(v => !v)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 font-semibold">
                                <CreditCard size={16}/> Record Payment
                            </button>
                            {showPayment && (
                                <div className="mt-4 space-y-3">
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                                        <input type="number" value={payForm.amount} onChange={e => setPayForm(f=>({...f,amount:e.target.value}))} placeholder={`Max ${balance}`} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
                                        <select value={payForm.paymentMode} onChange={e => setPayForm(f=>({...f,paymentMode:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                            {['CASH','CHEQUE','ONLINE','BANK_TRANSFER','DD'].map(m => <option key={m}>{m}</option>)}
                                        </select></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Reference No.</label>
                                        <input value={payForm.referenceNo} onChange={e => setPayForm(f=>({...f,referenceNo:e.target.value}))} placeholder="Cheque/Transaction ID" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Payment Date</label>
                                        <input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f=>({...f,paymentDate:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
                                        <input value={payForm.remarks} onChange={e => setPayForm(f=>({...f,remarks:e.target.value}))} placeholder="Optional" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></div>
                                    <button onClick={recordPayment} disabled={saving} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 font-semibold">
                                        {saving ? 'Recording…' : 'Confirm Payment'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Waive / Cancel */}
                    {canPay && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Management Actions</p>
                            <button onClick={() => { setShowWaive(true); setShowCancel(false); }} className="w-full py-2 border border-purple-200 text-purple-700 rounded-xl text-sm hover:bg-purple-50">Waive Invoice</button>
                            <button onClick={() => { setShowCancel(true); setShowWaive(false); }} className="w-full py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">Cancel Invoice</button>
                            {(showWaive || showCancel) && (
                                <div className="mt-2 space-y-2">
                                    <input value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} placeholder="Reason (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/>
                                    <div className="flex gap-2">
                                        <button onClick={showWaive ? waive : cancel} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm">Confirm</button>
                                        <button onClick={() => { setShowWaive(false); setShowCancel(false); }} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {invoice.remarks && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                            <div className="font-semibold mb-1 flex items-center gap-1"><AlertTriangle size={14}/>Remarks</div>
                            {invoice.remarks}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

