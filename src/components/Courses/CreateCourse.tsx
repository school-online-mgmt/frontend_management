import { useState } from "react";
import api from "../../api/api.ts";

const CreateCourse = ({ onClose, onRefresh }: any) => {

    const [slug, setSlug] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [classId, setClassId] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!slug || !name) {
            alert("Slug and Name are required");
            return;
        }
        try {
            setIsSubmitting(true);
            await api.createCourse({ slug, name, description, classId });
            onRefresh();
            onClose();
        } catch (error: any) {
            alert(error?.response?.data?.message || "Failed to create course");
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

                <div className="space-y-3">
                    <input
                        placeholder="Course Slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    />
                    <input
                        placeholder="Course Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    />
                    <input
                        placeholder="Class Name"
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg"
                    />
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