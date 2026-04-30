import { useState } from 'react';
import {
  GraduationCap, Phone, Mail, MapPin, User, BookOpen,
  Briefcase, MessageSquare, CheckCircle2, AlertTriangle, Loader2, School,
} from 'lucide-react';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_HOST,
  headers: { 'Content-Type': 'application/json' },
});

const inp = 'w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400 bg-white transition-colors placeholder:text-slate-300';
const lbl = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5';

interface FormState {
  name: string;
  gender: string;
  age: string;
  qualification: string;
  experienceYears: string;
  phone: string;
  email: string;
  address: string;
  subjectsInterested: string;
  message: string;
}

const INITIAL: FormState = {
  name: '', gender: '', age: '', qualification: '',
  experienceYears: '', phone: '', email: '',
  address: '', subjectsInterested: '', message: '',
};

const TeacherApply = () => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (f: keyof FormState, v: string) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError('Full name is required.'); return; }
    if (!form.gender)      { setError('Gender is required.'); return; }
    if (!form.qualification.trim()) { setError('Qualification is required.'); return; }
    if (!/^\d{10}$/.test(form.phone)) { setError('Phone number must be exactly 10 digits.'); return; }

    setSubmitting(true);
    try {
      await apiClient.post('/teacher/admission', {
        name:               form.name.trim(),
        gender:             form.gender,
        age:                form.age ? parseInt(form.age) : undefined,
        qualification:      form.qualification.trim(),
        experienceYears:    form.experienceYears ? parseInt(form.experienceYears) : undefined,
        phone:              form.phone.trim(),
        email:              form.email.trim() || undefined,
        address:            form.address.trim() || undefined,
        subjectsInterested: form.subjectsInterested.trim() || undefined,
        message:            form.message.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={38} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Thank you for applying. The school management team will review your application and contact you soon.
          </p>
          <button
            onClick={() => { setForm(INITIAL); setSuccess(false); }}
            className="mt-8 px-6 py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors"
          >
            Submit another application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20">
              <School size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-0.5">Teacher Recruitment</p>
              <h1 className="text-2xl font-black">Apply for a Teaching Position</h1>
            </div>
          </div>
          <p className="text-white/70 text-sm leading-relaxed max-w-lg">
            Fill in the form below to submit your job application. The school team will review it and reach out to you.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 space-y-6">

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Personal info */}
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4">
                <User size={15} className="text-violet-500" /> Personal Information
              </p>
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Full Name <span className="text-red-400">*</span></label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Anjali Sharma" className={inp} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Gender <span className="text-red-400">*</span></label>
                    <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Age</label>
                    <input type="number" value={form.age} min={18} max={70}
                      onChange={e => set('age', e.target.value)}
                      placeholder="e.g. 28" className={inp} />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Qualifications */}
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4">
                <GraduationCap size={15} className="text-violet-500" /> Qualifications
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={lbl}>Highest Qualification <span className="text-red-400">*</span></label>
                  <input value={form.qualification} onChange={e => set('qualification', e.target.value)}
                    placeholder="e.g. B.Ed, M.Sc Mathematics" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Experience (years)</label>
                  <input type="number" value={form.experienceYears} min={0}
                    onChange={e => set('experienceYears', e.target.value)}
                    placeholder="e.g. 3" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Subjects Interested In</label>
                  <input value={form.subjectsInterested}
                    onChange={e => set('subjectsInterested', e.target.value)}
                    placeholder="e.g. Maths, Physics" className={inp} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Contact */}
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4">
                <Phone size={15} className="text-violet-500" /> Contact Details
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Phone Number <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit number" className={inp + ' pl-9'} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        placeholder="your@email.com" className={inp + ' pl-9'} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Address</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <textarea value={form.address} onChange={e => set('address', e.target.value)}
                      rows={2} placeholder="Current residential address"
                      className={inp + ' pl-9 resize-none'} />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Message */}
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4">
                <MessageSquare size={15} className="text-violet-500" /> Cover Message
                <span className="text-xs font-normal text-slate-400 normal-case">(optional)</span>
              </p>
              <textarea value={form.message} onChange={e => set('message', e.target.value)}
                rows={4} placeholder="Introduce yourself, share why you'd like to teach here, or mention anything relevant…"
                className={inp + ' resize-none'} />
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Briefcase size={12} />
              <span>Your information will be reviewed by the school management team.</span>
            </div>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2.5 px-7 py-3 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-violet-200 shrink-0">
              {submitting ? (
                <><Loader2 size={15} className="animate-spin" /> Submitting…</>
              ) : (
                <><BookOpen size={15} /> Submit Application</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherApply;
