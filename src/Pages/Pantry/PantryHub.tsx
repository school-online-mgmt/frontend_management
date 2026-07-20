import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    UtensilsCrossed, Plus, Minus, X, Loader2, Search, CheckCircle2, Wallet,
    Banknote, ShoppingCart, Pencil, Trash2, PackagePlus, Ban, RotateCcw,
    PackageCheck, TrendingUp, AlertTriangle, Snowflake, IndianRupee,
    Users, ReceiptText,
} from "lucide-react";
import api from "../../api/api";
import type { PantryItem, PantryWalletRow, PantryInsights } from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection from "../../components/common/TabbedSection";
import useTabState from "../../hooks/useTabState";
import { useToast } from "../../context/ToastContext";

const inr = (n: number | null | undefined) => n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;
const fmtDT = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const CATEGORIES = ["SNACKS", "MEALS", "BEVERAGES", "STATIONERY", "OTHER"];

const STATUS_PILL: Record<string, string> = {
    PLACED: "bg-amber-50 text-amber-700", READY: "bg-blue-50 text-blue-700",
    COLLECTED: "bg-emerald-50 text-emerald-700", CANCELLED: "bg-slate-100 text-slate-500",
    REFUNDED: "bg-rose-50 text-rose-600",
};

type TabId = "pos" | "menu" | "orders" | "wallets" | "insights";

export default function PantryHub() {
    const [tab, setTab] = useTabState<TabId>("pantry", "pos");
    return (
        <div className="flex flex-col h-full bg-slate-50">
            <PageHeader
                icon={UtensilsCrossed}
                title="Pantry"
                subtitle="Counter sales, menu, wallets and canteen insights"
                gradient={MODULE_THEMES.finance}
            />
            <div className="flex-1 overflow-y-auto p-4">
                <TabbedSection<TabId>
                    tabs={[
                        { key: "pos", label: "POS — Sell" },
                        { key: "menu", label: "Menu Items" },
                        { key: "orders", label: "Orders" },
                        { key: "wallets", label: "Wallets" },
                        { key: "insights", label: "Insights" },
                    ]}
                    value={tab}
                    onChange={setTab}
                    ariaLabel="Pantry sections"
                    theme="emerald"
                >
                    {tab === "pos" && <PosTab />}
                    {tab === "menu" && <MenuTab />}
                    {tab === "orders" && <OrdersTab />}
                    {tab === "wallets" && <WalletsTab />}
                    {tab === "insights" && <InsightsTab />}
                </TabbedSection>
            </div>
        </div>
    );
}

