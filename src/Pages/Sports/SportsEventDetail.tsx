import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
    Trophy, ArrowLeft, Users, Calendar, MapPin, ShieldCheck, X,
    CheckCircle, XCircle, Clock, Award, AlertTriangle, UserPlus,
} from "lucide-react";
import api from "../../api/api";
import TabbedSection, { TabPanel } from "../../components/common/TabbedSection";

type Tab = "overview" | "coaches" | "enrollments" | "attendance" | "incidents" | "achievements";

const StatusPill = ({ value }: { value: string }) => {
    const map: Record<string, string> = {
        DRAFT: "bg-amber-100 text-amber-700",
        PUBLISHED: "bg-emerald-100 text-emerald-700",
        IN_PROGRESS: "bg-blue-100 text-blue-700",
        COMPLETED: "bg-slate-100 text-slate-700",
        CANCELLED: "bg-rose-100 text-rose-700",
        OPEN: "bg-emerald-100 text-emerald-700",
        CLOSED: "bg-slate-100 text-slate-700",
        NOT_OPEN: "bg-amber-100 text-amber-700",
        APPLIED: "bg-amber-50 text-amber-700",
        ACCEPTED: "bg-emerald-100 text-emerald-700",
        REJECTED: "bg-rose-100 text-rose-700",
        WAITLISTED: "bg-blue-50 text-blue-700",
        WITHDRAWN: "bg-slate-100 text-slate-500",
    };
    return <span className={`text-xs px-2 py-1 rounded ${map[value] ?? "bg-slate-100 text-slate-600"}`}>{value}</span>;
};

