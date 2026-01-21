import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function PoistaDuplikaatit() {
  // Estä pääsy production-ympäristössä
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Ei käytettävissä</h1>
          <p className="text-gray-600 mb-4">Tämä sivu ei ole käytettävissä production-ympäristössä.</p>
          <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block">
            ← Takaisin etusivulle
          </a>
        </div>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const findAndRemoveDuplicates = async () => {
    setLoading(true);
    setResults(null);

    try {
      // Hae kaikki tapahtumat
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Ryhmittele tapahtumat päivämäärän ja nimen mukaan
      const eventGroups = {};

      for (const event of events) {
        const key = `${event.date}|${event.title}`;
        if (!eventGroups[key]) {
          eventGroups[key] = [];
        }
        eventGroups[key].push(event);
      }

      // Etsi duplikaatit
      const duplicatesToDelete = [];
      const duplicateInfo = [];

      for (const [key, group] of Object.entries(eventGroups)) {
        if (group.length > 1) {
          // Pidä ensimmäinen (vanhin created_at), poista loput
          const [keep, ...remove] = group;

          duplicateInfo.push({
            title: keep.title,
            date: keep.date,
            kept: keep.id,
            removed: remove.map(r => r.id)
          });

          for (const dup of remove) {
            duplicatesToDelete.push(dup.id);
          }
        }
      }

      if (duplicatesToDelete.length === 0) {
        setResults({
          success: true,
          message: 'Ei duplikaatteja löytynyt!',
          totalEvents: events.length,
          duplicates: [],
          deleted: 0
        });
        setLoading(false);
        return;
      }

      // Poista duplikaatit
      let deletedCount = 0;
      for (const id of duplicatesToDelete) {
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .eq('id', id);

        if (!deleteError) {
          deletedCount++;
        }
      }

      setResults({
        success: true,
        message: `Poistettu ${deletedCount} duplikaattia!`,
        totalEvents: events.length,
        duplicates: duplicateInfo,
        deleted: deletedCount
      });

    } catch (error) {
      setResults({
        success: false,
        message: 'Virhe: ' + error.message,
        totalEvents: 0,
        duplicates: [],
        deleted: 0
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Otsikko ja navigaatio */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">🗑️ Poista duplikaatit</h1>
          <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            ← Etusivu
          </Link>
        </div>

        {/* Ohje */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">💡 Ohje</h2>
          <p className="text-sm text-gray-700 mb-2">
            Tämä työkalu etsii ja poistaa duplikaattitapahtumat. Duplikaatiksi lasketaan tapahtumat,
            joilla on sama päivämäärä ja nimi.
          </p>
          <p className="text-sm text-gray-700">
            <strong>Huom:</strong> Duplikaateista pidetään aina vanhin (ensimmäisenä luotu) ja poistetaan uudemmat.
          </p>
        </div>

        {/* Toimintopainike */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={findAndRemoveDuplicates}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? '⏳ Käsitellään...' : '🗑️ Etsi ja poista duplikaatit'}
          </button>
        </div>

        {/* Tulokset */}
        {results && (
          <div className={`rounded-lg shadow-md p-6 ${
            results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h2 className="text-xl font-bold mb-4">
              {results.success ? '✅ Valmis!' : '❌ Virhe'}
            </h2>

            <p className="text-lg mb-4">{results.message}</p>

            {results.duplicates.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Poistetut duplikaatit:</h3>
                <div className="space-y-2">
                  {results.duplicates.map((dup, index) => (
                    <div key={index} className="bg-white rounded p-3 text-sm">
                      <p className="font-medium">{dup.title}</p>
                      <p className="text-gray-600">{new Date(dup.date).toLocaleDateString('fi-FI')}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Pidetty: ID {dup.kept} | Poistettu: {dup.removed.length} kpl
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <Link href="/" className="text-blue-600 hover:underline">
                ← Palaa etusivulle katsomaan tulosta
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
