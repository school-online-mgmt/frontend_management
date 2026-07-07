import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy, Plus, Calendar, MapPin, Users, X } from "lucide-react";
import api from "../../api/api";
import PageHeader, { MODULE_THEMES } from "../../components/PageHeader";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";

type Tab = "events" | "catalog";

const SportsHome = () => {
    const nav = useNavigate();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("events");
    const [showSportModal, setShowSportModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const toast = (type: "success" | "error", text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 4000);
    };

    const eventsQuery = useQuery({
        queryKey: ["sports", "events"],
        queryFn: () => api.listSportsEvents(),
    });

    const sportsQuery = useQuery({
        queryKey: ["sports", "catalog"],
        queryFn: () => api.listSports(),
    });

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["sports"] });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Trophy}
                title="Sports"
                subtitle="Events, coaches, enrollment, lesson plans, attendance & achievements"
                gradient={MODULE_THEMES.sports}
                onRefresh={refresh}
            />
            {msg && (
                <div className={`p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>{msg.text}</div>
            )}

            <TabbedSection
                tabs={[
                    { key: "events", label: "Events", icon: Calendar },
                    { key: "catalog", label: "Sports Catalog", icon: Trophy },
                ]}
                value={tab}
                onChange={(k) => setTab(k as Tab)}
                theme="emerald"
            >
                <TabPanel tabKey="events">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-semibold">All Events</h3>
                        <button
                            onClick={() => {
                                if ((sportsQuery.data ?? []).filter((s) => s.isActive).length === 0) {
                                    toast("error", "Add at least one sport to your catalog before creating an event.");
                                    setTab("catalog");
                                    return;
                                }
                                setShowEventModal(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} /> Create Event
                        </button>
                    </div>
                    {eventsQuery.isLoading ? (
                        <p>Loading…</p>
                    ) : (eventsQuery.data ?? []).length === 0 ? (
                        <p className="text-slate-500">No events yet. Create one to get started.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(eventsQuery.data ?? []).map((e: any) => (
                                <button
                                    key={e.id}
                                    onClick={() => nav(`/sports/events/${e.id}`)}
                                    className="text-left p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-slate-900">{e.name}</h4>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            e.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" :
                                            e.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                                            e.status === "COMPLETED" ? "bg-slate-100 text-slate-700" :
                                            e.status === "CANCELLED" ? "bg-rose-100 text-rose-700" :
                                            "bg-amber-100 text-amber-700"
                                        }`}>{e.status}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">{e.sportName} · {e.eventType}</p>
                                    <div className="text-xs text-slate-500 space-y-1">
                                        {e.venue && <div className="flex items-center gap-1"><MapPin size={12} /> {e.venue}</div>}
                                        <div className="flex items-center gap-1"><Calendar size={12} /> {e.startDate} → {e.endDate}</div>
                                        <div className="flex items-center gap-1"><Users size={12} /> Cap: {e.capacity}</div>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            e.enrollmentStatus === "OPEN" ? "bg-emerald-50 text-emerald-700" :
                                            e.enrollmentStatus === "CLOSED" ? "bg-slate-50 text-slate-600" :
                                            "bg-amber-50 text-amber-700"
                                        }`}>Enrollment: {e.enrollmentStatus}</span>
                                        {e.feeAmount > 0 && <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">₹{e.feeAmount}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </TabPanel>

                <TabPanel tabKey="catalog">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Sports Catalog</h3>
                        <button
                            onClick={() => setShowSportModal(true)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} /> Add Sport
                        </button>
                    </div>
                    {sportsQuery.isLoading ? (
                        <p>Loading…</p>
                    ) : (sportsQuery.data ?? []).length === 0 ? (
                        <p className="text-slate-500">No sports in your catalog yet. Add one (e.g. Football, Badminton) before creating events.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(sportsQuery.data ?? []).map((s) => (
                                <div key={s.id} className="p-4 bg-white rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold">{s.name}</h4>
                                        <span className={`text-xs px-2 py-1 rounded ${s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            {s.isActive ? "Active" : "Disabled"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{s.category}</p>
                                    {s.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{s.description}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </TabPanel>
            </TabbedSection>

            {showSportModal && (
                <SportModal
                    onClose={() => setShowSportModal(false)}
                    onCreated={() => { refresh(); toast("success", "Sport added"); }}
                    onError={(e) => toast("error", e)}
                />
            )}
            {showEventModal && (
                <EventModal
                    sports={sportsQuery.data ?? []}
                    onClose={() => setShowEventModal(false)}
                    onCreated={(id) => { refresh(); toast("success", "Event created"); nav(`/sports/events/${id}`); }}
                    onError={(e) => toast("error", e)}
                />
            )}
        </div>
    );
};

const SportModal = ({ onClose, onCreated, onError }: { onClose: () => void; onCreated: () => void; onError: (e: string) => void }) => {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("INDIVIDUAL");
    const [description, setDescription] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        setBusy(true);
        try {
            await api.createSport({ name, category, description });
            onCreated();
            onClose();
        } catch (e: any) {
            onError(e?.response?.data?.message || "Failed to create sport");
        } finally { setBusy(false); }
    };
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Add Sport</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div>
                    <label className="text-xs text-slate-600 block mb-1">Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Football" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                    <label className="text-xs text-slate-600 block mb-1">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        {["TEAM", "INDIVIDUAL", "COMBAT", "AQUATIC", "ATHLETICS", "OTHER"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-600 block mb-1">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                    <button onClick={submit} disabled={!name || busy} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg disabled:opacity-50">{busy ? "Saving…" : "Add"}</button>
                </div>
            </div>
        </div>
    );
};

const EventModal = ({ sports, onClose, onCreated, onError }: { sports: any[]; onClose: () => void; onCreated: (id: string) => void; onError: (e: string) => void }) => {
    const [form, setForm] = useState({
        sportId: "",
        sessionId: "",
        name: "",
        eventType: "CAMP",
        description: "",
        venue: "",
        startDate: "",
        endDate: "",
        dailyStartTime: "",
        dailyEndTime: "",
        capacity: 30,
        feeAmount: 0,
        minLevel: "BEGINNER",
        minAge: "" as string | number,
        maxAge: "" as string | number,
        requiresMedicalClearance: true,
        headCoachTeacherId: "",
        assistantCoachTeacherIds: [] as string[],
    });
    const [busy, setBusy] = useState(false);

    const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: () => api.getSessions() });
    const teachersQuery = useQuery({ queryKey: ["teachers"], queryFn: () => api.getTeachers() });

    // Normalise the two shapes the existing endpoints return so the dropdowns
    // populate regardless of whether the caller returns the raw envelope or the
    // unwrapped list.
    const sessionList: any[] = Array.isArray(sessionsQuery.data)
        ? sessionsQuery.data
        : (sessionsQuery.data?.sessions ?? []);
    const teacherList: any[] = Array.isArray(teachersQuery.data)
        ? teachersQuery.data
        : (teachersQuery.data?.teachers ?? []);

    const toggleAssistant = (id: string) => {
        setForm((f) => ({
            ...f,
            assistantCoachTeacherIds: f.assistantCoachTeacherIds.includes(id)
                ? f.assistantCoachTeacherIds.filter((x) => x !== id)
                : [...f.assistantCoachTeacherIds, id],
        }));
    };

    const submit = async () => {
        if (!form.sportId || !form.sessionId || !form.name || !form.startDate || !form.endDate || !form.headCoachTeacherId) {
            onError("Sport, session, name, dates and head coach are required");
            return;
        }
        if (new Date(form.endDate) < new Date(form.startDate)) {
            onError("End date must be on or after start date");
            return;
        }
        setBusy(true);
        try {
            const payload: any = {
                sportId: form.sportId,
                sessionId: form.sessionId,
                name: form.name,
                eventType: form.eventType,
                startDate: form.startDate,
                endDate: form.endDate,
                capacity: Number(form.capacity),
                feeAmount: Number(form.feeAmount),
                minLevel: form.minLevel,
                requiresMedicalClearance: form.requiresMedicalClearance,
                headCoachTeacherId: form.headCoachTeacherId,
                assistantCoachTeacherIds: form.assistantCoachTeacherIds.filter((id) => id !== form.headCoachTeacherId),
            };
            if (form.description) payload.description = form.description;
            if (form.venue) payload.venue = form.venue;
            if (form.dailyStartTime) payload.dailyStartTime = form.dailyStartTime;
            if (form.dailyEndTime) payload.dailyEndTime = form.dailyEndTime;
            if (form.minAge !== "") payload.minAge = Number(form.minAge);
            if (form.maxAge !== "") payload.maxAge = Number(form.maxAge);

            const created = await api.createSportsEvent(payload);
            onCreated(created.id);
        } catch (e: any) {
            const detail = e?.response?.data?.errors
                ? JSON.stringify(e.response.data.errors.fieldErrors ?? e.response.data.errors)
                : e?.response?.data?.message;
            onError(detail || "Failed to create event");
        } finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Create Sports Event</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Sport *">
                        <select value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="">Select a sport</option>
                            {sports.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Session *">
                        <select value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="">Select session</option>
                            {sessionList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label="Event Name *">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="U-14 Summer Football Camp" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </Field>
                <Field label="Description">
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Event Type">
                        <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                            {["CAMP", "TOURNAMENT", "TRAINING", "CLASS", "EXTRACURRICULAR"].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Venue">
                        <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="Start Date *">
                        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="End Date *">
                        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="Capacity">
                        <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="Fee (₹)">
                        <input type="number" min={0} value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="Minimum Level">
                        <select value={form.minLevel} onChange={(e) => setForm({ ...form, minLevel: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                            {["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"].map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </Field>
                    <Field label="Head Coach *">
                        <select value={form.headCoachTeacherId} onChange={(e) => setForm({ ...form, headCoachTeacherId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="">Select a teacher</option>
                            {teacherList.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Min Age">
                        <input type="number" min={3} max={99} value={form.minAge} onChange={(e) => setForm({ ...form, minAge: e.target.value })} placeholder="e.g. 10" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="Max Age">
                        <input type="number" min={3} max={99} value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: e.target.value })} placeholder="e.g. 14" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="Daily Start Time">
                        <input type="time" value={form.dailyStartTime} onChange={(e) => setForm({ ...form, dailyStartTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                    <Field label="Daily End Time">
                        <input type="time" value={form.dailyEndTime} onChange={(e) => setForm({ ...form, dailyEndTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </Field>
                </div>
                <Field label="Assistant Coaches (optional)">
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                        {teacherList.filter((t: any) => t.id !== form.headCoachTeacherId).length === 0 ? (
                            <p className="text-xs text-slate-400">No other teachers available.</p>
                        ) : teacherList.filter((t: any) => t.id !== form.headCoachTeacherId).map((t: any) => (
                            <label key={t.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.assistantCoachTeacherIds.includes(t.id)}
                                    onChange={() => toggleAssistant(t.id)}
                                />
                                {t.name}
                            </label>
                        ))}
                    </div>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.requiresMedicalClearance} onChange={(e) => setForm({ ...form, requiresMedicalClearance: e.target.checked })} />
                    Requires medical clearance
                </label>
                <div className="flex gap-2 justify-end pt-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                    <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg disabled:opacity-50">{busy ? "Creating…" : "Create Event"}</button>
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="text-xs text-slate-600 block mb-1">{label}</label>
        {children}
    </div>
);

export default SportsHome;
