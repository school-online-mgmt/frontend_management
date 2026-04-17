import React, { useState } from 'react';
import { Lock, Phone, Eye, EyeOff, Loader2, CheckCircle, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.ts';
import { useToast } from '../context/ToastContext';
import { useAuthContext } from '../context/AuthContext';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { refresh } = useAuthContext();

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await api.login(phone, password);
      if (res.user?.id) {
        setIsSuccess(true);
        addToast(`Welcome back, ${res.user.name || 'Admin'}!`, 'success');
        await refresh();
        navigate('/dashboard');
      } else {
        addToast('Invalid credentials', 'error');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Invalid credentials or server error.";
      addToast(message, 'error');
      setErrors({ password: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-slate-900 p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
      
      <div className="w-full max-w-md z-10 transform transition-all duration-500">
        <div className="bg-slate-800/50 border border-slate-700/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl shadow-black/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 mb-4">
              <School className="text-emerald-400" size={28} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-slate-400 mt-2 text-sm">Sign in to manage your school</p>
          </div>

          {isSuccess && (
            <div className="flex items-center justify-center gap-3 bg-emerald-500/10 text-emerald-300 p-4 rounded-xl mb-6 border border-emerald-500/20 animate-in fade-in">
              <CheckCircle size={20} />
              <span className="font-medium">Login successful! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone Input */}
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                <input 
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter your 10-digit phone number"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setPhone(digits);
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                  }}
                  disabled={isLoading || isSuccess}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500 transition-all outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.phone ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
              </div>
              {errors.phone && <p className="text-red-400 text-xs mt-2 font-medium">{errors.phone}</p>}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  disabled={isLoading || isSuccess}
                  className={`w-full pl-11 pr-12 py-3 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500 transition-all outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                <button 
                  type="button" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50" 
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isSuccess}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-2 font-medium">{errors.password}</p>}
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 disabled:hover:translate-y-0"
              disabled={isLoading || isSuccess}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            Default credentials are set during school setup
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
