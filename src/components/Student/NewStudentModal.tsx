import React, { useState } from "react";
import { X, AlertCircle, User, Phone, MapPin, Users, Lock } from "lucide-react";
import api from "../../api/api";

type Props = {
    onClose: () => void;
    onCreated: () => void;
};

const EMPTY = {
    firstName: "", middleName: "", lastName: "",
    fatherName: "", motherName: "",
    gender: "" as "" | "Male" | "Female" | "Other",
    phone: "", address: "", email: "",
    password: "", disability: false, disabilityDescription: "", comments: "",
};

const NewStudentModal = ({ onClose, onCreated }: Props) => {
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (field: keyof typeof EMPTY) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const val = e.target.type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : e.target.value;
            setForm(prev => ({ ...prev, [field]: val }));
        };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await api.createStudent({
                ...form,
                middleName: form.middleName || undefined,
                disabilityDescription: form.disabilityDescription || undefined,
                comments: form.comments || undefined,
            });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Failed to create student. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
    const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-base font-bold">New Student</h2>
                        <p className="text-indigo-100 text-xs mt-0.5">Create a student profile directly</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {/* Personal Info */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <User size={13} className="text-slate-400" />
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Personal Information</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={form.firstName} onChange={set("firstName")} required placeholder="e.g. Rahul" />
                            </div>
                            <div>
                                <label className={labelCls}>Middle Name</label>
                                <input className={inputCls} value={form.middleName} onChange={set("middleName")} placeholder="Optional" />
                            </div>
                            <div>
                                <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={form.lastName} onChange={set("lastName")} required placeholder="e.g. Sharma" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                                <select className={inputCls} value={form.gender} onChange={set("gender")} required>
                                    <option value="">Select gender</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Family */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={13} className="text-slate-400" />
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Family Details</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Father's Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={form.fatherName} onChange={set("fatherName")} required placeholder="Father's full name" />
                            </div>
                            <div>
                                <label className={labelCls}>Mother's Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={form.motherName} onChange={set("motherName")} required placeholder="Mother's full name" />
                            </div>
                        </div>
                    </section>

                    {/* Contact */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Phone size={13} className="text-slate-400" />
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={form.phone} onChange={set("phone")} required
                                    placeholder="10-digit number" maxLength={10} pattern="\d{10}" inputMode="numeric" />
                            </div>
                            <div>
                                <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                                <input className={inputCls} type="email" value={form.email} onChange={set("email")} required placeholder="student@example.com" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className={labelCls}><MapPin size={12} className="inline mr-1 text-slate-400" />Address <span className="text-red-500">*</span></label>
                            <textarea className={`${inputCls} resize-none`} rows={2} value={form.address} onChange={set("address")} required placeholder="Full residential address" />
                        </div>
                    </section>

                    {/* Account */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Lock size={13} className="text-slate-400" />
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Account Password</p>
                        </div>
                        <div className="max-w-sm">
                            <label className={labelCls}>Password <span className="text-red-500">*</span></label>
                            <input className={inputCls} type="password" value={form.password} onChange={set("password")}
                                required minLength={8} placeholder="Min 8 characters" />
                            <p className="text-xs text-slate-400 mt-1">Student will use this to log in to their portal.</p>
                        </div>
                    </section>

                    {/* Medical & Notes */}
                    <section>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Additional Info</p>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition select-none">
                                <input type="checkbox" checked={form.disability} onChange={set("disability")}
                                    className="w-4 h-4 rounded accent-indigo-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Has Disability</p>
                                    <p className="text-xs text-slate-400">Check if the student has a disability</p>
                                </div>
                            </label>
                            {form.disability && (
                                <div>
                                    <label className={labelCls}>Disability Description</label>
                                    <input className={inputCls} value={form.disabilityDescription} onChange={set("disabilityDescription")}
                                        placeholder="Describe the disability" />
                                </div>
                            )}
                            <div>
                                <label className={labelCls}>Comments / Notes</label>
                                <textarea className={`${inputCls} resize-none`} rows={2} value={form.comments} onChange={set("comments")}
                                    placeholder="Any additional notes about the student" />
                            </div>
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
                            {loading ? "Creating…" : "Create Student"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewStudentModal;

