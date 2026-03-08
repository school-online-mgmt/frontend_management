import React, { useState } from 'react';
import { Lock, Phone, Eye, EyeOff, Loader2, CheckCircle, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.ts';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setIsSuccess(false);

    try {
      const res = await api.login(phone, password);
      if (res.user.id){
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }else{
        setError("Invalid credentials or server error.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials or server error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-slate-900 p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000"></div>
      
      <div className="w-full max-w-md z-10 transform transition-all duration-500">
        <div className="bg-slate-800/50 border border-slate-700/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl shadow-black/20">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 mb-4">
              <School className="text-emerald-400" size={28} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-slate-400 mt-2">Sign in to manage your school.</p>
          </div>

          {isSuccess && (
            <div className="flex items-center justify-center gap-3 bg-emerald-500/10 text-emerald-300 p-4 rounded-xl mb-6 border border-emerald-500/20">
              <CheckCircle size={20} />
              <span className="font-medium">Login successful! Redirecting...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-4 mb-6 text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                <input 
                  type="tel" 
                  placeholder="Enter your phone number" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                />
              </div>
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                />
                <button 
                  type="button" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={isLoading || isSuccess}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
