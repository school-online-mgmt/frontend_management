import { useState, useEffect, useCallback } from "react";
import {
    CalendarClock, Loader2, ChevronLeft, Plus, Check, X, Users, Clock,
    CheckCircle2, XCircle, Megaphone, Ban,
} from "lucide-react";
import api from "../../api/api";
import type { PtmEvent, PtmSlot, PtmEventStatus } from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { InlineError } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

const STATUS_CFG: Record<PtmEventStatus, { bg: string; text: string; label: string }> = {
    DRAFT:     { bg: "bg-slate-100 border-slate-200",     text: "text-slate-600",   label: "Draft" },
    PUBLISHED: { bg: "bg-emerald-50 border-emerald-200",  text: "text-emerald-700", label: "Published" },
    CANCELLED: { bg: "bg-red-50 border-red-200",          text: "text-red-600",     label: "Cancelled" },
    COMPLETED: { bg: "bg-blue-50 border-blue-200",        text: "text-blue-700",    label: "Completed" },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

interface Teacher { id: string; name: string; qualification?: string }

const PtmPage = () => {
    const { addToast } = useToast();
    const [events, setEvents] = useState<PtmEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setEvents(await api.getPtmEvents()); }
        catch { addToast("Failed to load PTMs", "error"); }
        finally { setLoading(false); }
    }, [addToast]);
    useEffect(() => { void load(); }, [load]);

    if (openId) return <EventDetail eventId={openId} onBack={() => { setOpenId(null); void load(); }} />;

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <PageHeader
                icon={CalendarClock}
                title="Parent-Teacher Meetings"
                subtitle="Schedule PTMs, generate teacher slots, and track bookings"
                gradient={MODULE_THEMES.communication}
                actions={
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-semibold transition-colors">
                        <Plus size={15} /> New PTM
                    </button>
                }
            />

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : events.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <CalendarClock size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No parent-teacher meetings yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mt-4">
                    {events.map((e) => (
                        <button key={e.id} data-testid="ptm-event-card" onClick={() => setOpenId(e.id)}
                            className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{e.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1"><CalendarClock size={12} /> {fmtDate(e.meetingDate)}</span>
                                        {e.location && <span>· {e.location}</span>}
                                        <span>· {e.slotDurationMins} min slots</span>
                                    </p>
                                </div>
                                <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full border ${STATUS_CFG[e.status].bg} ${STATUS_CFG[e.status].text}`}>
                                    {STATUS_CFG[e.status].label}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} />}
        </div>
    );
};

/* ── Create event modal ─────────────────────────────────────────────────── */
const CreateModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
    const { addToast } = useToast();
    const [form, setForm] = useState({
        title: "", description: "", meetingDate: "", location: "", slotDurationMins: 10,
        classId: "", sectionId: "",
    });
    const [classes, setClasses] = useState<Array<{ id: string; name: string; sections?: Array<{ id: string; name: string }> }>>([]);
    const [saving, setSaving] = useState(false);

    const [classesError, setClassesError] = useState<unknown>(null);
    const loadClasses = useCallback(() => {
        setClassesError(null);
        api.getClasses()
            .then((c: any) => setClasses(Array.isArray(c) ? c : (c?.classes ?? [])))
            // An empty class dropdown in a "schedule a meeting" form reads as
            // "this school has no classes", not "the list did not load".
            .catch((e: unknown) => { setClasses([]); setClassesError(e); });
    }, []);
    useEffect(() => { loadClasses(); }, [loadClasses]);
    const sections = classes.find((c) => c.id === form.classId)?.sections ?? [];

    const submit = async () => {
        if (!form.title.trim() || !form.meetingDate) { addToast("Title and date are required", "error"); return; }
        setSaving(true);
        try {
            await api.createPtmEvent({
                title: form.title.trim(),
                description: form.description.trim() || null,
                meetingDate: form.meetingDate,
                location: form.location.trim() || null,
                slotDurationMins: form.slotDurationMins,
                classId: form.classId || null,
                sectionId: form.sectionId || null,
            });
            addToast("PTM created (draft)", "success");
            onCreated();
        } catch { addToast("Failed to create PTM", "error"); }
        finally { setSaving(false); }
    };

    const input = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">New Parent-Teacher Meeting</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Title *</label>
                        <input data-testid="ptm-title" className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Term 1 Parent-Teacher Meeting" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Description</label>
                        <textarea rows={2} className={`${input} resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Date *</label>
                            <input data-testid="ptm-date" type="date" className={input} value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} min={new Date().toISOString().split("T")[0]} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Slot length (min)</label>
                            <input type="number" min={1} max={120} className={input} value={form.slotDurationMins} onChange={(e) => setForm({ ...form, slotDurationMins: Number(e.target.value) || 10 })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Location</label>
                        <input className={input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main hall" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Class (optional)</label>
                            <select className={input} value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: "" })}>
                                <option value="">All classes</option>
                                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {classesError != null && (
                                <div className="mt-1">
                                    <InlineError message="Class list unavailable." onRetry={loadClasses} testId="ptm-classes-error" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Section (optional)</label>
                            <select className={input} value={form.sectionId} disabled={!form.classId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })}>
                                <option value="">All sections</option>
                                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400">Leaving class/section blank makes the PTM visible to the whole school. Publish it after generating slots.</p>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button data-testid="ptm-create-submit" onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Event detail: slots + generate + publish/cancel ────────────────────── */
const EventDetail: React.FC<{ eventId: string; onBack: () => void }> = ({ eventId, onBack }) => {
    const { addToast } = useToast();
    const [event, setEvent] = useState<PtmEvent | null>(null);
    const [slots, setSlots] = useState<PtmSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGen, setShowGen] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [evs, sl] = await Promise.all([api.getPtmEvents(), api.getPtmEventSlots(eventId)]);
            setEvent(evs.find((e) => e.id === eventId) ?? null);
            setSlots(sl);
        } catch { addToast("Failed to load PTM", "error"); }
        finally { setLoading(false); }
    }, [eventId, addToast]);
    useEffect(() => { void load(); }, [load]);

    const act = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try { await fn(); addToast(ok, "success"); await load(); }
        catch (e: any) { addToast(e?.response?.data?.message || "Action failed", "error"); }
        finally { setBusy(false); }
    };

    const booked = slots.filter((s) => s.status === "BOOKED").length;

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
                <ChevronLeft size={16} /> Back to PTMs
            </button>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : !event ? (
                <p className="text-slate-400">PTM not found.</p>
            ) : (
                <>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h1 className="text-lg font-bold text-slate-800">{event.title}</h1>
                                <p className="text-sm text-slate-500 mt-1">{fmtDate(event.meetingDate)}{event.location ? ` · ${event.location}` : ""}</p>
                                {event.description && <p className="text-sm text-slate-600 mt-2">{event.description}</p>}
                                <p className="text-xs text-slate-400 mt-2">{slots.length} slots · {booked} booked</p>
                            </div>
                            <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full border ${STATUS_CFG[event.status].bg} ${STATUS_CFG[event.status].text}`}>
                                {STATUS_CFG[event.status].label}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {(event.status === "DRAFT" || event.status === "PUBLISHED") && (
                                <button data-testid="ptm-generate-btn" onClick={() => setShowGen(true)} disabled={busy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
                                    <Clock size={14} /> Generate slots
                                </button>
                            )}
                            {event.status === "DRAFT" && (
                                <button data-testid="ptm-publish-btn" onClick={() => act(() => api.publishPtmEvent(eventId), "PTM published")} disabled={busy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                                    <Megaphone size={14} /> Publish
                                </button>
                            )}
                            {event.status !== "CANCELLED" && (
                                <button data-testid="ptm-cancel-btn" onClick={() => act(() => api.cancelPtmEvent(eventId), "PTM cancelled")} disabled={busy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                                    <Ban size={14} /> Cancel PTM
                                </button>
                            )}
                        </div>
                    </div>

                    <SlotRoster slots={slots} onMark={(slotId, att) => act(() => api.markPtmAttendance(slotId, att), "Attendance updated")} busy={busy} />
                </>
            )}

            {showGen && event && (
                <GenerateModal
                    event={event}
                    onClose={() => setShowGen(false)}
                    onDone={(n) => { setShowGen(false); addToast(`${n} slots generated`, "success"); void load(); }}
                />
            )}
        </div>
    );
};

/* ── Slot roster grouped by teacher ─────────────────────────────────────── */
const SlotRoster: React.FC<{ slots: PtmSlot[]; onMark: (slotId: string, att: "ATTENDED" | "NO_SHOW") => void; busy: boolean }> = ({ slots, onMark, busy }) => {
    if (slots.length === 0) return <p className="text-sm text-slate-400 text-center py-8">No slots yet — generate slots for the teachers taking part.</p>;
    const byTeacher = new Map<string, PtmSlot[]>();
    for (const s of slots) {
        const key = s.teacherName || s.teacherId || "—";
        if (!byTeacher.has(key)) byTeacher.set(key, []);
        byTeacher.get(key)!.push(s);
    }
    return (
        <div className="space-y-4">
            {[...byTeacher.entries()].map(([teacher, list]) => (
                <div key={teacher} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">{teacher}</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {list.map((s) => (
                            <div key={s.id} data-testid="ptm-slot-row" className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-600">{fmtTime(s.startTime)}</span>
                                <span className="flex-1 text-center">
                                    {s.status === "BOOKED"
                                        ? <span className="text-slate-800 font-medium">Booked{s.attendance !== "PENDING" ? ` · ${s.attendance === "ATTENDED" ? "Attended" : "No-show"}` : ""}</span>
                                        : <span className="text-slate-300">Open</span>}
                                </span>
                                {s.status === "BOOKED" && (
                                    <span className="flex gap-1">
                                        <button title="Attended" disabled={busy} onClick={() => onMark(s.id, "ATTENDED")} className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><CheckCircle2 size={16} /></button>
                                        <button title="No-show" disabled={busy} onClick={() => onMark(s.id, "NO_SHOW")} className="p-1 rounded hover:bg-red-50 text-red-500"><XCircle size={16} /></button>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ── Generate-slots modal ───────────────────────────────────────────────── */
const GenerateModal: React.FC<{ event: PtmEvent; onClose: () => void; onDone: (n: number) => void }> = ({ event, onClose, onDone }) => {
    const { addToast } = useToast();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [startT, setStartT] = useState("09:00");
    const [endT, setEndT] = useState("12:00");
    const [saving, setSaving] = useState(false);

    const [teachersError, setTeachersError] = useState<unknown>(null);
    const loadTeachers = useCallback(() => {
        setTeachersError(null);
        api.getTeachers()
            .then((r: any) => setTeachers(Array.isArray(r) ? r : (r?.teachers ?? [])))
            .catch((e: unknown) => { setTeachers([]); setTeachersError(e); });
    }, []);
    useEffect(() => { loadTeachers(); }, [loadTeachers]);

    const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const submit = async () => {
        if (picked.size === 0) { addToast("Pick at least one teacher", "error"); return; }
        const windowStart = new Date(`${event.meetingDate}T${startT}:00`);
        const windowEnd = new Date(`${event.meetingDate}T${endT}:00`);
        if (windowEnd <= windowStart) { addToast("End time must be after start", "error"); return; }
        setSaving(true);
        try {
            const out = await api.generatePtmSlots(event.id, {
                teacherIds: [...picked],
                windowStart: windowStart.toISOString(),
                windowEnd: windowEnd.toISOString(),
                slotDurationMins: event.slotDurationMins,
            });
            onDone(out.created);
        } catch (e: any) { addToast(e?.response?.data?.message || "Failed to generate slots", "error"); }
        finally { setSaving(false); }
    };

    const input = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">Generate slots</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto">
                    <div className="flex items-center gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Start</label>
                            <input type="time" className={input} value={startT} onChange={(e) => setStartT(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">End</label>
                            <input type="time" className={input} value={endT} onChange={(e) => setEndT(e.target.value)} />
                        </div>
                        <span className="text-xs text-slate-400 mt-5">{event.slotDurationMins}-min slots</span>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1.5">Teachers</label>
                        <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-50">
                            {teachersError != null
                                ? <div className="p-3"><InlineError message="Teacher list unavailable." onRetry={loadTeachers} testId="ptm-teachers-error" /></div>
                                : teachers.length === 0 && <p className="text-xs text-slate-400 p-3">No teachers found.</p>}
                            {teachers.map((t) => (
                                <label key={t.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={picked.has(t.id)} onChange={() => toggle(t.id)} className="accent-indigo-600" />
                                    <span className="text-sm text-slate-700">{t.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                    <button onClick={onClose} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button data-testid="ptm-generate-submit" onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} Generate
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PtmPage;
