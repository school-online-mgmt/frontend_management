import { useEffect, useState } from "react";
import { RefreshCcw, Layers } from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../../api/api";
import AddSectionModal from "../../components/Classes/AddSectionModal";
import BackButton from "../../components/common/BackButton.tsx";
import CoursesSection from "../../components/Classes/CoursesSection.tsx";

const ClassDetails = () => {

    const { classId } = useParams() as { classId: string };

    const [classData, setClassData] = useState<any>(null);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    useEffect(() => {

        if (!message) return;

        const timer = setTimeout(() => {
            setMessage(null);
        }, 4000);

        return () => clearTimeout(timer);

    }, [message]);

    const fetchClass = async () => {

        setIsLoading(true);

        try {

            const data = await api.getClassById(classId);
            setClassData(data.classData);

        } finally {

            setIsLoading(false);

        }
    };

    useEffect(() => {
        fetchClass();
    }, []);
    if (!classData) return null;

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">

            {message && (
                <div
                    className={`p-3 rounded-lg text-sm ${
                        message.type === "success"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                    }`}
                >
                    {message.text}
                </div>
            )}

            {showSectionModal && (
                <AddSectionModal
                    classId={classId}
                    onClose={() => setShowSectionModal(false)}
                    onSuccess={(msg: any) => {
                        setMessage(msg);
                        fetchClass();
                    }}
                />
            )}

            {/* HEADER */}
            <div className="flex items-center gap-2">
                <BackButton />
            </div>
            <header className="flex justify-between items-end mb-6">

                <div>
                    <h1 className="text-3xl font-bold">
                        {classData.name}
                    </h1>

                    <p className="text-slate-500">
                        Class details and course structure
                    </p>
                </div>

                <button
                    onClick={fetchClass}
                    className="px-3 py-1.5 border rounded-xl flex items-center gap-2"
                >
                    <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                    Refresh
                </button>

            </header>

            {/* CLASS INFO */}

            <div className="bg-white rounded-2xl shadow border p-6">

                <h2 className="text-lg font-bold mb-4">Class Information</h2>

                <div className="grid grid-cols-2 gap-6 text-sm">

                    <div>
                        <p className="text-slate-500">Slug</p>
                        <p className="font-mono">#{classData.slug}</p>
                    </div>

                    <div>
                        <p className="text-slate-500">Created</p>
                        <p>{new Date(classData.createdAt).toLocaleDateString()}</p>
                    </div>

                </div>

            </div>

            {/* SECTIONS */}

            <div className="bg-white rounded-2xl shadow border">

                <div className="flex justify-between items-center p-4 border-b">

                    <h2 className="font-bold">Sections</h2>

                    <button
                        onClick={() => setShowSectionModal(true)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg"
                    >
                        Add Section
                    </button>

                </div>

                <table className="w-full text-left">

                    <tbody>

                    {classData.sections.map((section: any) => (

                        <tr
                            key={section.id}
                            className="hover:bg-slate-50 cursor-pointer"
                        >

                            <td className="p-4 font-mono">
                                #{section.slug}
                            </td>

                            <td className="p-4 flex items-center justify-between">

                                <div className="flex gap-3 items-center">

                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                        <Layers size={18} />
                                    </div>

                                    {section.name}

                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* COURSES */}
            <CoursesSection courses={classData.courses} />

        </div>
    );
};

export default ClassDetails;