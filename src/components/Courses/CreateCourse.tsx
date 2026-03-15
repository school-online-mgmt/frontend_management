import {useEffect, useState} from "react";
import api from "../../api/api.ts";

const CreateCourse = ({
      onClose, onRefresh, setMessage, setMessageType }: any) => {

    const [slug, setSlug] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [classId, setClassId] = useState("");
    const [classes, setClasses] =useState<any[]>([]);
    const [sessionId, setSessionId] = useState("");
    const [sessions, setSessions] = useState<any[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchSessions = async () => {
        try {
            const data = await api.getSessions();
            setSessions(data || []);
        } catch (error) {
            console.error("Failed to load sessions", error);
        }
    };

    const fetchClasses = async () => {
        try {
            const data = await api.getClasses();
            setClasses(data.classes || []);
        } catch (error) {
            console.error("Failed to load classes", error);
        }
    };

    useEffect(() => {
        fetchClasses();
        fetchSessions();
    }, []);

    const handleSubmit = async () => {

        if (!slug || !name || !classId || !sessionId) {
            setMessage("Slug, Name, Class and Session are required");
            setMessageType("error");
            return;
        }

        try {
            setIsSubmitting(true);
            await api.createCourse({slug, name, description, classId, sessionId});

            setMessage(`Course ${name} created successfully`);
            setMessageType("success");

            onRefresh();
            onClose();
        } catch (error: any) {
            setMessage(error?.response?.data?.message || "Failed to create course");
            setMessageType("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 flex justify-center items-center"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-[500px] p-6 space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                        Create Course
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500"
                    >
                        ✕
                    </button>
                </div>

                {/*Course Slug*/}
                <div className="space-y-3">
                    <input
                        placeholder="Course Slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    />

                    {/*Course Name*/}
                    <input
                        placeholder="Course Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    />

                    {/*Session (Academic year)*/}
                    <select
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    >
                        <option value="">Select Session</option>

                        {sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {session.name}
                            </option>
                        ))}
                    </select>

                    {/*Class*/}
                    <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    >
                        <option value="">Select Class</option>

                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name}
                            </option>
                        ))}
                    </select>

                    {/*Course Description*/}
                    <textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 rounded-lg"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
                    >
                        {isSubmitting ? "Creating..." : "Create Course"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateCourse;