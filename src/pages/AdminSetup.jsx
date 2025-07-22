import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { supabase } from '../supabase';
import { useAuth } from '../context/Auth';

const AdminSetup = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (!user) {
      route('/login', true);
      return;
    }
    checkUserStatus();
  }, [user]);

  const checkUserStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user status:', error);
        setStatus(`Error: ${error.message}`);
        return;
      }

      setUserProfile(data);
      if (data) {
        setStatus(`User found: ${data.email} - Admin: ${data.is_admin ? 'Yes' : 'No'}`);
      } else {
        setStatus('User profile not found in database');
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const makeUserAdmin = async () => {
    try {
      setLoading(true);
      
      const profileData = {
        id: user.id,
        email: user.email,
        is_admin: true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error making user admin:', error);
        setStatus(`Error: ${error.message}`);
        return;
      }

      setUserProfile(data);
      setStatus('Successfully set user as admin!');
    } catch (error) {
      console.error('Error:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    route('/login', true);
  };

  if (!user) {
    return <div>Please log in first.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Setup</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Current User</h2>
            <p className="text-gray-600">Email: {user.email}</p>
            <p className="text-gray-600">ID: {user.id}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700">Status</h2>
            <p className={`text-sm ${status.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {status || 'Checking...'}
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={checkUserStatus}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check User Status'}
            </button>

            <button
              onClick={makeUserAdmin}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Make User Admin'}
            </button>

            <button
              onClick={signOut}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Instructions:</h3>
            <ol className="text-xs text-gray-600 space-y-1">
              <li>1. Check your current user status</li>
              <li>2. If you're not an admin, click "Make User Admin"</li>
              <li>3. Go to <a href="/blog-admin" className="text-blue-600 hover:underline">/blog-admin</a> to manage posts</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;