import { useState, useEffect, useMemo, useCallback } from "react";
import {
    CalendarDays, Plus, Loader2, X, Trash2, Pencil, AlertTriangle,
    Clock, MapPin, School, ChevronDown, Check, CircleAlert,
} from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { EmptySessionState } from "../../components/common/SessionGate";
import { useSessionId } from "../../context/SessionContext";
import { useToast } from "../../context/ToastContext";

/* ── Constants ─────────────────────────────────────────────────────────────── */
const DAYS = [
    { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" },
    { n: 4, label: "Thu" }, { n: 5, label: "Fri" }, { n: 6, label: "Sat" },
];
const CELL_TYPES = [
    { value: "CLASS", label: "Class (subject + teacher)" },
    { value: "BREAK", label: "Break / Recess" },
    { value: "ASSEMBLY", label: "Assembly" },
    { value: "ACTIVITY", label: "Activity / Library / Sports" },
    { value: "FREE", label: "Free / Self-study" },
];
const TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
    CLASS:    { bg: "bg-white",       text: "text-slate-800", border: "border-slate-200" },
    BREAK:    { bg: "bg-amber-50",    text: "text-amber-700", border: "border-amber-200" },
    ASSEMBLY: { bg: "bg-violet-50",   text: "text-violet-700",border: "border-violet-200" },
    ACTIVITY: { bg: "bg-sky-50",      text: "text-sky-700",   border: "border-sky-200" },
    FREE:     { bg: "bg-slate-50",    text: "text-slate-500", border: "border-slate-200" },
};

interface Entry {
    id: string; dayOfWeek: number; periodNumber: number; startTime: string; endTime: string;
    type: string; room: string | null; subjectId: string | null; subjectName: string | null;
    teacherId: string | null; teacherName: string | null;
}
interface Section { id: string; name: string; slug?: string }
interface ClassRow { id: string; name: string; sections: Section[] }
interface PeriodSlot { periodNumber: number; startTime: string; endTime: string; label: string | null; isBreak: boolean }

