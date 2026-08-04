import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Package, Plus, Search, RefreshCw, Loader2, TrendingUp, TrendingDown,
    AlertTriangle, Boxes, Warehouse, IndianRupee, Activity, X, Pencil,
    Trash2, ShoppingCart, ArrowDownCircle, Sliders, History, BarChart3,
    ChevronRight, School, Info, Download, Sparkles, MapPin, Truck,
    ClipboardCheck, Zap,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";
import useTabState from "../../hooks/useTabState";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../context/ToastContext";
import { ErrorState } from "../../components/ui";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
    { value: "STATIONERY", label: "Stationery" },
    { value: "FURNITURE",  label: "Furniture" },
    { value: "ELECTRICAL", label: "Electrical" },
    { value: "CLEANING",   label: "Cleaning" },
    { value: "LAB",        label: "Lab" },
    { value: "SPORTS",     label: "Sports" },
    { value: "LIBRARY",    label: "Library" },
    { value: "MEDICAL",    label: "Medical" },
    { value: "IT",         label: "IT / Tech" },
    { value: "MISC",       label: "Miscellaneous" },
] as const;

const UNITS = [
    { value: "PIECE", label: "Piece"  },
    { value: "BOX",   label: "Box"    },
    { value: "PACK",  label: "Pack"   },
    { value: "KG",    label: "Kg"     },
    { value: "GRAM",  label: "Gram"   },
    { value: "LITER", label: "Liter"  },
    { value: "METER", label: "Meter"  },
    { value: "DOZEN", label: "Dozen"  },
    { value: "SET",   label: "Set"    },
    { value: "ROLL",  label: "Roll"   },
] as const;

const CONSUMER_TYPES = [
    { value: "SCHOOL",  label: "School-wide",  icon: School  },
    { value: "CLASS",   label: "Class",        icon: Boxes   },
    { value: "SECTION", label: "Section",      icon: Boxes   },
    { value: "STUDENT", label: "Student",      icon: Boxes   },
    { value: "TEACHER", label: "Teacher",      icon: Boxes   },
    { value: "STAFF",   label: "Staff",        icon: Boxes   },
    { value: "OTHER",   label: "Other",        icon: Info    },
] as const;

const TXN_TYPE_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    OPENING:     { label: "Opening",     color: "text-slate-700",   bg: "bg-slate-100",   icon: Package         },
    PROCUREMENT: { label: "Procured",    color: "text-emerald-700", bg: "bg-emerald-50",  icon: ShoppingCart    },
    CONSUMPTION: { label: "Consumed",    color: "text-rose-700",    bg: "bg-rose-50",     icon: ArrowDownCircle },
    ADJUSTMENT:  { label: "Adjustment",  color: "text-amber-700",   bg: "bg-amber-50",    icon: Sliders         },
    RETURN:      { label: "Return",      color: "text-blue-700",    bg: "bg-blue-50",     icon: RefreshCw       },
    WRITE_OFF:   { label: "Write-off",   color: "text-red-700",     bg: "bg-red-50",      icon: Trash2          },
};

const SAMPLE_TEMPLATES: Array<{
    name: string; category: string; unit: string; reorderLevel: number; storageLocation: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
    { name: "A4 printing paper (500 sheets)", category: "STATIONERY", unit: "PACK",  reorderLevel: 10, storageLocation: "Admin store", icon: Package },
    { name: "Chalk box (100 pcs)",             category: "STATIONERY", unit: "BOX",   reorderLevel: 15, storageLocation: "Store room A", icon: Package },
    { name: "Whiteboard marker",               category: "STATIONERY", unit: "PIECE", reorderLevel: 30, storageLocation: "Store room A", icon: Package },
    { name: "Whiteboard duster",               category: "STATIONERY", unit: "PIECE", reorderLevel: 10, storageLocation: "Store room A", icon: Package },
    { name: "Toilet cleaning liquid (1L)",     category: "CLEANING",   unit: "LITER", reorderLevel: 5,  storageLocation: "Cleaning cupboard", icon: Package },
    { name: "Floor cleaning liquid (1L)",      category: "CLEANING",   unit: "LITER", reorderLevel: 5,  storageLocation: "Cleaning cupboard", icon: Package },
    { name: "Student bench",                   category: "FURNITURE",  unit: "PIECE", reorderLevel: 0,  storageLocation: "Backyard store",     icon: Package },
    { name: "Plastic chair",                   category: "FURNITURE",  unit: "PIECE", reorderLevel: 0,  storageLocation: "Backyard store",     icon: Package },
    { name: "Tube light (4-ft)",               category: "ELECTRICAL", unit: "PIECE", reorderLevel: 10, storageLocation: "Electrical store",   icon: Package },
    { name: "Ceiling fan",                     category: "ELECTRICAL", unit: "PIECE", reorderLevel: 0,  storageLocation: "Electrical store",   icon: Package },
    { name: "First aid kit",                   category: "MEDICAL",    unit: "SET",   reorderLevel: 1,  storageLocation: "Sick room",          icon: Package },
    { name: "Cricket ball",                    category: "SPORTS",     unit: "PIECE", reorderLevel: 5,  storageLocation: "Sports store",       icon: Package },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMoney = (n: number | null | undefined) =>
    n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtNum = (n: number | null | undefined) =>
    n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtDateTime = (s: string | null | undefined) =>
    !s ? "—" : new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Client-side CSV download. Values are quoted and quotes are escaped.
 * BOM prefix keeps Excel happy with non-ASCII characters (₹, ā, etc.).
 */
const csvCell = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
};
function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
    const lines = [
        headers.map(csvCell).join(","),
        ...rows.map(r => r.map(csvCell).join(",")),
    ];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

type TabId = "dashboard" | "items" | "transactions";
type InventoryItem = Awaited<ReturnType<typeof api.listInventoryItems>>["items"][number];

