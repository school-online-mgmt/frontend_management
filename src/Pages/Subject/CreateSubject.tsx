import React, { useState } from 'react';
import { Save, BookOpen, User, Code } from 'lucide-react';
import api from '../../api/api.ts';

interface CreateSubjectProps {
  onClose: () => void;
  onRefresh: () => void;
}

const CreateSubject: React.FC<CreateSubjectProps> = ({ onClose, onRefresh }) => {
  const [subjectData, setSubjectData] = useState({
    name: '',
    slug: '',
    bookName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.createSubject(subjectData);
      onRefresh(); 
      onClose();   
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create subject. Please check the console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-8 shadow-2xl relative overflow-hidden transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h3 className="text-white text-2xl font-bold tracking-tight">Add New Subject</h3>
            <p className="text-slate-400 text-sm mt-1">Enter details to initialize a new course.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Subject Name</label>
              <div className="relative">
                <BookOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="e.g. Advanced Systems Programming"
                  required
                  value={subjectData.name}
                  onChange={(e) => setSubjectData({...subjectData, name: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Subject Slug</label>
                <div className="relative">
                  <Code size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="e.g., CS101"
                    required
                    value={subjectData.slug}
                    onChange={(e) => setSubjectData({...subjectData, slug: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Book Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="e.g., Dr. Alan Turing"
                    value={subjectData.bookName}
                    onChange={(e) => setSubjectData({...subjectData, bookName: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button type="button" className="flex-1 py-3.5 bg-slate-800/80 text-slate-300 rounded-xl font-semibold hover:bg-slate-700/80 transition-colors" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 flex justify-center items-center gap-2" disabled={isSubmitting}>
                <Save size={18} />
                <span>{isSubmitting ? 'Saving...' : 'Confirm & Create'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSubject;
