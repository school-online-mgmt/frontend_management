import React, { useState } from 'react';
import { Lock, Phone, Eye, EyeOff, Loader2, CheckCircle, School, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/api.ts';
import { useToast } from '../context/ToastContext';
import { useAuthContext } from '../context/AuthContext';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [asSuperAdmin, setAsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; email?: string; password?: string }>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { refresh, loginDirect } = useAuthContext();

  // The super-admin support login is hidden by default; it only appears when the
  // page is opened with ?debugMode=true. Without the flag the page behaves
  // exactly like the normal management login (phone + password).
  const debugMode = searchParams.get('debugMode') === 'true';
  // Never allow the super-admin path to engage unless the flag is present.
  const superAdminActive = debugMode && asSuperAdmin;

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (superAdminActive) {
      if (!email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors.email = 'Enter a valid email';
      }
    } else if (!phone.trim()) {
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
      const res = superAdminActive
        ? await api.superAdminLogin(email.trim().toLowerCase(), password)
        : await api.login(phone, password);
      if (res.user?.id) {
        // CONFIRM the auth cookie actually works before treating login as done.
        // The login response body can succeed while the Set-Cookie is dropped
        // (blocked third-party cookies, http-vs-https, cross-site SameSite) — in
        // which case the first real data call would 401 and bounce back to
        // /login, showing a confusing "Welcome … but stuck on login". verifyAuth
        // reads the cookie, so its success means the session is truly established.
        try {
          await api.checkAuth();
        } catch {
          addToast(
            'Signed in, but your session could not be established. Please enable cookies for this site (avoid incognito / blocked third-party cookies) and try again.',
            'error',
          );
          setIsLoading(false);
          return;
        }

        loginDirect({
          id: res.user.id,
          firstName: res.user.firstName,
          lastName: res.user.lastName,
          email: res.user.email,
          phone: res.user.phone,
          role: res.user.role,
          tenantId: res.user.tenantId,
          permissions: res.user.permissions,
          // Shows the forced-change screen immediately instead of after the
          // first gated call bounces with 403.
          mustChangePassword: res.user.mustChangePassword === true,
        });
        setIsSuccess(true);
        addToast(
          res.impersonated
            ? `Signed in as ${res.user.firstName || 'Admin'} (super-admin support session).`
            : `Welcome back, ${res.user.firstName || 'Admin'}!`,
          'success',
        );
        navigate('/dashboard', { replace: true });
        // Background refresh to get full permissions
        refresh();
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

          <form onSubmit={handleLogin} className="space-y-5" data-testid="login-form">
            {superAdminActive ? (
              /* Super-admin support access → email credential */
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Super-Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                  <input
                    id="email-input"
                    data-testid="superadmin-email-input"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@edupilots.in"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    disabled={isLoading || isSuccess}
                    className={`w-full pl-11 pr-4 py-3 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500 transition-all outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                      errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-amber-500'
                    }`}
                  />
                </div>
                {errors.email && <p data-testid="email-error" className="text-red-400 text-xs mt-2 font-medium">{errors.email}</p>}
              </div>
            ) : (
              /* Normal management login → phone credential */
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                  <input
                    id="phone-input"
                    data-testid="phone-input"
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
                {errors.phone && <p data-testid="phone-error" className="text-red-400 text-xs mt-2 font-medium">{errors.phone}</p>}
              </div>
            )}

            {/* Password Input */}
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                <input
                  id="password-input"
                  data-testid="password-input"
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
                  data-testid="toggle-password"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isSuccess}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p data-testid="password-error" className="text-red-400 text-xs mt-2 font-medium">{errors.password}</p>}
            </div>

            {/* Super-admin support access toggle — hidden unless ?debugMode=true */}
            {debugMode && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  data-testid="superadmin-checkbox"
                  checked={asSuperAdmin}
                  onChange={(e) => { setAsSuperAdmin(e.target.checked); setErrors({}); }}
                  disabled={isLoading || isSuccess}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/40 focus:ring-2 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-400" /> Login as Super-Admin
                </span>
              </label>
            )}

            {superAdminActive && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                <ShieldCheck size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Platform support access. Sign in with your <strong>super-admin</strong> credentials to enter this school's portal as its admin. This session is logged for audit.
                </p>
              </div>
            )}

            <button
              id="login-btn"
              data-testid="login-btn"
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
