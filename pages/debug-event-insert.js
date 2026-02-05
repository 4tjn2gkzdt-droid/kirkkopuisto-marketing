import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DebugEventInsert() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [savedEventId, setSavedEventId] = useState(null);

  const addLog = (message, type = 'info', data = null) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, { timestamp, message, type, data }]);
    console.log(`[${type.toUpperCase()}] ${message}`, data || '');
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    addLog('🔍 Tarkistetaan Supabase-yhteyttä...', 'info');

    try {
      if (!supabase) {
        addLog('❌ Supabase-client ei ole alustettu!', 'error');
        setSupabaseStatus({ connected: false, error: 'Supabase-client puuttuu' });
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('count')
        .limit(1);

      if (error) {
        addLog(`❌ Yhteys epäonnistui: ${error.message}`, 'error');
        setSupabaseStatus({ connected: false, error: error.message });
      } else {
        addLog('✅ Supabase-yhteys toimii!', 'success');
        setSupabaseStatus({ connected: true });
      }
    } catch (err) {
      addLog(`❌ Odottamaton virhe: ${err.message}`, 'error');
      setSupabaseStatus({ connected: false, error: err.message });
    }
  };

  const testStep1_InsertEvent = async () => {
    addLog('\n=== VAIHE 1: Tallenna tapahtuma (events-taulu) ===', 'info');

    try {
      const eventData = {
        title: 'Debug Test - Monipäiväinen tapahtuma',
        artist: 'Test Artist',
        summary: 'Testatapahtuma debug-tarkoituksiin',
        url: 'https://example.com',
        year: 2026,
        images: {},
        created_by_id: null,
        created_by_email: 'debug@test.com',
        created_by_name: 'Debug User'
      };

      addLog('📤 Tallennetaan events-tauluun...', 'info', eventData);

      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        addLog(`❌ VIRHE events-taulussa: ${error.message}`, 'error', {
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setTestResults(prev => ({ ...prev, step1: 'failed' }));
        return null;
      }

      addLog(`✅ Events-tallennus onnistui! ID: ${data.id}`, 'success', data);
      setTestResults(prev => ({ ...prev, step1: 'success' }));
      setSavedEventId(data.id);
      return data;
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error', err);
      setTestResults(prev => ({ ...prev, step1: 'failed' }));
      return null;
    }
  };

  const testStep2_InsertEventInstances = async (eventId) => {
    addLog('\n=== VAIHE 2: Tallenna päivämäärät (event_instances-taulu) ===', 'info');

    if (!eventId) {
      addLog('❌ Event ID puuttuu, ohitetaan vaihe 2', 'error');
      setTestResults(prev => ({ ...prev, step2: 'skipped' }));
      return false;
    }

    try {
      const instances = [
        {
          event_id: eventId,
          date: '2026-02-15',
          start_time: '18:00',
          end_time: '22:00'
        },
        {
          event_id: eventId,
          date: '2026-02-16',
          start_time: '19:00',
          end_time: '23:00'
        }
      ];

      addLog(`📤 Tallennetaan ${instances.length} päivämäärää...`, 'info', instances);

      const { data, error } = await supabase
        .from('event_instances')
        .insert(instances)
        .select();

      if (error) {
        addLog(`❌ VIRHE event_instances-taulussa: ${error.message}`, 'error', {
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setTestResults(prev => ({ ...prev, step2: 'failed' }));
        return false;
      }

      addLog(`✅ Event_instances-tallennus onnistui! Tallennettu ${data.length} päivää`, 'success', data);
      setTestResults(prev => ({ ...prev, step2: 'success' }));
      return true;
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error', err);
      setTestResults(prev => ({ ...prev, step2: 'failed' }));
      return false;
    }
  };

  const testStep3_InsertTasks = async (eventId) => {
    addLog('\n=== VAIHE 3: Tallenna tehtävät (tasks-taulu) ===', 'info');

    if (!eventId) {
      addLog('❌ Event ID puuttuu, ohitetaan vaihe 3', 'error');
      setTestResults(prev => ({ ...prev, step3: 'skipped' }));
      return false;
    }

    try {
      const tasks = [
        {
          event_id: eventId,
          title: 'Instagram-postaus',
          channel: 'instagram',
          due_date: '2026-02-10',
          due_time: '12:00',
          completed: false,
          content: 'Testisisältö Instagram-postaukselle',
          assignee: 'Test User',
          notes: 'Debug-testi',
          created_by_id: null,
          created_by_email: 'debug@test.com',
          created_by_name: 'Debug User'
        },
        {
          event_id: eventId,
          title: 'Facebook-tapahtuma',
          channel: 'facebook',
          due_date: '2026-02-12',
          due_time: '14:00',
          completed: false,
          content: null,
          assignee: null,
          notes: null,
          created_by_id: null,
          created_by_email: 'debug@test.com',
          created_by_name: 'Debug User'
        }
      ];

      addLog(`📤 Tallennetaan ${tasks.length} tehtävää...`, 'info', tasks);

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasks)
        .select();

      if (error) {
        addLog(`❌ VIRHE tasks-taulussa: ${error.message}`, 'error', {
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setTestResults(prev => ({ ...prev, step3: 'failed' }));
        return false;
      }

      addLog(`✅ Tasks-tallennus onnistui! Tallennettu ${data.length} tehtävää`, 'success', data);
      setTestResults(prev => ({ ...prev, step3: 'success' }));
      return true;
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error', err);
      setTestResults(prev => ({ ...prev, step3: 'failed' }));
      return false;
    }
  };

  const testStep4_VerifyData = async (eventId) => {
    addLog('\n=== VAIHE 4: Tarkista tallennettu data ===', 'info');

    if (!eventId) {
      addLog('❌ Event ID puuttuu, ohitetaan vaihe 4', 'error');
      setTestResults(prev => ({ ...prev, step4: 'skipped' }));
      return;
    }

    try {
      // Hae tapahtuma kaikilla liittyvillä tiedoilla
      addLog('📥 Haetaan tapahtuma tietokannasta...', 'info');

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        addLog(`❌ Virhe haettaessa tapahtumaa: ${eventError.message}`, 'error');
        setTestResults(prev => ({ ...prev, step4: 'failed' }));
        return;
      }

      addLog('✅ Tapahtuma löytyi', 'success', event);

      // Hae event instances
      const { data: instances, error: instancesError } = await supabase
        .from('event_instances')
        .select('*')
        .eq('event_id', eventId)
        .order('date', { ascending: true });

      if (instancesError) {
        addLog(`❌ Virhe haettaessa instansseja: ${instancesError.message}`, 'error');
      } else {
        addLog(`✅ Löytyi ${instances.length} päivämäärää`, 'success', instances);
      }

      // Hae tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('event_id', eventId);

      if (tasksError) {
        addLog(`❌ Virhe haettaessa tehtäviä: ${tasksError.message}`, 'error');
      } else {
        addLog(`✅ Löytyi ${tasks.length} tehtävää`, 'success', tasks);
      }

      // Yhteenveto
      addLog('\n📊 YHTEENVETO:', 'info');
      addLog(`  Event ID: ${event.id}`, 'info');
      addLog(`  Otsikko: ${event.title}`, 'info');
      addLog(`  Artisti: ${event.artist}`, 'info');
      addLog(`  Päivämääriä: ${instances?.length || 0}`, 'info');
      addLog(`  Tehtäviä: ${tasks?.length || 0}`, 'info');

      setTestResults(prev => ({ ...prev, step4: 'success' }));

    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error', err);
      setTestResults(prev => ({ ...prev, step4: 'failed' }));
    }
  };

  const runFullTest = async () => {
    setLoading(true);
    setLogs([]);
    setTestResults({});
    setSavedEventId(null);

    addLog('🚀 ALOITETAAN TÄYSI TALLENNUSTESTI', 'info');
    addLog('Tämä simuloi tapahtuman lisäystä kuten index.js:ssä\n', 'info');

    // Vaihe 1: Tallenna tapahtuma
    const savedEvent = await testStep1_InsertEvent();

    if (savedEvent) {
      // Vaihe 2: Tallenna päivämäärät
      await testStep2_InsertEventInstances(savedEvent.id);

      // Vaihe 3: Tallenna tehtävät
      await testStep3_InsertTasks(savedEvent.id);

      // Vaihe 4: Tarkista data
      await testStep4_VerifyData(savedEvent.id);
    }

    addLog('\n✅ TESTI VALMIS!', 'success');
    setLoading(false);
  };

  const testRLS = async () => {
    setLoading(true);
    addLog('\n=== TESTATAAN RLS-KÄYTÄNNÖT ===', 'info');

    try {
      // Testaa events-taulun RLS
      addLog('📋 Testataan events-taulun käytäntöjä...', 'info');

      const { data: eventsSelect, error: eventsSelectError } = await supabase
        .from('events')
        .select('id')
        .limit(1);

      if (eventsSelectError) {
        addLog(`❌ Events SELECT epäonnistui: ${eventsSelectError.message}`, 'error');
      } else {
        addLog('✅ Events SELECT toimii', 'success');
      }

      // Testaa event_instances-taulun RLS
      addLog('📋 Testataan event_instances-taulun käytäntöjä...', 'info');

      const { data: instancesSelect, error: instancesSelectError } = await supabase
        .from('event_instances')
        .select('id')
        .limit(1);

      if (instancesSelectError) {
        addLog(`❌ Event_instances SELECT epäonnistui: ${instancesSelectError.message}`, 'error');
      } else {
        addLog('✅ Event_instances SELECT toimii', 'success');
      }

      // Testaa tasks-taulun RLS
      addLog('📋 Testataan tasks-taulun käytäntöjä...', 'info');

      const { data: tasksSelect, error: tasksSelectError } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);

      if (tasksSelectError) {
        addLog(`❌ Tasks SELECT epäonnistui: ${tasksSelectError.message}`, 'error');
      } else {
        addLog('✅ Tasks SELECT toimii', 'success');
      }

      addLog('\n✅ RLS-testit valmiit!', 'success');
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error', err);
    }

    setLoading(false);
  };

  const checkSchema = async () => {
    setLoading(true);
    addLog('\n=== TARKISTETAAN TIETOKANTASKEEMA ===', 'info');

    try {
      // Tarkista events-taulun rakenne
      addLog('📋 Events-taulu:', 'info');
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .limit(1);

      if (eventsError) {
        addLog(`❌ Virhe: ${eventsError.message}`, 'error');
      } else if (events && events.length > 0) {
        const fields = Object.keys(events[0]);
        addLog(`  Kenttiä: ${fields.length}`, 'info');
        fields.forEach(field => addLog(`    - ${field}`, 'info'));
      } else {
        addLog('  Taulu on tyhjä', 'warning');
      }

      // Tarkista event_instances-taulun rakenne
      addLog('\n📋 Event_instances-taulu:', 'info');
      const { data: instances, error: instancesError } = await supabase
        .from('event_instances')
        .select('*')
        .limit(1);

      if (instancesError) {
        addLog(`❌ Virhe: ${instancesError.message}`, 'error');
      } else if (instances && instances.length > 0) {
        const fields = Object.keys(instances[0]);
        addLog(`  Kenttiä: ${fields.length}`, 'info');
        fields.forEach(field => addLog(`    - ${field}`, 'info'));
      } else {
        addLog('  Taulu on tyhjä', 'warning');
      }

      // Tarkista tasks-taulun rakenne
      addLog('\n📋 Tasks-taulu:', 'info');
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .limit(1);

      if (tasksError) {
        addLog(`❌ Virhe: ${tasksError.message}`, 'error');
      } else if (tasks && tasks.length > 0) {
        const fields = Object.keys(tasks[0]);
        addLog(`  Kenttiä: ${fields.length}`, 'info');
        fields.forEach(field => addLog(`    - ${field}`, 'info'));
      } else {
        addLog('  Taulu on tyhjä', 'warning');
      }

      addLog('\n✅ Skeematarkistus valmis!', 'success');
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error', err);
    }

    setLoading(false);
  };

  const deleteTestData = async () => {
    if (!savedEventId) {
      alert('Ei poistettavaa dataa');
      return;
    }

    if (!confirm(`Haluatko varmasti poistaa testitapahtuman ID ${savedEventId}?`)) {
      return;
    }

    setLoading(true);
    addLog(`\n🗑️ Poistetaan testitapahtuma ID ${savedEventId}...`, 'info');

    try {
      // Poista tapahtuma (tasks ja instances poistuvat automaattisesti CASCADE:n vuoksi)
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', savedEventId);

      if (error) {
        addLog(`❌ Virhe poistossa: ${error.message}`, 'error');
      } else {
        addLog('✅ Testitapahtuma poistettu!', 'success');
        setSavedEventId(null);
      }
    } catch (err) {
      addLog(`❌ ODOTTAMATON VIRHE: ${err.message}`, 'error', err);
    }

    setLoading(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Debug: Tapahtumien lisäys (Uusi rakenne)</h1>
          <p className="text-gray-600">
            Testaa ja debuggaa monipäiväisten tapahtumien tallennusta (events + event_instances + tasks)
          </p>
        </div>

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

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="font-bold mb-3">📊 Testien tila</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className={`p-3 rounded text-center ${
                testResults.step1 === 'success' ? 'bg-green-100 text-green-800' :
                testResults.step1 === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-500'
              }`}>
                <div className="font-bold">Vaihe 1</div>
                <div className="text-sm">Events-taulu</div>
              </div>
              <div className={`p-3 rounded text-center ${
                testResults.step2 === 'success' ? 'bg-green-100 text-green-800' :
                testResults.step2 === 'failed' ? 'bg-red-100 text-red-800' :
                testResults.step2 === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-500'
              }`}>
                <div className="font-bold">Vaihe 2</div>
                <div className="text-sm">Event_instances</div>
              </div>
              <div className={`p-3 rounded text-center ${
                testResults.step3 === 'success' ? 'bg-green-100 text-green-800' :
                testResults.step3 === 'failed' ? 'bg-red-100 text-red-800' :
                testResults.step3 === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-500'
              }`}>
                <div className="font-bold">Vaihe 3</div>
                <div className="text-sm">Tasks-taulu</div>
              </div>
              <div className={`p-3 rounded text-center ${
                testResults.step4 === 'success' ? 'bg-green-100 text-green-800' :
                testResults.step4 === 'failed' ? 'bg-red-100 text-red-800' :
                testResults.step4 === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-500'
              }`}>
                <div className="font-bold">Vaihe 4</div>
                <div className="text-sm">Tarkistus</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Testit</h2>
              <div className="space-y-3">
                <button
                  onClick={runFullTest}
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg disabled:bg-gray-300"
                >
                  🚀 Aja täysi tallennustesti
                </button>
                <button
                  onClick={checkSchema}
                  disabled={loading}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  📋 Tarkista tietokantaskeema
                </button>
                <button
                  onClick={testRLS}
                  disabled={loading}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  🔒 Testaa RLS-käytännöt
                </button>
                <button
                  onClick={checkConnection}
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                >
                  🔄 Tarkista yhteys uudelleen
                </button>
                {savedEventId && (
                  <button
                    onClick={deleteTestData}
                    disabled={loading}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-300"
                  >
                    🗑️ Poista testitapahtuma (ID: {savedEventId})
                  </button>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold mb-2">💡 Mitä testi tekee?</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Tallentaa tapahtuman events-tauluun</li>
                <li>Tallentaa 2 päivämäärää event_instances-tauluun</li>
                <li>Tallentaa 2 tehtävää tasks-tauluun</li>
                <li>Hakee ja tarkistaa tallennetun datan</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-bold mb-2">⚠️ Yleisiä ongelmia</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li><strong>RLS-virhe:</strong> Tarkista Supabase RLS-käytännöt</li>
                <li><strong>Foreign key -virhe:</strong> Events-tallennus epäonnistui</li>
                <li><strong>Null constraint:</strong> Pakollinen kenttä puuttuu</li>
              </ul>
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
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs h-[700px] overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-2">
                  <div className={`${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                  {log.data && (
                    <pre className="text-xs text-blue-300 ml-4 mt-1 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
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
