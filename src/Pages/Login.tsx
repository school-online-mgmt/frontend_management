import React, { useState } from 'react';
import { Mail, Lock, Phone, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import '../css/login.css';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(''); // New State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setIsSuccess(false);

    try {
      const response = await axios.post('http://localhost:8080/management/login', {
        email: email,
        password: password,
        phone: phone 
      });

      if (response.status === 200) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials or validation error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <span className="admin-access">Admin Access</span>
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to manage your school portal</p>

        {isSuccess && (
          <div className="success-banner" style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
            <CheckCircle size={18} />
            <span>Login successful! Admin session initialized.</span>
          </div>
        )}

        {error && (
          <div className="error-message" style={{ color: '#ff4d4d', fontSize: '14px', marginBottom: '15px', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Email Input */}
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          {/* Phone Input (New) */}
          <div className="form-group">
            <label>Phone Number</label>
            <div className="input-wrapper">
              <Phone className="input-icon" size={18} />
              <input type="tel" placeholder="Enter phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="eye-button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button" disabled={isLoading || isSuccess}>
            {isLoading ? <Loader2 className="spin" size={18} /> : isSuccess ? "Authenticated" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;