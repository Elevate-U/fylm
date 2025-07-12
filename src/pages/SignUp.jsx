import { useState } from 'preact/hooks';
import { supabase } from '../supabase';
import toast from '../components/Toast';
import './Auth.css';

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleSignUp = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) throw error;
      toast.success('Check your email for the confirmation link!');
    } catch (error) {
      toast.error(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1 className="header">Create an account</h1>
        <p className="description">Sign up for a new account.</p>
        <form onSubmit={handleSignUp}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input-field"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input-field"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button className="button" disabled={loading}>
              {loading ? <span>Loading...</span> : <span>Sign Up</span>}
            </button>
          </div>
        </form>

        <div className="auth-divider">
          <span>OR</span>
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
            <a href="/login" className="auth-link"> Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
} 