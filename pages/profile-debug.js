import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function ProfileDebug() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Hae sessio
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError('Sessio-virhe: ' + sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        setError('Ei kirjautumista');
        setLoading(false);
        router.push('/login');
        return;
      }

      setSession(session);

      // Hae profiili
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        setError('Profiilivirhe: ' + profileError.message);
      } else {
        setProfile(profileData);
      }

      setLoading(false);
    } catch (err) {
      setError('Odottamaton virhe: ' + err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex gap-4">
          <Link href="/">
            <button className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
              ← Takaisin etusivulle
            </button>
          </Link>
          <button
            onClick={loadProfile}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            🔄 Päivitä
          </button>
        </div>

        <h1 className="text-4xl font-bold mb-8">🔍 Profiilin Debug-tiedot</h1>

        {error && (
          <div className="bg-red-900 border-2 border-red-500 p-6 rounded mb-8">
            <h2 className="text-2xl font-bold mb-2">❌ Virhe</h2>
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* Sessio */}
        {session && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold mb-4 text-green-400">✅ Sessio (auth.users)</h2>
            <div className="font-mono text-sm space-y-2">
              <div><span className="text-gray-400">ID:</span> {session.user.id}</div>
              <div><span className="text-gray-400">Email:</span> {session.user.email}</div>
              <div><span className="text-gray-400">Created:</span> {new Date(session.user.created_at).toLocaleString('fi-FI')}</div>
              <div><span className="text-gray-400">Last Sign In:</span> {new Date(session.user.last_sign_in_at).toLocaleString('fi-FI')}</div>
            </div>
          </div>
        )}

        {/* Profiili */}
        {profile ? (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-green-400">✅ Profiili (user_profiles)</h2>
            <div className="font-mono text-sm space-y-2 mb-6">
              <div><span className="text-gray-400">ID:</span> {profile.id}</div>
              <div><span className="text-gray-400">Email:</span> {profile.email}</div>
              <div><span className="text-gray-400">Nimi:</span> {profile.full_name}</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Admin:</span>
                <span className={`text-2xl font-bold ${profile.is_admin ? 'text-green-400' : 'text-red-400'}`}>
                  {profile.is_admin ? '✅ KYLLÄ' : '❌ EI'}
                </span>
              </div>
              <div><span className="text-gray-400">Created:</span> {new Date(profile.created_at).toLocaleString('fi-FI')}</div>
              <div><span className="text-gray-400">Updated:</span> {profile.updated_at ? new Date(profile.updated_at).toLocaleString('fi-FI') : 'ei päivitetty'}</div>
            </div>

            {/* Täydellinen JSON */}
            <details className="mt-4">
              <summary className="cursor-pointer text-blue-400 hover:text-blue-300 mb-2">
                📋 Näytä kaikki kentät (JSON)
              </summary>
              <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-xs">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="bg-red-900 border-2 border-red-500 p-6 rounded">
            <h2 className="text-2xl font-bold mb-2">❌ Profiilia ei löytynyt</h2>
            <p>Käyttäjäprofiilia ei ole user_profiles -taulussa.</p>
          </div>
        )}

        {/* Ohjeet */}
        <div className="mt-8 bg-blue-900 border-2 border-blue-500 p-6 rounded">
          <h2 className="text-2xl font-bold mb-4">💡 Miten korjata?</h2>

          {profile && !profile.is_admin && (
            <div className="space-y-4">
              <p className="text-yellow-300 font-semibold">
                Profiilisi <code>is_admin</code> -kenttä on <code>false</code>.
                Aja tämä SQL Supabase SQL Editor:ssa:
              </p>
              <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm">
{`UPDATE user_profiles
SET is_admin = true
WHERE id = '${session?.user.id}';`}
              </pre>
              <p className="text-sm text-gray-300">
                Sen jälkeen klikkaa 🔄 Päivitä -nappia tällä sivulla tai kirjaudu ulos ja takaisin sisään.
              </p>
            </div>
          )}

          {profile && profile.is_admin && (
            <div className="space-y-4">
              <p className="text-green-300 font-semibold">
                ✅ Sinulla on admin-oikeudet! Admin-paneelin pitäisi näkyä etusivulla.
              </p>
              <p className="text-sm text-gray-300">
                Jos Admin-nappi ei näy etusivulla, kokeile:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                <li>Päivitä sivu (F5 tai Ctrl+R)</li>
                <li>Tyhjennä välimuisti (Ctrl+Shift+R tai Cmd+Shift+R)</li>
                <li>Kirjaudu ulos ja takaisin sisään</li>
              </ul>
              <div className="mt-4">
                <Link href="/admin">
                  <button className="bg-purple-600 px-6 py-3 rounded-lg hover:bg-purple-700 font-bold text-lg">
                    ⚙️ Mene Admin-paneeliin
                  </button>
                </Link>
              </div>
            </div>
          )}

          {!profile && session && (
            <div className="space-y-4">
              <p className="text-red-300 font-semibold">
                ❌ Sinulla ei ole profiilia user_profiles -taulussa!
              </p>
              <p className="text-sm text-gray-300">
                Aja tämä SQL Supabase SQL Editor:ssa:
              </p>
              <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm">
{`INSERT INTO user_profiles (id, email, full_name, is_admin)
VALUES (
  '${session.user.id}',
  '${session.user.email}',
  'Admin Käyttäjä',
  true
)
ON CONFLICT (id) DO UPDATE
SET is_admin = true;`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
