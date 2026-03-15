import { useState, useEffect } from "react";
import { Plus, User, RefreshCcw, GraduationCap, Users } from "lucide-react";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import CreateTeacher from "../../components/CreateTeacher";

const TeacherHome = () => {
    const [teachers, setTeachers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const navigate = useNavigate();

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getTeachers();
            setTeachers(Array.isArray(data) ? data : data?.teachers || []);
        } catch (error) {
            console.error("Error fetching teachers", error);
            setTeachers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
            {isCreateModalOpen && (
                <CreateTeacher
                    onClose={() => setIsCreateModalOpen(false)}
                    onRefresh={fetchTeachers}
                />
            )}

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Teacher Management
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Register, view and manage faculty members
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchTeachers}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                        <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 flex items-center gap-2 transition"
                    >
                        <Plus size={18} />
                        Add Teacher
                    </button>
                </div>
            </header>

            <main>
                <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <Users size={20} className="text-slate-400" />
                            All Teachers
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500">Teacher Name</th>
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500">Gender</th>
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500">Age</th>
                                    <th className="p-4 text-sm font-semibold uppercase text-slate-500 text-right">Qualification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center p-16 text-slate-500">
                                            <RefreshCcw size={18} className="animate-spin inline mr-2" />
                                            Loading teachers...
                                        </td>
                                    </tr>
                                ) : teachers.length > 0 ? (
                                    teachers.map((teacher: any) => (
                                        <tr
                                            key={teacher.id}
                                            onClick={() => navigate(`/teacher/${teacher.id}`)}
                                            className="hover:bg-slate-50 cursor-pointer transition"
                                        >
                                            <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                    <User size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{teacher.name}</span>
                                                    <span className="text-xs font-mono text-slate-400 font-normal">
                                                        {teacher.id.split('-')[0]}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {teacher.gender}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {teacher.age}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                                                    <GraduationCap size={14} />
                                                    {teacher.qualification}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center p-16 text-slate-500">
                                            No teachers registered yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherHome;