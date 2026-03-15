import { useEffect, useState } from "react";
import { Plus, RefreshCcw, School } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import CreateClassModal from "../../components/Classes/CreateClassModal";

const ClassHome = () => {

    const navigate = useNavigate();

    const [classes, setClasses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
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

    const fetchClasses = async () => {

        setIsLoading(true);

        try {
            const data = await api.getClasses();
            setClasses(data.classes || []);
        } catch (err) {
            console.error(err);
            setClasses([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">


            {showCreateModal && (
                <CreateClassModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(msg: any) => {
                        setMessage(msg);
                        fetchClasses();
                    }}
                />
            )}

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
            <header className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Class Management
                    </h1>

                    <p className="text-slate-500 mt-2">
                        Create and manage classes
                    </p>
                </div>

                <div className="flex gap-3">

                    <button
                        onClick={fetchClasses}
                        className="px-3 py-1.5 border border-slate-200 rounded-xl flex items-center gap-2"
                    >
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Class
                    </button>

                </div>

            </header>

            <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">

                <table className="w-full text-left">

                    <thead>
                    <tr className="border-b border-slate-100">
                        <th className="p-4 text-sm font-semibold uppercase">Slug</th>
                        <th className="p-4 text-sm font-semibold uppercase">Class</th>
                    </tr>
                    </thead>

                    <tbody>

                    {classes.map(cls => (

                        <tr
                            key={cls.id}
                            onClick={() => navigate(`/class/${cls.id}`)}
                            className="hover:bg-slate-50 cursor-pointer"
                        >

                            <td className="p-4 font-mono text-slate-500">
                                #{cls.slug}
                            </td>

                            <td className="p-4 flex items-center gap-3">

                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <School size={18} />
                                </div>

                                {cls.name}

                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClassHome;