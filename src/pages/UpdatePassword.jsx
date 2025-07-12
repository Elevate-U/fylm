import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { supabase } from '../supabase';
import toast from '../components/Toast';
import './Auth.css';

export default function UpdatePassword() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("You must be logged in to update your password.");
        route('/login', true);
      } else {
        setSession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'PASSWORD_RECOVERY') {
        // This event is triggered after the user clicks the password recovery link
        // You might want to handle this case specifically if needed
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;
      
      toast.success('Password updated successfully!');
      route('/', true);
    } catch (error) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1 className="header">Update Password</h1>
        <p className="description">Enter a new password for your account.</p>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleUpdatePassword}>
          <div className="input-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              className="input-field"
              type="password"
              placeholder="Your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              className="input-field"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <button className="button" disabled={loading}>
              {loading ? <span>Updating...</span> : <span>Update Password</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 