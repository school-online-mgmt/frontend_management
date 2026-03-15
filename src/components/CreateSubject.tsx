import React, { useState, useEffect } from 'react';
import api from '../api/api.ts';

interface CreateSubjectProps {
  onClose: () => void;
  onRefresh: () => void;
}

const CreateSubject: React.FC<CreateSubjectProps> = ({ onClose, onRefresh }) => {
  const [subjectData, setSubjectData] = useState({ name: '', slug: '', bookName: '', sessionId: '' });
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const data = await api.getSessions();
        setSessions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching sessions", error);
      }
    };
    fetchDropdowns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createSubject(subjectData);
      onRefresh();
      onClose();
    } catch (err) { alert("Failed to create subject."); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white text-2xl font-bold mb-6 text-center">Add New Subject</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
            placeholder="Name"
            value={subjectData.name}
            onChange={(e) => setSubjectData({...subjectData, name: e.target.value})}
            required
          />
          <div className="flex gap-4">
            <input className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Slug" value={subjectData.slug} onChange={(e) => setSubjectData({...subjectData, slug: e.target.value})} required />
            <input className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Book Name" value={subjectData.bookName} onChange={(e) => setSubjectData({...subjectData, bookName: e.target.value})} />
          </div>

          {/* Session Dropdown */}
          <select
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
            value={subjectData.sessionId}
            onChange={(e) => setSubjectData({...subjectData, sessionId: e.target.value})}
            required
          >
            <option value="" disabled>Select a Session</option>
            {sessions.map((session: any) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>

          <div className="flex gap-4 pt-4">
            <button type="button" className="flex-1 py-3 bg-slate-800 text-white rounded-lg" onClick={onClose}>Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Confirm Creation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubject;