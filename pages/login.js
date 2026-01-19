import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('fi-FI');
    const logEntry = `[${timestamp}] ${msg}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev, { msg: logEntry, type }]);
  };

  useEffect(() => {
    // Tarkista onko käyttäjä jo kirjautunut
    const checkUser = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Jos on jo kirjautunut, ohjaa etusivulle
          window.location.href = '/';
        }
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!supabase) {
      setError('Supabase-yhteyttä ei ole konfiguroitu');
      setLoading(false);
      return;
    }

    try {
      console.log('[LOGIN] Attempting login for:', email);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('[LOGIN] Sign in error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Väärä sähköposti tai salasana');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        console.log('[LOGIN] Login successful! Session created for:', data.session.user.email);
        console.log('[LOGIN] Waiting for session to persist...');

        // Odota hetki että session tallentuu
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('[LOGIN] Redirecting to home page...');
        // Käytä window.location varmistamaan että sivu latautuu uudelleen
        window.location.href = '/';
      } else {
        console.error('[LOGIN] No session in response data');
        setError('Kirjautuminen epäonnistui: ei sessiota');
        setLoading(false);
      }
    } catch (err) {
      console.error('[LOGIN] Unexpected error:', err);
      setError('Kirjautuminen epäonnistui: ' + err.message);
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!supabase) {
      setError('Supabase-yhteyttä ei ole konfiguroitu');
      setLoading(false);
      return;
    }

    if (!email) {
      setError('Syötä sähköpostiosoitteesi');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setMessage('📧 Salasanan resetointilinkki lähetetty sähköpostiisi!');
      setShowResetPassword(false);
      setLoading(false);
    } catch (err) {
      setError('Salasanan resetointi epäonnistui: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8">
        {/* Logo / Otsikko */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            🌸 Kirkkopuiston Terassi
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Markkinointisuunnittelu
          </p>
        </div>

        {/* Virheviesti */}
        {error && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Onnistumisviesti */}
        {message && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Kirjautumislomake */}
        {!showResetPassword ? (
          <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Sähköposti
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-base"
                placeholder="samuli@foodandwineturku.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Salasana
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-base"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 md:py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? '⏳ Kirjaudutaan...' : '🔓 Kirjaudu sisään'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Unohditko salasanan?
              </button>
            </div>
          </form>
        ) : (
          // Salasanan resetointilomake
          <form onSubmit={handleResetPassword} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 mb-2">
                Sähköposti
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-base"
                placeholder="samuli@foodandwineturku.com"
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 md:py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? '⏳ Lähetetään...' : '📧 Lähetä resetointilinkki'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                ← Takaisin kirjautumiseen
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 md:mt-8 text-center text-xs text-gray-500">
          <p>Tarvitsetko apua? Ota yhteyttä järjestelmän ylläpitäjään</p>
        </div>
      </div>
    </div>
  );
}
