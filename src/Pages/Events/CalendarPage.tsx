import React, { useEffect, useState, useCallback } from "react";
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2,
    AlertCircle, Plus, Edit2, Trash2, X, List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/api";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    type: string;
    date: string;
    endDate?: string | null;
    isExam?: boolean;
    examId?: string;
}

interface Session { id: string; name: string; startDate: string; endDate: string; }

/* ── Event type look-up ────────────────────────────────────────────────────── */
const eventTypes = [
    "HOLIDAY", "VACATION", "ACTIVITY", "PROGRAM",
    "EXHIBITION", "SPORTS", "CULTURAL", "MEETING", "OTHER",
];

const eventTypeConfig: Record<string, { icon: string; bgColor: string; dotColor: string }> = {
    HOLIDAY:    { icon: "🏖️", bgColor: "bg-blue-50",    dotColor: "bg-blue-500" },
    VACATION:   { icon: "✈️", bgColor: "bg-green-50",   dotColor: "bg-green-500" },
    ACTIVITY:   { icon: "🎨", bgColor: "bg-purple-50",  dotColor: "bg-purple-500" },
    PROGRAM:    { icon: "🎭", bgColor: "bg-pink-50",    dotColor: "bg-pink-500" },
    EXHIBITION: { icon: "🖼️", bgColor: "bg-orange-50",  dotColor: "bg-orange-500" },
    SPORTS:     { icon: "⚽", bgColor: "bg-red-50",     dotColor: "bg-red-400" },
    CULTURAL:   { icon: "🎵", bgColor: "bg-indigo-50",  dotColor: "bg-indigo-500" },
    MEETING:    { icon: "👥", bgColor: "bg-yellow-50",  dotColor: "bg-yellow-500" },
    EXAM:       { icon: "📝", bgColor: "bg-red-50",     dotColor: "bg-red-600" },
    OTHER:      { icon: "📌", bgColor: "bg-slate-50",   dotColor: "bg-slate-500" },
};

function eventCoversDate(event: CalendarEvent, dateStr: string): boolean {
    const start = event.date.split("T")[0];
    const end   = event.endDate?.split("T")[0] ?? start;
    return dateStr >= start && dateStr <= end;
}

const emptyForm = { title: "", description: "", type: "OTHER", date: "", endDate: "" };

/* ══════════════════════════════════════════════════════════════════════════════
   CalendarPage — Calendar view + full event CRUD
   ══════════════════════════════════════════════════════════════════════════════ */
