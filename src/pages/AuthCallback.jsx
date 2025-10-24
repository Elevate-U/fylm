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
    let timeoutId;
    
    const handleAuthCallback = async () => {
      // Safety timeout - if callback takes more than 10 seconds, force error state
      timeoutId = setTimeout(() => {
        console.error('⚠️ Auth callback timeout');
        setStatus('error');
        setMessage('Authentication is taking too long. Please try again.');
        toast.error('Authentication timeout. Redirecting...');
        setTimeout(() => route('/login', true), 2000);
      }, 10000);
      
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
          clearTimeout(timeoutId);
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
            console.log('📧 Setting session from email confirmation...');
            
            // Add timeout to setSession call
            const sessionPromise = supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            const sessionTimeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Session setup timeout')), 8000);
            });
            
            const { data, error: sessionError } = await Promise.race([
              sessionPromise,
              sessionTimeoutPromise
            ]);

            if (sessionError) {
              clearTimeout(timeoutId);
              console.error('Session error:', sessionError);
              setStatus('error');
              setMessage('Failed to confirm email. Please try again.');
              toast.error('Failed to confirm email. Please try again.');
              setTimeout(() => route('/login', true), 3000);
              return;
            }

            if (data.user) {
              clearTimeout(timeoutId);
              console.log('✅ Email confirmed successfully');
              setStatus('success');
              setMessage('Email confirmed successfully! Redirecting...');
              toast.success('Email confirmed successfully!');
              
              // Clear the hash from URL
              window.location.hash = '';
              
              // Give Auth context time to update before redirecting
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Redirect to home page
              setTimeout(() => route('/', true), 1500);
            } else {
              clearTimeout(timeoutId);
              setStatus('error');
              setMessage('Authentication failed. Please try logging in.');
              setTimeout(() => route('/login', true), 3000);
            }
          } else {
            clearTimeout(timeoutId);
            setStatus('error');
            setMessage('Invalid confirmation link. Please try again.');
            setTimeout(() => route('/login', true), 3000);
          }
        } else if (type === 'recovery' || type === 'password_recovery') {
          // Handle password recovery
          if (accessToken && refreshToken) {
            const sessionPromise = supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            const sessionTimeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Recovery session timeout')), 8000);
            });
            
            const { error: sessionError } = await Promise.race([
              sessionPromise,
              sessionTimeoutPromise
            ]);

            if (sessionError) {
              clearTimeout(timeoutId);
              console.error('Recovery session error:', sessionError);
              setStatus('error');
              setMessage('Invalid recovery link. Please try again.');
              setTimeout(() => route('/forgot-password', true), 3000);
              return;
            }

            clearTimeout(timeoutId);
            setStatus('success');
            setMessage('Recovery link verified! Redirecting to update password...');
            setTimeout(() => route('/update-password', true), 2000);
          } else {
            clearTimeout(timeoutId);
            setStatus('error');
            setMessage('Invalid recovery link. Please try again.');
            setTimeout(() => route('/forgot-password', true), 3000);
          }
        } else {
          // Handle other auth types or fallback
          const sessionPromise = supabase.auth.getSession();
          const sessionTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Session check timeout')), 5000);
          });
          
          const { data, error: sessionError } = await Promise.race([
            sessionPromise,
            sessionTimeoutPromise
          ]);
          
          if (sessionError) {
            clearTimeout(timeoutId);
            console.error('Session check error:', sessionError);
            setStatus('error');
            setMessage('Authentication failed. Please try logging in.');
            setTimeout(() => route('/login', true), 3000);
            return;
          }

          if (data.session) {
            clearTimeout(timeoutId);
            setStatus('success');
            setMessage('Authentication successful! Redirecting...');
            toast.success('Authentication successful!');
            setTimeout(() => route('/', true), 2000);
          } else {
            clearTimeout(timeoutId);
            setStatus('error');
            setMessage('No active session found. Please try logging in.');
            setTimeout(() => route('/login', true), 3000);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message.includes('timeout') 
          ? 'Authentication is taking too long. Please check your connection and try again.'
          : 'An unexpected error occurred. Please try again.');
        toast.error('Authentication failed. Please try again.');
        setTimeout(() => route('/login', true), 3000);
      }
    };

    handleAuthCallback();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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