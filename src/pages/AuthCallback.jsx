import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { supabase } from '../supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from '../components/Toast';
import './AuthCallback.css';

function AuthCallback() {
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        // Check for errors first
        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || error);
          toast.error(errorDescription || error);
          setTimeout(() => route('/login', true), 3000);
          return;
        }

        // Handle different auth types
        if (type === 'signup' || type === 'email_confirmation') {
          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              setStatus('error');
              setMessage('Failed to confirm email. Please try again.');
              toast.error('Failed to confirm email. Please try again.');
              setTimeout(() => route('/login', true), 3000);
              return;
            }

            if (data.user) {
              setStatus('success');
              setMessage('Email confirmed successfully! Redirecting...');
              toast.success('Email confirmed successfully!');
              
              // Clear the hash from URL
              window.location.hash = '';
              
              // Redirect to home page
              setTimeout(() => route('/', true), 2000);
            } else {
              setStatus('error');
              setMessage('Authentication failed. Please try logging in.');
              setTimeout(() => route('/login', true), 3000);
            }
          } else {
            setStatus('error');
            setMessage('Invalid confirmation link. Please try again.');
            setTimeout(() => route('/login', true), 3000);
          }
        } else if (type === 'recovery' || type === 'password_recovery') {
          // Handle password recovery
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.error('Recovery session error:', sessionError);
              setStatus('error');
              setMessage('Invalid recovery link. Please try again.');
              setTimeout(() => route('/forgot-password', true), 3000);
              return;
            }

            setStatus('success');
            setMessage('Recovery link verified! Redirecting to update password...');
            setTimeout(() => route('/update-password', true), 2000);
          } else {
            setStatus('error');
            setMessage('Invalid recovery link. Please try again.');
            setTimeout(() => route('/forgot-password', true), 3000);
          }
        } else {
          // Handle other auth types or fallback
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session check error:', sessionError);
            setStatus('error');
            setMessage('Authentication failed. Please try logging in.');
            setTimeout(() => route('/login', true), 3000);
            return;
          }

          if (data.session) {
            setStatus('success');
            setMessage('Authentication successful! Redirecting...');
            toast.success('Authentication successful!');
            setTimeout(() => route('/', true), 2000);
          } else {
            setStatus('error');
            setMessage('No active session found. Please try logging in.');
            setTimeout(() => route('/login', true), 3000);
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred. Please try again.');
        setTimeout(() => route('/login', true), 3000);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        {status === 'processing' && (
          <>
            <LoadingSpinner />
            <h2>Processing Authentication</h2>
            <p>{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>Success!</h2>
            <p>{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="error-icon">✗</div>
            <h2>Authentication Failed</h2>
            <p>{message}</p>
            <p className="redirect-note">You will be redirected shortly...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthCallback;