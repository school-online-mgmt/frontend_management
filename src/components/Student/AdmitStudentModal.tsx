import React, { useState, useEffect } from "react";
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
    const [loading, setLoading] = useState(false);

    // Auto-generate admission ID on mount
    useEffect(() => {
        api.generateAdmissionInfo().then((data: any) => {
            setForm(prev => ({ ...prev, admissionId: data.admissionId }));
        }).catch(() => {});
    }, []);

    // Auto-generate roll number when section changes
    useEffect(() => {
        if (form.sectionId) {
            api.generateAdmissionInfo(form.sectionId).then((data: any) => {
                setForm(prev => ({ ...prev, rollNo: data.rollNo }));
            }).catch(() => {});
        }
    }, [form.sectionId]);

    // Fetch only sessions on mount
    useEffect(() => {
        api.getSessions().then((data: any) => {
            setSessions(Array.isArray(data) ? data : []);
        }).catch(() => setSessions([]));
    }, []);

    // Fetch classes & courses when session changes
    useEffect(() => {
        if (form.sessionId) {
            api.getClasses().then((data: any) => {
                setClasses(Array.isArray(data) ? data : []);
            }).catch(() => setClasses([]));
            api.getCourses({ sessionId: form.sessionId }).then((data: any) => {
                const arr = Array.isArray(data) ? data : [];
                setAllCourses(arr);
            }).catch(() => setAllCourses([]));
        } else {
            setClasses([]);
            setAllCourses([]);
        }
        setSections([]);
        setCourses([]);
        setForm(prev => ({ ...prev, classId: "", sectionId: "", courseId: "" }));
    }, [form.sessionId]);

    // Fetch sections & filter courses when class changes
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
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdmit(form);
            onClose();
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl w-[600px] p-6 space-y-4 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-semibold">Admit Student {student.firstName} {student.lastName}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Session</label>
                        <select name="sessionId" value={form.sessionId} onChange={handleChange} required className="w-full p-2 border rounded">
                            <option value="">Select Session</option>
                            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Class</label>
                        <select name="classId" value={form.classId} onChange={handleChange} required disabled={!form.sessionId} className="w-full p-2 border rounded disabled:bg-slate-100 disabled:cursor-not-allowed">
                            <option value="">{!form.sessionId ? "Select a session first" : "Select Class"}</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Section</label>
                        <select name="sectionId" value={form.sectionId} onChange={handleChange} required disabled={!form.classId} className="w-full p-2 border rounded disabled:bg-slate-100 disabled:cursor-not-allowed">
                            <option value="">{!form.classId ? "Select a class first" : "Select Section"}</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Course</label>
                        <select name="courseId" value={form.courseId} onChange={handleChange} required disabled={!form.classId} className="w-full p-2 border rounded disabled:bg-slate-100 disabled:cursor-not-allowed">
                            <option value="">{!form.classId ? "Select a class first" : "Select Course"}</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Admission ID</label>
                        <input type="text" name="admissionId" value={form.admissionId} onChange={handleChange} required readOnly className="w-full p-2 border rounded bg-slate-50 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Roll No</label>
                        <input type="text" name="rollNo" value={form.rollNo} onChange={handleChange} required readOnly className="w-full p-2 border rounded bg-slate-50 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm">
                            <input type="checkbox" name="transportOpted" checked={form.transportOpted} onChange={handleChange} />
                            Transport Opted
                        </label>
                    </div>
                    {form.transportOpted && (
                        <div>
                            <label className="block text-sm font-medium">Transport Zone</label>
                            <input type="text" name="transportZoneId" value={form.transportZoneId} onChange={handleChange} placeholder="Enter zone ID" className="w-full p-2 border rounded" />
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                            {loading ? "Admitting..." : "Admit Student"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdmitStudentModal;