/* ── Cell editor modal ─────────────────────────────────────────────────────── */
const CellModal = ({ ctx, subjects, teachers, sessionId, sectionId, classId, periodConfig, onClose, onDone }: {
    ctx: { dayOfWeek: number; periodNumber: number; entry?: Entry };
    subjects: any[]; teachers: any[]; sessionId: string; sectionId: string; classId?: string;
    periodConfig: PeriodSlot[];
    onClose: () => void; onDone: () => void;
}) => {
    const e = ctx.entry;
    // For a NEW period, prefill start/end (and break type) from the saved bell
    // schedule for this period number — times are the same for every section.
    const slot = !e ? periodConfig.find(s => s.periodNumber === ctx.periodNumber) : undefined;
    const [type, setType] = useState(e?.type ?? (slot?.isBreak ? "BREAK" : "CLASS"));
    const [startTime, setStartTime] = useState(e?.startTime ?? slot?.startTime ?? "08:00");
    const [endTime, setEndTime] = useState(e?.endTime ?? slot?.endTime ?? "08:45");
    const [subjectId, setSubjectId] = useState(e?.subjectId ?? "");
    const [teacherId, setTeacherId] = useState(e?.teacherId ?? "");
    const [room, setRoom] = useState(e?.room ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const { addToast } = useToast();

    const save = async () => {
        if (endTime <= startTime) { setError("End time must be after start time."); return; }
        setSaving(true); setError("");
        try {
            if (e) {
                await api.updateTimetableEntry(e.id, {
                    startTime, endTime, type,
                    subjectId: type === "CLASS" ? (subjectId || null) : null,
                    teacherId: type === "CLASS" ? (teacherId || null) : null,
                    room: room || null,
                });
            } else {
                await api.createTimetableEntry({
                    sessionId, sectionId, classId,
                    dayOfWeek: ctx.dayOfWeek, periodNumber: ctx.periodNumber,
                    startTime, endTime, type,
                    subjectId: type === "CLASS" ? (subjectId || null) : null,
                    teacherId: type === "CLASS" ? (teacherId || null) : null,
                    room: room || null,
                });
            }
            addToast("Period saved.", "success");
            onDone();
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? "Failed to save period.";
            setError(msg);
        } finally { setSaving(false); }
    };

    const remove = async () => {
        if (!e) return;
        setSaving(true);
        try { await api.deleteTimetableEntry(e.id); addToast("Period removed.", "success"); onDone(); }
        catch (err: any) { setError(err?.response?.data?.message ?? "Failed to remove."); setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden" onClick={ev => ev.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                        {e ? "Edit" : "Add"} period · {DAYS.find(d => d.n === ctx.dayOfWeek)?.label} · P{ctx.periodNumber}
                    </h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={16} /></button>
                </div>
                <div className="p-5 space-y-3.5">
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Type</label>
                        <select value={type} onChange={ev => setType(ev.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                            {CELL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Start</label>
                            <input type="time" value={startTime} onChange={ev => setStartTime(ev.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600">End</label>
                            <input type="time" value={endTime} onChange={ev => setEndTime(ev.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                    {slot && <p className="text-[11px] text-slate-400 -mt-1.5">Prefilled from the bell schedule (Config tab). Edit if this period differs.</p>}
                    {type === "CLASS" && (
                        <>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Subject</label>
                                <select value={subjectId} onChange={ev => setSubjectId(ev.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                                    <option value="">— Select subject —</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Teacher</label>
                                <select value={teacherId} onChange={ev => setTeacherId(ev.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                                    <option value="">— Select teacher —</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1">The system blocks double-booking a teacher in the same slot.</p>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Room <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input value={room} onChange={ev => setRoom(ev.target.value)} placeholder="e.g. Room 12 / Lab 2" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700"><AlertTriangle size={13} className="shrink-0" />{error}</div>}
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-2">
                    {e && <button onClick={remove} disabled={saving} className="px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 inline-flex items-center gap-1.5"><Trash2 size={13} /> Remove</button>}
                    <div className="ml-auto flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                        <button onClick={save} disabled={saving} className="px-4 py-2 text-xs font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Period bell-schedule config tab ───────────────────────────────────────── */
const addMinutes = (hhmm: string, mins: number): string => {
    const [h, m] = hhmm.split(":").map(Number);
    const total = (h * 60 + m + mins + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const PeriodConfigTab = ({ sessionId, initial, onSaved }: {
    sessionId: string; initial: PeriodSlot[]; onSaved: (slots: PeriodSlot[]) => void;
}) => {
    const { addToast } = useToast();
    const [slots, setSlots] = useState<PeriodSlot[]>(initial.length ? initial : [
        { periodNumber: 1, startTime: "08:00", endTime: "08:45", label: null, isBreak: false },
    ]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const patch = (i: number, p: Partial<PeriodSlot>) => setSlots(s => s.map((x, idx) => idx === i ? { ...x, ...p } : x));
    const remove = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, periodNumber: idx + 1 })));
    const add = () => setSlots(s => {
        const last = s[s.length - 1];
        const start = last ? last.endTime : "08:00";
        return [...s, { periodNumber: s.length + 1, startTime: start, endTime: addMinutes(start, 45), label: null, isBreak: false }];
    });

    const save = async () => {
        for (const s of slots) if (s.endTime <= s.startTime) { setError(`Period ${s.periodNumber}: end time must be after start time.`); return; }
        setSaving(true); setError("");
        try {
            await api.saveTimetablePeriodConfig(sessionId, slots.map(s => ({ periodNumber: s.periodNumber, startTime: s.startTime, endTime: s.endTime, label: s.label || null, isBreak: s.isBreak })));
            addToast("Bell schedule saved.", "success");
            onSaved(slots);
        } catch (err: any) { setError(err?.response?.data?.message ?? "Failed to save."); }
        finally { setSaving(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 max-w-3xl">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0"><Clock size={16} className="text-sky-500" /></div>
                <div>
                    <p className="text-sm font-bold text-slate-800">Bell Schedule</p>
                    <p className="text-xs text-slate-500">Set each period's start & end time once — these apply to <b>every class and section</b>. The add-period popup prefills these times.</p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="grid gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1"
                    style={{ gridTemplateColumns: "48px 1fr 1fr 1.4fr 92px 32px" }}>
                    <span>Period</span><span>Start</span><span>End</span><span>Label</span><span>Break</span><span />
                </div>
                {slots.map((s, i) => (
                    <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "48px 1fr 1fr 1.4fr 92px 32px" }}>
                        <span className="text-xs font-bold text-slate-600">P{s.periodNumber}</span>
                        <input type="time" value={s.startTime} onChange={e => patch(i, { startTime: e.target.value })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={s.endTime} onChange={e => patch(i, { endTime: e.target.value })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                        <input value={s.label ?? ""} onChange={e => patch(i, { label: e.target.value })} placeholder={s.isBreak ? "e.g. Lunch" : "optional"} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                        <button onClick={() => patch(i, { isBreak: !s.isBreak })}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition ${s.isBreak ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-500"}`}>
                            {s.isBreak ? "Break" : "Class"}
                        </button>
                        <button onClick={() => remove(i)} disabled={slots.length <= 1}
                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-30"><Trash2 size={13} /></button>
                    </div>
                ))}
            </div>

            {error && <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700"><AlertTriangle size={13} className="shrink-0" />{error}</div>}

            <div className="flex items-center gap-2 mt-4">
                <button onClick={add} disabled={slots.length >= 20}
                    className="px-3 py-2 text-xs font-bold text-sky-600 border border-dashed border-sky-300 rounded-lg hover:bg-sky-50 disabled:opacity-40 inline-flex items-center gap-1.5"><Plus size={13} /> Add Period</button>
                <button onClick={save} disabled={saving}
                    className="ml-auto px-4 py-2 text-xs font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Schedule
                </button>
            </div>
        </div>
    );
};

/* ── Main page ─────────────────────────────────────────────────────────────── */
const TimetablePage = () => {
    const sessionId = useSessionId();
    const { addToast } = useToast();
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [sectionId, setSectionId] = useState<string>("");
    const [entries, setEntries] = useState<Entry[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [conflicts, setConflicts] = useState(0);
    const [modal, setModal] = useState<{ dayOfWeek: number; periodNumber: number; entry?: Entry } | null>(null);
    const [tab, setTab] = useState<"grid" | "config">("grid");
    const [periodConfig, setPeriodConfig] = useState<PeriodSlot[]>([]);

    const selectedSection = useMemo(() => {
        for (const c of classes) { const s = c.sections.find(x => x.id === sectionId); if (s) return { section: s, cls: c }; }
        return null;
    }, [classes, sectionId]);

    // Load classes + subjects + teachers + conflict count once per session.
    useEffect(() => {
        if (!sessionId) return;
        Promise.allSettled([api.getClasses(sessionId), api.getSubjects({ sessionId }), api.getTeachers(), api.getTimetableConflicts(sessionId)])
            .then(([c, s, t, cf]) => {
                const cls: ClassRow[] = c.status === "fulfilled" ? (Array.isArray(c.value) ? c.value : []) : [];
                setClasses(cls);
                setSubjects(s.status === "fulfilled" ? (Array.isArray(s.value) ? s.value : []) : []);
                const td = t.status === "fulfilled" ? t.value : null;
                setTeachers(Array.isArray(td) ? td : (td?.teachers ?? []));
                setConflicts(cf.status === "fulfilled" ? (cf.value.conflictCount ?? 0) : 0);
                if (!sectionId && cls[0]?.sections[0]) setSectionId(cls[0].sections[0].id);
            });
        api.getTimetablePeriodConfig(sessionId).then(r => setPeriodConfig(r.slots ?? [])).catch(() => {});
    }, [sessionId]);  // eslint-disable-line react-hooks/exhaustive-deps

    const loadGrid = useCallback(async () => {
        if (!sectionId || !sessionId) { setEntries([]); return; }
        setLoading(true);
        try { const r = await api.getSectionTimetable(sectionId, sessionId); setEntries(r.entries ?? []); }
        catch { addToast("Failed to load timetable.", "error"); }
        finally { setLoading(false); }
    }, [sectionId, sessionId, addToast]);
    useEffect(() => { loadGrid(); }, [loadGrid]);

    // Period rows = union of period numbers present, min 8 rows so empty grids are usable.
    const periodRows = useMemo(() => {
        const max = Math.max(8, ...entries.map(e => e.periodNumber));
        return Array.from({ length: max }, (_, i) => i + 1);
    }, [entries]);

    const cellAt = (day: number, period: number) => entries.find(e => e.dayOfWeek === day && e.periodNumber === period);

    if (!sessionId) return <div className="min-h-full bg-slate-50"><div className="p-6 max-w-6xl mx-auto"><EmptySessionState entityPlural="timetable" /></div></div>;

    return (
        <div className="min-h-full bg-slate-50">
            {modal && selectedSection && (
                <CellModal ctx={modal} subjects={subjects} teachers={teachers}
                    sessionId={sessionId} sectionId={sectionId} classId={selectedSection.cls.id} periodConfig={periodConfig}
                    onClose={() => setModal(null)} onDone={() => { setModal(null); loadGrid(); api.getTimetableConflicts(sessionId).then(c => setConflicts(c.conflictCount ?? 0)); }} />
            )}

            <PageHeader icon={CalendarDays} title="Timetable" gradient={MODULE_THEMES.classes}
                subtitle="Build the weekly class timetable. Teachers & students can view any section." onRefresh={loadGrid} refreshing={loading} />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5 py-4 space-y-4">
                {/* Tabs */}
                <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button onClick={() => setTab("grid")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "grid" ? "bg-sky-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>Timetable</button>
                    <button onClick={() => setTab("config")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === "config" ? "bg-sky-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>Config</button>
                </div>

                {tab === "config" ? (
                    <PeriodConfigTab sessionId={sessionId} initial={periodConfig} onSaved={setPeriodConfig} />
                ) : (
                <>
                {/* Section selector + conflict banner */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative">
                        <School size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                            className="appearance-none pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm min-w-[240px]">
                            <option value="">Select a section…</option>
                            {classes.map(c => (
                                <optgroup key={c.id} label={c.name}>
                                    {c.sections.map(s => <option key={s.id} value={s.id}>{c.name} · {s.name}</option>)}
                                </optgroup>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {conflicts > 0 && (
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                            <CircleAlert size={14} /> {conflicts} teacher double-booking{conflicts > 1 ? "s" : ""} across the school
                        </div>
                    )}
                </div>

                {!sectionId ? (
                    <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">Pick a section to build its timetable.</div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                        <table className="w-full border-collapse min-w-[720px]">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2.5 text-left w-16">Period</th>
                                    {DAYS.map(d => <th key={d.n} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-2.5 text-center">{d.label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {periodRows.map(p => (
                                    <tr key={p} className="border-t border-slate-100">
                                        <td className="px-3 py-2 text-xs font-bold text-slate-500 align-top">P{p}</td>
                                        {DAYS.map(d => {
                                            const c = cellAt(d.n, p);
                                            const st = c ? TYPE_STYLE[c.type] ?? TYPE_STYLE.CLASS : null;
                                            return (
                                                <td key={d.n} className="p-1 align-top">
                                                    {c ? (
                                                        <button onClick={() => setModal({ dayOfWeek: d.n, periodNumber: p, entry: c })}
                                                            className={`w-full text-left rounded-lg border px-2 py-1.5 hover:shadow-sm transition ${st!.bg} ${st!.border} group`}>
                                                            {c.type === "CLASS" ? (
                                                                <>
                                                                    <p className={`text-xs font-bold truncate ${st!.text}`}>{c.subjectName ?? "—"}</p>
                                                                    <p className="text-[10px] text-slate-500 truncate">{c.teacherName ?? "No teacher"}</p>
                                                                </>
                                                            ) : (
                                                                <p className={`text-xs font-bold ${st!.text}`}>{CELL_TYPES.find(t => t.value === c.type)?.label.split(" ")[0] ?? c.type}</p>
                                                            )}
                                                            <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={8} />{c.startTime}–{c.endTime}{c.room && <><MapPin size={8} className="ml-1" />{c.room}</>}</p>
                                                            <Pencil size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 mt-0.5" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setModal({ dayOfWeek: d.n, periodNumber: p })}
                                                            className="w-full h-full min-h-[48px] rounded-lg border border-dashed border-slate-200 text-slate-300 hover:border-sky-300 hover:text-sky-400 hover:bg-sky-50/40 transition flex items-center justify-center">
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </>
                )}
            </div>
        </div>
    );
};

export default TimetablePage;
