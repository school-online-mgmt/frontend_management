import { useState, useEffect } from "react";
import { Plus, BookOpen, RefreshCcw } from "lucide-react";
import api from "../../api/api";
import CreateCourse from "../../components/Courses/CreateCourse.tsx";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";

const CourseHome = () => {

    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

    const navigate = useNavigate();

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            const data = await api.getCourses();
            setCourses(Array.isArray(data) ? data : []);
        } catch (error) {

            setCourses([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    return (
        <div className="min-h-full bg-slate-50">
            {isCreateModalOpen && (
                <CreateCourse
                    onClose={() => setIsCreateModalOpen(false)}
                    onRefresh={fetchCourses}
                    setMessage={setMessage}
                    setMessageType={setMessageType}
                />
            )}

            {message && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-xl shadow-lg text-sm font-medium border ${
                    messageType === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                }`}>
                    {message}
                </div>
            )}

            <PageHeader
                icon={BookOpen}
                title="Course Management"
                subtitle="Create, view and manage courses"
                actions={
                    <div className="flex gap-2">
                        <button onClick={fetchCourses} disabled={isLoading}
                            className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl flex items-center gap-2 text-sm hover:bg-white/20 transition backdrop-blur-sm">
                            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-white/15 border border-white/25 text-white rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-white/25 transition backdrop-blur-sm">
                            <Plus size={18} /> Create Course
                        </button>
                    </div>
                }
            />
            <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">

            <main>
                <div className="bg-white p-4 rounded-2xl shadow border border-slate-100">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-700">
                            All Courses
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                            <tr className="border-b border-slate-100">
                                <th className="p-4 text-sm font-semibold uppercase">
                                    Slug
                                </th>
                                <th className="p-4 text-sm font-semibold uppercase">
                                    Course Name
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">

                            {isLoading ? (
                                <tr>
                                    <td colSpan={2} className="text-center p-16 text-slate-500">
                                        <RefreshCcw size={18} className="animate-spin inline mr-2" />
                                        Loading courses...
                                    </td>
                                </tr>
                            ) : courses.length > 0 ? (

                                courses.map((course: any) => (
                                    <tr
                                        key={course.id}
                                        onClick={() => navigate(`/course/${course.id}`)}
                                        className="hover:bg-slate-50 cursor-pointer transition"
                                    >
                                        <td className="p-4 font-mono text-slate-500">
                                            #{course.slug}
                                        </td>
                                        <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <BookOpen size={20} />
                                            </div>

                                            {course.name}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="text-center p-16 text-slate-500">
                                        No courses found
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            </div>
        </div>
    );
};

export default CourseHome;
