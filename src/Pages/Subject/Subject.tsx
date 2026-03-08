import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, RefreshCcw } from 'lucide-react';
import api from '../../api/api.ts';
import ConfirmModal from '../../components/common/ConfirmModal.tsx';

const Subject = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [subject, setSubject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Derived state to check if subject is in use
    const isUsedInCourses = subject?.courseSubjects?.length > 0;

    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 2500);
    };

    const fetchSubjectDetails = async () => {
        setIsLoading(true);
        try {
            const data = await api.getSubjectById(slug!);
            setSubject(data);
        } catch (error) {
            showMessage("error", "Failed to load subject details");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (slug) fetchSubjectDetails();
    }, [slug]);

    const confirmDelete = async () => {
        if (!subject) return;

        try {
            await api.deleteSubject(subject.id); 
            setIsConfirmOpen(false);
            showMessage("success", `${subject.name} deleted successfully`);
            navigate('/subject-Home');
        } catch (error) {
            showMessage("error", "Failed to delete subject");
            setIsConfirmOpen(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" size={32} /></div>;

    return (
        <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
            {isConfirmOpen && (
                <ConfirmModal
                    title="Delete Subject"
                    message={`Are you sure you want to delete ${subject?.name}? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={confirmDelete}
                    onCancel={() => setIsConfirmOpen(false)}
                />
            )}

            <header className="flex justify-between items-end">
                <div>
                    <button onClick={() => navigate("/subject-Home")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition">
                        <ArrowLeft size={20} /> <span className="font-medium">Back to Subjects</span>
                    </button>
                    <h1 className="text-3xl font-bold mt-4">{subject?.name}</h1>
                    <p className="text-slate-500">Subject details and configuration</p>
                </div>
                
                {/* Delete Button with conditional logic */}
                <button 
                    onClick={() => setIsConfirmOpen(true)} 
                    disabled={isUsedInCourses}
                    className={`px-3 py-1.5 border rounded-xl flex items-center gap-2 transition ${
                        isUsedInCourses 
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                            : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                    }`}
                >
                    <Trash2 size={16} /> 
                    {isUsedInCourses ? "Subject in use" : "Delete Subject"}
                </button>
            </header>

            {message && (
                <div className={`px-4 py-3 rounded-lg border text-sm font-medium ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Subject Information</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-slate-500">Name</p>
                        <p className="font-medium">{subject.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Slug</p>
                        <p className="font-mono text-slate-700">{subject.slug}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100">
                <div className="p-4 border-b font-semibold">Courses containing this subject</div>
                <div className="divide-y">
                    {subject.courseSubjects?.length === 0 ? (
                        <p className="p-6 text-slate-500">Not assigned to any courses.</p>
                    ) : (
                        subject.courseSubjects?.map((cs: any) => (
                            <div key={cs.course.id} className="flex justify-between items-center p-4">
                                <span className="font-medium">{cs.course.name}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Subject;