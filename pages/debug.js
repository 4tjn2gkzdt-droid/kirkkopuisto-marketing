import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Debug() {
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

  const [status, setStatus] = useState('Testataan...');
  const [details, setDetails] = useState({});

  useEffect(() => {
    async function testConnection() {
      const results = {
        supabaseClient: !!supabase,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        keyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        keyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      };

      if (supabase) {
        try {
          // Testaa yhteys hakemalla events-taulusta
          const { data, error, count } = await supabase
            .from('events')
            .select('*', { count: 'exact' })
            .limit(5);

          if (error) {
            results.connectionTest = 'VIRHE: ' + error.message;
            results.error = error;
          } else {
            results.connectionTest = '✅ Yhteys toimii!';
            results.eventsCount = count;
            results.sampleEvents = data;
          }
        } catch (e) {
          results.connectionTest = 'VIRHE: ' + e.message;
        }
      } else {
        results.connectionTest = '❌ Supabase-client ei luotu';
      }

      setDetails(results);
      setStatus(results.connectionTest);
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">🔍 Supabase Debug</h1>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-2">Yhteystesti</h2>
            <p className="text-lg">{status}</p>
          </div>

          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-2">Konfiguraatio</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="font-semibold py-1">Supabase Client:</td>
                  <td>{details.supabaseClient ? '✅ Luotu' : '❌ Ei luotu'}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1">URL:</td>
                  <td className="font-mono text-xs">{details.url || '❌ Puuttuu'}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1">API Key:</td>
                  <td className="font-mono text-xs">{details.keyPreview || '❌ Puuttuu'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {details.eventsCount !== undefined && (
            <div className="border-b pb-4">
              <h2 className="text-xl font-semibold mb-2">Tietokanta</h2>
              <p>Tapahtumia tietokannassa: <strong>{details.eventsCount}</strong></p>
            </div>
          )}

          {details.sampleEvents && details.sampleEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Esimerkkitapahtumat</h2>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(details.sampleEvents, null, 2)}
              </pre>
            </div>
          )}

          {details.error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Virhe</h2>
              <pre className="text-xs text-red-700 overflow-auto">
                {JSON.stringify(details.error, null, 2)}
              </pre>
            </div>
          )}

          <div className="pt-4">
            <a
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block"
            >
              ← Takaisin etusivulle
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
