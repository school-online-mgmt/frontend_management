import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Bus, MapPin, Users, IndianRupee, TrendingUp, Phone, User, Clock,
    Plus, Pencil, Trash2, Check, X, Search, RefreshCw, BarChart3, Route,
    Shield, Loader2, CheckCircle, AlertCircle, Info, ShieldCheck, ShieldAlert,
} from "lucide-react";
import api from "../../api/api";
import { ErrorState } from "../../components/ui";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";
import useTabState from "../../hooks/useTabState";
import { useConfirm } from "../../hooks/useConfirm";
import { useSessionId } from "../../context/SessionContext";

/* ── helpers ─────────────────────────────────────────────────────────────────── */
const fmt = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
const VEHICLE_TYPES = ["BUS", "VAN", "MINIBUS", "TEMPO", "OTHER"];
type TabId = "dashboard" | "students" | "buses" | "compliance" | "zones";

/* ══════════════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
══════════════════════════════════════════════════════════════════════════════ */
function DashboardTab() {
    // Session id is provided by the global SessionContext (rendered in
    // the layout topbar). When no session is chosen, the dashboard shows
    // school-wide totals.
    const sessionId = useSessionId();
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["transport-dashboard", sessionId],
        queryFn: () => api.getTransportDashboard(sessionId ? { sessionId } : undefined),
        staleTime: 60_000,
    });
    const d = data as any;
    const overallPct = pct(d?.totalCollected ?? 0, d?.totalMonthlyDemand ?? 0);

    return (
        <div className="p-4 sm:p-5 md:p-6 space-y-6">
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
            ) : isError ? (
                /* Without this the dashboard fell through to "No transport
                   zones configured — create zones from the Zones tab", which
                   invites building a fleet the school already has. */
                <div className="bg-white rounded-2xl border border-slate-200">
                    <ErrorState
                        message="Could not load the transport dashboard."
                        error={error}
                        onRetry={() => void refetch()}
                        testId="transport-dashboard-error"
                    />
                </div>
            ) : (
                <>
                    {/* ── KPI Cards ──────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                        {[
                            { icon: Users, label: "Transport Students", value: d?.totalTransportStudents ?? 0, bg: "bg-indigo-50", color: "text-indigo-600", iconBg: "bg-indigo-100" },
                            { icon: MapPin, label: "Active Zones", value: d?.totalZones ?? 0, bg: "bg-emerald-50", color: "text-emerald-600", iconBg: "bg-emerald-100" },
                            { icon: Bus, label: "Fleet Size", value: d?.totalBuses ?? 0, bg: "bg-sky-50", color: "text-sky-600", iconBg: "bg-sky-100" },
                            { icon: IndianRupee, label: "Monthly Demand", value: fmt(d?.totalMonthlyDemand ?? 0), bg: "bg-amber-50", color: "text-amber-600", iconBg: "bg-amber-100" },
                            { icon: TrendingUp, label: "Collected", value: fmt(d?.totalCollected ?? 0), bg: "bg-violet-50", color: "text-violet-600", iconBg: "bg-violet-100" },
                        ].map(c => (
                            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                                        <c.icon size={18} className={c.color} />
                                    </div>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                                <p className={`text-2xl font-black mt-0.5 tabular-nums ${c.color}`}>{c.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Overall Collection Progress ────────────────────────── */}
                    {(d?.totalMonthlyDemand ?? 0) > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Overall Collection Progress</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Transport fee recovery across all zones</p>
                                </div>
                                <span className={`text-3xl font-black tabular-nums ${overallPct >= 80 ? "text-emerald-600" : overallPct >= 50 ? "text-amber-500" : "text-red-500"}`}>
                                    {overallPct}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div className={`h-3 rounded-full transition-all duration-700 ${overallPct >= 80 ? "bg-emerald-400" : overallPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                    style={{ width: `${overallPct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-2">
                                <span>Collected: <strong className="text-slate-600">{fmt(d?.totalCollected ?? 0)}</strong></span>
                                <span>Outstanding: <strong className="text-red-500">{fmt((d?.totalMonthlyDemand ?? 0) - (d?.totalCollected ?? 0))}</strong></span>
                            </div>
                        </div>
                    )}

                    {/* ── Zone Breakdown Table ───────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={16} className="text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-800">Zone-wise Breakdown</h3>
                            </div>
                            <span className="text-xs text-slate-400">{(d?.zoneStats ?? []).length} zones</span>
                        </div>
                        {(d?.zoneStats ?? []).length === 0 ? (
                            <div className="py-16 text-center">
                                <MapPin size={32} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-sm font-medium text-slate-500">No transport zones configured</p>
                                <p className="text-xs text-slate-400 mt-1">Create zones from the "Zones" tab to see analytics here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                                            <th className="text-left px-6 py-3">Zone</th>
                                            <th className="text-right px-4 py-3">Fee/Month</th>
                                            <th className="text-center px-4 py-3">Students</th>
                                            <th className="text-center px-4 py-3">Buses</th>
                                            <th className="text-right px-4 py-3">Demand</th>
                                            <th className="text-right px-4 py-3">Collected</th>
                                            <th className="text-center px-6 py-3">Recovery</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(d?.zoneStats ?? []).map((z: any, i: number) => {
                                            const p = pct(z.collectedAmount, z.monthlyDemand);
                                            return (
                                                <tr key={z.zoneId} data-testid="transport-zone-dashboard-row" data-zone-id={z.zoneId} data-zone-name={z.zoneName} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0
                                                                ${["bg-indigo-500","bg-emerald-500","bg-sky-500","bg-amber-500","bg-violet-500","bg-rose-500"][i % 6]}`}>
                                                                {z.zoneName?.charAt(0)?.toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{z.zoneName}</p>
                                                                {z.zoneDescription && <p className="text-[11px] text-slate-400 line-clamp-1 max-w-[200px]">{z.zoneDescription}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-right px-4 py-3.5 font-semibold text-slate-600 tabular-nums">{fmt(z.zonePrice)}</td>
                                                    <td className="text-center px-4 py-3.5">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">{z.studentCount}</span>
                                                    </td>
                                                    <td className="text-center px-4 py-3.5">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 bg-sky-50 text-sky-700 rounded-md text-xs font-bold">{z.busCount}</span>
                                                    </td>
                                                    <td className="text-right px-4 py-3.5 font-semibold text-slate-700 tabular-nums">{fmt(z.monthlyDemand)}</td>
                                                    <td className="text-right px-4 py-3.5 font-semibold text-emerald-600 tabular-nums">{fmt(z.collectedAmount)}</td>
                                                    <td className="px-6 py-3.5">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                                                <div className={`h-1.5 rounded-full ${p >= 80 ? "bg-emerald-400" : p >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                                                    style={{ width: `${p}%` }} />
                                                            </div>
                                                            <span className={`text-xs font-bold tabular-nums ${p >= 80 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-red-500"}`}>{p}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {(d?.zoneStats ?? []).length > 1 && (
                                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                                            <tr className="text-xs font-bold text-slate-700">
                                                <td className="px-6 py-3">Total</td>
                                                <td className="px-4 py-3" />
                                                <td className="text-center px-4 py-3">{d?.totalTransportStudents ?? 0}</td>
                                                <td className="text-center px-4 py-3">{d?.totalBuses ?? 0}</td>
                                                <td className="text-right px-4 py-3 tabular-nums">{fmt(d?.totalMonthlyDemand ?? 0)}</td>
                                                <td className="text-right px-4 py-3 text-emerald-600 tabular-nums">{fmt(d?.totalCollected ?? 0)}</td>
                                                <td className="text-center px-6 py-3">{overallPct}%</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Zone Capacity Cards ─────────────────────────────────── */}
                    {(d?.zoneStats ?? []).length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Zone Snapshot</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {(d?.zoneStats ?? []).map((z: any, i: number) => {
                                    const outstanding = z.monthlyDemand - z.collectedAmount;
                                    const colors = ["indigo","emerald","sky","amber","violet","rose"][i % 6];
                                    return (
                                        <div key={z.zoneId} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-2.5 h-2.5 rounded-full bg-${colors}-400`} />
                                                <span className="text-sm font-bold text-slate-800">{z.zoneName}</span>
                                                <span className="ml-auto text-[10px] text-slate-400">{z.busCount} bus{z.busCount !== 1 ? "es" : ""}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-indigo-400 font-semibold">Students</p>
                                                    <p className="text-xl font-black text-indigo-700">{z.studentCount}</p>
                                                </div>
                                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-emerald-400 font-semibold">Rate</p>
                                                    <p className="text-xl font-black text-emerald-700">{fmt(z.zonePrice)}</p>
                                                </div>
                                            </div>
                                            {outstanding > 0 && (
                                                <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-3 py-2 mt-2 text-xs text-red-600 font-medium">
                                                    <AlertCircle size={11} />{fmt(outstanding)} outstanding
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   STUDENTS TAB
══════════════════════════════════════════════════════════════════════════════ */
function StudentsTab({ sessions, zones }: { sessions: any[]; zones: any[] }) {
    const qc = useQueryClient();
    const [sessionId, setSessionId] = useState("");
    const [zoneId, setZoneId] = useState("");
    const [opted, setOpted] = useState("");
    const [search, setSearch] = useState("");
    const [assigning, setAssigning] = useState<string | null>(null);
    const [assignZoneId, setAssignZoneId] = useState("");
    const [successId, setSuccessId] = useState<string | null>(null);

    const { data, isLoading, refetch, isFetching, isError: studentsError, error: studentsErrorObj } = useQuery({
        queryKey: ["transport-students", sessionId, zoneId, opted],
        queryFn: () => api.getTransportStudents({
            ...(sessionId && { sessionId }),
            ...(zoneId && { zoneId }),
            ...(opted && { opted }),
            limit: 300,
        }),
        staleTime: 30_000,
    });

    const updateMut = useMutation({
        mutationFn: ({ academicId, transportOpted, transportZoneId }: any) =>
            api.updateStudentTransport(academicId, { transportOpted, transportZoneId }),
        onSuccess: (_: any, vars: any) => {
            qc.invalidateQueries({ queryKey: ["transport-students"] });
            qc.invalidateQueries({ queryKey: ["transport-dashboard"] });
            setAssigning(null);
            setSuccessId(vars.academicId);
            setTimeout(() => setSuccessId(null), 2500);
        },
    });

    const allStudents: any[] = data?.students ?? [];
    const filtered = search
        ? allStudents.filter(s =>
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            s.phone?.includes(search) || s.admissionId?.toLowerCase().includes(search.toLowerCase()))
        : allStudents;

    const optedCount = allStudents.filter(s => s.transportOpted).length;

    return (
        <div className="space-y-5">
            {/* Quick stats */}
            {allStudents.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Total Students", value: allStudents.length, cls: "bg-white border-slate-200 text-slate-800" },
                        { label: "Transport Opted", value: optedCount, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                        { label: "No Transport", value: allStudents.length - optedCount, cls: "bg-slate-50 border-slate-200 text-slate-500" },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl border px-5 py-4 ${s.cls}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                            <p className={`text-2xl font-black tabular-nums mt-0.5 ${s.cls.includes("emerald") ? "text-emerald-700" : s.cls.includes("slate-500") ? "text-slate-500" : "text-slate-800"}`}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input data-testid="transport-search-input" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search name, phone, admission ID…"
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <select data-testid="transport-session-id-select" value={sessionId} onChange={e => setSessionId(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-indigo-400">
                    <option value="">All Sessions</option>
                    {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select data-testid="transport-zone-id-select" value={zoneId} onChange={e => setZoneId(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-indigo-400">
                    <option value="">All Zones</option>
                    {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
                <select data-testid="transport-opted-select" value={opted} onChange={e => setOpted(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-indigo-400">
                    <option value="">All Students</option>
                    <option value="true">Transport Opted</option>
                    <option value="false">No Transport</option>
                </select>
                <button data-testid="transport-refetch-btn" onClick={() => refetch()} disabled={isFetching}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 bg-white disabled:opacity-50">
                    <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">{filtered.length} student{filtered.length !== 1 ? "s" : ""}</span>
                    {isFetching && <Loader2 size={12} className="animate-spin text-indigo-400 ml-1" />}
                </div>
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={26} /></div>
                ) : studentsError ? (
                    /* "No students found — adjust your filters" sent people
                       hunting a filter problem that did not exist. */
                    <ErrorState
                        message="Could not load transport students."
                        error={studentsErrorObj}
                        onRetry={() => void refetch()}
                        testId="transport-students-error"
                    />
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users size={32} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm font-medium text-slate-500">No students found</p>
                        <p className="text-xs text-slate-400 mt-1">Adjust your filters or search query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-6 py-3">Student</th>
                                    <th className="text-left px-4 py-3">Class / Section</th>
                                    <th className="text-left px-4 py-3">Session</th>
                                    <th className="text-center px-4 py-3">Transport</th>
                                    <th className="text-left px-4 py-3">Zone</th>
                                    <th className="text-right px-6 py-3">Manage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((s: any) => (
                                    <tr key={s.academicId} data-testid="transport-student-row" data-academic-id={s.academicId} data-student-name={`${s.firstName} ${s.lastName}`} data-opted={s.transportOpted ? "true" : "false"} className={`transition-colors ${successId === s.academicId ? "bg-emerald-50/40" : "hover:bg-slate-50/60"}`}>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                                    {s.firstName?.charAt(0)}{s.lastName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{s.firstName} {s.lastName}</p>
                                                    <p className="text-[11px] text-slate-400">{s.admissionId ?? s.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600">
                                            {s.className ? <span className="font-medium">{s.className}</span> : "—"}
                                            {s.sectionName && <span className="text-slate-400"> / {s.sectionName}</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500">{s.sessionName ?? "—"}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            {s.transportOpted
                                                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle size={10} />Opted</span>
                                                : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">Not Opted</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {s.zoneName ? (
                                                <div>
                                                    <p className="text-xs font-bold text-indigo-600">{s.zoneName}</p>
                                                    <p className="text-[11px] text-slate-400">{fmt(s.zonePrice)}/mo</p>
                                                </div>
                                            ) : <span className="text-xs text-slate-300">— unassigned —</span>}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            {successId === s.academicId ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle size={14} />Updated!</span>
                                            ) : assigning === s.academicId ? (
                                                <div className="flex items-center gap-2 justify-end flex-wrap">
                                                    <select data-testid="transport-assign-zone-id-select" value={assignZoneId} onChange={e => setAssignZoneId(e.target.value)}
                                                        className="text-xs border border-indigo-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:border-indigo-400">
                                                        <option value="">Remove Transport</option>
                                                        {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name} — {fmt(z.price)}/mo</option>)}
                                                    </select>
                                                    <button
                                                        data-testid="transport-assign-confirm-btn"
                                                        onClick={() => updateMut.mutate({ academicId: s.academicId, transportOpted: !!assignZoneId, transportZoneId: assignZoneId || null })}
                                                        disabled={updateMut.isPending}
                                                        className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                                                        {updateMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                                        {assignZoneId ? "Assign" : "Remove"}
                                                    </button>
                                                    <button data-testid="transport-assigning-btn" onClick={() => setAssigning(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200"><X size={12} /></button>
                                                </div>
                                            ) : (
                                                <button data-testid={`transport-assign-open-btn-${s.academicId}`} onClick={() => { setAssigning(s.academicId); setAssignZoneId(s.transportZoneId ?? ""); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors">
                                                    <Pencil size={11} />Assign Zone
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BUS FLEET TAB
══════════════════════════════════════════════════════════════════════════════ */
const emptyBus = () => ({
    zoneId: "", busNumber: "", driverName: "", driverPhone: "",
    conductorName: "", conductorPhone: "", capacity: 40,
    routeDescription: "", pickupTime: "", dropTime: "", vehicleType: "BUS",
    // Compliance documents (plain dates; blank = not recorded).
    registrationNumber: "", registrationExpiry: "",
    insuranceProvider: "", insurancePolicyNumber: "", insuranceExpiry: "",
    fitnessCertExpiry: "", permitExpiry: "", pollutionCertExpiry: "",
    lastServicedOn: "", driverLicenseNumber: "", driverLicenseExpiry: "",
});

function BusFleetTab({ zones }: { zones: any[] }) {
    const qc = useQueryClient();
    const { confirm: confirmDialog, dialog } = useConfirm();
    const [filterZone, setFilterZone] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyBus());
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data, isLoading } = useQuery({
        queryKey: ["transport-buses", filterZone],
        queryFn: () => api.getTransportBusDetails(filterZone ? { zoneId: filterZone } : undefined),
        staleTime: 30_000,
    });

    const inv = () => { qc.invalidateQueries({ queryKey: ["transport-buses"] }); qc.invalidateQueries({ queryKey: ["transport-dashboard"] }); };
    const createMut = useMutation({ mutationFn: (d: any) => api.createBusDetail(d), onSuccess: () => { inv(); resetForm(); } });
    const updateMut = useMutation({ mutationFn: ({ id, d }: any) => api.updateBusDetail(id, d), onSuccess: () => { inv(); resetForm(); } });
    const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteBusDetail(id), onSuccess: inv });

    const resetForm = () => { setShowForm(false); setEditId(null); setForm(emptyBus()); setErrors({}); };
    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.zoneId) e.zoneId = "Zone required";
        if (!form.busNumber.trim()) e.busNumber = "Registration number required";
        if (!form.driverName.trim()) e.driverName = "Driver name required";
        return e;
    };
    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        if (editId) updateMut.mutate({ id: editId, d: form });
        else createMut.mutate(form);
    };
    const startEdit = (b: any) => {
        setEditId(b.id);
        setForm({ zoneId: b.zoneId, busNumber: b.busNumber, driverName: b.driverName, driverPhone: b.driverPhone ?? "", conductorName: b.conductorName ?? "", conductorPhone: b.conductorPhone ?? "", capacity: b.capacity ?? 40, routeDescription: b.routeDescription ?? "", pickupTime: b.pickupTime ?? "", dropTime: b.dropTime ?? "", vehicleType: b.vehicleType ?? "BUS",
            registrationNumber: b.registrationNumber ?? "", registrationExpiry: (b.registrationExpiry ?? "").slice(0, 10),
            insuranceProvider: b.insuranceProvider ?? "", insurancePolicyNumber: b.insurancePolicyNumber ?? "", insuranceExpiry: (b.insuranceExpiry ?? "").slice(0, 10),
            fitnessCertExpiry: (b.fitnessCertExpiry ?? "").slice(0, 10), permitExpiry: (b.permitExpiry ?? "").slice(0, 10), pollutionCertExpiry: (b.pollutionCertExpiry ?? "").slice(0, 10),
            lastServicedOn: (b.lastServicedOn ?? "").slice(0, 10), driverLicenseNumber: b.driverLicenseNumber ?? "", driverLicenseExpiry: (b.driverLicenseExpiry ?? "").slice(0, 10) });
        setShowForm(true); setErrors({});
    };

    const buses: any[] = data?.busDetails ?? [];
    const pending = createMut.isPending || updateMut.isPending;

    const Field = ({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
            {children}
            {error && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
        </div>
    );

    return (
        <div className="space-y-5">
            {dialog}
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <select data-testid="transport-filter-zone-select" value={filterZone} onChange={e => setFilterZone(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-indigo-400">
                        <option value="">All Zones</option>
                        {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <span className="text-xs text-slate-400">{buses.length} vehicle{buses.length !== 1 ? "s" : ""}</span>
                </div>
                <button data-testid="transport-add-vehicle-open-btn" onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors">
                    <Plus size={14} />Add Vehicle
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <Bus size={16} className="text-indigo-600" />
                            </div>
                            <h3 className="text-sm font-bold text-indigo-900">{editId ? "Edit Vehicle Details" : "Register New Vehicle"}</h3>
                        </div>
                        <button data-testid="transport-reset-form-btn" onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Field label="Zone" required error={errors.zoneId}>
                                <select value={form.zoneId} onChange={e => setForm(f => ({ ...f, zoneId: e.target.value }))}
                                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 bg-white ${errors.zoneId ? "border-red-300" : "border-slate-200"}`}>
                                    <option value="">Select zone…</option>
                                    {zones.map(z => <option key={z.id} value={z.id}>{z.name} — {fmt(z.price)}/mo</option>)}
                                </select>
                            </Field>
                            <Field label="Registration Number" required error={errors.busNumber}>
                                <input value={form.busNumber} onChange={e => setForm(f => ({ ...f, busNumber: e.target.value }))} placeholder="e.g. DL-01-AB-1234"
                                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 ${errors.busNumber ? "border-red-300" : "border-slate-200"}`} />
                            </Field>
                            <Field label="Vehicle Type">
                                <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 bg-white">
                                    {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Driver Name" required error={errors.driverName}>
                                <input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Full name"
                                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 ${errors.driverName ? "border-red-300" : "border-slate-200"}`} />
                            </Field>
                            <Field label="Driver Phone">
                                <input value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="10-digit mobile" maxLength={10}
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                            </Field>
                            <Field label="Seating Capacity">
                                <input type="number" min={1} max={100} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 40 }))}
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                            </Field>
                            <Field label="Conductor Name">
                                <input value={form.conductorName} onChange={e => setForm(f => ({ ...f, conductorName: e.target.value }))} placeholder="Optional"
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                            </Field>
                            <Field label="Conductor Phone">
                                <input value={form.conductorPhone} onChange={e => setForm(f => ({ ...f, conductorPhone: e.target.value }))} placeholder="10-digit mobile" maxLength={10}
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                            </Field>
                            <div className="flex gap-3">
                                <Field label="Pickup Time">
                                    <input value={form.pickupTime} onChange={e => setForm(f => ({ ...f, pickupTime: e.target.value }))} placeholder="7:15 AM"
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Drop Time">
                                    <input value={form.dropTime} onChange={e => setForm(f => ({ ...f, dropTime: e.target.value }))} placeholder="2:30 PM"
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <Field label="Route Description">
                                    <input value={form.routeDescription} onChange={e => setForm(f => ({ ...f, routeDescription: e.target.value }))}
                                        placeholder="e.g. Sector 14 Bus Stand → Subhash Nagar → MG Road → School Gate"
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                            </div>
                        </div>

                        {/* ── Compliance & document records ────────────────────── */}
                        <div className="mt-6 pt-5 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldCheck size={15} className="text-amber-500" />
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Compliance & Documents</h4>
                                <span className="text-[11px] text-slate-400">— renewal dates trigger expiry alerts</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                <Field label="RC / Registration No.">
                                    <input data-testid="bus-registration-number-input" value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} placeholder="Registration certificate no."
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="RC Valid Till">
                                    <input data-testid="bus-registration-expiry-input" type="date" value={form.registrationExpiry} onChange={e => setForm(f => ({ ...f, registrationExpiry: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Fitness Certificate Expiry">
                                    <input data-testid="bus-fitness-expiry-input" type="date" value={form.fitnessCertExpiry} onChange={e => setForm(f => ({ ...f, fitnessCertExpiry: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Insurance Provider">
                                    <input value={form.insuranceProvider} onChange={e => setForm(f => ({ ...f, insuranceProvider: e.target.value }))} placeholder="Insurer name"
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Insurance Policy No.">
                                    <input value={form.insurancePolicyNumber} onChange={e => setForm(f => ({ ...f, insurancePolicyNumber: e.target.value }))} placeholder="Policy number"
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Insurance Expiry">
                                    <input data-testid="bus-insurance-expiry-input" type="date" value={form.insuranceExpiry} onChange={e => setForm(f => ({ ...f, insuranceExpiry: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Permit Expiry">
                                    <input data-testid="bus-permit-expiry-input" type="date" value={form.permitExpiry} onChange={e => setForm(f => ({ ...f, permitExpiry: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Pollution (PUC) Expiry">
                                    <input data-testid="bus-puc-expiry-input" type="date" value={form.pollutionCertExpiry} onChange={e => setForm(f => ({ ...f, pollutionCertExpiry: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Last Serviced On">
                                    <input type="date" value={form.lastServicedOn} onChange={e => setForm(f => ({ ...f, lastServicedOn: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Driver Licence No.">
                                    <input data-testid="bus-driver-license-input" value={form.driverLicenseNumber} onChange={e => setForm(f => ({ ...f, driverLicenseNumber: e.target.value }))} placeholder="DL number"
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                                <Field label="Driver Licence Expiry">
                                    <input data-testid="bus-driver-license-expiry-input" type="date" value={form.driverLicenseExpiry} onChange={e => setForm(f => ({ ...f, driverLicenseExpiry: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                                </Field>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
                            <button onClick={resetForm} className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={handleSubmit} disabled={pending}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-200 transition-colors">
                                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {editId ? "Save Changes" : "Register Vehicle"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bus Cards */}
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={26} /></div>
            ) : buses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                    <Bus size={36} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium text-slate-500">No vehicles registered yet</p>
                    <p className="text-xs text-slate-400 mt-1 mb-5">Add buses or vans to your school transport fleet.</p>
                    <button onClick={() => { resetForm(); setShowForm(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
                        <Plus size={14} />Add First Vehicle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {buses.map((b: any) => (
                        <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                            {/* Card header */}
                            <div className="px-5 py-4 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide
                                                ${b.vehicleType === "BUS" ? "bg-indigo-100 text-indigo-700" : b.vehicleType === "VAN" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>
                                                {b.vehicleType ?? "BUS"}
                                            </span>
                                            <span className="text-sm font-black text-slate-800 font-mono tracking-wide">{b.busNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <MapPin size={11} className="text-emerald-500" />
                                            <span className="text-xs font-semibold text-emerald-600">{b.zoneName}</span>
                                            <span className="text-[11px] text-slate-400">· {fmt(b.zonePrice)}/mo</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(b)} title="Edit"
                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 border border-slate-100"><Pencil size={12} /></button>
                                        <button onClick={() => confirmDialog({ title: "Remove Vehicle", message: `Remove vehicle ${b.busNumber}? This cannot be undone.`, confirmText: "Remove", onConfirm: async () => { deleteMut.mutate(b.id); } })} title="Delete"
                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 border border-slate-100"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            </div>
                            {/* Card body */}
                            <div className="px-5 py-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center"><User size={11} className="text-slate-500" /></div>
                                        <span className="font-bold">{b.driverName}</span>
                                        <span className="text-[10px] text-slate-400">Driver</span>
                                    </div>
                                    {b.driverPhone && (
                                        <a href={`tel:${b.driverPhone}`} className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100">
                                            <Phone size={10} />{b.driverPhone}
                                        </a>
                                    )}
                                </div>
                                {b.conductorName && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center"><Shield size={11} className="text-slate-500" /></div>
                                            <span className="font-medium">{b.conductorName}</span>
                                            <span className="text-[10px] text-slate-400">Conductor</span>
                                        </div>
                                        {b.conductorPhone && (
                                            <a href={`tel:${b.conductorPhone}`} className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100">
                                                <Phone size={10} />{b.conductorPhone}
                                            </a>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center gap-3 pt-1 flex-wrap">
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                        <Users size={11} className="text-slate-400" /><strong className="text-slate-600">{b.capacity}</strong> seats
                                    </span>
                                    {b.pickupTime && <span className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg"><Clock size={11} className="text-slate-400" />{b.pickupTime}</span>}
                                    {b.dropTime && <span className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg"><Clock size={11} className="text-slate-400" />{b.dropTime}</span>}
                                </div>
                                {b.routeDescription && (
                                    <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
                                        <Route size={11} className="text-slate-400 mt-0.5 shrink-0" />{b.routeDescription}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ZONES TAB
══════════════════════════════════════════════════════════════════════════════ */
const emptyZone = () => ({ name: "", description: "", price: 0 });

function ZonesTab({ zones, zonesLoading, refetchZones }: { zones: any[]; zonesLoading: boolean; refetchZones: () => void }) {
    const qc = useQueryClient();
    const { confirm: confirmDialog, dialog } = useConfirm();
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyZone());
    const [errors, setErrors] = useState<Record<string, string>>({});

    const inv = () => { qc.invalidateQueries({ queryKey: ["transport-zones"] }); refetchZones(); };
    const createMut = useMutation({ mutationFn: (d: any) => api.createTransportZone(d), onSuccess: () => { inv(); resetForm(); } });
    const updateMut = useMutation({ mutationFn: ({ id, d }: any) => api.updateTransportZone(id, d), onSuccess: () => { inv(); resetForm(); } });
    const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteTransportZone(id), onSuccess: inv });

    const resetForm = () => { setShowForm(false); setEditId(null); setForm(emptyZone()); setErrors({}); };
    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = "Name required";
        if (form.price < 0) e.price = "Cannot be negative";
        return e;
    };
    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        if (editId) updateMut.mutate({ id: editId, d: form });
        else createMut.mutate(form);
    };
    const startEdit = (z: any) => { setEditId(z.id); setForm({ name: z.name, description: z.description ?? "", price: z.price }); setShowForm(true); setErrors({}); };
    const pending = createMut.isPending || updateMut.isPending;

    return (
        <div className="space-y-5">
            {dialog}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-800">Transport Zones</p>
                    <p className="text-xs text-slate-400 mt-0.5">Define geographical zones and their monthly transport fees</p>
                </div>
                <button data-testid="transport-add-zone-open-btn" onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200">
                    <Plus size={14} />Add Zone
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center"><MapPin size={16} className="text-indigo-600" /></div>
                            <h3 className="text-sm font-bold text-indigo-900">{editId ? "Edit Zone" : "New Transport Zone"}</h3>
                        </div>
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zone Name <span className="text-red-400">*</span></label>
                                <input data-testid="transport-zone-name-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. North Zone, Sector 14"
                                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 ${errors.name ? "border-red-300" : "border-slate-200"}`} />
                                {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Fee (₹) <span className="text-red-400">*</span></label>
                                <input data-testid="transport-zone-fee-input" type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
                                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400 ${errors.price ? "border-red-300" : "border-slate-200"}`} />
                                {errors.price && <p className="text-[11px] text-red-500 mt-1">{errors.price}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                                <input data-testid="transport-zone-description-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Areas covered, stops…"
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-400" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                            <button onClick={resetForm} className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                            <button data-testid="transport-zone-submit-btn" onClick={handleSubmit} disabled={pending}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-200 transition-colors">
                                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {editId ? "Save Changes" : "Create Zone"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {zonesLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={26} /></div>
            ) : zones.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                    <MapPin size={36} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-medium text-slate-500">No zones defined yet</p>
                    <p className="text-xs text-slate-400 mt-1 mb-5">Create transport zones to organize bus routes and set monthly fees.</p>
                    <button onClick={() => { resetForm(); setShowForm(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
                        <Plus size={14} />Create First Zone
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {zones.map((z: any, i: number) => (
                        <div key={z.id} data-testid="transport-zone-card" data-zone-id={z.id} data-zone-name={z.name} data-zone-price={z.price} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                            <div className={`h-1.5 ${["bg-indigo-400","bg-emerald-400","bg-sky-400","bg-amber-400","bg-violet-400","bg-rose-400"][i % 6]}`} />
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white
                                            ${["bg-indigo-500","bg-emerald-500","bg-sky-500","bg-amber-500","bg-violet-500","bg-rose-500"][i % 6]}`}>
                                            {z.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{z.name}</p>
                                            {z.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{z.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button data-testid={`transport-zone-edit-btn-${z.id}`} onClick={() => startEdit(z)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 border border-slate-100"><Pencil size={12} /></button>
                                        <button data-testid={`transport-zone-delete-btn-${z.id}`} onClick={() => confirmDialog({ title: "Delete Zone", message: `Delete zone "${z.name}"? Any students assigned to this zone will be unassigned.`, confirmText: "Delete", onConfirm: async () => { deleteMut.mutate(z.id); } })}
                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 border border-slate-100"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-baseline gap-1 pt-3 border-t border-slate-50">
                                    <span className="text-2xl font-black text-slate-800 tabular-nums">{fmt(z.price)}</span>
                                    <span className="text-xs text-slate-400 font-medium">/ month</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {zones.length > 0 && (
                <div className="bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4 flex items-start gap-3">
                    <Info size={14} className="text-sky-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-700 leading-relaxed">
                        Zone fees are automatically included in monthly fee invoices when a student is assigned to a zone. Deleting a zone will unassign students but won't affect existing invoices.
                    </p>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPLIANCE TAB — vehicle document expiry insights
══════════════════════════════════════════════════════════════════════════════ */
function ComplianceTab() {
    const [within, setWithin] = useState(30);
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["transport-compliance", within],
        queryFn: () => api.getTransportCompliance(within),
        staleTime: 30_000,
    });

    const items: any[] = data?.items ?? [];
    const expired = data?.expiredCount ?? 0;
    const expiring = data?.expiringCount ?? 0;

    const cards = [
        { label: "Vehicles Tracked", value: data?.totalBuses ?? 0, cls: "text-slate-800", icon: Bus },
        { label: "Expired Documents", value: expired, cls: "text-red-600", icon: ShieldAlert },
        { label: "Expiring Soon", value: expiring, cls: "text-amber-600", icon: ShieldCheck },
    ];

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Show documents due within</span>
                    <select data-testid="compliance-within-select" value={within} onChange={e => setWithin(parseInt(e.target.value))}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-400">
                        <option value={15}>15 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                    </select>
                </div>
                <button data-testid="compliance-refresh-btn" onClick={() => refetch()} disabled={isFetching}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cards.map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center"><c.icon size={18} className={c.cls} /></div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{c.label}</p>
                            <p className={`text-2xl font-black tabular-nums mt-0.5 ${c.cls}`}>{c.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={26} /></div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center" data-testid="compliance-empty">
                        <ShieldCheck size={36} className="mx-auto text-emerald-300 mb-3" />
                        <p className="text-sm font-medium text-slate-500">All documents are valid</p>
                        <p className="text-xs text-slate-400 mt-1">No vehicle documents expire within {within} days.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-4 py-3">Vehicle</th>
                                    <th className="px-4 py-3">Zone</th>
                                    <th className="px-4 py-3">Document</th>
                                    <th className="px-4 py-3">Expiry Date</th>
                                    <th className="px-4 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map((it, idx) => (
                                    <tr key={`${it.busId}-${it.document}-${idx}`} data-testid="compliance-row"
                                        data-bus-number={it.busNumber} data-document={it.document} data-status={it.status}
                                        className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <p className="font-semibold text-slate-700">{it.busNumber}</p>
                                            <p className="text-xs text-slate-400">{it.driverName}</p>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500">{it.zoneName}</td>
                                        <td className="px-4 py-3.5 font-medium text-slate-600">{it.document}</td>
                                        <td className="px-4 py-3.5 tabular-nums text-slate-600">{it.expiryDate}</td>
                                        <td className="px-4 py-3.5 text-right">
                                            {it.status === "EXPIRED" ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">
                                                    <ShieldAlert size={11} />Expired {Math.abs(it.daysRemaining)}d ago
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                                                    <Clock size={11} />{it.daysRemaining === 0 ? "Due today" : `${it.daysRemaining}d left`}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN HUB
══════════════════════════════════════════════════════════════════════════════ */
export default function TransportHub() {
    const [activeTab, setActiveTab] = useTabState<TabId>("tab", "dashboard");

    const { data: zonesData, isLoading: zonesLoading, refetch: refetchZones, isFetching: zonesFetching } = useQuery({
        queryKey: ["transport-zones"],
        queryFn: () => api.getTransportZones(),
        staleTime: 60_000,
    });
    const { data: sessionsData } = useQuery({
        queryKey: ["sessions"],
        queryFn: () => api.getSessions(),
        staleTime: 300_000,
    });

    const zones: any[] = zonesData?.zones ?? [];
    const sessions: any[] = sessionsData ?? [];

    const TABS = [
        { key: "dashboard"  as const, label: "Dashboard",  icon: BarChart3 },
        { key: "students"   as const, label: "Students",   icon: Users },
        { key: "buses"      as const, label: "Bus Fleet",  icon: Bus },
        { key: "compliance" as const, label: "Compliance", icon: ShieldCheck },
        { key: "zones"      as const, label: "Zones",      icon: MapPin },
    ];

    return (
        <div className="min-h-full bg-slate-50 flex flex-col">
            <PageHeader
                icon={Bus}
                title="Transport Management"
                subtitle="Manage school buses, routes, zones and student transport assignments"
                gradient={MODULE_THEMES.transport}
                onRefresh={() => refetchZones()}
                refreshing={zonesFetching}
            />

            <TabbedSection
                idPrefix="transport"
                value={activeTab}
                onChange={setActiveTab}
                tabs={TABS}
                theme="cyan"
                flushPanel
            >
                <TabPanel tabKey="dashboard"><DashboardTab /></TabPanel>
                <TabPanel tabKey="students"><StudentsTab sessions={sessions} zones={zones} /></TabPanel>
                <TabPanel tabKey="buses"><BusFleetTab zones={zones} /></TabPanel>
                <TabPanel tabKey="compliance"><ComplianceTab /></TabPanel>
                <TabPanel tabKey="zones"><ZonesTab zones={zones} zonesLoading={zonesLoading} refetchZones={refetchZones} /></TabPanel>
            </TabbedSection>
        </div>
    );
}