/* ═══════════════════════════ POS ═══════════════════════════ */
function PosTab() {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [cart, setCart] = useState<Record<string, number>>({});
    const [method, setMethod] = useState<"WALLET" | "CASH">("CASH");
    const [buyer, setBuyer] = useState<PantryWalletRow | null>(null);
    const [buyerQuery, setBuyerQuery] = useState("");
    const [itemQuery, setItemQuery] = useState("");
    const [charging, setCharging] = useState(false);

    const itemsQ = useQuery({ queryKey: ["pantry", "items"], queryFn: () => api.listPantryItems() });
    const walletsQ = useQuery({ queryKey: ["pantry", "wallets"], queryFn: () => api.listPantryWallets() });

    const items = (itemsQ.data?.items ?? []).filter(i => i.isAvailable);
    const filteredItems = itemQuery
        ? items.filter(i => i.name.toLowerCase().includes(itemQuery.toLowerCase()))
        : items;

    const wallets = walletsQ.data?.wallets ?? [];
    const buyerMatches = buyerQuery.length >= 2
        ? wallets.filter(w => (w.holderName ?? "").toLowerCase().includes(buyerQuery.toLowerCase())).slice(0, 8)
        : [];

    const lines = Object.entries(cart)
        .map(([id, qty]) => ({ item: items.find(i => i.id === id), qty }))
        .filter((l): l is { item: PantryItem; qty: number } => !!l.item && l.qty > 0);
    const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
    const setQty = (id: string, qty: number) => setCart(c => ({ ...c, [id]: Math.max(0, Math.min(50, qty)) }));

    const charge = async () => {
        if (lines.length === 0 || charging) return;
        if (method === "WALLET" && !buyer) { addToast("Pick the wallet holder first.", "error"); return; }
        setCharging(true);
        try {
            await api.pantryPosSale({
                items: lines.map(l => ({ itemId: l.item.id, quantity: l.qty })),
                paymentMethod: method,
                userType: buyer?.userType ?? null,
                userId: buyer?.userId ?? null,
            });
            addToast(`Sale recorded — ${inr(total)} ${method === "WALLET" ? "charged to wallet" : "received in cash"}.`, "success");
            setCart({}); setBuyer(null); setBuyerQuery("");
            qc.invalidateQueries({ queryKey: ["pantry"] });
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Sale failed.", "error");
        } finally { setCharging(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Item grid */}
            <div className="lg:col-span-2">
                <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={itemQuery} onChange={e => setItemQuery(e.target.value)} placeholder="Search items…"
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
                </div>
                {itemsQ.isLoading ? (
                    <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
                ) : filteredItems.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-16">No items — add some in the Menu tab.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {filteredItems.map(item => {
                            const qty = cart[item.id] ?? 0;
                            const soldOut = item.stockCount != null && item.stockCount <= 0;
                            return (
                                <button key={item.id} disabled={soldOut}
                                    onClick={() => setQty(item.id, qty + 1)}
                                    className={`relative rounded-xl border bg-white p-3 text-left transition-all ${
                                        soldOut ? "opacity-50" : qty > 0 ? "border-emerald-400 ring-1 ring-emerald-200" : "border-slate-200 hover:border-emerald-300"}`}>
                                    <p className="text-sm font-semibold text-slate-800 line-clamp-2">{item.name}</p>
                                    <p className="mt-1 text-sm font-bold text-emerald-700 tabular-nums">{inr(item.price)}</p>
                                    {item.stockCount != null && (
                                        <p className={`text-[10px] mt-0.5 ${item.stockCount <= (item.lowStockThreshold ?? 5) ? "text-amber-600" : "text-slate-400"}`}>
                                            {soldOut ? "Sold out" : `${item.stockCount} in stock`}
                                        </p>
                                    )}
                                    {qty > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">{qty}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cart panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 h-fit sticky top-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3"><ShoppingCart size={16} /> Current sale</h3>
                {lines.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">Tap items to add them.</p>
                ) : (
                    <div className="space-y-2 mb-3">
                        {lines.map(l => (
                            <div key={l.item.id} className="flex items-center justify-between gap-2 text-sm">
                                <span className="truncate text-slate-700">{l.item.name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => setQty(l.item.id, l.qty - 1)} className="rounded border border-slate-200 p-0.5 text-slate-500"><Minus size={12} /></button>
                                    <span className="w-5 text-center font-semibold tabular-nums">{l.qty}</span>
                                    <button onClick={() => setQty(l.item.id, l.qty + 1)} className="rounded border border-slate-200 p-0.5 text-slate-500"><Plus size={12} /></button>
                                    <span className="w-14 text-right font-medium tabular-nums">{inr(l.item.price * l.qty)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">Total</span>
                    <span className="text-xl font-bold text-slate-900 tabular-nums">{inr(total)}</span>
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <button onClick={() => setMethod("CASH")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${method === "CASH" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>
                        <Banknote size={15} /> Cash
                    </button>
                    <button onClick={() => setMethod("WALLET")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${method === "WALLET" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>
                        <Wallet size={15} /> Wallet
                    </button>
                </div>

                {/* Buyer picker (needed for wallet, optional for cash) */}
                <div className="mb-3">
                    <span className="text-xs font-medium text-slate-600">
                        {method === "WALLET" ? "Wallet holder (required)" : "Customer (optional — for their history)"}
                    </span>
                    {buyer ? (
                        <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-emerald-800 truncate">{buyer.holderName}</p>
                                <p className="text-[11px] text-emerald-600">{buyer.userType} · balance {inr(buyer.balance)}{!buyer.isActive ? " · FROZEN" : ""}</p>
                            </div>
                            <button onClick={() => setBuyer(null)} className="p-1 text-emerald-600"><X size={14} /></button>
                        </div>
                    ) : (
                        <div className="relative mt-1">
                            <input value={buyerQuery} onChange={e => setBuyerQuery(e.target.value)}
                                placeholder="Type a name (min 2 letters)…"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            {buyerMatches.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                                    {buyerMatches.map(w => (
                                        <button key={w.id} onClick={() => { setBuyer(w); setBuyerQuery(""); }}
                                            className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                                            <span className="truncate">{w.holderName}</span>
                                            <span className="text-xs text-slate-400 shrink-0">{w.userType} · {inr(w.balance)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {method === "WALLET" && (
                                <p className="mt-1 text-[11px] text-slate-400">A wallet appears here once it has been topped up at least once.</p>
                            )}
                        </div>
                    )}
                </div>

                {method === "WALLET" && buyer && buyer.balance < total && (
                    <p className="mb-2 text-xs text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> Balance {inr(buyer.balance)} is less than the total.</p>
                )}

                <button
                    disabled={charging || lines.length === 0 || (method === "WALLET" && (!buyer || buyer.balance < total || !buyer.isActive))}
                    onClick={charge}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                    {charging ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Charge {inr(total)}
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════ MENU ═══════════════════════════ */
function MenuTab() {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [editing, setEditing] = useState<PantryItem | "new" | null>(null);
    const itemsQ = useQuery({ queryKey: ["pantry", "items"], queryFn: () => api.listPantryItems() });
    const items = itemsQ.data?.items ?? [];
    const refresh = () => qc.invalidateQueries({ queryKey: ["pantry", "items"] });

    const toggleAvailable = async (item: PantryItem) => {
        try {
            await api.updatePantryItem(item.id, { isAvailable: !item.isAvailable });
            refresh();
        } catch (err: any) { addToast(err?.response?.data?.message ?? "Update failed.", "error"); }
    };
    const remove = async (item: PantryItem) => {
        if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
        try { await api.deletePantryItem(item.id); addToast("Item deleted.", "success"); refresh(); }
        catch (err: any) { addToast(err?.response?.data?.message ?? "Delete failed.", "error"); }
    };
    const restock = async (item: PantryItem) => {
        const raw = window.prompt(`Add stock for "${item.name}" (current: ${item.stockCount ?? "untracked"})`, "10");
        if (!raw) return;
        const qty = Number(raw);
        if (!Number.isInteger(qty) || qty < 1) { addToast("Enter a whole positive number.", "error"); return; }
        try { await api.restockPantryItem(item.id, qty); addToast("Stock updated.", "success"); refresh(); }
        catch (err: any) { addToast(err?.response?.data?.message ?? "Restock failed.", "error"); }
    };

    return (
        <div>
            <div className="flex justify-end mb-3">
                <button onClick={() => setEditing("new")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                    <Plus size={15} /> Add item
                </button>
            </div>
            {itemsQ.isLoading ? (
                <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : items.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-16">No menu items yet — add your first snack.</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">Price</th>
                                <th className="px-4 py-3 text-right">Stock</th>
                                <th className="px-4 py-3">Available</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const low = item.stockCount != null && item.stockCount <= (item.lowStockThreshold ?? 5);
                                return (
                                    <tr key={item.id} className="border-b border-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-800 flex items-center gap-1.5">
                                                {item.isVeg != null && <span className={`h-2 w-2 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />}
                                                {item.name}
                                            </p>
                                            {item.description && <p className="text-xs text-slate-400 truncate max-w-xs">{item.description}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{item.category}</td>
                                        <td className="px-4 py-3 text-right font-medium tabular-nums">{inr(item.price)}</td>
                                        <td className={`px-4 py-3 text-right tabular-nums ${low ? "text-amber-600 font-semibold" : "text-slate-600"}`}>
                                            {item.stockCount == null ? "—" : item.stockCount}
                                            {low && <AlertTriangle size={12} className="inline ml-1 -mt-0.5" />}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => toggleAvailable(item)}
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {item.isAvailable ? "On sale" : "Hidden"}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => restock(item)} title="Add stock" className="p-1.5 text-slate-500 hover:text-emerald-700"><PackagePlus size={15} /></button>
                                                <button onClick={() => setEditing(item)} title="Edit" className="p-1.5 text-slate-500 hover:text-emerald-700"><Pencil size={15} /></button>
                                                <button onClick={() => remove(item)} title="Delete" className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {editing && <ItemModal item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
        </div>
    );
}

function ItemModal({ item, onClose, onSaved }: { item: PantryItem | null; onClose: () => void; onSaved: () => void }) {
    const { addToast } = useToast();
    const [name, setName] = useState(item?.name ?? "");
    const [category, setCategory] = useState(item?.category ?? "SNACKS");
    const [description, setDescription] = useState(item?.description ?? "");
    const [price, setPrice] = useState<number | "">(item?.price ?? "");
    const [isVeg, setIsVeg] = useState<string>(item?.isVeg == null ? "NA" : item.isVeg ? "VEG" : "NONVEG");
    const [trackStock, setTrackStock] = useState(item?.stockCount != null);
    const [stockCount, setStockCount] = useState<number | "">(item?.stockCount ?? "");
    const [lowStockThreshold, setLowStockThreshold] = useState<number | "">(item?.lowStockThreshold ?? 5);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (name.trim().length < 2 || price === "" || Number(price) < 1) { addToast("Name and a positive price are required.", "error"); return; }
        setSaving(true);
        const payload = {
            name: name.trim(), category, description: description.trim() || null,
            price: Number(price),
            isVeg: isVeg === "NA" ? null : isVeg === "VEG",
            stockCount: trackStock ? Number(stockCount || 0) : null,
            lowStockThreshold: trackStock && lowStockThreshold !== "" ? Number(lowStockThreshold) : null,
        };
        try {
            if (item) await api.updatePantryItem(item.id, payload);
            else await api.createPantryItem(payload as any);
            addToast(item ? "Item updated." : "Item added.", "success");
            onSaved();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Save failed.", "error");
        } finally { setSaving(false); }
    };

    return (
        <Modal title={item ? "Edit item" : "New menu item"} onClose={onClose}>
            <div className="grid grid-cols-2 gap-3">
                <label className="block col-span-2">
                    <span className="text-xs font-medium text-slate-600">Name</span>
                    <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Category</span>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Price (₹)</span>
                    <input type="number" min={1} value={price} onChange={e => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                    <span className="text-xs font-medium text-slate-600">Type</span>
                    <select value={isVeg} onChange={e => setIsVeg(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <option value="NA">Not applicable</option>
                        <option value="VEG">Veg</option>
                        <option value="NONVEG">Non-veg</option>
                    </select>
                </label>
                <label className="block col-span-2">
                    <span className="text-xs font-medium text-slate-600">Description (optional)</span>
                    <input value={description} onChange={e => setDescription(e.target.value)} maxLength={300}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={trackStock} onChange={e => setTrackStock(e.target.checked)} className="rounded border-slate-300" />
                    Track stock for this item
                </label>
                {trackStock && (
                    <>
                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Stock count</span>
                            <input type="number" min={0} value={stockCount} onChange={e => setStockCount(e.target.value === "" ? "" : Number(e.target.value))}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Low-stock alert at</span>
                            <input type="number" min={0} value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value === "" ? "" : Number(e.target.value))}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </label>
                    </>
                )}
            </div>
            <ModalActions onClose={onClose} onSave={save} saving={saving} saveLabel={item ? "Save changes" : "Add item"} />
        </Modal>
    );
}

/* ═══════════════════════════ ORDERS ═══════════════════════════ */
function OrdersTab() {
    const qc = useQueryClient();
    const { addToast } = useToast();
    const [status, setStatus] = useState("");
    const [channel, setChannel] = useState("");
    const [date, setDate] = useState("");

    const ordersQ = useQuery({
        queryKey: ["pantry", "orders", status, channel, date],
        queryFn: () => api.listPantryOrders({
            ...(status ? { status } : {}), ...(channel ? { channel } : {}), ...(date ? { date } : {}),
        }),
    });
    const orders = ordersQ.data?.orders ?? [];
    const refresh = () => qc.invalidateQueries({ queryKey: ["pantry"] });

    const act = async (fn: () => Promise<{ message: string }>, ok: string) => {
        try { await fn(); addToast(ok, "success"); refresh(); }
        catch (err: any) { addToast(err?.response?.data?.message ?? "Action failed.", "error"); }
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-3">
                <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                    <option value="">All statuses</option>
                    {["PLACED", "READY", "COLLECTED", "CANCELLED", "REFUNDED"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={channel} onChange={e => setChannel(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                    <option value="">All channels</option>
                    <option value="POS">POS (counter)</option>
                    <option value="SELF">Self-order (portal)</option>
                </select>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm" />
            </div>
            {ordersQ.isLoading ? (
                <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : orders.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-16">No orders match these filters.</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                <th className="px-4 py-3">When</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Channel</th>
                                <th className="px-4 py-3">Paid by</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id} className="border-b border-slate-50">
                                    <td className="px-4 py-3 text-slate-500">{fmtDT(o.createdAt)}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{o.userName ?? "Walk-in"}</td>
                                    <td className="px-4 py-3 text-slate-500">{o.channel === "POS" ? "Counter" : "Portal"}</td>
                                    <td className="px-4 py-3 text-slate-500">{o.paymentMethod === "WALLET" ? "Wallet" : "Cash"}</td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{inr(o.totalAmount)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[o.status]}`}>{o.status}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            {o.status === "PLACED" && (
                                                <button onClick={() => act(() => api.pantryOrderReady(o.id), "Marked ready.")} title="Mark ready" className="p-1.5 text-slate-500 hover:text-blue-600"><PackageCheck size={15} /></button>
                                            )}
                                            {(o.status === "PLACED" || o.status === "READY") && (
                                                <>
                                                    <button onClick={() => act(() => api.pantryOrderCollect(o.id), "Order collected.")} title="Mark collected" className="p-1.5 text-slate-500 hover:text-emerald-600"><CheckCircle2 size={15} /></button>
                                                    <button onClick={() => { if (window.confirm("Cancel this order? Wallet payments are refunded and stock restored.")) act(() => api.pantryOrderCancel(o.id), "Order cancelled."); }} title="Cancel" className="p-1.5 text-slate-400 hover:text-rose-600"><Ban size={15} /></button>
                                                </>
                                            )}
                                            {o.status === "COLLECTED" && o.paymentMethod === "WALLET" && (
                                                <button onClick={() => { if (window.confirm("Refund this collected order to the wallet?")) act(() => api.pantryOrderRefund(o.id), "Refunded to wallet."); }} title="Refund" className="p-1.5 text-slate-400 hover:text-rose-600"><RotateCcw size={15} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════ WALLETS ═══════════════════════════ */
function WalletsTab() {
    const qc = useQueryClient();
    const [q, setQ] = useState("");
    const [target, setTarget] = useState<PantryWalletRow | null>(null);
    const [creating, setCreating] = useState(false);

    const walletsQ = useQuery({ queryKey: ["pantry", "wallets"], queryFn: () => api.listPantryWallets() });
    const wallets = (walletsQ.data?.wallets ?? []).filter(w =>
        !q || (w.holderName ?? "").toLowerCase().includes(q.toLowerCase()));

    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="relative max-w-sm flex-1 min-w-52">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search wallet holders…"
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" />
                </div>
                <button onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                    <Plus size={15} /> New wallet / first top-up
                </button>
            </div>
            {walletsQ.isLoading ? (
                <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : wallets.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Users size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No wallets yet — a wallet is created the first time you top someone up.</p>
                    <p className="text-xs mt-1">Use "Top up" on any student/teacher from this screen once they ask at the counter.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                                <th className="px-4 py-3">Holder</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 text-right">Balance</th>
                                <th className="px-4 py-3 text-right">Daily limit</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {wallets.map(w => (
                                <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer" onClick={() => setTarget(w)}>
                                    <td className="px-4 py-3 font-medium text-slate-800">{w.holderName}</td>
                                    <td className="px-4 py-3 text-slate-500">{w.userType}</td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{inr(w.balance)}</td>
                                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{w.dailyLimit == null ? "—" : inr(w.dailyLimit)}</td>
                                    <td className="px-4 py-3">
                                        {w.isActive
                                            ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
                                            : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"><Snowflake size={11} /> Frozen</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-emerald-600">Manage →</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {target && (
                <WalletModal row={target} onClose={() => setTarget(null)}
                    onChanged={() => { qc.invalidateQueries({ queryKey: ["pantry", "wallets"] }); }} />
            )}
            {creating && (
                <NewWalletModal onClose={() => setCreating(false)}
                    onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["pantry", "wallets"] }); }} />
            )}
        </div>
    );
}

/** Pick ANY student/teacher (wallet or not) and record their first cash top-up. */
function NewWalletModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const { addToast } = useToast();
    const [query, setQuery] = useState("");
    const [holder, setHolder] = useState<{ userType: "STUDENT" | "TEACHER"; userId: string; name: string } | null>(null);
    const [amount, setAmount] = useState<number | "">("");
    const [busy, setBusy] = useState(false);

    const searchQ = useQuery({
        queryKey: ["pantry", "holders", query],
        queryFn: () => api.searchPantryHolders(query),
        enabled: query.trim().length >= 2 && !holder,
    });

    const save = async () => {
        if (!holder) { addToast("Pick a student or teacher first.", "error"); return; }
        if (amount === "" || Number(amount) < 1) { addToast("Enter the cash amount received.", "error"); return; }
        setBusy(true);
        try {
            const out = await api.pantryOfflineTopup(holder.userType, holder.userId, { amount: Number(amount) });
            addToast(`Wallet ready — ${holder.name} now has ${inr(out.balance)}.`, "success");
            onDone();
        } catch (err: any) {
            addToast(err?.response?.data?.message ?? "Top-up failed.", "error");
        } finally { setBusy(false); }
    };

    return (
        <Modal title="New wallet / first top-up" onClose={onClose}>
            <p className="text-xs text-slate-500 mb-3">
                Search any student or teacher — their wallet is created automatically with this first cash top-up.
            </p>
            {holder ? (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div>
                        <p className="text-sm font-medium text-emerald-800">{holder.name}</p>
                        <p className="text-[11px] text-emerald-600">{holder.userType}</p>
                    </div>
                    <button onClick={() => setHolder(null)} className="p-1 text-emerald-600"><X size={14} /></button>
                </div>
            ) : (
                <div className="relative mb-3">
                    <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
                        placeholder="Type a name (min 2 letters)…"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    {searchQ.isFetching && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-slate-400" />}
                    {(searchQ.data?.holders ?? []).length > 0 && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                            {searchQ.data!.holders.map(h => (
                                <button key={`${h.userType}-${h.userId}`} onClick={() => setHolder(h)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                                    <span className="truncate">{h.name}</span>
                                    <span className="text-xs text-slate-400 shrink-0">{h.userType}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <label className="block">
                <span className="text-xs font-medium text-slate-600">Cash received (₹)</span>
                <input type="number" min={1} value={amount}
                    onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <ModalActions onClose={onClose} onSave={save} saving={busy} saveLabel="Create & top up" />
        </Modal>
    );
}

function WalletModal({ row, onClose, onChanged }: { row: PantryWalletRow; onClose: () => void; onChanged: () => void }) {
    const { addToast } = useToast();
    const qc = useQueryClient();
    const detailQ = useQuery({
        queryKey: ["pantry", "wallet", row.userType, row.userId],
        queryFn: () => api.getPantryWalletDetail(row.userType, row.userId),
    });
    const [topupAmount, setTopupAmount] = useState<number | "">("");
    const [busy, setBusy] = useState(false);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["pantry", "wallet", row.userType, row.userId] });
        onChanged();
    };

    const topup = async () => {
        if (topupAmount === "" || Number(topupAmount) < 1) { addToast("Enter a positive amount.", "error"); return; }
        setBusy(true);
        try {
            const out = await api.pantryOfflineTopup(row.userType, row.userId, { amount: Number(topupAmount) });
            addToast(`Topped up — new balance ${inr(out.balance)}. Collect the cash!`, "success");
            setTopupAmount("");
            refresh();
        } catch (err: any) { addToast(err?.response?.data?.message ?? "Top-up failed.", "error"); }
        finally { setBusy(false); }
    };

    const adjust = async (direction: "CREDIT" | "DEBIT") => {
        const raw = window.prompt(`${direction === "CREDIT" ? "Add to" : "Deduct from"} wallet (₹):`);
        if (!raw) return;
        const amount = Number(raw);
        if (!Number.isInteger(amount) || amount < 1) { addToast("Enter a whole positive number.", "error"); return; }
        const notes = window.prompt("Reason (required, will be audited):");
        if (!notes || notes.trim().length < 3) { addToast("A reason is required.", "error"); return; }
        try {
            await api.pantryAdjustWallet(row.userType, row.userId, { direction, amount, notes: notes.trim() });
            addToast("Wallet adjusted.", "success");
            refresh();
        } catch (err: any) { addToast(err?.response?.data?.message ?? "Adjustment failed.", "error"); }
    };

    const setLimit = async () => {
        const raw = window.prompt("Daily spend limit in ₹ (leave empty to remove the cap):", row.dailyLimit == null ? "" : String(row.dailyLimit));
        if (raw === null) return;
        const dailyLimit = raw.trim() === "" ? null : Number(raw);
        if (dailyLimit != null && (!Number.isInteger(dailyLimit) || dailyLimit < 0)) { addToast("Enter a whole number.", "error"); return; }
        try {
            await api.pantryPatchWallet(row.userType, row.userId, { dailyLimit });
            addToast(dailyLimit == null ? "Daily limit removed." : `Daily limit set to ${inr(dailyLimit)}.`, "success");
            refresh();
        } catch (err: any) { addToast(err?.response?.data?.message ?? "Update failed.", "error"); }
    };

    const toggleFreeze = async () => {
        const wallet = detailQ.data?.wallet ?? row;
        try {
            await api.pantryPatchWallet(row.userType, row.userId, { isActive: !wallet.isActive });
            addToast(wallet.isActive ? "Wallet frozen." : "Wallet unfrozen.", "success");
            refresh();
        } catch (err: any) { addToast(err?.response?.data?.message ?? "Update failed.", "error"); }
    };

    const wallet = detailQ.data?.wallet;
    return (
        <Modal title={`Wallet — ${row.holderName ?? ""}`} onClose={onClose} wide>
            {detailQ.isLoading || !wallet ? (
                <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <Stat label="Balance" value={inr(wallet.balance)} />
                        <Stat label="Spent today" value={inr(detailQ.data!.spentToday)} />
                        <Stat label="Daily limit" value={wallet.dailyLimit == null ? "None" : inr(wallet.dailyLimit)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <input type="number" min={1} value={topupAmount} placeholder="Cash top-up ₹"
                            onChange={e => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        <button onClick={topup} disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <IndianRupee size={14} />} Top up (cash)
                        </button>
                        <button onClick={() => adjust("CREDIT")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">+ Adjust</button>
                        <button onClick={() => adjust("DEBIT")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">− Adjust</button>
                        <button onClick={setLimit} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Daily limit…</button>
                        <button onClick={toggleFreeze}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${wallet.isActive ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                            <Snowflake size={14} /> {wallet.isActive ? "Freeze" : "Unfreeze"}
                        </button>
                    </div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recent activity</h4>
                    {detailQ.data!.transactions.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center">No transactions yet.</p>
                    ) : (
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-50">
                            {detailQ.data!.transactions.map(txn => (
                                <div key={txn.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-700">{txn.source.replace(/_/g, " ")}</p>
                                        <p className="text-xs text-slate-400">{fmtDT(txn.createdAt)}{txn.notes ? ` · ${txn.notes}` : ""}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`font-semibold tabular-nums ${txn.type === "CREDIT" ? "text-emerald-600" : "text-rose-500"}`}>
                                            {txn.type === "CREDIT" ? "+" : "−"}{inr(txn.amount)}
                                        </p>
                                        <p className="text-[11px] text-slate-400 tabular-nums">bal {inr(txn.balanceAfter)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
}

/* ═══════════════════════════ INSIGHTS ═══════════════════════════ */
function InsightsTab() {
    const now = new Date();
    const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const today = now.toISOString().slice(0, 10);
    const [from, setFrom] = useState(first);
    const [to, setTo] = useState(today);

    const q = useQuery<PantryInsights>({
        queryKey: ["pantry", "insights", from, to],
        queryFn: () => api.getPantryInsights(from, to),
    });
    const d = q.data;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm" />
                <span className="text-slate-400 text-sm">to</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm" />
            </div>
            {q.isLoading || !d ? (
                <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon={ReceiptText} label="Orders" value={String(d.totals.orders)} tone="slate" />
                        <StatCard icon={TrendingUp} label="Gross revenue" value={inr(d.totals.grossRevenue)} tone="emerald" />
                        <StatCard icon={Wallet} label="Wallet liability" value={inr(d.walletLiability)} tone="indigo"
                            hint="Prepaid money the school still owes in goods" />
                        <StatCard icon={RotateCcw} label="Cancelled / refunded" value={inr(d.totals.reversed)} tone="rose" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Panel title="Sales by payment method">
                            {d.byMethod.length === 0 ? <Nil /> : d.byMethod.map(m => (
                                <Row key={m.method} left={m.method === "WALLET" ? "Wallet" : "Cash"} mid={`${m.orders} orders`} right={inr(m.revenue)} />
                            ))}
                        </Panel>
                        <Panel title="Sales by channel">
                            {d.byChannel.length === 0 ? <Nil /> : d.byChannel.map(c => (
                                <Row key={c.channel} left={c.channel === "POS" ? "Counter (POS)" : "Portal self-order"} mid={`${c.orders} orders`} right={inr(c.revenue)} />
                            ))}
                        </Panel>
                        <Panel title="Wallet top-ups in period">
                            <Row left="Online (Razorpay)" mid="" right={inr(d.topUps.online)} />
                            <Row left="Cash at counter" mid="" right={inr(d.topUps.offline)} />
                        </Panel>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Panel title="Top-selling items">
                            {d.topItems.length === 0 ? <Nil /> : d.topItems.map(item => (
                                <Row key={item.name} left={item.name} mid={`${item.quantity} sold`} right={inr(item.revenue)} />
                            ))}
                        </Panel>
                        <Panel title="Low stock — restock soon">
                            {d.lowStock.length === 0 ? (
                                <p className="text-sm text-slate-400 py-3">All tracked items are healthy. 🎉</p>
                            ) : d.lowStock.map(item => (
                                <Row key={item.id}
                                    left={<span className="inline-flex items-center gap-1.5 text-amber-700"><AlertTriangle size={13} /> {item.name}</span>}
                                    mid={`alert at ${item.lowStockThreshold ?? 5}`}
                                    right={`${item.stockCount} left`} />
                            ))}
                        </Panel>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Shared bits ────────────────────────────────────────────────────────── */
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
function ModalActions({ onClose, onSave, saving, saveLabel = "Save" }: { onClose: () => void; onSave: () => void; saving: boolean; saveLabel?: string }) {
    return (
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">Cancel</button>
            <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {saveLabel}
            </button>
        </div>
    );
}
function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-800 tabular-nums">{value}</p>
        </div>
    );
}
function StatCard({ icon: Icon, label, value, tone, hint }: { icon: any; label: string; value: string; tone: "slate" | "emerald" | "indigo" | "rose"; hint?: string }) {
    const tones = {
        slate: "bg-slate-50 text-slate-700", emerald: "bg-emerald-50 text-emerald-700",
        indigo: "bg-indigo-50 text-indigo-700", rose: "bg-rose-50 text-rose-700",
    };
    return (
        <div className={`rounded-xl px-4 py-3 ${tones[tone]}`}>
            <p className="text-[11px] font-medium opacity-70 flex items-center gap-1"><Icon size={12} /> {label}</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
            {hint && <p className="text-[10px] opacity-60 mt-0.5">{hint}</p>}
        </div>
    );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h4>
            <div className="divide-y divide-slate-50">{children}</div>
        </div>
    );
}
function Nil() {
    return <p className="text-sm text-slate-400 py-3">Nothing in this period.</p>;
}
function Row({ left, mid, right }: { left: React.ReactNode; mid: string; right: string }) {
    return (
        <div className="flex items-center justify-between py-2 text-sm">
            <span className="font-medium text-slate-700 min-w-0 truncate">{left}</span>
            <span className="text-xs text-slate-400 mx-2 shrink-0">{mid}</span>
            <span className="font-semibold text-slate-800 tabular-nums shrink-0">{right}</span>
        </div>
    );
}