const CalendarPage: React.FC = () => {
    /* ── calendar state ──────────────────────────────────────────────────── */
    const [currentDate, setCurrentDate]       = useState(new Date());
    const [events, setEvents]                 = useState<CalendarEvent[]>([]);
    const [sessions, setSessions]             = useState<Session[]>([]);
    const [activeSession, setActiveSession]   = useState<Session | null>(null);
    const [loading, setLoading]               = useState(true);
    const [selectedDate, setSelectedDate]     = useState<string | null>(null);

    /* ── event CRUD state ────────────────────────────────────────────────── */
    const [showForm, setShowForm]             = useState(false);
    const [editingId, setEditingId]           = useState<string | null>(null);
    const [formData, setFormData]             = useState({ ...emptyForm });
    const [formError, setFormError]           = useState<string | null>(null);
    const [saving, setSaving]                 = useState(false);

    /* ── all-events list panel ───────────────────────────────────────────── */
    const [showAllEvents, setShowAllEvents]   = useState(false);
    const [allEvents, setAllEvents]           = useState<CalendarEvent[]>([]);
    const [allEventsLoading, setAllEventsLoading] = useState(false);

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dayNames   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    /* ── Load sessions on mount ──────────────────────────────────────────── */
    useEffect(() => {
        (async () => {
            try {
                const data = await api.getCalendarSessions();
                const list: Session[] = data?.sessions ?? [];
                setSessions(list);
                const today = new Date().toISOString();
                const current = list.find(s => s.startDate <= today && s.endDate >= today) ?? list[list.length - 1] ?? null;
                setActiveSession(current);
                if (current) setCurrentDate(new Date());
            } catch (_) { /* ignore */ }
        })();
    }, []);

    /* ── Fetch calendar events for visible month ─────────────────────────── */
    useEffect(() => { fetchCalendarEvents(); }, [currentDate]);

    const fetchCalendarEvents = async () => {
        setLoading(true);
        try {
            const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const to   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
            const data = await api.getCalendarEvents(from, to);
            setEvents(data?.events ?? []);
        } catch (_) { setEvents([]); }
        finally { setLoading(false); }
    };

    /* ── Fetch ALL events (for the list panel) ───────────────────────────── */
    const fetchAllEvents = async () => {
        setAllEventsLoading(true);
        try {
            const from = new Date(new Date().getFullYear(), 0, 1).toISOString();
            const to   = new Date(new Date().getFullYear() + 1, 11, 31).toISOString();
            const data = await api.getSchoolEvents?.(from, to);
            setAllEvents(data?.events ?? []);
        } catch (_) { setAllEvents([]); }
        finally { setAllEventsLoading(false); }
    };

    /* ── Month navigation (clamped to session) ───────────────────────────── */
    const canGoPrev = useCallback(() => {
        if (!activeSession) return true;
        const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        return prev >= new Date(new Date(activeSession.startDate).getFullYear(), new Date(activeSession.startDate).getMonth(), 1);
    }, [currentDate, activeSession]);

    const canGoNext = useCallback(() => {
        if (!activeSession) return true;
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        return next <= new Date(new Date(activeSession.endDate).getFullYear(), new Date(activeSession.endDate).getMonth(), 1);
    }, [currentDate, activeSession]);

    const previousMonth = () => { if (canGoPrev()) setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)); };
    const nextMonth     = () => { if (canGoNext()) setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)); };

    /* ── Calendar grid helpers ───────────────────────────────────────────── */
    const daysInMonth  = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay     = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const calendarDays = Array.from({ length: firstDay }, () => 0).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    const toDateStr = (day: number) => {
        const m = currentDate.getMonth() + 1;
        return `${currentDate.getFullYear()}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    const getEventsForDate  = (day: number) => { const ds = toDateStr(day); return events.filter(e => eventCoversDate(e, ds)); };
    const selectedDateEvents = selectedDate ? events.filter(e => eventCoversDate(e, selectedDate)) : [];

    /* ── CRUD helpers ────────────────────────────────────────────────────── */
    const openCreateForm = (prefillDate?: string) => {
        setFormData({ ...emptyForm, date: prefillDate ?? "" });
        setEditingId(null);
        setFormError(null);
        setShowForm(true);
        setShowAllEvents(false);
    };

    const openEditForm = (ev: CalendarEvent) => {
        setFormData({
            title: ev.title,
            description: ev.description || "",
            type: ev.type,
            date: ev.date.split("T")[0],
            endDate: ev.endDate?.split("T")[0] || "",
        });
        setEditingId(ev.id);
        setFormError(null);
        setShowForm(true);
        setShowAllEvents(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.date) { setFormError("Title and start date are required"); return; }
        setSaving(true);
        setFormError(null);
        try {
            if (editingId) {
                await api.updateSchoolEvent?.(editingId, formData);
            } else {
                await api.createSchoolEvent?.(formData);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ ...emptyForm });
            await fetchCalendarEvents();
        } catch (err: unknown) {
            setFormError(err.response?.data?.message || "Failed to save event");
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this event?")) return;
        try {
            await api.deleteSchoolEvent?.(id);
            fetchCalendarEvents();
            if (showAllEvents) fetchAllEvents();
        } catch (_) { /* ignore */ }
    };

    const toggleAllEvents = () => {
        const next = !showAllEvents;
        setShowAllEvents(next);
        setShowForm(false);
        if (next) fetchAllEvents();
    };

    /* ══════════════════════════════════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════════════════════════════════ */
    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <CalendarIcon size={28} className="text-blue-600" />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Academic Calendar</h1>
                            <p className="text-slate-500 text-sm">Manage &amp; view events, holidays &amp; exam dates</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Session picker */}
                        {sessions.length > 0 && (
                            <select
                                value={activeSession?.id ?? ""}
                                onChange={e => {
                                    const s = sessions.find(x => x.id === e.target.value);
                                    if (s) { setActiveSession(s); setCurrentDate(new Date(s.startDate)); }
                                }}
                                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white"
                            >
                                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}
                        {/* All Events toggle */}
                        <button
                            onClick={toggleAllEvents}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                showAllEvents ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            <List size={18} />
                            All Events
                        </button>
                        {/* New Event */}
                        <button
                            onClick={() => openCreateForm(selectedDate ?? "")}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                            <Plus size={18} />
                            New Event
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ── Create / Edit Form (slide down) ────────────────────────────── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        key="event-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">{editingId ? "Edit Event" : "Create New Event"}</h3>
                                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1 rounded hover:bg-slate-100"><X size={20} /></button>
                            </div>

                            {formError && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {formError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text" placeholder="Event Title" value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <textarea
                                    placeholder="Description (optional)" value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Start Date</label>
                                        <input type="date" value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">End Date (optional)</label>
                                        <input type="date" value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" disabled={saving}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium text-sm">
                                        {saving ? "Saving…" : editingId ? "Update Event" : "Create Event"}
                                    </button>
                                    <button type="button"
                                        onClick={() => { setShowForm(false); setEditingId(null); setFormData({ ...emptyForm }); }}
                                        className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-300 transition text-sm font-medium">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── All-Events List Panel ───────────────────────────────────────── */}
            <AnimatePresence>
                {showAllEvents && (
                    <motion.div
                        key="all-events"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">All School Events</h3>
                                <button onClick={() => setShowAllEvents(false)} className="p-1 rounded hover:bg-slate-100"><X size={20} /></button>
                            </div>
                            {allEventsLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
                            ) : allEvents.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">No events found</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1">
                                    {allEvents.map(ev => {
                                        const cfg = eventTypeConfig[ev.type] ?? eventTypeConfig.OTHER;
                                        return (
                                            <div key={ev.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <span className="text-xl">{cfg.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-slate-900 text-sm truncate">{ev.title}</h4>
                                                        <span className="inline-block text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mt-0.5">{ev.type}</span>
                                                    </div>
                                                </div>
                                                {ev.description && <p className="text-xs text-slate-600 line-clamp-2 mb-2">{ev.description}</p>}
                                                <p className="text-xs text-slate-500 mb-3">
                                                    📅 {new Date(ev.date).toLocaleDateString("en-IN")}
                                                    {ev.endDate && ` → ${new Date(ev.endDate).toLocaleDateString("en-IN")}`}
                                                </p>
                                                {!ev.isExam && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => openEditForm(ev)}
                                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-xs font-medium">
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                        <button onClick={() => handleDelete(ev.id)}
                                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-xs font-medium">
                                                            <Trash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Main grid: Calendar + Sidebar ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar grid */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                            <div className="flex gap-1">
                                <button onClick={previousMonth} disabled={!canGoPrev()} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"><ChevronLeft size={20} /></button>
                                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">Today</button>
                                <button onClick={nextMonth} disabled={!canGoNext()} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"><ChevronRight size={20} /></button>
                            </div>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {dayNames.map(d => <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>)}
                        </div>

                        {/* Days */}
                        {loading ? (
                            <div className="flex items-center justify-center h-80"><Loader2 className="animate-spin text-slate-400" size={36} /></div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, idx) => {
                                    if (day === 0) return <div key={`e-${idx}`} className="aspect-square" />;
                                    const ds = toDateStr(day);
                                    const dayEvts = getEventsForDate(day);
                                    const isSelected = selectedDate === ds;
                                    const isToday = new Date().toISOString().split("T")[0] === ds;
                                    const dots = dayEvts.slice(0, 3).map(e => (eventTypeConfig[e.type] ?? eventTypeConfig.OTHER).dotColor);
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDate(isSelected ? null : ds)}
                                            className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all
                                                ${isSelected ? "ring-2 ring-blue-500 bg-blue-50"
                                                : isToday ? "ring-2 ring-emerald-500 bg-emerald-50"
                                                : dayEvts.length > 0 ? "bg-amber-50 hover:bg-amber-100"
                                                : "hover:bg-slate-50"}`}
                                        >
                                            <span className={isToday ? "text-emerald-700 font-bold" : ""}>{day}</span>
                                            {dots.length > 0 && (
                                                <div className="flex gap-0.5 mt-0.5">
                                                    {dots.map((c, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${c}`} />)}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Legend */}
                        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-slate-600">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full ring-2 ring-emerald-500 bg-emerald-50 inline-block" /> Today</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-100 inline-block" /> Has Events</span>
                            {Object.entries(eventTypeConfig).map(([k, v]) => (
                                <span key={k} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${v.dotColor} inline-block`} />{k}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Sidebar: selected-date events ──────────────────────────── */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 text-sm">
                                {selectedDate
                                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                                    : "Select a date"}
                            </h3>
                            {selectedDate && (
                                <button
                                    onClick={() => openCreateForm(selectedDate)}
                                    title="Add event on this date"
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>

                        {selectedDateEvents.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <AlertCircle className="mx-auto mb-2" size={28} />
                                <p className="text-sm">{selectedDate ? "No events on this day" : "Click a date to see events"}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {selectedDateEvents.map(ev => {
                                    const cfg = eventTypeConfig[ev.type] ?? eventTypeConfig.OTHER;
                                    const startStr = new Date(ev.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                                    const endStr   = ev.endDate ? new Date(ev.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : null;
                                    return (
                                        <div key={ev.id} className={`p-3 rounded-lg ${cfg.bgColor} border-l-4 ${cfg.dotColor.replace("bg-", "border-")}`}>
                                            <div className="flex items-start gap-2">
                                                <span className="text-lg leading-none">{cfg.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 text-sm">{ev.title}</p>
                                                    {ev.description && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{ev.description}</p>}
                                                    <p className="text-xs text-slate-500 mt-1">{startStr}{endStr && endStr !== startStr ? ` → ${endStr}` : ""}</p>
                                                </div>
                                            </div>
                                            {/* Edit / Delete for non-exam events */}
                                            {!ev.isExam && (
                                                <div className="flex gap-2 mt-2 ml-7">
                                                    <button onClick={() => openEditForm(ev)}
                                                        className="flex items-center gap-1 px-2 py-1 bg-white/70 text-blue-600 rounded hover:bg-white transition text-xs font-medium">
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(ev.id)}
                                                        className="flex items-center gap-1 px-2 py-1 bg-white/70 text-red-600 rounded hover:bg-white transition text-xs font-medium">
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;

