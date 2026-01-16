import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        setError('Supabase-yhteyttä ei ole konfiguroitu');
        setLoading(false);
        return;
      }

      try {
        // Tarkista onko tämä salasanan resetointi
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (session) {
          // Kirjautuminen onnistui, ohjaa etusivulle
          router.push('/');
        } else {
          // Ei sessiota, ohjaa kirjautumissivulle
          router.push('/login');
        }
      } catch (err) {
        setError('Autentikointi epäonnistui: ' + err.message);
        setLoading(false);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        {loading && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">⏳ Käsitellään kirjautumista...</p>
          </>
        )}

        {error && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Virhe</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
            >
              Takaisin kirjautumiseen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
