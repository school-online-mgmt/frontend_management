import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, AlertCircle, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../api/api";

interface SchoolEvent {
    id: string;
    title: string;
    description?: string;
    type: string;
    date: string;
    endDate?: string;
    createdBy?: { firstName: string; lastName: string };
    isActive: boolean;
}

const eventTypes = [
    "HOLIDAY", "VACATION", "ACTIVITY", "PROGRAM", 
    "EXHIBITION", "SPORTS", "CULTURAL", "MEETING", "OTHER"
];

const eventTypeIcons: Record<string, string> = {
    HOLIDAY: "🏖️", VACATION: "✈️", ACTIVITY: "🎨", PROGRAM: "🎭",
    EXHIBITION: "🖼️", SPORTS: "⚽", CULTURAL: "🎵", MEETING: "👥", OTHER: "📌"
};

const EventManagement: React.FC = () => {
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "OTHER",
        date: "",
        endDate: "",
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const from = new Date(new Date().getFullYear(), 0, 1).toISOString();
            const to = new Date(new Date().getFullYear() + 1, 11, 31).toISOString();
            const data = await api.getSchoolEvents?.(from, to);
            setEvents(data?.events ?? []);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch events");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.date) {
            setError("Title and date are required");
            return;
        }

        try {
            if (editingId) {
                await api.updateSchoolEvent?.(editingId, formData);
            } else {
                await api.createSchoolEvent?.(formData);
            }
            setFormData({ title: "", description: "", type: "OTHER", date: "", endDate: "" });
            setEditingId(null);
            setShowForm(false);
            setError(null);
            fetchEvents();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save event");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            try {
                await api.deleteSchoolEvent?.(id);
                fetchEvents();
            } catch (err: any) {
                setError(err.response?.data?.message || "Failed to delete event");
            }
        }
    };

    const handleEdit = (event: SchoolEvent) => {
        setFormData({
            title: event.title,
            description: event.description || "",
            type: event.type,
            date: event.date.split("T")[0],
            endDate: event.endDate?.split("T")[0] || "",
        });
        setEditingId(event.id);
        setShowForm(true);
    };

    return (
        <div className="p-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-blue-600" size={32} />
                            <h1 className="text-4xl font-bold text-slate-900">School Events</h1>
                        </div>
                        <button
                            onClick={() => {
                                setShowForm(!showForm);
                                if (showForm) setEditingId(null);
                                setFormData({ title: "", description: "", type: "OTHER", date: "", endDate: "" });
                            }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            <Plus size={20} />
                            New Event
                        </button>
                    </div>
                </motion.div>

                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                        <p className="text-red-700">{error}</p>
                    </motion.div>
                )}

                {/* Form */}
                {showForm && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 bg-white rounded-lg border border-slate-200 p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Event Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {eventTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                placeholder="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                                    {editingId ? "Update" : "Create"} Event
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingId(null);
                                        setFormData({ title: "", description: "", type: "OTHER", date: "", endDate: "" });
                                    }}
                                    className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-400 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* Events List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-slate-400" size={40} />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                        <Calendar className="mx-auto text-slate-400 mb-3" size={40} />
                        <p className="text-slate-600">No events scheduled</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(event => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3 flex-1">
                                        <span className="text-2xl">{eventTypeIcons[event.type] || "📌"}</span>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">{event.title}</h3>
                                            <span className="inline-block text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded mt-1">
                                                {event.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {event.description && <p className="text-sm text-slate-600 line-clamp-2 mb-3">{event.description}</p>}
                                <div className="text-xs text-slate-500 space-y-1 mb-4">
                                    <p>📅 {new Date(event.date).toLocaleDateString("en-IN")}</p>
                                    {event.endDate && <p>→ {new Date(event.endDate).toLocaleDateString("en-IN")}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(event)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm font-medium"
                                    >
                                        <Edit2 size={16} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm font-medium"
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    
    export default EventManagement;

