import { useState } from 'preact/hooks';
import { supabase } from '../supabase';
import toast from '../components/Toast';
import './Auth.css';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      
      toast.success('Password reset link sent! Please check your email.');
    } catch (error) {
      toast.error(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1 className="header">Forgot Password</h1>
        <p className="description">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handlePasswordReset}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input-field"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <button className="button" disabled={loading}>
              {loading ? <span>Sending...</span> : <span>Send Reset Link</span>}
            </button>
          </div>
        </form>
        <div className="auth-links">
          <a href="/login" className="auth-link">
            Remembered your password? <span>Log in</span>
          </a>
        </div>
      </div>
    </div>
  );
} 