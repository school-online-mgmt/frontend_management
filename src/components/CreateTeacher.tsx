import React, { useState } from 'react';
import api from '../api/api';
import { User, Phone, GraduationCap, MapPin, Mail, Calendar, UserPlus, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface CreateTeacherProps {
  onClose: () => void;
  onRefresh: () => void;
}

const CreateTeacher: React.FC<CreateTeacherProps> = ({ onClose, onRefresh }) => {
  const [teacherData, setTeacherData] = useState({ 
    name: '', 
    gender: '', 
    age: '', 
    qualification: '',
    phone: '',
    email: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.createTeacherEntry({
        ...teacherData,
        age: Number.parseInt(teacherData.age)
      });
      onRefresh();
      onClose();
    } catch (err: any) { 
      setError(err?.response?.data?.message || "Failed to create teacher. Please check all mandatory fields."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-50 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <button data-testid="create-teacher-close-btn" onClick={onClose} className="absolute -top-2 -right-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
              <UserPlus size={28} />
            </div>
            <h3 className="text-slate-900 text-2xl font-black tracking-tight">Onboard New Teacher</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Fill in the mandatory details to create faculty account</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in fade-in zoom-in duration-300">
               <XCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="create-teacher-form">
            <div className="relative group">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                data-testid="teacher-name-input"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
                placeholder="Full Name *"
                value={teacherData.name}
                onChange={(e) => setTeacherData({...teacherData, name: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                <select 
                  data-testid="teacher-gender-select"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                  value={teacherData.gender}
                  onChange={(e) => setTeacherData({...teacherData, gender: e.target.value})}
                  required
                >
                  <option value="" disabled>Gender *</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="relative group">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  data-testid="teacher-age-input"
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400" 
                  placeholder="Age *" 
                  min="18"
                  max="100"
                  value={teacherData.age} 
                  onChange={(e) => setTeacherData({...teacherData, age: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  data-testid="teacher-phone-input"
                  type="text"
                  maxLength={10}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
                  placeholder="Phone Number *"
                  value={teacherData.phone}
                  onChange={(e) => setTeacherData({...teacherData, phone: e.target.value})}
                  required
                />
              </div>

              <div className="relative group">
                <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  data-testid="teacher-qualification-input"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
                  placeholder="Qualification *"
                  value={teacherData.qualification}
                  onChange={(e) => setTeacherData({...teacherData, qualification: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="relative group">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                data-testid="teacher-email-input"
                type="email"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
                placeholder="Email Address"
                value={teacherData.email}
                onChange={(e) => setTeacherData({...teacherData, email: e.target.value})}
              />
            </div>

            <div className="relative group">
              <MapPin size={16} className="absolute left-4 top-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <textarea 
                data-testid="teacher-address-input"
                rows={2}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400 resize-none"
                placeholder="Residential Address"
                value={teacherData.address}
                onChange={(e) => setTeacherData({...teacherData, address: e.target.value})}
              />
            </div>
            
            <div className="flex gap-4 pt-4">
              <button data-testid="create-teacher-close-btn-2" 
                type="button" 
                className="flex-1 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-bold transition-all active:scale-[0.98]" 
                onClick={onClose}
              >
                Discard
              </button>
              <button 
                data-testid="teacher-submit-btn"
                type="submit"
                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2" 
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {isSubmitting ? 'Onboarding...' : 'Confirm Onboarding'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeacher;
