import React, { useState, useEffect } from 'react';
import { X, BookOpen, Loader2 } from 'lucide-react';
import api from '../api/api.ts';

interface CreateSubjectProps {
  onClose: () => void;
  onRefresh: () => void;
}

const SUBJECT_TYPES = [
  { value: 'CORE', label: 'Core' },
  { value: 'ELECTIVE', label: 'Elective' },
  { value: 'LAB', label: 'Lab' },
  { value: 'LANGUAGE', label: 'Language' },
  { value: 'MATHEMATICS', label: 'Mathematics' },
  { value: 'ARTS', label: 'Arts' },
];

const CreateSubject: React.FC<CreateSubjectProps> = ({ onClose, onRefresh }) => {
  const [subjectData, setSubjectData] = useState({ name: '', slug: '', bookName: '', sessionId: '', type: 'CORE', teacherId: '' });
  const [sessions, setSessions] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [sessData, teachData] = await Promise.all([
          api.getSessions(),
          api.getTeachers(),
        ]);
        setSessions(Array.isArray(sessData) ? sessData : []);
        const tList = Array.isArray(teachData) ? teachData : teachData?.teachers ?? [];
        setTeachers(tList.filter((t: any) => t.isActive !== false));
      } catch { /* ignore */ }
    };
    fetchDropdowns();
  }, []);

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleNameChange = (name: string) => {
    setSubjectData(prev => ({
      ...prev,
      name,
      slug: prev.slug === autoSlug(prev.name) || !prev.slug ? autoSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const payload: any = { ...subjectData };
      if (!payload.teacherId) delete payload.teacherId;
      await api.createSubject(payload);
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <BookOpen size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Create New Subject</h3>
              <p className="text-xs text-slate-500">Add a subject to the curriculum</p>
            </div>
          </div>
          <button data-testid="create-subject-close-btn" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" data-testid="create-subject-form">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Subject Name <span className="text-red-500">*</span></label>
            <input
              data-testid="subject-name-input"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
              placeholder="e.g. Mathematics, English Literature"
              value={subjectData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Slug <span className="text-red-500">*</span></label>
              <input
                data-testid="subject-slug-input"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent font-mono bg-white"
                placeholder="mathematics"
                value={subjectData.slug}
                onChange={(e) => setSubjectData({ ...subjectData, slug: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Type <span className="text-red-500">*</span></label>
              <select
                data-testid="subject-type-select"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
                value={subjectData.type}
                onChange={(e) => setSubjectData({ ...subjectData, type: e.target.value })}
              >
                {SUBJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Textbook Name <span className="text-red-500">*</span></label>
            <input
              data-testid="subject-book-input"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
              placeholder="e.g. NCERT Mathematics Class 10"
              value={subjectData.bookName}
              onChange={(e) => setSubjectData({ ...subjectData, bookName: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Session <span className="text-red-500">*</span></label>
            <select
              data-testid="subject-session-select"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
              value={subjectData.sessionId}
              onChange={(e) => setSubjectData({ ...subjectData, sessionId: e.target.value })}
              required
            >
              <option value="" disabled>Select academic session</option>
              {sessions.map((session: any) => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Subject Incharge (Teacher)</label>
            <select
              data-testid="subject-teacher-select"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
              value={subjectData.teacherId}
              onChange={(e) => setSubjectData({ ...subjectData, teacherId: e.target.value })}
            >
              <option value="">No incharge (assign later)</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}{t.qualification ? ` — ${t.qualification}` : ''}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">The incharge oversees this subject but doesn't teach specific sections.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button data-testid="create-subject-close-btn-2" type="button" className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors" onClick={onClose}>
              Cancel
            </button>
            <button data-testid="subject-submit-btn" type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubject;

