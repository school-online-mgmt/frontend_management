import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CalendarDays, Users, Loader2, Hash, ChevronRight,
    Search, X, Phone, ArrowRightLeft,
} from "lucide-react";
import api from "../../api/api";
import type { Student } from "../../api/types";
import { useSessionId } from "../../context/SessionContext";
import TransferSectionModal from "./TransferSectionModal";

interface Props {
    /** Filter students by their academic.classId for the selected session. */
    filterClassId?: string;
    /** Filter students by their academic.sectionId for the selected session. */
    filterSectionId?: string;
    /** Header label customisation. */
    title?: string;
    subtitle?: string;
    /** Theme tint for the empty state icon + search bar gradient. */
    accent?: "indigo" | "violet" | "emerald";
    /** Show a per-row "transfer section" action (P1-ACA-06). Management only. */
    enableSectionTransfer?: boolean;
}

const ACCENT: Record<NonNullable<Props["accent"]>, { from: string; to: string; tint: string; tintBorder: string }> = {
    indigo:  { from: "from-indigo-600",  to: "to-violet-700",  tint: "bg-indigo-50",  tintBorder: "border-indigo-100"  },
    violet:  { from: "from-violet-600",  to: "to-fuchsia-700", tint: "bg-violet-50",  tintBorder: "border-violet-100"  },
    emerald: { from: "from-emerald-600", to: "to-teal-700",    tint: "bg-emerald-50", tintBorder: "border-emerald-100" },
};

const SessionStudentsTable: React.FC<Props> = ({
    filterClassId, filterSectionId, title = "Enrolled Students",
    subtitle = "Students currently enrolled — click a row to open the student profile",
    accent = "indigo", enableSectionTransfer = false,
}) => {
    const navigate = useNavigate();
    const a = ACCENT[accent];

    // Session is owned by the layout topbar (SessionContext) — we just read it.
    const selectedSessionId = useSessionId();

    const [students, setStudents]               = useState<Student[]>([]);
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState<string | null>(null);
    const [search, setSearch]                   = useState("");
    const [reloadKey, setReloadKey]             = useState(0);
    const [transfer, setTransfer]               = useState<{ id: string; name: string; classId: string; sectionId: string; sectionName?: string } | null>(null);

    // Refetch students whenever the global session changes (or after a transfer).
    useEffect(() => {
        if (!selectedSessionId) { setStudents([]); return; }
        let cancelled = false;
        (async () => {
            setLoading(true); setError(null);
            try {
                const res = await api.getStudents(undefined, undefined, selectedSessionId);
                if (!cancelled) setStudents(Array.isArray(res) ? res : []);
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.response?.data?.message ?? "Failed to load students.");
                    setStudents([]);
                }
            } finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [selectedSessionId, reloadKey]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return students.filter(s => {
            const enr = s.sessionEnrollment;
            if (!enr) return false;
            if (filterClassId   && enr.classId   !== filterClassId)   return false;
            if (filterSectionId && enr.sectionId !== filterSectionId) return false;
            if (q) {
                const hay = `${s.firstName} ${s.middleName ?? ""} ${s.lastName} ${enr.rollNo ?? ""} ${enr.sectionName ?? ""} ${s.phone}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [students, filterClassId, filterSectionId, search]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Users size={15} className="text-slate-500" /> {title}
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length}</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>

            {/* Search bar — session is picked via the global topbar selector */}
            <div className={`px-5 sm:px-6 py-3.5 bg-gradient-to-r ${a.from} ${a.to} text-white`}>
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                    <input data-testid="session-students-table-search-input"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, roll, phone…"
                        className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white/15 border border-white/20 placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    {search && (
                        <button data-testid="session-students-table-search-btn" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div className="flex items-center justify-center py-14">
                    <Loader2 size={22} className="animate-spin text-slate-400" />
                </div>
            ) : error ? (
                <div className="px-6 py-10 text-center">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            ) : !selectedSessionId ? (
                <div className="px-6 py-12 text-center">
                    <div className={`w-12 h-12 ${a.tint} ${a.tintBorder} border rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                        <CalendarDays size={22} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Pick a session in the topbar</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Students are listed per academic session.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Users size={22} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No students enrolled</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {search ? "Try a different search." : "No students are enrolled in this group for the selected session."}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-2.5 font-semibold">Roll</th>
                                <th className="px-5 py-2.5 font-semibold">Student</th>
                                <th className="px-5 py-2.5 font-semibold hidden md:table-cell">Section</th>
                                <th className="px-5 py-2.5 font-semibold hidden lg:table-cell">Phone</th>
                                <th className="px-5 py-2.5 font-semibold hidden sm:table-cell">Status</th>
                                <th className="px-5 py-2.5 font-semibold text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(s => {
                                const enr = s.sessionEnrollment!;
                                return (
                                    <tr key={s.id}
                                        data-testid="session-students-row"
                                        data-student-id={s.id}
                                        data-student-name={`${s.firstName} ${s.lastName ?? ""}`.trim()}
                                        data-section-name={enr.sectionName ?? ""}
                                        onClick={() => navigate(`/student/${s.id}`)}
                                        className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                        <td className="px-5 py-3 text-xs font-mono text-slate-500">
                                            {enr.rollNo
                                                ? <span className="inline-flex items-center gap-0.5"><Hash size={10} />{enr.rollNo}</span>
                                                : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                                    {s.firstName.charAt(0)}{s.lastName?.charAt(0) ?? ""}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                                                        {s.firstName}{s.middleName ? ` ${s.middleName}` : ""} {s.lastName}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 capitalize">{s.gender}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-600 hidden md:table-cell">
                                            {enr.sectionName ?? <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-600 hidden lg:table-cell">
                                            <span className="inline-flex items-center gap-1"><Phone size={10} className="text-slate-400" />{s.phone}</span>
                                        </td>
                                        <td className="px-5 py-3 hidden sm:table-cell">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                s.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" :
                                                s.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700" :
                                                "bg-slate-100 text-slate-600"
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            {enableSectionTransfer && enr.classId && enr.sectionId && (
                                                <button
                                                    data-testid="transfer-section-btn"
                                                    title="Transfer to another section"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTransfer({ id: s.id, name: `${s.firstName} ${s.lastName ?? ""}`.trim(), classId: enr.classId!, sectionId: enr.sectionId!, sectionName: enr.sectionName ?? undefined });
                                                    }}
                                                    className="mr-2 inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors align-middle">
                                                    <ArrowRightLeft size={14} />
                                                </button>
                                            )}
                                            <ChevronRight size={14} className="inline text-slate-300 group-hover:text-indigo-500 transition-colors align-middle" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {transfer && selectedSessionId && (
                <TransferSectionModal
                    studentId={transfer.id}
                    studentName={transfer.name}
                    sessionId={selectedSessionId}
                    classId={transfer.classId}
                    currentSectionId={transfer.sectionId}
                    currentSectionName={transfer.sectionName}
                    onClose={() => setTransfer(null)}
                    onDone={() => { setTransfer(null); setReloadKey(k => k + 1); }}
                />
            )}
        </div>
    );
};

export default SessionStudentsTable;
