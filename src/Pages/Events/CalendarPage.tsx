import React, { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2,
    AlertCircle, Plus, Edit2, Trash2, X, List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../context/ToastContext";
import { useSession } from "../../context/SessionContext";
import { ErrorState } from "../../components/ui";

/* â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ Event type look-up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const eventTypes = [
    "HOLIDAY", "VACATION", "ACTIVITY", "PROGRAM",
    "EXHIBITION", "SPORTS", "CULTURAL", "MEETING", "OTHER",
];

const eventTypeConfig: Record<string, { icon: string; bgColor: string; dotColor: string }> = {
    HOLIDAY:    { icon: "ðŸ–ï¸", bgColor: "bg-blue-50",    dotColor: "bg-blue-500" },
    VACATION:   { icon: "âœˆï¸", bgColor: "bg-green-50",   dotColor: "bg-green-500" },
    ACTIVITY:   { icon: "ðŸŽ¨", bgColor: "bg-purple-50",  dotColor: "bg-purple-500" },
    PROGRAM:    { icon: "ðŸŽ­", bgColor: "bg-pink-50",    dotColor: "bg-pink-500" },
    EXHIBITION: { icon: "ðŸ–¼ï¸", bgColor: "bg-orange-50",  dotColor: "bg-orange-500" },
    SPORTS:     { icon: "âš½", bgColor: "bg-red-50",     dotColor: "bg-red-400" },
    CULTURAL:   { icon: "ðŸŽµ", bgColor: "bg-indigo-50",  dotColor: "bg-indigo-500" },
    MEETING:    { icon: "ðŸ‘¥", bgColor: "bg-yellow-50",  dotColor: "bg-yellow-500" },
    EXAM:       { icon: "ðŸ“", bgColor: "bg-red-50",     dotColor: "bg-red-600" },
    OTHER:      { icon: "ðŸ“Œ", bgColor: "bg-slate-50",   dotColor: "bg-slate-500" },
};

function eventCoversDate(event: CalendarEvent, dateStr: string): boolean {
    const start = event.date.split("T")[0];
    const end   = event.endDate?.split("T")[0] ?? start;
    return dateStr >= start && dateStr <= end;
}

const emptyForm = { title: "", description: "", type: "OTHER", date: "", endDate: "" };

/* ═══════════════════════ Component ═══════════════════════ */
const CalendarPage = () => {
    const { confirm, dialog } = useConfirm();
    const { addToast } = useToast();
    // Session selection comes from the global SessionContext (rendered
    // in the layout topbar). We use the active session for date-bounded
    // navigation; the full sessions list isn't needed here.
    const { selectedSession } = useSession();
    const activeSession: Session | null = (selectedSession as unknown as Session) ?? null;
    const queryClient = useQueryClient();
    const [currentDate, setCurrentDate] = useState(new Date());

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [showAllEvents, setShowAllEvents] = useState(false);
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
    const [allEventsLoading, setAllEventsLoading] = useState(false);

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    // When the global session changes, snap the calendar to its start month.
    useEffect(() => {
        if (activeSession) setCurrentDate(new Date(activeSession.startDate));
    }, [activeSession?.id]);

    // ── Load events when month / session changes ──
    // Cached per (year, month) so navigating back to a previously
    // viewed month is instant.
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${String(m + 1).padStart(2, "0")}-${lastDay}`;
    const eventsQuery = useQuery({
        queryKey: ["calendar", "events", from, to],
        queryFn: () => api.getCalendarEvents(from, to),
        select: (res: any) => res?.events ?? res ?? [],
    });
    useEffect(() => {
        const e = eventsQuery.error as any;
        if (e) addToast(e?.response?.data?.message || 'Failed to load calendar events', 'error');
    }, [eventsQuery.error, addToast]);
    const events: CalendarEvent[] = eventsQuery.data ?? [];
    const loading = eventsQuery.isFetching;
    const fetchEvents = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["calendar", "events"] });
    }, [queryClient]);

    // ── Calendar grid helpers ──
    const calendarDays: number[] = (() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const firstDow = new Date(y, m, 1).getDay();
        const dim = new Date(y, m + 1, 0).getDate();
        const arr: number[] = [];
        for (let i = 0; i < firstDow; i++) arr.push(0);
        for (let d = 1; d <= dim; d++) arr.push(d);
        return arr;
    })();

    const toDateStr = (day: number) => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    const getEventsForDate = (day: number) => {
        const ds = toDateStr(day);
        return events.filter(e => eventCoversDate(e, ds));
    };

    const selectedDateEvents = selectedDate ? events.filter(e => eventCoversDate(e, selectedDate)) : [];

    // ── Navigation ──
    const previousMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const canGoPrev = () => {
        if (!activeSession) return true;
        const start = new Date(activeSession.startDate);
        return currentDate.getFullYear() > start.getFullYear() || currentDate.getMonth() > start.getMonth();
    };
    const canGoNext = () => {
        if (!activeSession) return true;
        const end = new Date(activeSession.endDate);
        return currentDate.getFullYear() < end.getFullYear() || currentDate.getMonth() < end.getMonth();
    };

    // ── CRUD helpers ──
    const openCreateForm = (date: string) => {
        setEditingId(null);
        setFormData({ ...emptyForm, date });
        setFormError("");
        setShowForm(true);
    };
    const openEditForm = (ev: CalendarEvent) => {
        setEditingId(ev.id);
        setFormData({ title: ev.title, description: ev.description ?? "", type: ev.type, date: ev.date.split("T")[0], endDate: ev.endDate?.split("T")[0] ?? "" });
        setFormError("");
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.date) { setFormError("Title and date are required"); return; }
        setSaving(true);
        try {
            if (editingId) {
                await api.updateSchoolEvent(editingId, { title: formData.title, description: formData.description || undefined, type: formData.type, date: formData.date, endDate: formData.endDate || undefined });
            } else {
                await api.createSchoolEvent({ title: formData.title, description: formData.description || undefined, type: formData.type, date: formData.date, endDate: formData.endDate || undefined });
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ ...emptyForm });
            fetchEvents();
        } catch (err: any) {
            setFormError(err.response?.data?.message || "Failed to save event");
        } finally { setSaving(false); }
    };

    const handleDelete = (id: string, title: string) => {
        confirm({
            title: "Delete Event",
            message: `Delete "${title}"? This cannot be undone.`,
            confirmText: "Delete",
            onConfirm: async () => {
                await api.deleteSchoolEvent(id);
                fetchEvents();
            },
        });
    };

    const toggleAllEvents = async () => {
        if (showAllEvents) { setShowAllEvents(false); return; }
        setShowAllEvents(true);
        setAllEventsLoading(true);
        try {
            const res = await api.getSchoolEvents();
            setAllEvents(res.events ?? res ?? []);
        } finally { setAllEventsLoading(false); }
    };

    return (
        <div className="min-h-full bg-slate-50">
            {dialog}
            <PageHeader
                icon={CalendarIcon}
                title="Academic Calendar"
                subtitle="Manage & view events, holidays & exam dates"
                gradient={MODULE_THEMES.communication}
                onRefresh={fetchEvents}
                refreshing={loading}
                primaryActions={
                    <>
                        <button data-testid="events-toggle-all-events-btn" onClick={toggleAllEvents}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border transition backdrop-blur-sm shrink-0 ${
                                showAllEvents
                                    ? "bg-white text-violet-700 border-white"
                                    : "bg-white/15 border-white/25 text-white hover:bg-white/25"
                            }`}>
                            <List size={14} /> All Events
                        </button>
                        {/* The always-available create affordance. The other
                            create button (events-open-create-form-btn) lives in
                            the selected-date sidebar and only exists once a date
                            has been picked, so this one needs its own handle. */}
                        <button data-testid="events-new-event-btn"
                            onClick={() => openCreateForm(selectedDate ?? "")}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/25 transition backdrop-blur-sm shrink-0">
                            <Plus size={14} /> New Event
                        </button>
                    </>
                }
            />
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-5">

            {/* Create / Edit Form (slide down) */}
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
                                    <input data-testid="events-title-input"
                                        type="text" placeholder="Event Title" value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <select data-testid="events-type-select"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <textarea data-testid="events-description-input"
                                    placeholder="Description (optional)" value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Start Date</label>
                                        <input data-testid="events-date-input" type="date" value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">End Date (optional)</label>
                                        <input data-testid="events-end-date-input" type="date" value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" disabled={saving} data-testid="events-submit-btn"
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

            {/* â”€â”€ All-Events List Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                                <button data-testid="events-show-all-events-btn" onClick={() => setShowAllEvents(false)} className="p-1 rounded hover:bg-slate-100"><X size={20} /></button>
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
                                                    ðŸ“… {new Date(ev.date).toLocaleDateString("en-IN")}
                                                    {ev.endDate && ` â†’ ${new Date(ev.endDate).toLocaleDateString("en-IN")}`}
                                                </p>
                                                {!ev.isExam && (
                                                    <div className="flex gap-2">
                                                        <button data-testid="events-open-edit-form-btn" onClick={() => openEditForm(ev)}
                                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-xs font-medium">
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                        <button data-testid="events-delete-btn" onClick={() => handleDelete(ev.id, ev.title)}
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

            {/* â”€â”€ Main grid: Calendar + Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar grid */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                            <div className="flex gap-1">
                                <button data-testid="events-previous-month-btn" onClick={previousMonth} disabled={!canGoPrev()} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"><ChevronLeft size={20} /></button>
                                <button data-testid="events-current-date-btn" onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">Today</button>
                                <button data-testid="events-next-month-btn" onClick={nextMonth} disabled={!canGoNext()} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"><ChevronRight size={20} /></button>
                            </div>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {dayNames.map(d => <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>)}
                        </div>

                        {/* Days */}
                        {loading ? (
                            <div className="flex items-center justify-center h-80"><Loader2 className="animate-spin text-slate-400" size={36} /></div>
                        ) : eventsQuery.isError ? (
                            /* An empty grid is indistinguishable from a month
                               with nothing scheduled — say the load failed. */
                            <ErrorState
                                message="Could not load the calendar."
                                onRetry={() => void eventsQuery.refetch()}
                                testId="calendar-error"
                            />
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
                                        <button data-testid="events-selected-date-btn"
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

                {/* â”€â”€ Sidebar: selected-date events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 text-sm">
                                {selectedDate
                                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                                    : "Select a date"}
                            </h3>
                            {selectedDate && (
                                <button data-testid="events-open-create-form-btn"
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
                                                    <p className="text-xs text-slate-500 mt-1">{startStr}{endStr && endStr !== startStr ? ` â†’ ${endStr}` : ""}</p>
                                                </div>
                                            </div>
                                            {/* Edit / Delete for non-exam events */}
                                            {!ev.isExam && (
                                                <div className="flex gap-2 mt-2 ml-7">
                                                    <button data-testid="events-open-edit-form-btn-2" onClick={() => openEditForm(ev)}
                                                        className="flex items-center gap-1 px-2 py-1 bg-white/70 text-blue-600 rounded hover:bg-white transition text-xs font-medium">
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    <button data-testid="events-delete-btn-2" onClick={() => handleDelete(ev.id, ev.title)}
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
        </div>
    );
};

export default CalendarPage;

