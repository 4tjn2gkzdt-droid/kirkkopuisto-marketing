import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DebugEvents() {
  const [logs, setLogs] = useState([]);
  const [testEvent, setTestEvent] = useState({
    title: 'Debug Test Event',
    date: new Date().toISOString().split('T')[0],
    type: 'tapahtuma',
    description: 'Tämä on debug-testi'
  });
  const [loading, setLoading] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState(null);
  const [events, setEvents] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  useEffect(() => {
    checkSupabaseConnection();
    loadEvents();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      addLog('Tarkistetaan Supabase-yhteyttä...', 'info');

      if (!supabase) {
        addLog('❌ Supabase-client ei ole alustettu!', 'error');
        addLog('Tarkista että .env.local sisältää NEXT_PUBLIC_SUPABASE_URL ja NEXT_PUBLIC_SUPABASE_ANON_KEY', 'error');
        setSupabaseStatus({ connected: false, error: 'Supabase-client puuttuu' });
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('id, title')
        .limit(1);

      if (error) {
        addLog(`Tietokantavirhe: ${error.message}`, 'error');
        addLog(`Virhekoodi: ${error.code}`, 'error');
        setSupabaseStatus({ connected: false, error: error.message });
      } else {
        addLog('✅ Supabase-yhteys toimii!', 'success');
        setSupabaseStatus({ connected: true });
      }
    } catch (err) {
      addLog(`Odottamaton virhe: ${err.message}`, 'error');
      setSupabaseStatus({ connected: false, error: err.message });
    }
  };

  const loadEvents = async () => {
    try {
      if (!supabase) {
        addLog('❌ Supabase ei ole alustettu', 'error');
        return;
      }

      addLog('Ladataan tapahtumia...', 'info');
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        addLog(`Virhe ladattaessa: ${error.message}`, 'error');
      } else {
        setEvents(data || []);
        addLog(`Ladattu ${data?.length || 0} tapahtumaa`, 'success');
      }
    } catch (err) {
      addLog(`Odottamaton virhe: ${err.message}`, 'error');
    }
  };

  const testSingleSave = async () => {
    setLoading(true);
    addLog('=== ALOITETAAN YKSITTÄINEN TALLENNUS ===', 'info');

    try {
      if (!supabase) {
        addLog('❌ Supabase ei ole alustettu', 'error');
        setLoading(false);
        return;
      }

      const newEvent = {
        ...testEvent,
        id: Date.now(),
        status: 'luonnos',
        created_at: new Date().toISOString(),
      };

      addLog(`Tallennetaan tapahtuma: ${JSON.stringify(newEvent)}`, 'info');

      const { data, error } = await supabase
        .from('posts')
        .insert([newEvent])
        .select();

      if (error) {
        addLog(`❌ VIRHE: ${error.message}`, 'error');
        addLog(`Virheen koodi: ${error.code}`, 'error');
        addLog(`Virheen yksityiskohdat: ${JSON.stringify(error.details)}`, 'error');
        addLog(`Virheen vihje: ${error.hint}`, 'error');
      } else {
        addLog(`✅ ONNISTUI! Tallennettu ID: ${data?.[0]?.id}`, 'success');
        addLog(`Palautettu data: ${JSON.stringify(data)}`, 'success');
        await loadEvents();
      }
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error');
      addLog(`Stack trace: ${err.stack}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testBatchSave = async () => {
    setLoading(true);
    addLog('=== ALOITETAAN ERÄTALLENNUS (3 tapahtumaa) ===', 'info');

    try {
      if (!supabase) {
        addLog('❌ Supabase ei ole alustettu', 'error');
        setLoading(false);
        return;
      }

      const baseTime = Date.now();
      const events = [1, 2, 3].map((i, index) => ({
        id: baseTime + index,
        title: `Erätesti ${i}: ${testEvent.title}`,
        date: testEvent.date,
        type: testEvent.type,
        description: `${testEvent.description} (nro ${i})`,
        status: 'luonnos',
        created_at: new Date().toISOString(),
      }));

      addLog(`Tallennetaan ${events.length} tapahtumaa...`, 'info');
      events.forEach((e, i) => addLog(`  ${i + 1}. ${e.title} (ID: ${e.id})`, 'info'));

      const { data, error } = await supabase
        .from('posts')
        .insert(events)
        .select();

      if (error) {
        addLog(`❌ VIRHE: ${error.message}`, 'error');
        addLog(`Virheen koodi: ${error.code}`, 'error');
        addLog(`Virheen yksityiskohdat: ${JSON.stringify(error.details)}`, 'error');
      } else {
        addLog(`✅ ONNISTUI! Tallennettu ${data?.length || 0} tapahtumaa`, 'success');
        data?.forEach((d, i) => addLog(`  ${i + 1}. ID: ${d.id}, Nimi: ${d.title}`, 'success'));
        await loadEvents();
      }
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error');
      addLog(`Stack trace: ${err.stack}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testExcelImport = async () => {
    setLoading(true);
    addLog('=== SIMULOIDAAN EXCEL-TUONTIA ===', 'info');

    try {
      if (!supabase) {
        addLog('❌ Supabase ei ole alustettu', 'error');
        setLoading(false);
        return;
      }

      // Simuloi Excel-tuonti kuten index.js:ssä
      const importedEvents = [
        {
          title: 'Excel-tuonti testi 1',
          date: '2024-02-01',
          time: '18:00',
          description: 'Tuotu Excelistä',
          type: 'tapahtuma'
        },
        {
          title: 'Excel-tuonti testi 2',
          date: '2024-02-02',
          time: '19:00',
          description: 'Tuotu Excelistä',
          type: 'markkinointi'
        }
      ];

      addLog(`Tuotu ${importedEvents.length} tapahtumaa Excelistä`, 'info');

      const baseTime = Date.now();
      const eventsToSave = importedEvents.map((event, index) => {
        const newId = baseTime + index;
        addLog(`Luodaan tapahtuma ID ${newId}: ${event.title}`, 'info');

        return {
          id: newId,
          title: event.title,
          date: event.date,
          time: event.time || '',
          description: event.description || '',
          type: event.type || 'tapahtuma',
          status: 'luonnos',
          platform: '',
          hashtags: '',
          image_url: '',
          created_at: new Date().toISOString(),
          autoGenerateContent: false
        };
      });

      addLog('Tallennetaan tapahtumat Supabaseen...', 'info');
      addLog(`Tallennettavat tapahtumat: ${JSON.stringify(eventsToSave, null, 2)}`, 'info');

      const { data, error } = await supabase
        .from('posts')
        .insert(eventsToSave)
        .select();

      if (error) {
        addLog(`❌ VIRHE TALLENNUKSESSA: ${error.message}`, 'error');
        addLog(`Virheen koodi: ${error.code}`, 'error');
        addLog(`Virheen yksityiskohdat: ${JSON.stringify(error.details)}`, 'error');
        addLog(`Virheen vihje: ${error.hint}`, 'error');

        // Tarkista onko RLS-ongelma
        if (error.code === '42501' || error.message.includes('policy')) {
          addLog('⚠️ Mahdollinen RLS (Row Level Security) ongelma!', 'error');
          addLog('Tarkista Supabase RLS-käytännöt posts-taulussa', 'error');
        }
      } else {
        addLog(`✅ TALLENNUS ONNISTUI!`, 'success');
        addLog(`Tallennettu ${data?.length || 0} tapahtumaa`, 'success');
        data?.forEach((d, i) => {
          addLog(`  ${i + 1}. ID: ${d.id}, Nimi: ${d.title}`, 'success');
        });
        await loadEvents();
      }
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error');
      addLog(`Stack trace: ${err.stack}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseSchema = async () => {
    setLoading(true);
    addLog('=== TARKISTETAAN TIETOKANTASKEEMA ===', 'info');

    try {
      if (!supabase) {
        addLog('❌ Supabase-client ei ole alustettu!', 'error');
        setLoading(false);
        return;
      }

      // Yritä hakea yksi tapahtuma ja tarkista kentät
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .limit(1);

      if (error) {
        addLog(`❌ Virhe skeeman tarkistuksessa: ${error.message}`, 'error');
      } else if (data && data.length > 0) {
        const fields = Object.keys(data[0]);
        addLog(`✅ Taulun 'posts' kentät (${fields.length} kpl):`, 'success');
        fields.forEach(field => addLog(`  - ${field}`, 'info'));
      } else {
        addLog('⚠️ Taulu on tyhjä, ei voida tarkistaa skeemaa', 'warning');

        // Yritä insert tyhjällä objektilla nähdäksemme pakolliset kentät
        const { error: insertError } = await supabase
          .from('posts')
          .insert([{ id: Date.now(), title: 'test' }])
          .select();

        if (insertError) {
          addLog(`Virhe kertoo pakollisista kentistä: ${insertError.message}`, 'info');
        }
      }

    } catch (err) {
      addLog(`❌ Odottamaton virhe: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Lokit tyhjennetty', 'info');
  };

  const deleteTestEvents = async () => {
    if (!confirm('Haluatko varmasti poistaa kaikki debug-testit?')) return;

    setLoading(true);
    addLog('=== POISTETAAN TESTITAPAHTUMAT ===', 'info');

    try {
      if (!supabase) {
        addLog('❌ Supabase ei ole alustettu', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .delete()
        .or('title.ilike.%debug%,title.ilike.%testi%,title.ilike.%excel-tuonti%')
        .select();

      if (error) {
        addLog(`❌ Virhe poistossa: ${error.message}`, 'error');
      } else {
        addLog(`✅ Poistettu ${data?.length || 0} testitapahtumaa`, 'success');
        await loadEvents();
      }
    } catch (err) {
      addLog(`❌ Odottamaton virhe: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Debug: Tapahtumien tallennus</h1>
        <p className="text-gray-600 mb-6">
          Testaa ja debuggaa tapahtumien tallennusta Supabaseen
        </p>

        {/* Status Card */}
        <div className={`mb-6 p-4 rounded-lg ${
          supabaseStatus?.connected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h2 className="font-bold mb-2">
            {supabaseStatus?.connected ? '✅ Supabase yhteys toimii' : '❌ Supabase yhteysvirhe'}
          </h2>
          {supabaseStatus?.error && (
            <p className="text-sm text-red-600">Virhe: {supabaseStatus.error}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Test Event Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Testitapahtuman tiedot</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Otsikko</label>
                  <input
                    type="text"
                    value={testEvent.title}
                    onChange={(e) => setTestEvent({...testEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Päivämäärä</label>
                  <input
                    type="date"
                    value={testEvent.date}
                    onChange={(e) => setTestEvent({...testEvent, date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tyyppi</label>
                  <select
                    value={testEvent.type}
                    onChange={(e) => setTestEvent({...testEvent, type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="tapahtuma">Tapahtuma</option>
                    <option value="markkinointi">Markkinointi</option>
                    <option value="some">Some</option>
                    <option value="blogi">Blogi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Kuvaus</label>
                  <textarea
                    value={testEvent.description}
                    onChange={(e) => setTestEvent({...testEvent, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Test Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Testit</h2>
              <div className="space-y-3">
                <button
                  onClick={testSingleSave}
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  1. Testaa yksittäinen tallennus
                </button>
                <button
                  onClick={testBatchSave}
                  disabled={loading}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  2. Testaa erätallennus (3 kpl)
                </button>
                <button
                  onClick={testExcelImport}
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  3. Simuloi Excel-tuonti
                </button>
                <button
                  onClick={testDatabaseSchema}
                  disabled={loading}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  4. Tarkista tietokantaskeema
                </button>
                <button
                  onClick={checkSupabaseConnection}
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  5. Tarkista yhteys uudelleen
                </button>
                <button
                  onClick={deleteTestEvents}
                  disabled={loading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  🗑️ Poista testitapahtumat
                </button>
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Viimeisimmät tapahtumat ({events.length})</h2>
                <button
                  onClick={loadEvents}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                >
                  Päivitä
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="p-3 bg-gray-50 rounded border text-sm">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-gray-600 text-xs mt-1">
                      ID: {event.id} | {event.date} | {event.type}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-gray-400 text-center py-4">Ei tapahtumia</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Debug-loki</h2>
              <button
                onClick={clearLogs}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
              >
                Tyhjennä
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-[800px] overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500">Ei lokeja vielä. Aja testi aloittaaksesi...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
