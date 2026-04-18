import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCcw, UserPlus, Search, Filter, X,
  Users, CheckCircle, Clock, BookOpen, ChevronRight,
  Phone, Mail, UserCheck, Loader2,
} from 'lucide-react';
import api from '../../api/api';
import type { Student } from '../../api/types';
import AdmitStudentModal from '../../components/Student/AdmitStudentModal';
import PageHeader from '../../components/PageHeader';
import NewStudentModal from '../../components/Student/NewStudentModal';

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  APPLIED:     { label: 'Applied',     dot: 'bg-slate-400',   bg: 'bg-slate-100',   text: 'text-slate-600'   },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700'   },
  ACTIVE:      { label: 'Active',      dot: 'bg-emerald-500', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  REJECTED:    { label: 'Rejected',    dot: 'bg-red-500',     bg: 'bg-red-50',      text: 'text-red-700'     },
  ALUMNI:      { label: 'Alumni',      dot: 'bg-blue-500',    bg: 'bg-blue-50',     text: 'text-blue-700'    },
  GRADUATED:   { label: 'Graduated',   dot: 'bg-purple-500',  bg: 'bg-purple-50',   text: 'text-purple-700'  },
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS  = Object.keys(STATUS_CONFIG);

function getInitials(first: string, last?: string) {
  return `${first.charAt(0)}${last?.charAt(0) ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'from-indigo-400 to-indigo-600',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-sky-400 to-sky-600',
];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

const StudentsHome: React.FC = () => {
  const [students, setStudents]           = useState<Student[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAdmitModal, setShowAdmitModal]   = useState(false);
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [showFilters, setShowFilters]     = useState(false);

  // Filters
  const [search,       setSearch]         = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [genderFilter, setGenderFilter]   = useState('');

  const navigate = useNavigate();

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.getStudents();
      setStudents(Array.isArray(response) ? response : []);
    } catch { setStudents([]); }
    finally { setLoading(false); }
  };

  const handleAdmit = async (formData: any) => {
    if (!selectedStudent) return;
    await api.admitStudent(selectedStudent.id, formData);
    fetchStudents();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (genderFilter && s.gender.toLowerCase() !== genderFilter.toLowerCase()) return false;
      if (q) {
        const full = `${s.firstName} ${s.middleName ?? ''} ${s.lastName}`.toLowerCase();
        if (!full.includes(q) && !s.phone.includes(q) && !s.email.toLowerCase().includes(q) &&
            !s.fatherName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [students, search, statusFilter, genderFilter]);

  const stats = useMemo(() => ({
    total:      students.length,
    active:     students.filter(s => s.status === 'ACTIVE').length,
    inProgress: students.filter(s => s.status === 'IN_PROGRESS').length,
    other:      students.filter(s => !['ACTIVE','IN_PROGRESS'].includes(s.status)).length,
  }), [students]);

  const activeFilterCount = [statusFilter, genderFilter].filter(Boolean).length;
  const clearFilters = () => { setStatusFilter(''); setGenderFilter(''); setSearch(''); };

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm text-slate-500">Loading students…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        icon={Users}
        title="Student Management"
        gradient="from-blue-600 via-indigo-600 to-violet-600"
        subtitle="View, search and manage enrolled students"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewStudentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white text-sm font-bold rounded-xl hover:bg-white/25 active:scale-95 transition-all backdrop-blur-sm">
              <UserPlus size={16} /> New Student
            </button>
            <button onClick={fetchStudents} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-bold rounded-xl hover:bg-white/20 active:scale-95 disabled:opacity-50 transition-all backdrop-blur-sm">
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[{
            label: 'Total Students',  value: stats.total,      icon: Users,       color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Active',          value: stats.active,     icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Admission Pending', value: stats.inProgress, icon: Clock,     color: 'text-amber-600',   bg: 'bg-amber-50'   },
            { label: 'Other',           value: stats.other,      icon: BookOpen,    color: 'text-slate-500',   bg: 'bg-slate-100'  },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & filter bar */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, email, or father's name…"
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 placeholder-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Clear all */}
            {(search || activeFilterCount > 0) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">
                <X size={13} /> Clear all
              </button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Status filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setStatusFilter('')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!statusFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    All
                  </button>
                  {STATUS_OPTIONS.map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const active = statusFilter === s;
                    return (
                      <button key={s} onClick={() => setStatusFilter(active ? '' : s)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                          active ? `${cfg.bg} ${cfg.text} border-current` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? cfg.dot : 'bg-slate-300'}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gender filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setGenderFilter('')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${!genderFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    All
                  </button>
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => setGenderFilter(genderFilter === g ? '' : g)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        genderFilter === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{students.length}</span> students
          </p>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCcw size={24} className="animate-spin text-indigo-400" />
              <p className="text-sm text-slate-500">Loading students…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Users size={24} className="text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-700">No students found</p>
              <p className="text-sm text-slate-400">
                {search || activeFilterCount > 0 ? 'Try adjusting your search or filters.' : 'No students have been enrolled yet.'}
              </p>
              {(search || activeFilterCount > 0) && (
                <button onClick={clearFilters} className="mt-1 text-sm text-indigo-600 hover:underline font-medium">Clear filters</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Family</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(student => {
                    const cfg = STATUS_CONFIG[student.status] ?? STATUS_CONFIG['APPLIED'];
                    const color = avatarColor(student.firstName);
                    return (
                      <tr key={student.id}
                        onClick={() => navigate(`/student/${student.id}`)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        {/* Name + gender */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {getInitials(student.firstName, student.lastName)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 capitalize">{student.gender}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="space-y-0.5">
                            <p className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Phone size={11} className="text-slate-400 shrink-0" />{student.phone}
                            </p>
                            <p className="flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-[200px]">
                              <Mail size={11} className="text-slate-400 shrink-0" />{student.email}
                            </p>
                          </div>
                        </td>

                        {/* Family */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <p className="text-xs text-slate-600">{student.fatherName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{student.motherName}</p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {student.status === 'IN_PROGRESS' && (
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedStudent(student); setShowAdmitModal(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                <UserPlus size={13} /> Admit
                              </button>
                            )}
                            <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">
                              <UserCheck size={13} />
                              <ChevronRight size={13} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdmitModal && selectedStudent && (
        <AdmitStudentModal
          student={selectedStudent}
          onClose={() => { setShowAdmitModal(false); setSelectedStudent(null); }}
          onAdmit={handleAdmit}
        />
      )}

      {showNewStudentModal && (
        <NewStudentModal
          onClose={() => setShowNewStudentModal(false)}
          onCreated={fetchStudents}
        />
      )}
    </div>
  );
};

export default StudentsHome;
