import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SimpleTest() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log('1. Getting session...');
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Session error: ' + sessionError.message);
        setLoading(false);
        return;
      }

      if (!currentSession) {
        console.log('2. No session found');
        setError('Ei sessiota - kirjaudu ensin');
        setLoading(false);
        return;
      }

      console.log('2. Session found:', currentSession.user.email);
      setSession(currentSession);

      console.log('3. Fetching profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Profile error: ' + profileError.message + ' (Code: ' + profileError.code + ')');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg">Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold mb-4">🔍 Yksinkertainen testi</h1>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-800 px-4 py-3 rounded mb-4">
              <p className="font-bold">❌ Virhe:</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {session && (
            <div className="bg-green-100 border-2 border-green-400 text-green-800 px-4 py-3 rounded mb-4">
              <p className="font-bold">✅ Sessio löytyi:</p>
              <p className="text-sm mt-2"><strong>Email:</strong> {session.user.email}</p>
              <p className="text-sm"><strong>ID:</strong> {session.user.id}</p>
            </div>
          )}

          {profile && (
            <div className="bg-blue-100 border-2 border-blue-400 text-blue-800 px-4 py-3 rounded mb-4">
              <p className="font-bold">👤 Profiili löytyi:</p>
              <p className="text-sm mt-2"><strong>Nimi:</strong> {profile.full_name}</p>
              <p className="text-sm"><strong>Email:</strong> {profile.email}</p>
              <p className="text-sm"><strong>Admin:</strong> {profile.is_admin ? 'Kyllä' : 'Ei'}</p>
            </div>
          )}

          <div className="mt-6">
            <a
              href="/login"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 mr-3"
            >
              ← Takaisin kirjautumiseen
            </a>
            <a
              href="/"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Kokeile etusivua →
            </a>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-yellow-800">💡 Ohjeet:</p>
          <ol className="text-sm text-yellow-800 mt-2 space-y-1 list-decimal list-inside">
            <li>Jos näet vihreän "Sessio löytyi" ja sinisen "Profiili löytyi" → kaikki toimii!</li>
            <li>Jos näet vain vihreän laatikon → RLS policy estää profiilin lukemisen</li>
            <li>Jos näet punaisen virheen → katso mitä virhe sanoo</li>
            <li>Avaa selaimen konsoli (F12) nähdäksesi yksityiskohtaiset lokit</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
