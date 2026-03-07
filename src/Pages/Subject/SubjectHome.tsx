import { useState, useEffect } from 'react';
import { Plus, BookOpen, Search, Trash2, RefreshCcw, MoreHorizontal, ArrowRight } from 'lucide-react';
import api from '../../api/api.ts';
import CreateSubject from '../../components/CreateSubject.tsx';

const SubjectPage = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSubjects();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleGetById = async () => {
    if (!searchId) {
      fetchSubjects();
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.getSubjectById(searchId);
      setSubjects(data ? [data] : []); 
    } catch (error) {
      alert("Subject not found");
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      try {
        await api.deleteSubject(id);
        await fetchSubjects();
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete. This subject might be assigned to active courses.");
      }
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {isModalOpen && (
        <CreateSubject 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchSubjects} 
        />
      )}
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Subject Management</h1>
          <p className="text-slate-500 mt-2 text-lg">Create, view, and manage all course subjects.</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
            onClick={fetchSubjects}
            disabled={isLoading}
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            Create Subject
          </button>
        </div>
      </header>

      <main>
        <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-700">All Subjects</h2>
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                  type="number" 
                  placeholder="Search by Subject ID..." 
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGetById()}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <button className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors" onClick={handleGetById}>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-slate-500 text-sm font-semibold uppercase tracking-wider">Slug</th>
                  <th className="p-4 text-slate-500 text-sm font-semibold uppercase tracking-wider">Subject Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-16 text-slate-500 font-medium">
                      <div className="flex justify-center items-center gap-3">
                        <RefreshCcw size={18} className="animate-spin" /> Loading subjects...
                      </div>
                    </td>
                  </tr>
                ) : subjects.length > 0 ? (
                  subjects.map((subject: any) => (
                    <tr key={subject.id} className="hover:bg-slate-50/50 transition-colors duration-150 group">
                      <td className="p-4 font-mono text-slate-500 font-medium">#{subject.id}</td>
                      <td className="p-4 font-semibold text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-inset ring-black/5">
                          <BookOpen size={20} />
                        </div>
                        {subject.name}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            className="p-2 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => handleDelete(subject.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                          <button className="p-2 text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-16 text-slate-500 font-medium">
                      No subjects found.
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

export default SubjectPage;
