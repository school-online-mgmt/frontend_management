import React, { useState, useEffect } from "react";
import { X, Bus, MapPin, Tag, AlertCircle } from "lucide-react";
import api from "../../api/api";

type AdmitStudentModalProps = {
    student: any;
    onClose: () => void;
    onAdmit: (data: any) => void;
};

const AdmitStudentModal = ({ student, onClose, onAdmit }: AdmitStudentModalProps) => {
    const [form, setForm] = useState({
        sessionId: "",
        classId: "",
        sectionId: "",
        courseId: "",
        admissionId: "",
        rollNo: "",
        transportOpted: false,
        transportZoneId: "",
    });
    const [sessions, setSessions] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [transportZones, setTransportZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.generateAdmissionInfo().then((data: any) => {
            setForm(prev => ({ ...prev, admissionId: data.admissionId }));
        }).catch(() => {});
        api.getSessions().then((data: any) => {
            setSessions(Array.isArray(data) ? data : []);
        }).catch(() => setSessions([]));
        api.getTransportZones().then((data: any) => {
            setTransportZones(Array.isArray(data) ? data : data?.zones ?? []);
        }).catch(() => setTransportZones([]));
    }, []);

    useEffect(() => {
        if (form.sectionId) {
            api.generateAdmissionInfo(form.sectionId).then((data: any) => {
                setForm(prev => ({ ...prev, rollNo: data.rollNo }));
            }).catch(() => {});
        }
    }, [form.sectionId]);

    useEffect(() => {
        if (form.sessionId) {
            api.getClasses().then((data: any) => {
                setClasses(Array.isArray(data) ? data : []);
            }).catch(() => setClasses([]));
            api.getCourses({ sessionId: form.sessionId }).then((data: any) => {
                setAllCourses(Array.isArray(data) ? data : []);
            }).catch(() => setAllCourses([]));
        } else {
            setClasses([]);
            setAllCourses([]);
        }
        setSections([]);
        setCourses([]);
        setForm(prev => ({ ...prev, classId: "", sectionId: "", courseId: "" }));
    }, [form.sessionId]);

    useEffect(() => {
        if (form.classId) {
            api.getSectionsByClass(form.classId).then((data: any) => {
                setSections(Array.isArray(data) ? data : []);
            }).catch(() => setSections([]));
            setCourses(allCourses.filter((c: any) => c.classId === form.classId || c.class?.id === form.classId));
        } else {
            setSections([]);
            setCourses([]);
        }
        setForm(prev => ({ ...prev, sectionId: "", courseId: "" }));
    }, [form.classId, allCourses]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.transportOpted && !form.transportZoneId) {
            setError("Please select a transport zone.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onAdmit({ ...form, transportZoneId: form.transportZoneId || undefined });
            onClose();
        } catch {
            setError("Failed to admit student. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const selectedZone = transportZones.find(z => z.id === form.transportZoneId);

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-base font-bold">Admit Student</h2>
                        <p className="text-emerald-100 text-xs mt-0.5">{student.firstName} {student.lastName}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {/* Academic Placement */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Academic Placement</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Session <span className="text-red-500">*</span></label>
                                <select name="sessionId" value={form.sessionId} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                                    <option value="">Select Session</option>
                                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Class <span className="text-red-500">*</span></label>
                                <select name="classId" value={form.classId} onChange={handleChange} required disabled={!form.sessionId}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white">
                                    <option value="">{!form.sessionId ? "Select a session first" : "Select Class"}</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Section <span className="text-red-500">*</span></label>
                                <select name="sectionId" value={form.sectionId} onChange={handleChange} required disabled={!form.classId}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white">
                                    <option value="">{!form.classId ? "Select a class first" : "Select Section"}</option>
                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Course <span className="text-red-500">*</span></label>
                                <select name="courseId" value={form.courseId} onChange={handleChange} required disabled={!form.classId}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white">
                                    <option value="">{!form.classId ? "Select a class first" : "Select Course"}</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Admission ID</label>
                                <input type="text" name="admissionId" value={form.admissionId} readOnly
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Roll Number</label>
                                <input type="text" name="rollNo" value={form.rollNo} readOnly
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                            </div>
                        </div>
                    </div>

                    {/* Transport */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Transport</p>

                        {/* Toggle */}
                        <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors select-none">
                            <input type="checkbox" name="transportOpted" checked={form.transportOpted} onChange={handleChange}
                                className="w-4 h-4 rounded accent-emerald-600" />
                            <Bus size={15} className="text-slate-500" />
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Transport Opted</p>
                                <p className="text-xs text-slate-400">Assign student to a transport zone</p>
                            </div>
                        </label>

                        {/* Zone picker */}
                        {form.transportOpted && (
                            <div className="mt-3 space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Transport Zone <span className="text-red-500">*</span>
                                </label>

                                {transportZones.length === 0 ? (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                        <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-700">
                                            No transport zones configured. Set up zones in the <strong>Fees</strong> module first.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Dropdown */}
                                        <select
                                            value={form.transportZoneId}
                                            onChange={(e) => setForm(prev => ({ ...prev, transportZoneId: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                        >
                                            <option value="">— Select a transport zone —</option>
                                            {transportZones.map((zone: any) => (
                                                <option key={zone.id} value={zone.id}>
                                                    {zone.name}{zone.description ? ` · ${zone.description}` : ""} — ₹{Number(zone.price).toLocaleString("en-IN")}/month
                                                </option>
                                            ))}
                                        </select>

                                        {/* Visual cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                            {transportZones.map((zone: any) => {
                                                const selected = form.transportZoneId === zone.id;
                                                return (
                                                    <button key={zone.id} type="button"
                                                        onClick={() => setForm(prev => ({ ...prev, transportZoneId: zone.id }))}
                                                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                                                            selected
                                                                ? "border-emerald-500 bg-emerald-50"
                                                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                        }`}>
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-emerald-100" : "bg-slate-100"}`}>
                                                                    <MapPin size={13} className={selected ? "text-emerald-600" : "text-slate-400"} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`text-sm font-semibold truncate ${selected ? "text-emerald-800" : "text-slate-800"}`}>{zone.name}</p>
                                                                    {zone.description && <p className="text-xs text-slate-400 truncate mt-0.5">{zone.description}</p>}
                                                                </div>
                                                            </div>
                                                            <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${selected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                                                <Tag size={10} />
                                                                ₹{Number(zone.price).toLocaleString("en-IN")}/mo
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Selected zone summary */}
                                        {selectedZone && (
                                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mt-1">
                                                <Bus size={16} className="text-emerald-600 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-emerald-800">{selectedZone.name}</p>
                                                    {selectedZone.description && <p className="text-xs text-emerald-600 mt-0.5">{selectedZone.description}</p>}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs text-emerald-600 font-medium">Monthly Fee</p>
                                                    <p className="text-sm font-bold text-emerald-800">₹{Number(selectedZone.price).toLocaleString("en-IN")}</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
                            {loading ? "Admitting…" : "Admit Student"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdmitStudentModal;