const SportsEventDetail = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const nav = useNavigate();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("overview");
    const [enrollFilter, setEnrollFilter] = useState("APPLIED");
    const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const toast = (type: "success" | "error", text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 4000);
    };
    const [incidentModal, setIncidentModal] = useState(false);
    const [achievementModal, setAchievementModal] = useState(false);

    const eventQuery = useQuery({
        queryKey: ["sports", "event", eventId],
        queryFn: () => api.getSportsEvent(eventId!),
        enabled: !!eventId,
    });
    const enrollmentsQuery = useQuery({
        queryKey: ["sports", "event", eventId, "enrollments", enrollFilter],
        queryFn: () => api.listSportsEnrollments(eventId!, enrollFilter),
        enabled: !!eventId,
    });
    const incidentsQuery = useQuery({
        queryKey: ["sports", "event", eventId, "incidents"],
        queryFn: () => api.listSportsIncidents(eventId!),
        enabled: !!eventId && tab === "incidents",
    });
    const achievementsQuery = useQuery({
        queryKey: ["sports", "event", eventId, "achievements"],
        queryFn: () => api.listSportsAchievements(eventId!),
        enabled: !!eventId && tab === "achievements",
    });
    const attendanceQuery = useQuery({
        queryKey: ["sports", "event", eventId, "attendance"],
        queryFn: () => api.getSportsAttendanceSummary(eventId!),
        enabled: !!eventId && tab === "attendance",
    });
    const teachersQuery = useQuery({ queryKey: ["teachers"], queryFn: () => api.getTeachers() });

    const event = eventQuery.data;
    const refresh = () => qc.invalidateQueries({ queryKey: ["sports", "event", eventId] });

    const decide = async (id: string, decision: "ACCEPT" | "REJECT" | "WAITLIST", rejectionReason?: string) => {
        try {
            await api.decideSportsEnrollment(id, decision, rejectionReason);
            qc.invalidateQueries({ queryKey: ["sports", "event", eventId, "enrollments"] });
            refresh();
            toast("success", `Application ${decision.toLowerCase()}ed`);
        } catch (e: any) {
            toast("error", e?.response?.data?.message || "Failed to decide");
        }
    };

    const publish = async () => {
        try { await api.publishSportsEvent(eventId!); refresh(); toast("success", "Event published"); }
        catch (e: any) { toast("error", e?.response?.data?.message || "Failed to publish"); }
    };
    const openEnr = async () => {
        try { await api.openSportsEnrollment(eventId!); refresh(); toast("success", "Enrollment opened"); }
        catch (e: any) { toast("error", e?.response?.data?.message || "Failed to open"); }
    };
    const closeEnr = async () => {
        try { await api.closeSportsEnrollment(eventId!); refresh(); toast("success", "Enrollment closed"); }
        catch (e: any) { toast("error", e?.response?.data?.message || "Failed to close"); }
    };
    const complete = async () => {
        try { await api.completeSportsEvent(eventId!); refresh(); toast("success", "Event marked complete"); }
        catch (e: any) { toast("error", e?.response?.data?.message || "Failed"); }
    };
    const cancel = async () => {
        const reason = window.prompt("Cancellation reason?");
        if (reason === null) return;
        try { await api.cancelSportsEvent(eventId!, reason); refresh(); toast("success", "Event cancelled"); }
        catch (e: any) { toast("error", e?.response?.data?.message || "Failed"); }
    };
    const removeCoach = async (coachId: string) => {
        try { await api.removeSportsCoach(eventId!, coachId); refresh(); toast("success", "Coach removed"); }
        catch (e: any) { toast("error", e?.response?.data?.message || "Failed"); }
    };

    if (eventQuery.isLoading) return <div className="p-6">Loading eventâ€¦</div>;
    if (!event) return <div className="p-6">Event not found.</div>;

    return (
        <div className="space-y-6">
            <button onClick={() => nav("/sports")} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                <ArrowLeft size={16} /> Back to Sports
            </button>
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-lime-600 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy size={20} />
                            <span className="text-sm opacity-80">Sports Event</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-1">{event.name}</h1>
                        <p className="text-sm opacity-80">{event.eventType}</p>
                        <div className="flex flex-wrap gap-4 mt-4 text-sm">
                            {event.venue && <div className="flex items-center gap-1"><MapPin size={14} /> {event.venue}</div>}
                            <div className="flex items-center gap-1"><Calendar size={14} /> {event.startDate} â†’ {event.endDate}</div>
                            <div className="flex items-center gap-1"><Users size={14} /> {event.acceptedCount ?? 0} / {event.capacity}</div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                        <StatusPill value={event.status} />
                        <StatusPill value={event.enrollmentStatus} />
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {event.status === "DRAFT" && <button onClick={publish} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs">Publish</button>}
                    {event.enrollmentStatus !== "OPEN" && event.status !== "DRAFT" && event.status !== "CANCELLED" && event.status !== "COMPLETED" && (
                        <button onClick={openEnr} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs">Open Enrollment</button>
                    )}
                    {event.enrollmentStatus === "OPEN" && (
                        <button onClick={closeEnr} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs">Close Enrollment</button>
                    )}
                    {event.status !== "COMPLETED" && event.status !== "CANCELLED" && event.status !== "DRAFT" && (
                        <button onClick={complete} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs">Mark Complete</button>
                    )}
                    {event.status !== "CANCELLED" && event.status !== "COMPLETED" && (
                        <button onClick={cancel} className="px-3 py-1.5 bg-rose-500/40 hover:bg-rose-500/60 rounded text-xs">Cancel Event</button>
                    )}
                </div>
            </div>

            {msg && (
                <div className={`p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>{msg.text}</div>
            )}

            <TabbedSection
                tabs={[
                    { key: "overview", label: "Overview", icon: Trophy },
                    { key: "coaches", label: "Coaches", icon: ShieldCheck },
                    { key: "enrollments", label: "Enrollments", icon: Users },
                    { key: "attendance", label: "Attendance", icon: Calendar },
                    { key: "incidents", label: "Incidents", icon: AlertTriangle },
                    { key: "achievements", label: "Achievements", icon: Award },
                ]}
                value={tab}
                onChange={(k) => setTab(k as Tab)}
                theme="emerald"
            >
                <TabPanel tabKey="overview">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl">
                            <h4 className="text-xs uppercase text-slate-500 mb-3">Configuration</h4>
                            <Row label="Min Level" value={event.minLevel} />
                            <Row label="Min Age" value={event.minAge ?? "â€”"} />
                            <Row label="Max Age" value={event.maxAge ?? "â€”"} />
                            <Row label="Daily Time" value={event.dailyStartTime ? `${event.dailyStartTime} â€“ ${event.dailyEndTime}` : "â€”"} />
                            <Row label="Recurrence Days" value={(event.recurrenceDays ?? []).join(", ") || "All days in range"} />
                            <Row label="Fee" value={event.feeAmount ? `â‚¹${event.feeAmount}` : "Free"} />
                        </div>
                        <div className="p-4 bg-white border border-slate-200 rounded-xl">
                            <h4 className="text-xs uppercase text-slate-500 mb-3">Compliance</h4>
                            <Row label="Medical clearance" value={event.requiresMedicalClearance ? "Required" : "Optional"} />
                            <Row label="Capacity" value={`${event.acceptedCount ?? 0} / ${event.capacity}`} />
                            <Row label="Created" value={new Date(event.createdAt).toLocaleString()} />
                        </div>
                    </div>
                    {event.description && (
                        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl">
                            <h4 className="text-xs uppercase text-slate-500 mb-2">Description</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</p>
                        </div>
                    )}
                </TabPanel>

                <TabPanel tabKey="coaches">
                    <div className="mb-3 flex justify-between">
                        <h3 className="font-semibold">Assigned Coaches</h3>
                        <AddCoachInline
                            teachers={teachersQuery.data ?? []}
                            onAdd={async (teacherId, role) => {
                                try { await api.addSportsCoach(eventId!, { teacherId, role }); refresh(); toast("success", "Coach added"); }
                                catch (e: any) { toast("error", e?.response?.data?.message || "Failed"); }
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        {(event.coaches ?? []).map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg">
                                <div>
                                    <span className="font-medium">{c.teacherName}</span>
                                    <span className="text-xs text-slate-500 ml-2">{c.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded ${c.role === "HEAD" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{c.role}</span>
                                    <button onClick={() => removeCoach(c.id)} className="text-rose-600 hover:text-rose-700 text-xs">Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabPanel>

                <TabPanel tabKey="enrollments">
                    <div className="mb-3 flex justify-between items-center">
                        <h3 className="font-semibold">Applications</h3>
                        <select value={enrollFilter} onChange={(e) => setEnrollFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
                            {["APPLIED", "ACCEPTED", "REJECTED", "WAITLISTED", "WITHDRAWN", "COMPLETED"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {enrollmentsQuery.isLoading ? <p>Loadingâ€¦</p> :
                     (enrollmentsQuery.data ?? []).length === 0 ? <p className="text-slate-500 text-sm">No enrollments in this state.</p> :
                     <div className="space-y-2">
                        {(enrollmentsQuery.data ?? []).map((en: any) => (
                            <div key={en.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg">
                                <div>
                                    <div className="font-medium">{en.studentFirst} {en.studentLast}</div>
                                    <div className="text-xs text-slate-500">{en.className} Â· {en.sectionName} Â· {en.admissionId}</div>
                                    {en.studentNotes && <p className="text-xs text-slate-600 mt-1 italic">"{en.studentNotes}"</p>}
                                    {en.rejectionReason && <p className="text-xs text-rose-600 mt-1">Reason: {en.rejectionReason}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill value={en.status} />
                                    {en.status === "APPLIED" && (
                                        <>
                                            <button onClick={() => decide(en.id, "ACCEPT")} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Accept"><CheckCircle size={14} /></button>
                                            <button onClick={() => setRejectModal({ id: en.id, reason: "" })} className="p-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200" title="Reject"><XCircle size={14} /></button>
                                            <button onClick={() => decide(en.id, "WAITLIST")} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Waitlist"><Clock size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>}
                </TabPanel>

                <TabPanel tabKey="attendance">
                    <h3 className="font-semibold mb-3">Attendance Summary</h3>
                    {attendanceQuery.isLoading ? <p>Loadingâ€¦</p> : (attendanceQuery.data ?? []).length === 0 ? <p className="text-slate-500 text-sm">No attendance recorded yet.</p> :
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr><th className="text-left p-2">Student</th><th className="text-center p-2">Present</th><th className="text-center p-2">Absent</th><th className="text-center p-2">Late</th><th className="text-center p-2">Excused</th><th className="text-center p-2">Total</th><th className="text-center p-2">%</th></tr>
                            </thead>
                            <tbody>
                                {(attendanceQuery.data ?? []).map((r: any) => (
                                    <tr key={r.enrollmentId} className="border-b">
                                        <td className="p-2">{r.studentName}</td>
                                        <td className="text-center p-2">{r.present}</td>
                                        <td className="text-center p-2">{r.absent}</td>
                                        <td className="text-center p-2">{r.late}</td>
                                        <td className="text-center p-2">{r.excused}</td>
                                        <td className="text-center p-2">{r.total}</td>
                                        <td className="text-center p-2 font-semibold">{r.attendancePercent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>}
                </TabPanel>

                <TabPanel tabKey="incidents">
                    <div className="mb-3 flex justify-between">
                        <h3 className="font-semibold">Incidents</h3>
                        <button onClick={() => setIncidentModal(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs">Report Incident</button>
                    </div>
                    {(incidentsQuery.data ?? []).length === 0 ? <p className="text-slate-500 text-sm">No incidents reported.</p> :
                    <div className="space-y-2">
                        {(incidentsQuery.data ?? []).map((inc: any) => (
                            <div key={inc.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs text-slate-500">{inc.date}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${inc.severity === "SEVERE" ? "bg-rose-100 text-rose-700" : inc.severity === "MODERATE" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{inc.severity}</span>
                                </div>
                                <p className="text-sm">{inc.description}</p>
                                <p className="text-xs text-slate-600 mt-1"><strong>Action:</strong> {inc.actionTaken}</p>
                            </div>
                        ))}
                    </div>}
                </TabPanel>

                <TabPanel tabKey="achievements">
                    <div className="mb-3 flex justify-between">
                        <h3 className="font-semibold">Achievements & Awards</h3>
                        <button onClick={() => setAchievementModal(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs">Award Achievement</button>
                    </div>
                    {(achievementsQuery.data ?? []).length === 0 ? <p className="text-slate-500 text-sm">No achievements awarded yet.</p> :
                    <div className="space-y-2">
                        {(achievementsQuery.data ?? []).map((a: any) => (
                            <div key={a.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-semibold">{a.title}</div>
                                    {a.description && <p className="text-xs text-slate-600">{a.description}</p>}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${
                                    a.type === "GOLD" ? "bg-yellow-100 text-yellow-700" :
                                    a.type === "SILVER" ? "bg-slate-200 text-slate-700" :
                                    a.type === "BRONZE" ? "bg-orange-100 text-orange-700" :
                                    "bg-blue-100 text-blue-700"
                                }`}>{a.type}</span>
                            </div>
                        ))}
                    </div>}
                </TabPanel>
            </TabbedSection>

            {rejectModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between"><h3 className="font-semibold">Reject application</h3><button onClick={() => setRejectModal(null)}><X size={20} /></button></div>
                        <textarea value={rejectModal.reason} onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })} placeholder="Reason (shown to student)" className="w-full border rounded-lg p-2 text-sm" rows={3} />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setRejectModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                            <button onClick={() => { decide(rejectModal.id, "REJECT", rejectModal.reason); setRejectModal(null); }} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm">Reject</button>
                        </div>
                    </div>
                </div>
            )}

            {incidentModal && eventId && (
                <IncidentModal eventId={eventId} onClose={() => setIncidentModal(false)} onCreated={() => { qc.invalidateQueries({ queryKey: ["sports", "event", eventId, "incidents"] }); toast("success", "Incident logged"); }} onError={(e) => toast("error", e)} />
            )}
            {achievementModal && eventId && (
                <AchievementModal eventId={eventId} enrollments={enrollmentsQuery.data ?? []} onClose={() => setAchievementModal(false)} onCreated={() => { qc.invalidateQueries({ queryKey: ["sports", "event", eventId, "achievements"] }); toast("success", "Achievement awarded"); }} onError={(e) => toast("error", e)} />
            )}
        </div>
    );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-1 text-sm border-b border-slate-100 last:border-0">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium">{value}</span>
    </div>
);

