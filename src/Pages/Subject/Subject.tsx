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
  
  // Track specific subject for deletion to ensure consistency with Course page
  const [selectedSubject, setSelectedSubject] = useState<{ id: string; name: string; } | null>(null);

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
      setSubject(null);
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => {
    if (slug) fetchSubjectDetails();
  }, [slug]);

  // Open modal and set target subject
  const openDeleteModal = () => {
    if (subject) {
      setSelectedSubject({
        id: subject.id,
        name: subject.name
      });
      setIsConfirmOpen(true);
    }
  };

  // Perform deletion using the selectedSubject state
  const handleDelete = async () => {
    if (!selectedSubject) return;

    try {
      await api.deleteSubject(selectedSubject.id); 
      setIsConfirmOpen(false);
      setSelectedSubject(null);
      showMessage("success", `${selectedSubject.name} deleted successfully`);
      navigate('/subject-Home'); 
    } catch (error) {
      showMessage("error", "Failed to delete subject");
      setIsConfirmOpen(false);
      setSelectedSubject(null);
    }
  };

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-emerald-600" size={32} /></div>;

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      
      {/* Delete Confirmation Modal */}
      {isConfirmOpen && selectedSubject && (
        <ConfirmModal
          title="Delete Subject"
          message={`Are you sure you want to delete ${selectedSubject.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => {
            setIsConfirmOpen(false);
            setSelectedSubject(null);
          }}
        />
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <button onClick={() => navigate('/subject-Home')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition mb-4">
            <ArrowLeft size={20} /> <span className="font-medium">Back to Subjects</span>
          </button>
          <h1 className="text-3xl font-bold text-slate-900">{subject?.name || "Subject Details"}</h1>
          <p className="text-slate-500">Subject details and configuration</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchSubjectDetails} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-2">
            <RefreshCcw size={16} /> Refresh
          </button>
          <button onClick={openDeleteModal} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 flex items-center gap-2">
            <Trash2 size={16} /> Delete Subject
          </button>
        </div>
      </header>

      {message && (
        <div className={`px-4 py-3 rounded-lg border text-sm font-medium ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <main>
        <div className="bg-white p-6 rounded-2xl shadow border border-slate-100">
          <h2 className="text-lg font-semibold border-b pb-2 mb-4">Subject Information</h2>
          {subject ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium">{subject.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Slug</p>
                <p className="font-mono text-slate-700">{subject.slug}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500">Description</p>
                <p className="text-slate-700">{subject.description || "No description provided."}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Subject not found.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Subject;