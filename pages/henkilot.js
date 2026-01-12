import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Henkilot() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoading(true);
    if (supabase) {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (!error && data) {
        setTeamMembers(data);
      }
    }
    setLoading(false);
  };

  const addMember = async () => {
    if (!newMemberName.trim()) return;

    if (supabase) {
      const { error } = await supabase
        .from('team_members')
        .insert({ name: newMemberName.trim() });

      if (error) {
        alert('Virhe lisättäessä: ' + error.message);
      } else {
        setNewMemberName('');
        loadTeamMembers();
      }
    }
  };

  const updateMember = async (id) => {
    if (!editingName.trim()) return;

    if (supabase) {
      const { error } = await supabase
        .from('team_members')
        .update({ name: editingName.trim() })
        .eq('id', id);

      if (error) {
        alert('Virhe päivitettäessä: ' + error.message);
      } else {
        setEditingId(null);
        setEditingName('');
        loadTeamMembers();
      }
    }
  };

  const deleteMember = async (id, name) => {
    if (!confirm(`Haluatko varmasti poistaa henkilön "${name}"?`)) return;

    if (supabase) {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Virhe poistettaessa: ' + error.message);
      } else {
        loadTeamMembers();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center text-gray-600">Ladataan...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Otsikko ja navigaatio */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">👥 Vastuuhenkilöt</h1>
          <div className="space-x-4">
            <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              ← Etusivu
            </Link>
            <Link href="/tehtavat" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              📋 Tehtävät
            </Link>
          </div>
        </div>

        {/* Lisää uusi henkilö */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Lisää uusi henkilö</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMember()}
              placeholder="Henkilön nimi"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={addMember}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Lisää
            </button>
          </div>
        </div>

        {/* Henkilölista */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            Kaikki vastuuhenkilöt ({teamMembers.length})
          </h2>

          {teamMembers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Ei vastuuhenkilöitä. Lisää ensimmäinen yllä olevalla lomakkeella.
            </p>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  {editingId === member.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && updateMember(member.id)}
                        className="flex-1 px-3 py-2 border rounded-lg mr-3"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateMember(member.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                          Tallenna
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingName('');
                          }}
                          className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                        >
                          Peruuta
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-medium">{member.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(member.id);
                            setEditingName(member.name);
                          }}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                        >
                          Muokkaa
                        </button>
                        <button
                          onClick={() => deleteMember(member.id, member.name)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                        >
                          Poista
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ohje */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">💡 Ohje:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Lisää tähän tiimin jäsenten nimet</li>
            <li>Voit käyttää näitä nimiä kun luot tehtäviä</li>
            <li>Tehtävät-sivulla voit suodattaa tehtävät vastuuhenkilön mukaan</li>
            <li>Jos poistat henkilön, hänen tehtävänsä jäävät tallessa mutta ilman vastuuhenkilöä</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