const AddCoachInline = ({ teachers, onAdd }: { teachers: any[]; onAdd: (teacherId: string, role: "HEAD" | "ASSISTANT") => void }) => {
    const [teacherId, setTeacherId] = useState("");
    const [role, setRole] = useState<"HEAD" | "ASSISTANT">("ASSISTANT");
    return (
        <div className="flex gap-2">
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="px-2 py-1 border rounded text-xs">
                <option value="">Select coach</option>
                {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value as "HEAD" | "ASSISTANT")} className="px-2 py-1 border rounded text-xs">
                <option value="ASSISTANT">Assistant</option>
                <option value="HEAD">Head</option>
            </select>
            <button onClick={() => { if (teacherId) { onAdd(teacherId, role); setTeacherId(""); } }} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs flex items-center gap-1"><UserPlus size={12} /> Add</button>
        </div>
    );
};

const IncidentModal = ({ eventId, onClose, onCreated, onError }: { eventId: string; onClose: () => void; onCreated: () => void; onError: (e: string) => void }) => {
    const [form, setForm] = useState({ studentId: "", date: new Date().toISOString().slice(0, 10), severity: "MINOR", description: "", actionTaken: "" });
    const enrollmentsQuery = useQuery({ queryKey: ["sports", "event", eventId, "enrollments", "ACCEPTED"], queryFn: () => api.listSportsEnrollments(eventId, "ACCEPTED") });
    const submit = async () => {
        try { await api.createSportsIncident(eventId, form); onCreated(); onClose(); }
        catch (e: any) { onError(e?.response?.data?.message || "Failed"); }
    };
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-3">
                <div className="flex justify-between"><h3 className="font-semibold">Report Incident</h3><button onClick={onClose}><X size={20} /></button></div>
                <Field label="Student">
                    <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full border rounded p-2 text-sm">
                        <option value="">Select</option>
                        {(enrollmentsQuery.data ?? []).map((en: any) => <option key={en.studentId} value={en.studentId}>{en.studentFirst} {en.studentLast}</option>)}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full border rounded p-2 text-sm" /></Field>
                    <Field label="Severity"><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full border rounded p-2 text-sm">{["MINOR", "MODERATE", "SEVERE"].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
                </div>
                <Field label="What happened?"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded p-2 text-sm" rows={3} /></Field>
                <Field label="Action taken"><textarea value={form.actionTaken} onChange={(e) => setForm({ ...form, actionTaken: e.target.value })} className="w-full border rounded p-2 text-sm" rows={2} /></Field>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Cancel</button>
                    <button onClick={submit} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm">Log Incident</button>
                </div>
            </div>
        </div>
    );
};