// ─────────────────────────────────────────────────────────────────────────────
// MODAL SHELL — flex-col with fixed header + scrollable body + fixed footer.
// The footer stays pinned so primary action buttons are never off-screen,
// even on tall forms or short viewports.
// ─────────────────────────────────────────────────────────────────────────────
function ModalShell({
    title, subtitle, onClose, children, footer, accent = "lime",
}: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    accent?: "lime" | "emerald" | "rose" | "amber" | "red";
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const accentClasses: Record<string, string> = {
        lime:    "from-lime-500 to-emerald-500",
        emerald: "from-emerald-500 to-teal-500",
        rose:    "from-rose-500 to-pink-500",
        amber:   "from-amber-500 to-orange-500",
        red:     "from-red-500 to-rose-500",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}>
                {/* Header — fixed */}
                <div className={`px-6 py-4 border-b border-slate-100 bg-gradient-to-r ${accentClasses[accent]} text-white shrink-0 relative`}>
                    <h2 className="text-lg font-bold pr-8">{title}</h2>
                    {subtitle && <p className="text-xs opacity-90 mt-0.5 pr-8 truncate">{subtitle}</p>}
                    <button data-testid="inventory-close-btn" onClick={onClose} aria-label="Close"
                        className="absolute right-4 top-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
                {/* Footer — fixed */}
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

const inputCls = "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400";
const labelCls = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

// ─────────────────────────────────────────────────────────────────────────────
// ITEM FORM — create / edit
// ─────────────────────────────────────────────────────────────────────────────
function ItemFormModal({ mode, item, template, onClose, onSuccess }: {
    mode: "create" | "edit";
    item?: InventoryItem;
    template?: Partial<InventoryItem> & { openingStock?: number };
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { addToast } = useToast();
    const [form, setForm] = useState({
        name:            item?.name ?? template?.name ?? "",
        sku:             item?.sku ?? "",
        category:        item?.category ?? template?.category ?? "MISC",
        unit:            item?.unit ?? template?.unit ?? "PIECE",
        reorderLevel:    item ? String(item.reorderLevel) : (template?.reorderLevel != null ? String(template.reorderLevel) : "0"),
        unitCost:        item?.unitCost != null ? String(item.unitCost) : "",
        description:     item?.description ?? "",
        storageLocation: item?.storageLocation ?? template?.storageLocation ?? "",
        openingStock:    template?.openingStock != null ? String(template.openingStock) : "",
    });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!form.name.trim()) { addToast("Item name is required.", "error"); return; }
        setSaving(true);
        try {
            const payload: any = {
                name:            form.name.trim(),
                sku:             form.sku.trim() || undefined,
                category:        form.category,
                unit:            form.unit,
                reorderLevel:    Number(form.reorderLevel) || 0,
                unitCost:        form.unitCost.trim() === "" ? undefined : Number(form.unitCost),
                description:     form.description.trim() || undefined,
                storageLocation: form.storageLocation.trim() || undefined,
            };
            if (mode === "create") {
                if (form.openingStock.trim() !== "") payload.openingStock = Number(form.openingStock);
                await api.createInventoryItem(payload);
                addToast(`Added "${payload.name}" to inventory.`, "success");
            } else {
                await api.updateInventoryItem(item!.id, payload);
                addToast("Item updated.", "success");
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to save item.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell
            title={mode === "create" ? "Add Inventory Item" : "Edit Item"}
            subtitle={mode === "create" ? "Register a new product in your item master" : item?.name}
            onClose={onClose}
            footer={
                <div className="flex gap-2">
                    <button data-testid="inventory-close-btn-2" onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">
                        Cancel
                    </button>
                    <button data-testid="inventory-submit-btn" onClick={submit} disabled={saving}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-lime-600 to-emerald-600 rounded-xl hover:from-lime-700 hover:to-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {mode === "create" ? "Add Item" : "Save Changes"}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className={labelCls}>Item Name *</label>
                    <input data-testid="inventory-name-input" className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. A4 printing paper (500 sheets)" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>SKU / Code</label>
                        <input data-testid="inventory-sku-input" className={inputCls} value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                            placeholder="Optional" />
                    </div>
                    <div>
                        <label className={labelCls}>Storage Location</label>
                        <input data-testid="inventory-storage-location-input" className={inputCls} value={form.storageLocation} onChange={e => setForm({ ...form, storageLocation: e.target.value })}
                            placeholder="e.g. Store room A" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Category</label>
                        <select data-testid="inventory-category-select" className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Unit</label>
                        <select data-testid="inventory-unit-select" className={inputCls} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Reorder Level</label>
                        <input data-testid="inventory-reorder-level-input" type="number" min="0" step="any" className={inputCls}
                            value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
                        <p className="text-[10px] text-slate-500 mt-1">Alert triggers at or below this quantity.</p>
                    </div>
                    <div>
                        <label className={labelCls}>Unit Cost (₹)</label>
                        <input data-testid="inventory-unit-cost-input" type="number" min="0" step="any" className={inputCls}
                            value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })}
                            placeholder="Optional" />
                    </div>
                </div>
                {mode === "create" && (
                    <div>
                        <label className={labelCls}>Opening Stock</label>
                        <input data-testid="inventory-opening-stock-input" type="number" min="0" step="any" className={inputCls}
                            value={form.openingStock} onChange={e => setForm({ ...form, openingStock: e.target.value })}
                            placeholder="Leave blank if starting empty" />
                        <p className="text-[10px] text-slate-500 mt-1">Creates an opening-balance entry in the ledger.</p>
                    </div>
                )}
                <div>
                    <label className={labelCls}>Description</label>
                    <textarea data-testid="inventory-description-input" className={inputCls} rows={2}
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Notes about specifications, brand preferences…" />
                </div>
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCURE
// ─────────────────────────────────────────────────────────────────────────────
function ProcureModal({ item, onClose, onSuccess }: {
    item: InventoryItem; onClose: () => void; onSuccess: () => void;
}) {
    const { addToast } = useToast();
    const [form, setForm] = useState({
        quantity: "",
        unitCost: item.unitCost != null ? String(item.unitCost) : "",
        supplier: "",
        invoiceRef: "",
        purchasedAt: new Date().toISOString().slice(0, 10),
        notes: "",
    });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        const q = Number(form.quantity);
        if (!q || q <= 0) { addToast("Enter a positive quantity.", "error"); return; }
        setSaving(true);
        try {
            await api.procureInventoryItem(item.id, {
                quantity: q,
                unitCost: form.unitCost.trim() === "" ? undefined : Number(form.unitCost),
                supplier: form.supplier.trim() || undefined,
                invoiceRef: form.invoiceRef.trim() || undefined,
                purchasedAt: form.purchasedAt ? new Date(form.purchasedAt).toISOString() : undefined,
                notes: form.notes.trim() || undefined,
            });
            addToast(`Procured ${q} ${item.unit.toLowerCase()} of ${item.name}.`, "success");
            onSuccess();
            onClose();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to record procurement.", "error");
        } finally {
            setSaving(false);
        }
    };

    const total = form.unitCost && form.quantity ? Number(form.unitCost) * Number(form.quantity) : null;

    return (
        <ModalShell
            title="Procure Stock"
            subtitle={`${item.name} · current: ${fmtNum(item.currentStock)} ${item.unit.toLowerCase()}`}
            onClose={onClose}
            accent="emerald"
            footer={
                <div className="flex gap-2">
                    <button data-testid="inventory-close-btn-3" onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">Cancel</button>
                    <button data-testid="inventory-submit-btn-2" onClick={submit} disabled={saving}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Record Procurement
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Quantity *</label>
                        <div className="relative">
                            <input data-testid="inventory-quantity-input" type="number" min="0" step="any" className={inputCls}
                                value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} autoFocus />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                                {item.unit.toLowerCase()}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Unit Cost (₹)</label>
                        <input data-testid="inventory-unit-cost-input-2" type="number" min="0" step="any" className={inputCls}
                            value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })}
                            placeholder="Optional" />
                    </div>
                </div>
                {total !== null && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-700">Total cost</span>
                        <span className="text-sm font-black text-emerald-800 tabular-nums">{fmtMoney(total)}</span>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Supplier</label>
                        <input data-testid="inventory-supplier-input" className={inputCls} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                            placeholder="Vendor name" />
                    </div>
                    <div>
                        <label className={labelCls}>Invoice / Bill Ref.</label>
                        <input data-testid="inventory-invoice-ref-input" className={inputCls} value={form.invoiceRef} onChange={e => setForm({ ...form, invoiceRef: e.target.value })} />
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Purchased On</label>
                    <input data-testid="inventory-purchased-at-input" type="date" className={inputCls}
                        value={form.purchasedAt} onChange={e => setForm({ ...form, purchasedAt: e.target.value })} />
                </div>
                <div>
                    <label className={labelCls}>Notes</label>
                    <textarea data-testid="inventory-notes-input" className={inputCls} rows={2}
                        value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Optional context…" />
                </div>
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSUME
// ─────────────────────────────────────────────────────────────────────────────
function ConsumeModal({ item, onClose, onSuccess }: {
    item: InventoryItem; onClose: () => void; onSuccess: () => void;
}) {
    const { addToast } = useToast();
    const [form, setForm] = useState({
        quantity: "",
        consumerType: "SCHOOL" as (typeof CONSUMER_TYPES)[number]["value"],
        consumerId: "",
        consumerLabel: "",
        notes: "",
    });
    const [consumerSearch, setConsumerSearch] = useState("");
    const [saving, setSaving] = useState(false);

    const consumerQuery = useQuery({
        queryKey: ["inventory-consumers", form.consumerType, consumerSearch],
        queryFn: () => api.listInventoryConsumers(form.consumerType, consumerSearch),
        enabled: !["SCHOOL", "OTHER"].includes(form.consumerType),
        staleTime: 60_000,
    });

    const submit = async () => {
        const q = Number(form.quantity);
        if (!q || q <= 0) { addToast("Enter a positive quantity.", "error"); return; }
        if (q > item.currentStock) {
            addToast(`Only ${fmtNum(item.currentStock)} in stock — cannot consume ${fmtNum(q)}.`, "error");
            return;
        }

        const payload: any = { quantity: q, consumerType: form.consumerType, notes: form.notes.trim() || undefined };
        if (form.consumerType === "CLASS")   payload.consumerClassId   = form.consumerId;
        if (form.consumerType === "SECTION") payload.consumerSectionId = form.consumerId;
        if (form.consumerType === "STUDENT") payload.consumerStudentId = form.consumerId;
        if (form.consumerType === "TEACHER") payload.consumerTeacherId = form.consumerId;
        if (form.consumerType === "STAFF")   payload.consumerStaffId   = form.consumerId;
        if (form.consumerType === "OTHER")   payload.consumerLabel     = form.consumerLabel.trim();

        if (form.consumerType !== "SCHOOL" && form.consumerType !== "OTHER" && !form.consumerId) {
            addToast("Please choose a consumer.", "error"); return;
        }
        if (form.consumerType === "OTHER" && !form.consumerLabel.trim()) {
            addToast("Enter a label for the consumer.", "error"); return;
        }

        setSaving(true);
        try {
            await api.consumeInventoryItem(item.id, payload);
            addToast(`Issued ${q} ${item.unit.toLowerCase()} of ${item.name}.`, "success");
            onSuccess();
            onClose();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to record consumption.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell
            title="Issue / Consume Stock"
            subtitle={`${item.name} · available: ${fmtNum(item.currentStock)} ${item.unit.toLowerCase()}`}
            onClose={onClose}
            accent="rose"
            footer={
                <div className="flex gap-2">
                    <button data-testid="inventory-close-btn-4" onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">Cancel</button>
                    <button data-testid="inventory-submit-btn-3" onClick={submit} disabled={saving}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl hover:from-rose-700 hover:to-pink-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Issue Stock
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className={labelCls}>Consumer Type *</label>
                    <div className="grid grid-cols-4 gap-1.5">
                        {CONSUMER_TYPES.map(c => {
                            const active = form.consumerType === c.value;
                            const Icon = c.icon;
                            return (
                                <button data-testid="inventory-form-btn" key={c.value} type="button"
                                    onClick={() => setForm({ ...form, consumerType: c.value as any, consumerId: "", consumerLabel: "" })}
                                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[10px] font-semibold transition-all border ${
                                        active
                                            ? "bg-rose-100 text-rose-800 border-rose-300 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                    }`}>
                                    <Icon size={13} />
                                    <span className="truncate w-full text-center leading-tight">{c.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {form.consumerType === "SCHOOL" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-600">
                        <School size={14} className="inline mr-1.5 text-slate-500" />
                        Consumption is recorded against the school as a whole (no specific class/person).
                    </div>
                )}
                {form.consumerType === "OTHER" && (
                    <div>
                        <label className={labelCls}>Consumer label *</label>
                        <input data-testid="inventory-consumer-label-input" className={inputCls} value={form.consumerLabel}
                            onChange={e => setForm({ ...form, consumerLabel: e.target.value })}
                            placeholder="e.g. Sports day event, guest visit" />
                    </div>
                )}
                {!["SCHOOL", "OTHER"].includes(form.consumerType) && (
                    <div>
                        <label className={labelCls}>Pick a {form.consumerType.toLowerCase()} *</label>
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className={`${inputCls} pl-9`} placeholder={`Search ${form.consumerType.toLowerCase()}s…`}
                                value={consumerSearch}
                                onChange={e => setConsumerSearch(e.target.value)} />
                        </div>
                        <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                            {consumerQuery.isLoading ? (
                                <div className="px-3 py-3 text-center text-xs text-slate-400">Loading…</div>
                            ) : (consumerQuery.data?.options ?? []).length === 0 ? (
                                <div className="px-3 py-3 text-center text-xs text-slate-400">No matches.</div>
                            ) : (
                                (consumerQuery.data?.options ?? []).map(o => (
                                    <button key={o.id} type="button"
                                        onClick={() => setForm({ ...form, consumerId: o.id })}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${
                                            form.consumerId === o.id ? "bg-rose-50 font-semibold text-rose-800" : "text-slate-700"
                                        }`}>
                                        {o.label}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <label className={labelCls}>Quantity *</label>
                    <div className="relative">
                        <input type="number" min="0" step="any" className={inputCls}
                            value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                            {item.unit.toLowerCase()}
                        </span>
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Notes</label>
                    <textarea className={inputCls} rows={2}
                        value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Reason / context…" />
                </div>
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADJUST
// ─────────────────────────────────────────────────────────────────────────────
function AdjustModal({ item, onClose, onSuccess }: {
    item: InventoryItem; onClose: () => void; onSuccess: () => void;
}) {
    const { addToast } = useToast();
    const [newStock, setNewStock] = useState(String(item.currentStock));
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const parsedNew = Number(newStock);
    const delta = Number.isFinite(parsedNew) ? parsedNew - item.currentStock : 0;

    const submit = async () => {
        if (!Number.isFinite(parsedNew) || parsedNew < 0) { addToast("Enter a valid non-negative quantity.", "error"); return; }
        setSaving(true);
        try {
            await api.adjustInventoryItem(item.id, {
                newStock: parsedNew,
                notes: notes.trim() || undefined,
            });
            addToast("Adjustment recorded.", "success");
            onSuccess();
            onClose();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Failed to adjust stock.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell
            title="Adjust Stock (Physical Count)"
            subtitle={`${item.name} · book stock: ${fmtNum(item.currentStock)} ${item.unit.toLowerCase()}`}
            onClose={onClose}
            accent="amber"
            footer={
                <div className="flex gap-2">
                    <button onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">Cancel</button>
                    <button onClick={submit} disabled={saving}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Apply Adjustment
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className={labelCls}>New physical stock count *</label>
                    <div className="relative">
                        <input type="number" min="0" step="any" className={inputCls}
                            value={newStock} onChange={e => setNewStock(e.target.value)} autoFocus />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                            {item.unit.toLowerCase()}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Book</p>
                        <p className="text-lg font-black text-slate-700 tabular-nums">{fmtNum(item.currentStock)}</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${delta > 0 ? "bg-emerald-50" : delta < 0 ? "bg-rose-50" : "bg-slate-50"}`}>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delta</p>
                        <p className={`text-lg font-black tabular-nums ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-700"}`}>
                            {delta > 0 ? "+" : ""}{fmtNum(delta)}
                        </p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Physical</p>
                        <p className="text-lg font-black text-amber-700 tabular-nums">{fmtNum(parsedNew)}</p>
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Reason *</label>
                    <textarea className={inputCls} rows={2}
                        value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="e.g. Quarterly audit, breakage, missing units" />
                </div>
            </div>
        </ModalShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM DETAIL DRAWER — right-side slide-in
// ─────────────────────────────────────────────────────────────────────────────
type DrawerTab = "overview" | "ledger" | "consumers" | "suppliers";

function ItemDetailDrawer({ itemId, onClose, onLaunchModal, onEdit }: {
    itemId: string;
    onClose: () => void;
    onLaunchModal: (kind: "procure" | "consume" | "adjust", item: InventoryItem) => void;
    onEdit: (item: InventoryItem) => void;
}) {
    const [tab, setTab] = useState<DrawerTab>("overview");

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["inventory-item-detail", itemId],
        queryFn: () => api.getInventoryItem(itemId),
        staleTime: 15_000,
    });

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const item = data?.item;
    const txns = data?.transactions ?? [];
    const consumers = data?.consumers ?? [];
    const suppliers = data?.suppliers ?? [];
    const totals = data?.totals;

    const exportLedgerCsv = () => {
        if (!item) return;
        downloadCsv(
            `ledger_${item.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
            ["When", "Type", "Quantity", "Unit", "Balance After", "Unit Cost", "Total Cost", "Supplier", "Invoice", "Consumer Type", "Consumer", "Notes", "By"],
            txns.map(t => [
                new Date(t.performedAt).toISOString(),
                t.type,
                t.quantity,
                item.unit,
                t.balanceAfter,
                t.unitCost ?? "",
                t.totalCost ?? "",
                t.supplier ?? "",
                t.invoiceRef ?? "",
                t.consumerType ?? "",
                t.consumerName ?? "",
                t.notes ?? "",
                t.performedByName ?? "",
            ]),
        );
    };

    return (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/40 backdrop-blur-sm"
            onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col h-full animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-lime-600 via-emerald-600 to-teal-600 text-white px-6 py-5 shrink-0">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                            <Package size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                            {isLoading || !item ? (
                                <>
                                    <div className="h-5 w-40 bg-white/20 rounded animate-pulse mb-1.5" />
                                    <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-lg font-black truncate">{item.name}</h2>
                                        {!item.isActive && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-white/25 rounded">Archived</span>}
                                        {item.lowStock && item.isActive && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-500 rounded">Low Stock</span>}
                                    </div>
                                    <p className="text-xs opacity-90 mt-0.5">
                                        {item.category}
                                        {item.sku ? ` · SKU ${item.sku}` : ""}
                                        {item.storageLocation ? ` · ${item.storageLocation}` : ""}
                                    </p>
                                </>
                            )}
                        </div>
                        <button onClick={onClose} aria-label="Close"
                            className="p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Quick actions */}
                    {item && item.isActive && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button onClick={() => onLaunchModal("procure", item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 shadow-sm">
                                <ShoppingCart size={13} /> Procure
                            </button>
                            <button onClick={() => onLaunchModal("consume", item)}
                                disabled={item.currentStock <= 0}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-rose-700 rounded-lg hover:bg-rose-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                <ArrowDownCircle size={13} /> Consume
                            </button>
                            <button onClick={() => onLaunchModal("adjust", item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-amber-700 rounded-lg hover:bg-amber-50 shadow-sm">
                                <Sliders size={13} /> Adjust
                            </button>
                            <button onClick={() => onEdit(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/20 text-white rounded-lg hover:bg-white/30 shadow-sm">
                                <Pencil size={13} /> Edit
                            </button>
                            <button onClick={() => refetch()} disabled={isFetching}
                                title="Refresh"
                                className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 ml-auto">
                                <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 bg-white px-4 shrink-0">
                    <div className="flex gap-1">
                        {([
                            { k: "overview",  l: "Overview",  i: BarChart3 },
                            { k: "ledger",    l: "Ledger",    i: History,   n: txns.length },
                            { k: "consumers", l: "Consumers", i: Boxes,     n: consumers.length },
                            { k: "suppliers", l: "Suppliers", i: Truck,     n: suppliers.length },
                        ] as Array<{ k: DrawerTab; l: string; i: any; n?: number }>).map(t => {
                            const active = tab === t.k;
                            const Icon = t.i;
                            return (
                                <button key={t.k} onClick={() => setTab(t.k)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                                        active
                                            ? "border-emerald-500 text-emerald-700"
                                            : "border-transparent text-slate-500 hover:text-slate-700"
                                    }`}>
                                    <Icon size={13} />
                                    {t.l}
                                    {typeof t.n === "number" && t.n > 0 && (
                                        <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                                            active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                        }`}>{t.n}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading || !item ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={26} /></div>
                    ) : (
                        <>
                            {tab === "overview" && (
                                <div className="p-5 space-y-5">
                                    {/* KPI strip */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Stock</p>
                                            <p className={`text-2xl font-black tabular-nums ${item.lowStock ? "text-rose-700" : "text-slate-800"}`}>
                                                {fmtNum(item.currentStock)}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{item.unit.toLowerCase()}</p>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reorder At</p>
                                            <p className="text-2xl font-black text-amber-700 tabular-nums">{fmtNum(item.reorderLevel)}</p>
                                            <p className="text-[10px] text-slate-500">Alert threshold</p>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit Cost</p>
                                            <p className="text-2xl font-black text-slate-800 tabular-nums">{item.unitCost == null ? "—" : fmtMoney(item.unitCost)}</p>
                                            <p className="text-[10px] text-slate-500">Latest procurement price</p>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stock Value</p>
                                            <p className="text-2xl font-black text-emerald-700 tabular-nums">{fmtMoney(item.stockValue)}</p>
                                            <p className="text-[10px] text-slate-500">Book value</p>
                                        </div>
                                    </div>

                                    {/* Lifetime totals */}
                                    {totals && (
                                        <div className="bg-white border border-slate-200 rounded-xl p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Activity size={14} className="text-slate-500" />
                                                <h3 className="text-sm font-bold text-slate-800">Lifetime Movement</h3>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3 text-center">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total procured</p>
                                                    <p className="text-lg font-black text-emerald-700 tabular-nums">{fmtNum(totals.procured)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total consumed</p>
                                                    <p className="text-lg font-black text-rose-700 tabular-nums">{fmtNum(totals.consumed)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lifetime spend</p>
                                                    <p className="text-lg font-black text-indigo-700 tabular-nums">{fmtMoney(totals.spend)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total movements</p>
                                                    <p className="text-lg font-black text-slate-700 tabular-nums">{totals.txnCount}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Metadata */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 text-sm">
                                        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                            <ClipboardCheck size={14} className="text-slate-500" /> Details
                                        </h3>
                                        <MetaRow label="Category" value={item.category} />
                                        <MetaRow label="SKU / Code" value={item.sku ?? "—"} />
                                        <MetaRow label="Storage" value={item.storageLocation ?? "—"} icon={MapPin} />
                                        <MetaRow label="Status" value={item.isActive ? "Active" : "Archived"} />
                                        <MetaRow label="Added on" value={fmtDateTime(item.createdAt)} />
                                        {item.description && (
                                            <div className="pt-2 border-t border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tab === "ledger" && (
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500">
                                            {txns.length} recorded movement{txns.length === 1 ? "" : "s"} (most recent 200)
                                        </p>
                                        <button onClick={exportLedgerCsv} disabled={txns.length === 0}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                                            <Download size={12} /> Export CSV
                                        </button>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                        {txns.length === 0 ? (
                                            <div className="text-center py-12">
                                                <History size={26} strokeWidth={1.5} className="text-slate-300 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500">No movements recorded yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Procure or issue stock to see activity here.</p>
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-slate-100">
                                                {txns.map(t => {
                                                    const meta = TXN_TYPE_META[t.type] ?? TXN_TYPE_META.ADJUSTMENT;
                                                    const Icon = meta.icon;
                                                    const inflow = t.type === "PROCUREMENT" || t.type === "RETURN" || t.type === "OPENING" ||
                                                        (t.type === "ADJUSTMENT" && t.deltaDirection === "INCREASE");
                                                    return (
                                                        <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                                                                <Icon size={14} className={meta.color} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-baseline justify-between gap-2">
                                                                    <p className={`text-sm font-bold ${meta.color}`}>{meta.label}</p>
                                                                    <p className={`text-sm font-black tabular-nums ${inflow ? "text-emerald-700" : "text-rose-700"}`}>
                                                                        {inflow ? "+" : "−"}{fmtNum(t.quantity)} {item.unit.toLowerCase()}
                                                                    </p>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500">
                                                                    {fmtDateTime(t.performedAt)}
                                                                    {t.performedByName ? ` · by ${t.performedByName}` : ""}
                                                                </p>
                                                                {(t.consumerName || t.supplier) && (
                                                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                                                        {t.consumerName && <><span className="font-semibold">{t.consumerType}:</span> {t.consumerName}</>}
                                                                        {t.supplier && <><span className="font-semibold">Supplier:</span> {t.supplier}
                                                                            {t.invoiceRef && <span className="text-slate-400"> · #{t.invoiceRef}</span>}
                                                                        </>}
                                                                    </p>
                                                                )}
                                                                {t.notes && <p className="text-[11px] italic text-slate-500 mt-0.5">"{t.notes}"</p>}
                                                                <p className="text-[10px] text-slate-400 mt-0.5">Balance after: {fmtNum(t.balanceAfter)} {item.unit.toLowerCase()}
                                                                    {t.unitCost != null && ` · @ ${fmtMoney(t.unitCost)}/unit`}
                                                                    {t.totalCost != null && ` · ${fmtMoney(t.totalCost)} total`}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tab === "consumers" && (
                                <div className="p-5">
                                    {consumers.length === 0 ? (
                                        <div className="bg-white border border-slate-200 rounded-xl text-center py-12">
                                            <Boxes size={28} strokeWidth={1.5} className="text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">No consumption recorded yet.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                                <TrendingDown size={14} className="text-rose-500" />
                                                <h3 className="text-sm font-bold text-slate-800">Who consumed this item</h3>
                                                <span className="ml-auto text-[10px] text-slate-500">Ranked by total quantity</span>
                                            </div>
                                            <ul className="divide-y divide-slate-100">
                                                {consumers.map((c, i) => {
                                                    const maxQty = Math.max(...consumers.map(x => x.totalQty), 1);
                                                    const pct = Math.max(2, (c.totalQty / maxQty) * 100);
                                                    return (
                                                        <li key={c.key} className="px-4 py-3">
                                                            <div className="flex items-center gap-3 mb-1.5">
                                                                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-slate-800 truncate">{c.label}</p>
                                                                    <p className="text-[10px] text-slate-500">{c.type} · {c.txnCount} txn{c.txnCount === 1 ? "" : "s"}</p>
                                                                </div>
                                                                <p className="text-sm font-black text-rose-700 tabular-nums">{fmtNum(c.totalQty)} <span className="text-[10px] font-normal text-slate-400">{item.unit.toLowerCase()}</span></p>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === "suppliers" && (
                                <div className="p-5">
                                    {suppliers.length === 0 ? (
                                        <div className="bg-white border border-slate-200 rounded-xl text-center py-12">
                                            <Truck size={28} strokeWidth={1.5} className="text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm text-slate-500">No suppliers recorded yet.</p>
                                            <p className="text-xs text-slate-400 mt-1">Enter a supplier name during procurement to track vendor history.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                                <Truck size={14} className="text-emerald-500" />
                                                <h3 className="text-sm font-bold text-slate-800">Suppliers of this item</h3>
                                                <span className="ml-auto text-[10px] text-slate-500">Ranked by spend</span>
                                            </div>
                                            <ul className="divide-y divide-slate-100">
                                                {suppliers.map((s, i) => (
                                                    <li key={s.supplier} className="px-4 py-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-slate-800 truncate">{s.supplier}</p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    {fmtNum(s.totalQty)} {item.unit.toLowerCase()} across {s.txnCount} order{s.txnCount === 1 ? "" : "s"}
                                                                    {s.lastPurchasedAt && ` · last on ${new Date(s.lastPurchasedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm font-black text-emerald-700 tabular-nums shrink-0">{fmtMoney(s.totalSpend)}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const MetaRow: React.FC<{ label: string; value: string; icon?: React.ComponentType<{ size?: number; className?: string }> }> = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-2 text-[13px]">
        {Icon && <Icon size={13} className="text-slate-400 shrink-0" />}
        <span className="text-slate-500 font-medium min-w-[110px]">{label}</span>
        <span className="text-slate-800 font-semibold">{value}</span>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────
function DashboardTab({ onOpenItem }: { onOpenItem: (id: string) => void }) {
    const { data, isLoading } = useQuery({
        queryKey: ["inventory-summary"],
        queryFn: () => api.getInventorySummary(),
        staleTime: 60_000,
    });
    const s = data?.summary;

    if (isLoading || !s) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-lime-500" size={28} />
            </div>
        );
    }

    const kpis = [
        { icon: Boxes,         label: "Active Items",    value: s.totals.activeItems.toLocaleString("en-IN"), bg: "bg-lime-50",    iconBg: "bg-lime-100",    color: "text-lime-700"    },
        { icon: Warehouse,     label: "Total Items",     value: s.totals.items.toLocaleString("en-IN"),        bg: "bg-slate-50",   iconBg: "bg-slate-200",   color: "text-slate-700"   },
        { icon: IndianRupee,   label: "Stock Value",     value: fmtMoney(s.totals.stockValue),                 bg: "bg-emerald-50", iconBg: "bg-emerald-100", color: "text-emerald-700" },
        { icon: AlertTriangle, label: "Low-Stock Items", value: s.totals.lowStockCount.toLocaleString("en-IN"), bg: "bg-amber-50",   iconBg: "bg-amber-100",   color: "text-amber-700"   },
    ];

    const renderDelta = (pct: number | null) => {
        if (pct === null) return <span className="text-[10px] font-semibold text-slate-400">no prior data</span>;
        if (pct === 0) return <span className="text-[10px] font-semibold text-slate-500">no change</span>;
        const up = pct > 0;
        return (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
                {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(pct)}% vs last month
            </span>
        );
    };

    return (
        <div className="p-4 sm:p-5 md:p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(c => (
                    <div key={c.label} className={`rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow ${c.bg}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.iconBg}`}>
                            <c.icon size={18} className={c.color} />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{c.label}</p>
                        <p className={`text-2xl font-black mt-0.5 tabular-nums ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Procured — this month</p>
                        <ShoppingCart size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-emerald-700 tabular-nums">{fmtNum(s.movement.thisMonth.procured)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{fmtMoney(s.movement.thisMonth.procuredSpend)} spent</p>
                    <div className="mt-2">{renderDelta(s.movement.deltas.procuredPct)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consumed — this month</p>
                        <ArrowDownCircle size={16} className="text-rose-500" />
                    </div>
                    <p className="text-2xl font-black text-rose-700 tabular-nums">{fmtNum(s.movement.thisMonth.consumed)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.movement.thisMonth.totalTxns} total txns</p>
                    <div className="mt-2">{renderDelta(s.movement.deltas.consumedPct)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Procurement Spend</p>
                        <IndianRupee size={16} className="text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-indigo-700 tabular-nums">{fmtMoney(s.movement.thisMonth.procuredSpend)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Last month: {fmtMoney(s.movement.lastMonth.procuredSpend)}</p>
                    <div className="mt-2">{renderDelta(s.movement.deltas.procuredSpendPct)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertTriangle size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-800">Low-stock Alerts</h3>
                            <p className="text-[11px] text-slate-500">Items at or below their reorder level</p>
                        </div>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{s.lowStock.length}</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {s.lowStock.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-slate-500">
                                All items are above reorder level.
                            </div>
                        ) : (
                            s.lowStock.map(i => (
                                <button key={i.id}
                                    onClick={() => onOpenItem(i.id)}
                                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 text-left transition-colors">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <Package size={14} className="text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{i.name}</p>
                                        <p className="text-[11px] text-slate-500">{i.category}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-rose-700 tabular-nums">{fmtNum(i.currentStock)} {i.unit.toLowerCase()}</p>
                                        <p className="text-[10px] text-slate-500">reorder at {fmtNum(i.reorderLevel)}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300" />
                                </button>
                            ))
                        )}
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <BarChart3 size={14} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">By Category</h3>
                            <p className="text-[11px] text-slate-500">Item counts and stock value per category</p>
                        </div>
                    </div>
                    <div className="p-5 space-y-3">
                        {s.byCategory.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 py-6">No categories with active items.</p>
                        ) : (
                            s.byCategory.map(c => {
                                const maxValue = Math.max(...s.byCategory.map(x => x.stockValue), 1);
                                const pct = Math.max(2, (c.stockValue / maxValue) * 100);
                                return (
                                    <div key={c.category}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-semibold text-slate-700">{c.category}</span>
                                            <span className="text-[11px] tabular-nums text-slate-500">
                                                {c.itemCount} items · {fmtMoney(c.stockValue)}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full transition-all"
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-fuchsia-100 flex items-center justify-center">
                            <TrendingUp size={14} className="text-fuchsia-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Top Consuming Classes</h3>
                            <p className="text-[11px] text-slate-500">Last 90 days</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {s.topConsumingClasses.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-slate-500">
                                No class-wise consumption recorded in the last 90 days.
                            </div>
                        ) : (
                            s.topConsumingClasses.map((c, i) => (
                                <div key={c.classId} className="flex items-center gap-3 px-5 py-3">
                                    <div className="w-7 h-7 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-black flex items-center justify-center">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{c.className}</p>
                                        <p className="text-[11px] text-slate-500">{c.txnCount} txns</p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 tabular-nums">{fmtNum(c.totalUnits)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                            <Activity size={14} className="text-cyan-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
                            <p className="text-[11px] text-slate-500">Last 15 stock movements</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {s.recentActivity.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-slate-500">
                                No activity yet.
                            </div>
                        ) : (
                            s.recentActivity.map((r: any) => {
                                const meta = TXN_TYPE_META[r.type] ?? TXN_TYPE_META.ADJUSTMENT;
                                const Icon = meta.icon;
                                return (
                                    <button key={r.id} onClick={() => onOpenItem(r.itemId)}
                                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 text-left transition-colors">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg}`}>
                                            <Icon size={13} className={meta.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{r.itemName}</p>
                                            <p className="text-[11px] text-slate-500">{meta.label} · {fmtDateTime(r.performedAt)}</p>
                                        </div>
                                        <p className="text-sm font-bold tabular-nums text-slate-700">{fmtNum(r.quantity)}</p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEMS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ItemsTab({ onOpenItem, onOpenModal, itemsCount }: {
    onOpenItem: (id: string) => void;
    onOpenModal: (modal: ModalState) => void;
    itemsCount: number | undefined;
}) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<string>("");
    const [active, setActive] = useState<"true" | "false" | "all">("true");
    const [lowOnly, setLowOnly] = useState(false);

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ["inventory-items", search, category, active, lowOnly],
        queryFn: () => api.listInventoryItems({
            search: search.trim() || undefined,
            category: category || undefined,
            active,
            lowStock: lowOnly ? "true" : undefined,
        }),
        staleTime: 30_000,
    });

    const items = data?.items ?? [];

    const exportItemsCsv = () => {
        downloadCsv(
            `inventory_items_${new Date().toISOString().slice(0, 10)}.csv`,
            ["Name", "SKU", "Category", "Unit", "Current Stock", "Reorder Level", "Unit Cost", "Stock Value", "Storage Location", "Status"],
            items.map(i => [
                i.name, i.sku ?? "", i.category, i.unit,
                i.currentStock, i.reorderLevel, i.unitCost ?? "", i.stockValue,
                i.storageLocation ?? "", i.isActive ? "Active" : "Archived",
            ]),
        );
    };

    const isTrulyEmpty = !isLoading && items.length === 0 && !search && !category && !lowOnly && active === "true" && (itemsCount === 0 || itemsCount === undefined);

    return (
        <div className="p-4 sm:p-5 md:p-6 space-y-4">
            {/* Truly empty — first-time setup */}
            {isTrulyEmpty ? (
                <EmptyStateWizard onOpenModal={onOpenModal} />
            ) : (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or SKU…"
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400"
                            />
                        </div>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400"
                        >
                            <option value="">All categories</option>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <select
                            value={active}
                            onChange={e => setActive(e.target.value as "true" | "false" | "all")}
                            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400"
                        >
                            <option value="true">Active only</option>
                            <option value="false">Archived only</option>
                            <option value="all">All items</option>
                        </select>
                        <button
                            onClick={() => setLowOnly(v => !v)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                                lowOnly
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <AlertTriangle size={13} /> Low stock
                        </button>
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            title="Refresh"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button
                            onClick={exportItemsCsv}
                            disabled={items.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Download size={13} /> Export
                        </button>
                        <button
                            onClick={() => onOpenModal({ kind: "create" })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-lime-600 to-emerald-600 rounded-lg hover:from-lime-700 hover:to-emerald-700 shadow-sm ml-auto"
                        >
                            <Plus size={13} /> New Item
                        </button>
                    </div>

                    {/* Items table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reorder</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit Cost</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Value</th>
                                        <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr><td colSpan={7} className="py-12 text-center">
                                            <Loader2 className="animate-spin text-lime-500 inline" size={24} />
                                        </td></tr>
                                    ) : isError ? (
                                        <tr><td colSpan={7} className="p-0">
                                            <ErrorState message="Could not load inventory items." onRetry={() => void refetch()} testId="inventory-items-error" />
                                        </td></tr>
                                    ) : items.length === 0 ? (
                                        <tr><td colSpan={7} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Warehouse size={32} strokeWidth={1.5} />
                                                <p className="text-sm font-medium">No items match these filters.</p>
                                                <p className="text-xs">Try clearing filters or add a new item.</p>
                                            </div>
                                        </td></tr>
                                    ) : (
                                        items.map(item => (
                                            <tr key={item.id} data-testid="inventory-row" data-id={item.id}
                                                onClick={() => onOpenItem(item.id)}
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer ${!item.isActive ? "opacity-60" : ""}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-lime-50 flex items-center justify-center shrink-0">
                                                            <Package size={14} className="text-lime-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                                                {!item.isActive && (
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">Archived</span>
                                                                )}
                                                                {item.lowStock && item.isActive && (
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Low</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 truncate">
                                                                {item.sku ? `SKU: ${item.sku}` : "no SKU"}
                                                                {item.storageLocation ? ` · ${item.storageLocation}` : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-block text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm tabular-nums font-semibold text-slate-800">
                                                    {fmtNum(item.currentStock)}<span className="text-slate-400 font-normal"> {item.unit.toLowerCase()}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-500">
                                                    {fmtNum(item.reorderLevel)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">
                                                    {item.unitCost == null ? "—" : fmtMoney(item.unitCost)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm tabular-nums font-semibold text-emerald-700">
                                                    {fmtMoney(item.stockValue)}
                                                </td>
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => onOpenModal({ kind: "procure", item })}
                                                            disabled={!item.isActive}
                                                            title="Procure (add stock)"
                                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <ShoppingCart size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onOpenModal({ kind: "consume", item })}
                                                            disabled={!item.isActive || item.currentStock <= 0}
                                                            title="Consume (issue stock)"
                                                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <ArrowDownCircle size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onOpenModal({ kind: "adjust", item })}
                                                            disabled={!item.isActive}
                                                            title="Adjust (physical count)"
                                                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <Sliders size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onOpenModal({ kind: "edit", item })}
                                                            title="Edit item"
                                                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => onOpenModal({ kind: "delete", item })}
                                                            disabled={!item.isActive}
                                                            title="Deactivate item"
                                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {items.length > 0 && (
                            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500 flex items-center justify-between">
                                <span>{items.length} item{items.length === 1 ? "" : "s"} listed. Click a row to open full details.</span>
                                <span className="hidden md:inline">
                                    <ShoppingCart size={11} className="inline text-emerald-500" /> procure ·
                                    <ArrowDownCircle size={11} className="inline text-rose-500 ml-1" /> consume ·
                                    <Sliders size={11} className="inline text-amber-500 ml-1" /> adjust
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE — first-time onboarding wizard
// ─────────────────────────────────────────────────────────────────────────────
function EmptyStateWizard({ onOpenModal }: { onOpenModal: (m: ModalState) => void }) {
    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="bg-gradient-to-br from-lime-50 via-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                    <Sparkles size={22} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800">Set up your school inventory</h2>
                <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2">
                    Track every product your school buys, stores, and issues — stationery, chairs, chalk, sports gear, medical supplies, everything. Start with a common template or add your own.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button onClick={() => onOpenModal({ kind: "create" })}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-lime-600 to-emerald-600 rounded-xl hover:from-lime-700 hover:to-emerald-700 shadow-sm">
                        <Plus size={14} /> Add my first item
                    </button>
                </div>
            </div>

            <div className="mt-8">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <Zap size={13} className="text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick-add from templates</h3>
                    <p className="text-[11px] text-slate-400 ml-auto">Click any template to open the item form pre-filled — adjust and save.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SAMPLE_TEMPLATES.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.name}
                                onClick={() => onOpenModal({ kind: "create-from-template", template: t })}
                                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all text-left group">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center shrink-0 transition-colors">
                                        <Icon size={14} className="text-slate-500 group-hover:text-emerald-600 transition-colors" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{t.name}</p>
                                        <p className="text-[11px] text-slate-500">{t.category} · {t.unit.toLowerCase()} · reorder @ {t.reorderLevel}</p>
                                    </div>
                                    <Plus size={12} className="text-slate-300 group-hover:text-emerald-500 shrink-0 mt-1" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
function TransactionsTab() {
    const [type, setType] = useState<string>("");
    const [consumerType, setConsumerType] = useState<string>("");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ["inventory-transactions", type, consumerType, fromDate, toDate],
        queryFn: () => api.listInventoryTransactions({
            type: type || undefined,
            consumerType: consumerType || undefined,
            fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
            toDate: toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString() : undefined,
            limit: 200,
        }),
        staleTime: 30_000,
    });

    const rows = data?.transactions ?? [];

    const exportCsv = () => {
        downloadCsv(
            `inventory_ledger_${new Date().toISOString().slice(0, 10)}.csv`,
            ["When", "Item", "Unit", "Type", "Quantity", "Balance After", "Unit Cost", "Total Cost", "Supplier", "Invoice", "Consumer Type", "Consumer", "Notes", "By"],
            rows.map(r => [
                new Date(r.performedAt).toISOString(),
                r.itemName, r.itemUnit, r.type,
                r.quantity, r.balanceAfter,
                r.unitCost ?? "", r.totalCost ?? "",
                r.supplier ?? "", r.invoiceRef ?? "",
                r.consumerType ?? "", r.consumerName ?? "",
                r.notes ?? "", r.performedByName ?? "",
            ]),
        );
    };

    return (
        <div className="p-4 sm:p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400"
                >
                    <option value="">All movement types</option>
                    {Object.entries(TXN_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>
                <select
                    value={consumerType}
                    onChange={e => setConsumerType(e.target.value)}
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-400"
                >
                    <option value="">All consumers</option>
                    {CONSUMER_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    From:
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                        className="px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30" />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    To:
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                        className="px-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/30" />
                </label>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    title="Refresh"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 ml-auto"
                >
                    <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                </button>
                <button
                    onClick={exportCsv}
                    disabled={rows.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                    <Download size={13} /> Export CSV
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">When</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Movement</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Balance</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Consumer / Supplier</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="py-12 text-center">
                                    <Loader2 className="animate-spin text-lime-500 inline" size={24} />
                                </td></tr>
                            ) : isError ? (
                                        <tr><td colSpan={7} className="p-0">
                                            <ErrorState message="Could not load stock transactions." onRetry={() => void refetch()} testId="inventory-txns-error" />
                                        </td></tr>
                                    ) : rows.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <History size={32} strokeWidth={1.5} />
                                        <p className="text-sm font-medium">No transactions in this range.</p>
                                    </div>
                                </td></tr>
                            ) : (
                                rows.map(r => {
                                    const meta = TXN_TYPE_META[r.type] ?? TXN_TYPE_META.ADJUSTMENT;
                                    const Icon = meta.icon;
                                    const signed = r.type === "PROCUREMENT" || r.type === "RETURN" ||
                                        (r.type === "ADJUSTMENT" && r.deltaDirection === "INCREASE") ||
                                        r.type === "OPENING" ? "+" : "−";
                                    const isNeg = signed === "−";
                                    return (
                                        <tr key={r.id} data-testid="inventory-row" data-id={r.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                                                {fmtDateTime(r.performedAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Package size={12} className="text-slate-400" />
                                                    <span className="text-sm font-semibold text-slate-800 truncate">{r.itemName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                                                    <Icon size={11} /> {meta.label}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${isNeg ? "text-rose-700" : "text-emerald-700"}`}>
                                                {signed}{fmtNum(r.quantity)} <span className="text-slate-400 font-normal">{r.itemUnit?.toLowerCase()}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                                                {fmtNum(r.balanceAfter)}
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-slate-600">
                                                {r.consumerName ? (
                                                    <span><span className="font-semibold text-slate-500">{r.consumerType}:</span> {r.consumerName}</span>
                                                ) : r.supplier ? (
                                                    <span><span className="font-semibold text-slate-500">Supplier:</span> {r.supplier}
                                                        {r.invoiceRef && <span className="ml-1 text-slate-400">#{r.invoiceRef}</span>}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                                {r.notes && <p className="text-slate-400 italic truncate mt-0.5">{r.notes}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-slate-500 truncate">
                                                {r.performedByName ?? "—"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {rows.length >= 200 && (
                    <div className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100 text-center">
                        Showing the most recent 200 transactions. Tighten filters to see older activity.
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL STATE UNION
// ─────────────────────────────────────────────────────────────────────────────
type ModalState =
    | { kind: "create" }
    | { kind: "create-from-template"; template: (typeof SAMPLE_TEMPLATES)[number] }
    | { kind: "edit"; item: InventoryItem }
    | { kind: "procure"; item: InventoryItem }
    | { kind: "consume"; item: InventoryItem }
    | { kind: "adjust"; item: InventoryItem }
    | { kind: "delete"; item: InventoryItem };

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HUB
// ─────────────────────────────────────────────────────────────────────────────
export default function InventoryHub() {
    const [activeTab, setActiveTab] = useTabState<TabId>("tab", "dashboard");
    const [modal, setModal] = useState<ModalState | null>(null);
    const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
    const { addToast } = useToast();
    const { confirm, dialog } = useConfirm();
    const queryClient = useQueryClient();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-item-detail"] });
    };

    // Deactivate flow
    useEffect(() => {
        if (modal?.kind === "delete") {
            const item = modal.item;
            setModal(null);
            confirm({
                title: "Deactivate this item?",
                message: `${item.name} will be marked inactive and hidden from new procurement/consumption. Existing transactions remain in the ledger.`,
                confirmText: "Deactivate",
                onConfirm: async () => {
                    try {
                        await api.deactivateInventoryItem(item.id);
                        addToast("Item deactivated.", "success");
                        invalidateAll();
                    } catch (err: any) {
                        addToast(err?.response?.data?.message ?? "Failed to deactivate item.", "error");
                        throw err;
                    }
                },
            });
        }
    }, [modal]); // eslint-disable-line react-hooks/exhaustive-deps

    const summaryQuery = useQuery({
        queryKey: ["inventory-summary"],
        queryFn: () => api.getInventorySummary(),
        staleTime: 60_000,
    });

    const badges = useMemo(() => {
        const s = summaryQuery.data?.summary;
        return {
            items:        s?.totals.activeItems,
            transactions: s?.movement.thisMonth.totalTxns,
            lowStock:     s?.totals.lowStockCount,
        };
    }, [summaryQuery.data]);

    const TABS = [
        { key: "dashboard"    as const, label: "Insights",  icon: BarChart3 },
        { key: "items"        as const, label: "Items",     icon: Package,  badge: badges.items },
        { key: "transactions" as const, label: "Ledger",    icon: History,  badge: badges.transactions },
    ];

    const openItem = (id: string) => setDrawerItemId(id);
    const closeDrawer = () => setDrawerItemId(null);

    return (
        <div className="min-h-full bg-slate-50 flex flex-col">
            <PageHeader
                icon={Package}
                title="Inventory Management"
                subtitle="Track products, procurement, and class/section-wise consumption across the school"
                gradient={MODULE_THEMES.sports}
                onRefresh={() => {
                    invalidateAll();
                    summaryQuery.refetch();
                }}
                refreshing={summaryQuery.isFetching}
                primaryActions={
                    <button
                        onClick={() => setModal({ kind: "create" })}
                        className="inline-flex items-center gap-1.5 px-3.5 h-9 text-xs font-bold text-emerald-700 bg-white rounded-lg hover:bg-slate-50 shadow-sm"
                    >
                        <Plus size={13} /> New Item
                    </button>
                }
            />

            {typeof badges.lowStock === "number" && badges.lowStock > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
                    <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <p className="text-amber-800">
                            <span className="font-bold">{badges.lowStock}</span> item{badges.lowStock === 1 ? " is" : "s are"} at or below reorder level.
                        </p>
                        <button onClick={() => setActiveTab("dashboard")}
                            className="ml-auto text-amber-700 hover:text-amber-900 font-bold underline underline-offset-2">
                            Review
                        </button>
                    </div>
                </div>
            )}

            <TabbedSection
                idPrefix="inventory"
                value={activeTab}
                onChange={setActiveTab}
                tabs={TABS}
                theme="emerald"
                flushPanel
            >
                <TabPanel tabKey="dashboard">
                    <DashboardTab onOpenItem={openItem} />
                </TabPanel>
                <TabPanel tabKey="items">
                    <ItemsTab onOpenItem={openItem} onOpenModal={setModal} itemsCount={badges.items} />
                </TabPanel>
                <TabPanel tabKey="transactions">
                    <TransactionsTab />
                </TabPanel>
            </TabbedSection>

            {/* Modals */}
            {modal?.kind === "create" && (
                <ItemFormModal mode="create" onClose={() => setModal(null)} onSuccess={invalidateAll} />
            )}
            {modal?.kind === "create-from-template" && (
                <ItemFormModal mode="create" template={modal.template} onClose={() => setModal(null)} onSuccess={invalidateAll} />
            )}
            {modal?.kind === "edit" && (
                <ItemFormModal mode="edit" item={modal.item} onClose={() => setModal(null)} onSuccess={invalidateAll} />
            )}
            {modal?.kind === "procure" && (
                <ProcureModal item={modal.item} onClose={() => setModal(null)} onSuccess={invalidateAll} />
            )}
            {modal?.kind === "consume" && (
                <ConsumeModal item={modal.item} onClose={() => setModal(null)} onSuccess={invalidateAll} />
            )}
            {modal?.kind === "adjust" && (
                <AdjustModal item={modal.item} onClose={() => setModal(null)} onSuccess={invalidateAll} />
            )}

            {/* Detail drawer */}
            {drawerItemId && (
                <ItemDetailDrawer
                    itemId={drawerItemId}
                    onClose={closeDrawer}
                    onLaunchModal={(kind, item) => setModal({ kind, item } as ModalState)}
                    onEdit={(item) => setModal({ kind: "edit", item })}
                />
            )}

            {dialog}
        </div>
    );
}
