import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { supabase } from '../supabase';
import toast from '../components/Toast';
import './Auth.css';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSocialLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error.error_description || error.message);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      
      if (error) throw error;
      
      toast.success('Logged in successfully!');
      route('/', true);
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        setErrors({ general: 'Invalid email or password' });
      } else if (error.message.includes('Email not confirmed')) {
        setErrors({ general: 'Please check your email and confirm your account' });
      } else {
        setErrors({ general: error.error_description || error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1 className="auth-header">Login</h1>
        <p className="description">Welcome back! Please login to your account.</p>
        
        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={handleLogin} noValidate>
          <div className="input-group">
            <label htmlFor="email">EMAIL</label>
            <input
              id="email"
              className={`input-field ${errors.email ? 'error' : ''}`}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              required
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email && <span id="email-error" className="field-error" role="alert">{errors.email}</span>}
          </div>
          
          <div className="input-group">
            <label htmlFor="password">PASSWORD</label>
            <div className="password-input-container">
              <input
                id="password"
                className={`input-field password-field ${errors.password ? 'error' : ''}`}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                required
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                className="password-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.password && <span id="password-error" className="field-error" role="alert">{errors.password}</span>}
          </div>
          
          <div className="auth-options">
            <a href="/forgot-password" className="forgot-password-link">Forgot password?</a>
          </div>

          <div>
            <button className="button" disabled={loading}>
              {loading ? <span>Signing in...</span> : <span>Login</span>}
            </button>
          </div>
        </form>
        
        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="social-login-group">
          <button
            type="button" className="social-button google"
            onClick={() => handleSocialLogin('google')}
          >
            Sign in with Google
          </button>
        </div>

        <div className="auth-links">
          <p>
            Don't have an account?
            <a href="/signup" className="button"> Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