const AchievementModal = ({ eventId, enrollments, onClose, onCreated, onError }: { eventId: string; enrollments: any[]; onClose: () => void; onCreated: () => void; onError: (e: string) => void }) => {
    const [form, setForm] = useState({ enrollmentId: "", studentId: "", type: "GOLD", title: "", description: "" });
    const submit = async () => {
        if (!form.enrollmentId || !form.title) { onError("Student and title required"); return; }
        try { await api.createSportsAchievement(eventId, form); onCreated(); onClose(); }
        catch (e: any) { onError(e?.response?.data?.message || "Failed"); }
    };
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-3">
                <div className="flex justify-between"><h3 className="font-semibold">Award Achievement</h3><button onClick={onClose}><X size={20} /></button></div>
                <Field label="Student">
                    <select value={form.enrollmentId} onChange={(e) => {
                        const en = enrollments.find((x: any) => x.id === e.target.value);
                        setForm({ ...form, enrollmentId: e.target.value, studentId: en?.studentId ?? "" });
                    }} className="w-full border rounded p-2 text-sm">
                        <option value="">Select</option>
                        {enrollments.filter((e: any) => ["ACCEPTED", "COMPLETED"].includes(e.status)).map((en: any) => <option key={en.id} value={en.id}>{en.studentFirst} {en.studentLast}</option>)}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border rounded p-2 text-sm">{["GOLD", "SILVER", "BRONZE", "PARTICIPATION", "SPECIAL_MENTION"].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
                    <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Best Striker" className="w-full border rounded p-2 text-sm" /></Field>
                </div>
                <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded p-2 text-sm" rows={2} /></Field>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Cancel</button>
                    <button onClick={submit} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm">Award</button>
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

export default SportsEventDetail;
