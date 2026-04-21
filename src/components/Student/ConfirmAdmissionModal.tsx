import React, { useState, useEffect } from "react";
import api from "../../api/api";

type ConfirmAdmissionModalProps = {
    applicant: any;
    onClose: () => void;
    onConfirm: (data: any) => void;
};

const ConfirmAdmissionModal = ({ applicant, onClose, onConfirm }: ConfirmAdmissionModalProps) => {
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sess, cls, secs, cors] = await Promise.all([
                    api.getSessions(),
                    api.getClasses(),
                    api.getSections(),
                    api.getCourses(),
                ]);
                setSessions(sess);
                setClasses(cls);
                setSections(secs);
                setCourses(cors);
            } catch (error) {

            }
        };
        fetchData();
    }, []);

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
            await onConfirm(form);
            onClose();
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl w-[600px] p-6 space-y-4 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-semibold">Confirm Admission for {applicant.firstName} {applicant.lastName}</h2>
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
                        <select name="classId" value={form.classId} onChange={handleChange} required className="w-full p-2 border rounded">
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Section</label>
                        <select name="sectionId" value={form.sectionId} onChange={handleChange} required className="w-full p-2 border rounded">
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Course</label>
                        <select name="courseId" value={form.courseId} onChange={handleChange} required className="w-full p-2 border rounded">
                            <option value="">Select Course</option>
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
                            {loading ? "Confirming..." : "Confirm Admission"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConfirmAdmissionModal;
