import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function DebugUpload() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    checkAuth();
  }, []);

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { type, message, data, timestamp }]);
    console.log(`[${type}] ${message}`, data);
  };

  const checkAuth = async () => {
    addLog('info', 'Tarkistetaan autentikointi...');

    if (!supabase) {
      addLog('error', 'Supabase client puuttuu!');
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      addLog('error', 'Ei sessiota - ohjataan kirjautumissivulle');
      router.push('/login');
      return;
    }

    addLog('success', 'Session löytyi', { email: session.user.email });
    setUser(session.user);
    setLoading(false);

    // Aja automaattiset testit
    runTests();
  };

  const runTests = async () => {
    addLog('info', '=== ALOITETAAN AUTOMAATTISET TESTIT ===');

    // Testi 1: Supabase connection
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setTestResults(prev => ({...prev, auth: 'OK'}));
      addLog('success', 'Testi 1/4: Autentikointi OK');
    } catch (error) {
      setTestResults(prev => ({...prev, auth: 'FAIL'}));
      addLog('error', 'Testi 1/4: Autentikointi epäonnistui', error.message);
    }

    // Testi 2: Storage bucket listaus
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;

      const hasBrandGuidelines = data?.some(b => b.name === 'brand-guidelines');
      setTestResults(prev => ({...prev, bucket: hasBrandGuidelines ? 'OK' : 'MISSING'}));

      if (hasBrandGuidelines) {
        addLog('success', 'Testi 2/4: Storage bucket "brand-guidelines" löytyi');
      } else {
        addLog('error', 'Testi 2/4: Storage bucket "brand-guidelines" puuttuu!', data);
      }
    } catch (error) {
      setTestResults(prev => ({...prev, bucket: 'FAIL'}));
      addLog('error', 'Testi 2/4: Storage bucket listaus epäonnistui', error.message);
    }

    // Testi 3: Storage policies
    try {
      // Yritä listata tiedostoja bucketista (testaa lukuoikeus)
      const { data, error } = await supabase.storage
        .from('brand-guidelines')
        .list('', { limit: 1 });

      if (error) {
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          setTestResults(prev => ({...prev, policies: 'RLS_ERROR'}));
          addLog('error', 'Testi 3/4: RLS policy ongelma', error.message);
        } else {
          throw error;
        }
      } else {
        setTestResults(prev => ({...prev, policies: 'OK'}));
        addLog('success', 'Testi 3/4: Storage policies OK');
      }
    } catch (error) {
      setTestResults(prev => ({...prev, policies: 'FAIL'}));
      addLog('error', 'Testi 3/4: Storage policies testi epäonnistui', error.message);
    }

    // Testi 4: Testaa tiedostonimen sanitointia
    const testNames = [
      'Brändiohje 2024.pdf',
      'test-file.md',
      'data (final).json',
      'file@#$%.pdf'
    ];

    const sanitizeFileName = (filename) => {
      return filename
        .toLowerCase()
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/å/g, 'a')
        .replace(/[^a-z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const sanitizedResults = testNames.map(name => ({
      original: name,
      sanitized: sanitizeFileName(name)
    }));

    setTestResults(prev => ({...prev, sanitize: 'OK'}));
    addLog('success', 'Testi 4/4: Tiedostonimen sanitointi', sanitizedResults);

    addLog('info', '=== TESTIT VALMIIT ===');
  };

  const testUpload = async () => {
    if (!uploadFile) {
      addLog('error', 'Valitse tiedosto ensin!');
      return;
    }

    addLog('info', '=== ALOITETAAN TIEDOSTON LATAUS ===');

    try {
      // Vaihe 1: Hae session
      addLog('info', 'Vaihe 1/6: Haetaan session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addLog('error', 'Session puuttuu!');
        return;
      }
      addLog('success', 'Session OK', { email: session.user.email });

      // Vaihe 2: Validoi tiedosto
      addLog('info', 'Vaihe 2/6: Validoidaan tiedosto...');
      addLog('info', 'Tiedoston tiedot', {
        name: uploadFile.name,
        size: `${(uploadFile.size / 1024).toFixed(2)} KB`,
        type: uploadFile.type
      });

      // Vaihe 3: Sanitoi nimi
      addLog('info', 'Vaihe 3/6: Sanitoidaan tiedostonimi...');
      const sanitizeFileName = (filename) => {
        return filename
          .toLowerCase()
          .replace(/ä/g, 'a')
          .replace(/ö/g, 'o')
          .replace(/å/g, 'a')
          .replace(/[^a-z0-9.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      };

      const sanitizedFileName = sanitizeFileName(uploadFile.name);
      const filePath = `${Date.now()}-${sanitizedFileName}`;
      addLog('success', 'Tiedostonimi sanitoitu', {
        original: uploadFile.name,
        sanitized: sanitizedFileName,
        fullPath: filePath
      });

      // Vaihe 4: Lataa tiedosto
      addLog('info', 'Vaihe 4/6: Ladataan tiedostoa Storageen...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('brand-guidelines')
        .upload(filePath, uploadFile, {
          contentType: uploadFile.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadError) {
        addLog('error', 'Storage upload epäonnistui!', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError
        });
        return;
      }

      addLog('success', 'Tiedosto ladattu!', uploadData);

      // Vaihe 5: Hae public URL
      addLog('info', 'Vaihe 5/6: Haetaan public URL...');
      const { data: urlData } = supabase.storage
        .from('brand-guidelines')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        addLog('error', 'Public URL:n haku epäonnistui!');
        return;
      }

      addLog('success', 'Public URL luotu', { url: urlData.publicUrl });

      // Vaihe 6: Testaa API-kutsu
      addLog('info', 'Vaihe 6/6: Testataan API-kutsua...');
      const response = await fetch('/api/brand-guidelines/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Debug Test ${Date.now()}`,
          fileName: uploadFile.name,
          filePath: uploadData.path,
          fileUrl: urlData.publicUrl
        })
      });

      const result = await response.json();

      if (result.success) {
        addLog('success', 'API-kutsu onnistui!', result);
      } else {
        addLog('error', 'API-kutsu epäonnistui!', result);
      }

      addLog('info', '=== LATAUS VALMIS ===');
    } catch (error) {
      addLog('error', 'Kriittinen virhe!', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p>Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-400 mb-2">🔧 Debug: Tiedostojen lataus</h1>
              <p className="text-gray-400">Käyttäjä: {user?.email}</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              ← Takaisin
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4">📊 Automaattiset testit</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-sm text-gray-400 mb-1">Autentikointi</div>
              <div className={`text-2xl font-bold ${testResults.auth === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.auth || '...'}
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-sm text-gray-400 mb-1">Storage Bucket</div>
              <div className={`text-2xl font-bold ${testResults.bucket === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.bucket || '...'}
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-sm text-gray-400 mb-1">RLS Policies</div>
              <div className={`text-2xl font-bold ${testResults.policies === 'OK' ? 'text-green-400' : testResults.policies === 'RLS_ERROR' ? 'text-yellow-400' : 'text-red-400'}`}>
                {testResults.policies || '...'}
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-sm text-gray-400 mb-1">Sanitointi</div>
              <div className={`text-2xl font-bold ${testResults.sanitize === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.sanitize || '...'}
              </div>
            </div>
          </div>
        </div>

        {/* Upload Test */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4">📤 Testaa tiedoston lataus</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Valitse tiedosto
              </label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white"
              />
            </div>
            <button
              onClick={testUpload}
              disabled={!uploadFile}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded font-bold"
            >
              🚀 Testaa lataus
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-400">📋 Lokit</h2>
            <button
              onClick={clearLogs}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              Tyhjennä
            </button>
          </div>

          <div className="bg-gray-900 rounded p-4 h-96 overflow-y-auto font-mono text-sm space-y-2">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">Ei lokeja vielä...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="border-l-4 pl-3 py-1" style={{
                  borderColor: log.type === 'success' ? '#10b981' : log.type === 'error' ? '#ef4444' : '#3b82f6'
                }}>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 text-xs">{log.timestamp}</span>
                    <span className={`font-bold ${
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'error' ? 'text-red-400' :
                      'text-blue-400'
                    }`}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span className="text-gray-200">{log.message}</span>
                  </div>
                  {log.data && (
                    <pre className="text-xs text-gray-400 mt-1 ml-20 overflow-x-auto">
                      {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-blue-300 mb-2">💡 Ohjeet</h3>
          <ul className="text-blue-200 space-y-1 text-sm">
            <li>1. Tarkista että kaikki automaattiset testit ovat OK (vihreä)</li>
            <li>2. Jos RLS Policies on keltainen/punainen, tarkista Supabase Storage policies</li>
            <li>3. Valitse testtiedosto ja klikkaa "Testaa lataus"</li>
            <li>4. Seuraa lokeja - ne näyttävät tarkalleen missä kohtaa virhe tapahtuu</li>
            <li>5. Kopioi virheloki ja lähetä se eteenpäin jos ongelma jatkuu</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
