import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { Link } from 'preact-router/match';
import { supabase } from '../supabase';
import toast from '../components/Toast';
import './Auth.css';

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
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
    } else {
      const passwordRequirements = getPasswordRequirements(password);
      if (!passwordRequirements.isValid) {
        newErrors.password = 'Password does not meet requirements';
      }
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordRequirements = (pwd) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
    
    const metCount = Object.values(requirements).filter(Boolean).length;
    const isValid = requirements.length && requirements.uppercase && requirements.number;
    
    return {
      ...requirements,
      isValid,
      strength: metCount <= 1 ? 'weak' : metCount <= 2 ? 'medium' : metCount <= 3 ? 'good' : 'strong'
    };
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      // Try to sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });
      // If a user object is returned, try to log in immediately
      if (data && data.user) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (!loginError) {
          toast.success('Account created and logged in successfully!');
          route('/', true);
          return;
        } else {
          // User is unconfirmed or password is wrong, show confirmation message
          toast.success('Check your email for the confirmation link!');
          return;
        }
      }
      // If error, check if it's because the user already exists
      if (
        signUpError &&
        signUpError.message &&
        (signUpError.message.toLowerCase().includes('user already registered') ||
         signUpError.message.toLowerCase().includes('already registered') ||
         signUpError.message.toLowerCase().includes('already exists'))
      ) {
        // Try to log in with the provided password
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (!loginError) {
          toast.success('Logged in successfully!');
          route('/', true);
          return;
        } else {
          toast.error('You have already signed up with this email. Please log in.');
          setTimeout(() => {
            route('/login', true);
          }, 1500);
          return;
        }
      }
      // Other errors
      if (signUpError) {
        if (signUpError.message.includes('Password should be at least 6 characters')) {
          setErrors({ password: 'Password must be at least 8 characters long' });
        } else {
          setErrors({ general: signUpError.error_description || signUpError.message });
        }
      }
    } catch (error) {
      setErrors({ general: error.error_description || error.message });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return email && password && confirmPassword && password === confirmPassword && 
           getPasswordRequirements(password).isValid && agreeToTerms;
  };

  const passwordRequirements = getPasswordRequirements(password);

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1 className="auth-header">Create an account</h1>
        <p className="description">Join us to get started.</p>
        
        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSignUp} noValidate>
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
                placeholder="Create a password"
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
            
            {password && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  <div className={`password-strength-fill ${passwordRequirements.strength}`}></div>
                </div>
                <div className="password-requirements">
                  <div className={`requirement ${passwordRequirements.length ? 'met' : ''}`}>
                    <span className="requirement-icon">{passwordRequirements.length ? '✓' : '○'}</span>
                    8+ characters
                  </div>
                  <div className={`requirement ${passwordRequirements.uppercase ? 'met' : ''}`}>
                    <span className="requirement-icon">{passwordRequirements.uppercase ? '✓' : '○'}</span>
                    1 uppercase letter
                  </div>
                  <div className={`requirement ${passwordRequirements.number ? 'met' : ''}`}>
                    <span className="requirement-icon">{passwordRequirements.number ? '✓' : '○'}</span>
                    1 number
                  </div>
                </div>
              </div>
            )}
            
            {errors.password && <span id="password-error" className="field-error" role="alert">{errors.password}</span>}
          </div>
          
          <div className="input-group">
            <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
            <div className="password-input-container">
              <input
                id="confirmPassword"
                className={`input-field password-field ${errors.confirmPassword ? 'error' : ''}`}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                required
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                aria-invalid={!!errors.confirmPassword}
              />
              <button
                type="button"
                className="password-toggle-eye"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {showConfirmPassword ? (
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
            {errors.confirmPassword && <span id="confirm-password-error" className="field-error" role="alert">{errors.confirmPassword}</span>}
          </div>
          
          <div className="terms-group">
            <label className="terms-checkbox">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => {
                  setAgreeToTerms(e.target.checked);
                  if (errors.terms) setErrors({ ...errors, terms: null });
                }}
                className={errors.terms ? 'error' : ''}
              />
              <span className="checkmark"></span>
              <span className="terms-text">
                I agree to the 
                <Link href="/terms-of-service" className="terms-link">
                  Terms of Service
                </Link>
                {' and '}
                <Link href="/privacy-policy" className="terms-link">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.terms && <span className="field-error" role="alert">{errors.terms}</span>}
          </div>
          <div>
            <button className="button" disabled={loading || !isFormValid()}>
              {loading ? <span>Creating Account...</span> : <span>Create Account</span>}
            </button>
          </div>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="social-login-group">
          <button
            type="button"
            className="social-button google"
            onClick={() => handleSocialLogin('google')}
          >
            Sign up with Google
          </button>
        </div>

        <div className="auth-links">
          <p>
            Already have an account?
            <a href="/login" className="button"> Log in</a>
          </p>
        </div>
      </div>

    </div>
  );
}