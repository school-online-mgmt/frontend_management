import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import '../css/login.css';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-container">
      <div className="login-card">
        <span className="admin-access">Admin Access</span>
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to manage your school portal</p>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input type="email" placeholder="Enter your email address" defaultValue="roshan22@gmail.com" />
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>Password</label>
              <a href="#" style={{ color: '#2d4a43', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</a>
            </div>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                defaultValue="password123"
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button">Sign In to Portal
          </button>
        </form>

        <div className="footer-text">
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Secure access for authorized staff only</p>
          <p style={{ marginTop: '12px', fontSize: '14px' }}>
            Need help? <a href="#" style={{ color: '#7c7e7e', fontWeight: 700, textDecoration: 'none' }}>Contact IT Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;