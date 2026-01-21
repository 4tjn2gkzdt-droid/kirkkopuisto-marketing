import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function TestAuth() {
  // Estä pääsy production-ympäristössä
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Ei käytettävissä</h1>
          <p className="text-gray-600 mb-4">Debug-sivut eivät ole käytettävissä production-ympäristössä.</p>
          <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block">
            ← Takaisin etusivulle
          </a>
        </div>
      </div>
    );
  }

  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('1. Checking session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Session error: ' + sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        console.log('No session, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('2. Session found:', session.user.email);
      setUser(session.user);

      console.log('3. Fetching user profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Profile error: ' + profileError.message);
      } else {
        console.log('4. Profile loaded:', profileData);
        setProfile(profileData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Unexpected error: ' + err.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="text-xl">⏳ Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6">🔍 Auth Debug</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Virhe:</p>
            <p>{error}</p>
          </div>
        )}

        {user && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">✅ Kirjautunut käyttäjä:</h2>
            <div className="bg-green-50 p-4 rounded">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString('fi-FI')}</p>
            </div>
          </div>
        )}

        {profile && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">👤 Profiili:</h2>
            <div className="bg-blue-50 p-4 rounded">
              <p><strong>Nimi:</strong> {profile.full_name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Admin:</strong> {profile.is_admin ? '✅ Kyllä' : '❌ Ei'}</p>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            → Mene etusivulle
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
          >
            🚪 Kirjaudu ulos
          </button>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded">
          <p className="text-sm text-gray-700">
            💡 <strong>Vihje:</strong> Avaa selaimen konsoli (F12) nähdäksesi yksityiskohtaiset lokit.
          </p>
        </div>
      </div>
    </div>
  );
}
