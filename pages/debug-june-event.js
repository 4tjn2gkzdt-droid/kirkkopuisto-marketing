import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Debug-sivu: Selvittää tapahtumien lisäysongelmia
 *
 * Testaa tarkasti samat INSERT-operaatiot kuin saveNewEvent() pages/index.js:1585,
 * ja vertaa niitä savePosts() pages/index.js:330 käyttämään rakenteen kanssa.
 *
 * Tunnetut epäilykset selvitettäväksi:
 *   1. 'summary' -sarake events-taulussa (migraatiota ei löydy)
 *   2. 'created_by_*' -sarakkeet events + tasks -tauluissa
 *   3. 'assignee' ja 'notes' -sarakkeet tasks-taulussa
 *   4. Aikavyöhykevira deadline-laskennassa (toISOString vs local getDate)
 */

export default function DebugJuneEvent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedEventId, setSavedEventId] = useState(null);
  const [tableColumns, setTableColumns] = useState(null);

  const addLog = (message, type = 'info', data = null) => {
    const ts = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, { ts, message, type, data }]);
  };

  // ── 1. Tarkista sarakkeet tauluissa ──────────────────────────────
  const checkColumns = async () => {
    setLoading(true);
    addLog('── Tarkistetaan sarakkeet ──', 'info');

    try {
      const tables = ['events', 'event_instances', 'tasks'];
      const result = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
          addLog(`${table}: SELECT epäonnistui — ${error.message}`, 'error');
          result[table] = { error: error.message };
        } else if (data && data.length > 0) {
          const cols = Object.keys(data[0]);
          addLog(`${table}: ${cols.length} saraketta`, 'success', cols);
          result[table] = { columns: cols };
        } else {
          // Tyhjä taulu — kokeita INSERT + SELECT tarkistamaan skeema
          addLog(`${table}: taulu on tyhjä, yritetään kokeellinen INSERT...`, 'warning');
          result[table] = { columns: [], empty: true };
        }
      }

      setTableColumns(result);
    } catch (err) {
      addLog(`Odottamaton virhe: ${err.message}`, 'error');
    }

    setLoading(false);
  };

  // ── 2. Testi A: Tarkisti kenttä kenttä — mistä INSERT rikkoutuu ─
  const testFieldByField = async () => {
    setLoading(true);
    addLog('\n── TESTI A: Kenttä kentällä (events-taulu) ──', 'info');
    addLog('Yritetään INSERT vain pakollisilla kentillä, sitten lisätään epäilyttävät kentät yksi kerrallaan.', 'info');

    let eventId = null;

    // A1: Minimaalinen INSERT — pitää toimia
    addLog('\n  [A1] Minimaalinen INSERT (title + year + images)…', 'info');
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({ title: 'Debug A1 – minimal', year: 2026, images: {} })
        .select()
        .single();

      if (error) {
        addLog(`  [A1] VIRHE: ${error.message}`, 'error', { code: error.code, details: error.details, hint: error.hint });
      } else {
        addLog(`  [A1] OK – id=${data.id}`, 'success');
        eventId = data.id;
      }
    } catch (e) {
      addLog(`  [A1] EXCEPTION: ${e.message}`, 'error');
    }

    // A2: artist + url
    addLog('\n  [A2] Lisää artist + url…', 'info');
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({ title: 'Debug A2 – artist+url', year: 2026, images: {}, artist: 'Test Artist', url: 'https://example.com' })
        .select()
        .single();

      if (error) {
        addLog(`  [A2] VIRHE: ${error.message}`, 'error', { code: error.code, details: error.details, hint: error.hint });
      } else {
        addLog(`  [A2] OK – id=${data.id}`, 'success');
        // Poista testi-rivi
        await supabase.from('events').delete().eq('id', data.id);
      }
    } catch (e) {
      addLog(`  [A2] EXCEPTION: ${e.message}`, 'error');
    }

    // A3: + summary  ← EPÄILYTTÄVÄ: migraatiota ei löydy
    addLog('\n  [A3] Lisää summary…', 'info');
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({ title: 'Debug A3 – summary', year: 2026, images: {}, summary: 'Test yhteenveto' })
        .select()
        .single();

      if (error) {
        addLog(`  [A3] VIRHE (summary rikkoutui?): ${error.message}`, 'error', { code: error.code, details: error.details, hint: error.hint });
      } else {
        addLog(`  [A3] OK – summary-sarake on olemassa`, 'success');
        await supabase.from('events').delete().eq('id', data.id);
      }
    } catch (e) {
      addLog(`  [A3] EXCEPTION: ${e.message}`, 'error');
    }

    // A4: + created_by_* kentät ← EPÄILYTTÄVÄ
    addLog('\n  [A4] Lisää created_by_id / created_by_email / created_by_name…', 'info');
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: 'Debug A4 – created_by',
          year: 2026,
          images: {},
          created_by_id: null,
          created_by_email: 'debug@test.com',
          created_by_name: 'Debug User'
        })
        .select()
        .single();

      if (error) {
        addLog(`  [A4] VIRHE (created_by rikkoutui?): ${error.message}`, 'error', { code: error.code, details: error.details, hint: error.hint });
      } else {
        addLog(`  [A4] OK – created_by-sarakkeet ovat olemassa`, 'success');
        await supabase.from('events').delete().eq('id', data.id);
      }
    } catch (e) {
      addLog(`  [A4] EXCEPTION: ${e.message}`, 'error');
    }

    // A5: Koko INSERT tarkisti saveNewEvent (kaikki kentät + kesäkuu)
    addLog('\n  [A5] Täysi INSERT kuten saveNewEvent() tekee (kesäkuu)…', 'info');
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: 'Debug A5 – täysi saveNewEvent',
          artist: 'Test Artist',
          summary: 'Tapahtuman yhteenveto',
          url: 'https://example.com',
          year: 2026,
          images: {},
          created_by_id: null,
          created_by_email: 'debug@test.com',
          created_by_name: 'Debug User'
        })
        .select()
        .single();

      if (error) {
        addLog(`  [A5] VIRHE: ${error.message}`, 'error', { code: error.code, details: error.details, hint: error.hint });
      } else {
        addLog(`  [A5] OK – id=${data.id}`, 'success');
        // Säilytä tämä testi-event tapahtuman tallennustestiin
        if (!eventId) eventId = data.id;
        else await supabase.from('events').delete().eq('id', data.id);
      }
    } catch (e) {
      addLog(`  [A5] EXCEPTION: ${e.message}`, 'error');
    }

    // A6: Testaa tasks-taulu suspeektilla kentillä
    if (eventId) {
      addLog('\n  [A6] Testaa tasks-INSERT (assignee + notes + created_by)…', 'info');
      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            event_id: eventId,
            title: 'Debug tehtävä',
            channel: 'instagram',
            due_date: '2026-06-01',
            due_time: '12:00',
            completed: false,
            content: null,
            assignee: 'Test User',
            notes: 'Test notes',
            created_by_id: null,
            created_by_email: 'debug@test.com',
            created_by_name: 'Debug User'
          })
          .select()
          .single();

        if (error) {
          addLog(`  [A6] VIRHE (tasks): ${error.message}`, 'error', { code: error.code, details: error.details, hint: error.hint });
        } else {
          addLog(`  [A6] OK – tasks-INSERT onnistui`, 'success');
        }
      } catch (e) {
        addLog(`  [A6] EXCEPTION: ${e.message}`, 'error');
      }
    }

    // Säilytä eventId poistoa varten
    if (eventId) setSavedEventId(eventId);
    setLoading(false);
  };

  // ── 3. Testi B: Täysi kesäkuun tapahtuma (kuten saveNewEvent) ───
  const testFullJuneEvent = async () => {
    setLoading(true);
    addLog('\n── TESTI B: Täysi kesäkuun tapahtuma ──', 'info');
    addLog('Simuloi saveNewEvent() tarkisti: events → event_instances → tasks', 'info');

    try {
      // Vaihe 1: events
      addLog('\n  [B1] INSERT events…', 'info');
      const { data: savedEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          title: 'Debug – Kesäkonsertti 2026',
          artist: 'Test Band',
          summary: 'Kesäpäivän konsertti terrassilla',
          url: 'https://example.com/kesakonserti',
          year: 2026,
          images: {},
          created_by_id: null,
          created_by_email: 'debug@test.com',
          created_by_name: 'Debug User'
        })
        .select()
        .single();

      if (eventError) {
        addLog(`  [B1] VIRHE: ${eventError.message}`, 'error', { code: eventError.code, details: eventError.details, hint: eventError.hint });
        setLoading(false);
        return;
      }
      addLog(`  [B1] OK – event id=${savedEvent.id}`, 'success', savedEvent);
      setSavedEventId(savedEvent.id);

      // Vaihe 2: event_instances (kesäkuu)
      addLog('\n  [B2] INSERT event_instances (kesäkuu)…', 'info');
      const instances = [
        { event_id: savedEvent.id, date: '2026-06-14', start_time: '18:00', end_time: '22:00' },
        { event_id: savedEvent.id, date: '2026-06-15', start_time: '19:00', end_time: '23:00' }
      ];
      addLog('  Syötetävä data:', 'info', instances);

      const { error: instancesError } = await supabase
        .from('event_instances')
        .insert(instances);

      if (instancesError) {
        addLog(`  [B2] VIRHE: ${instancesError.message}`, 'error', { code: instancesError.code, details: instancesError.details, hint: instancesError.hint });
        setLoading(false);
        return;
      }
      addLog(`  [B2] OK – ${instances.length} päivää tallennettiin`, 'success');

      // Vaihe 3: tasks
      addLog('\n  [B3] INSERT tasks…', 'info');
      const tasks = [
        {
          event_id: savedEvent.id,
          title: 'Instagram Feed -postaus',
          channel: 'instagram',
          due_date: '2026-06-07',  // 7 päivää ennen
          due_time: '12:00',
          completed: false,
          content: null,
          assignee: 'Test User',
          notes: null,
          created_by_id: null,
          created_by_email: 'debug@test.com',
          created_by_name: 'Debug User'
        },
        {
          event_id: savedEvent.id,
          title: 'Facebook Event',
          channel: 'facebook',
          due_date: '2026-05-31',  // 14 päivää ennen
          due_time: '11:00',
          completed: false,
          content: null,
          assignee: null,
          notes: 'Luo FB-tapahtuma',
          created_by_id: null,
          created_by_email: 'debug@test.com',
          created_by_name: 'Debug User'
        }
      ];
      addLog('  Syötetävä data:', 'info', tasks);

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasks);

      if (tasksError) {
        addLog(`  [B3] VIRHE: ${tasksError.message}`, 'error', { code: tasksError.code, details: tasksError.details, hint: tasksError.hint });
        setLoading(false);
        return;
      }
      addLog(`  [B3] OK – ${tasks.length} tehtävää tallennettiin`, 'success');

      // Vaihe 4: Tarkistus
      addLog('\n  [B4] Tarkistus – haetaan tallennettu data…', 'info');

      const { data: eventCheck } = await supabase.from('events').select('*').eq('id', savedEvent.id).single();
      addLog('  Event:', 'success', eventCheck);

      const { data: instancesCheck } = await supabase.from('event_instances').select('*').eq('event_id', savedEvent.id);
      addLog(`  Event_instances (${instancesCheck?.length}):`, 'success', instancesCheck);

      const { data: tasksCheck } = await supabase.from('tasks').select('*').eq('event_id', savedEvent.id);
      addLog(`  Tasks (${tasksCheck?.length}):`, 'success', tasksCheck);

      addLog('\n  ✅ Testi B valmis – kaikki vaiheet onnistuivat!', 'success');
    } catch (err) {
      addLog(`  EXCEPTION: ${err.message}`, 'error');
    }

    setLoading(false);
  };

  // ── 4. Testi C: Aikavyöhyke-debug (deadline-laskenta) ──────────
  const testTimezoneDeadline = () => {
    addLog('\n── TESTI C: Aikavyöhyke-debug ──', 'info');

    const testDates = ['2026-06-01', '2026-06-15', '2026-06-30', '2026-01-01'];

    testDates.forEach(dateStr => {
      const d = new Date(dateStr);
      addLog(`\n  Syöte: "${dateStr}"`, 'info');
      addLog(`    new Date().toISOString()  = ${d.toISOString()}`, 'info');
      addLog(`    getFullYear() (local)     = ${d.getFullYear()}`, 'info');
      addLog(`    getMonth()+1  (local)     = ${d.getMonth() + 1}`, 'info');
      addLog(`    getDate()     (local)     = ${d.getDate()}`, 'info');

      // Simuloi deadline-laskenta (kuten index.js:4196-4210)
      const daysBeforeEvent = 7;
      const deadline = new Date(d);
      deadline.setDate(d.getDate() - daysBeforeEvent);
      const isoDeadline = deadline.toISOString().split('T')[0];

      // Oikea tapa (parseLocalDate)
      const [y, m, day] = dateStr.split('-').map(Number);
      const correctDate = new Date(y, m - 1, day);
      const correctDeadline = new Date(correctDate);
      correctDeadline.setDate(correctDate.getDate() - daysBeforeEvent);
      const correctIso = `${correctDeadline.getFullYear()}-${String(correctDeadline.getMonth() + 1).padStart(2, '0')}-${String(correctDeadline.getDate()).padStart(2, '0')}`;

      const mismatch = isoDeadline !== correctIso;
      addLog(
        `    Deadline (toISOString):   ${isoDeadline}  ${mismatch ? '⚠️ VÄÄRÄ' : '✓'}`,
        mismatch ? 'error' : 'success'
      );
      if (mismatch) {
        addLog(`    Deadline (oikea):         ${correctIso}`, 'success');
      }
    });
  };

  // ── 5. Poista testitapahtuma ──────────────────────────────────
  const deleteTestEvent = async () => {
    if (!savedEventId) return;
    setLoading(true);
    addLog(`\n── Poistetaan testitapahtuma id=${savedEventId} ──`, 'info');

    const { error } = await supabase.from('events').delete().eq('id', savedEventId);
    if (error) {
      addLog(`  VIRHE: ${error.message}`, 'error');
    } else {
      addLog('  ✅ Poistettu (CASCADE poistaa instances + tasks)', 'success');
      setSavedEventId(null);
    }
    setLoading(false);
  };

  // ── UI ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Debug: Kesäkuun tapahtuma</h1>
        <p className="text-sm text-gray-500 mb-4">
          Selvittää, miksi <code className="bg-gray-100 px-1 rounded">saveNewEvent()</code> saattaa epäonnistua —
          testaa taulujen sarakkeet ja INSERT-operaatiot tarkisti.
        </p>

        {/* Tunnetut epäilykset */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-amber-800 mb-2">Selvitettävät epäilykset</h3>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li><code className="bg-amber-100 px-1 rounded">summary</code> — käytetään INSERTissä, migraatiota ei löydy</li>
            <li><code className="bg-amber-100 px-1 rounded">created_by_id / email / name</code> — events ja tasks tauluissa, ei schemassa</li>
            <li><code className="bg-amber-100 px-1 rounded">assignee / notes</code> — tasks-taulussa, ei schemassa</li>
            <li>Aikavyöhykevira: <code className="bg-amber-100 px-1 rounded">toISOString()</code> vs <code className="bg-amber-100 px-1 rounded">getDate()</code> deadline-laskennassa</li>
            <li><code className="bg-amber-100 px-1 rounded">url</code> — puuttuu lomakkeen resetistä (rivi 1728)</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Napit */}
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold mb-3">Testit</h2>
              <div className="space-y-2">
                <button onClick={checkColumns} disabled={loading}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded disabled:bg-gray-300 text-sm font-medium">
                  📋 Tarkista taulujen sarakkeet
                </button>
                <button onClick={testFieldByField} disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:bg-gray-300 text-sm font-medium">
                  🔍 Testi A: Kenttä kentällä
                </button>
                <button onClick={testFullJuneEvent} disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-300 text-sm font-medium">
                  🎉 Testi B: Täysi kesäkuun tapahtuma
                </button>
                <button onClick={testTimezoneDeadline} disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded disabled:bg-gray-300 text-sm font-medium">
                  🕐 Testi C: Aikavyöhyke-debug
                </button>
                {savedEventId && (
                  <button onClick={deleteTestEvent} disabled={loading}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded disabled:bg-gray-300 text-sm font-medium">
                    🗑️ Poista testitapahtuma (id={savedEventId})
                  </button>
                )}
                <button onClick={() => setLogs([])}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded text-sm font-medium">
                  Tyhjennä lokit
                </button>
              </div>
            </div>

            {/* Sarakkeiden yhteenveto */}
            {tableColumns && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-bold mb-2">Sarakkeet tauluissa</h3>
                {Object.entries(tableColumns).map(([table, info]) => (
                  <div key={table} className="mb-3">
                    <p className="text-sm font-semibold text-gray-700">{table}</p>
                    {info.error ? (
                      <p className="text-xs text-red-500">{info.error}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(info.columns || []).map(col => {
                          const suspicious = ['summary', 'created_by_id', 'created_by_email', 'created_by_name', 'assignee', 'notes', 'url'].includes(col);
                          return (
                            <span key={col} className={`text-xs px-2 py-0.5 rounded ${suspicious ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                              {col}{suspicious ? ' ⚠️' : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loki */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold mb-2">Loki</h2>
            <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs h-[600px] overflow-y-auto">
              {logs.length === 0 && <p className="text-gray-500">Aja testi aloittaaksesi…</p>}
              {logs.map((log, i) => (
                <div key={i} className="mb-1.5">
                  <span className={`${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    <span className="text-gray-500">[{log.ts}]</span> {log.message}
                  </span>
                  {log.data && (
                    <pre className="text-blue-300 ml-4 mt-0.5 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
