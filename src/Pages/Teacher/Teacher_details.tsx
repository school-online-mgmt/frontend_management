import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, User, GraduationCap, BookOpen, Layers } from 'lucide-react';
import api from '../../api/api.ts';

const TeacherDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [teacher, setTeacher] = useState<any>(null);
    const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssignedSubjects = async (teacherId: string) => {
        try {
            const data = await api.getTeacherSubjects(teacherId);
            setAssignedSubjects(Array.isArray(data) ? data : data?.subjects || []);
        } catch (err) {
            console.error("Error fetching assigned subjects", err);
        }
    };

    const fetchTeacherDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getTeacherById(id!);
            const teacher = data?.teacher || data;
            setTeacher(teacher);
            await fetchAssignedSubjects(teacher.id);
        } catch (err) {
            setError("Failed to load teacher details");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchTeacherDetails();
    }, [id]);

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" size={32} /></div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
    if (!teacher) return <div className="p-10 text-center text-slate-500">Teacher not found.</div>;

    return (
        <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8">
            <header>
                <button
                    onClick={() => navigate("/teacher-home")}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition mb-6"
                >
                    <ArrowLeft size={20} /> <span className="font-medium">Back to Teachers</span>
                </button>

                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <User size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{teacher.name}</h1>
                        <p className="text-slate-500">Faculty Member Profile</p>
                    </div>
                </div>
            </header>

            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Full Name</p>
                        <p className="font-semibold text-slate-800">{teacher.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Gender</p>
                        <p className="font-semibold text-slate-800 capitalize">{teacher.gender}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Age</p>
                        <p className="font-semibold text-slate-800">{teacher.age} Years</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                            <GraduationCap size={16} /> Qualification
                        </p>
                        <p className="font-semibold text-slate-800">{teacher.qualification}</p>
                    </div>
                </div>
            </div>

            {/* Assigned Subjects */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Assigned Subjects</h2>
                    <p className="text-sm text-slate-500 mt-1">Subjects and sections assigned to this teacher</p>
                </div>

                <div className="divide-y divide-slate-100">
                    {assignedSubjects.length === 0 ? (
                        <p className="p-8 text-center text-slate-500">No subjects assigned yet.</p>
                    ) : (
                        assignedSubjects.map((st: any) => (
                            <div key={st.subjectTeachers?.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Subject */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{st.subjects?.name}</p>
                                        <p className="text-xs text-slate-400 font-mono">#{st.subjects?.slug}</p>
                                    </div>
                                </div>

                                {/* Section */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                                    <Layers size={14} className="text-slate-400" />
                                    <span className="text-sm text-slate-600">{st.sections?.name}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherDetails;