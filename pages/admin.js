import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function AdminPanel() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [stats, setStats] = useState({});
  const [guidelines, setGuidelines] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (!supabase) {
      router.push('/login');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUser(session.user);

    // Hae käyttäjäprofiili
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.is_admin) {
      // Ei ole admin, ohjaa etusivulle
      alert('Sinulla ei ole oikeuksia admin-paneeliin');
      router.push('/');
      return;
    }

    setUserProfile(profile);
    setLoading(false);

    // Lataa käyttäjät
    loadUsers();
    loadStats();
    loadGuidelines();
  };

  const loadUsers = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Virhe ladattaessa käyttäjiä:', error);
      return;
    }

    setUsers(data || []);
  };

  const loadStats = async () => {
    if (!supabase) return;

    // Hae tilastot: tapahtumat, tehtävät, somepostaukset per käyttäjä
    const { data: events } = await supabase
      .from('events')
      .select('created_by_id, created_by_email, created_by_name');

    const { data: tasks } = await supabase
      .from('tasks')
      .select('created_by_id, created_by_email, created_by_name');

    const { data: socialPosts } = await supabase
      .from('social_media_posts')
      .select('created_by_id, created_by_email, created_by_name');

    const statsMap = {};

    // Laske tapahtumat
    (events || []).forEach(e => {
      if (e.created_by_id) {
        if (!statsMap[e.created_by_id]) {
          statsMap[e.created_by_id] = {
            email: e.created_by_email,
            name: e.created_by_name,
            events: 0,
            tasks: 0,
            socialPosts: 0
          };
        }
        statsMap[e.created_by_id].events++;
      }
    });

    // Laske tehtävät
    (tasks || []).forEach(t => {
      if (t.created_by_id) {
        if (!statsMap[t.created_by_id]) {
          statsMap[t.created_by_id] = {
            email: t.created_by_email,
            name: t.created_by_name,
            events: 0,
            tasks: 0,
            socialPosts: 0
          };
        }
        statsMap[t.created_by_id].tasks++;
      }
    });

    // Laske somepostaukset
    (socialPosts || []).forEach(s => {
      if (s.created_by_id) {
        if (!statsMap[s.created_by_id]) {
          statsMap[s.created_by_id] = {
            email: s.created_by_email,
            name: s.created_by_name,
            events: 0,
            tasks: 0,
            socialPosts: 0
          };
        }
        statsMap[s.created_by_id].socialPosts++;
      }
    });

    setStats(statsMap);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (!newUserEmail || !newUserPassword || !newUserName) {
      alert('Täytä kaikki kentät');
      return;
    }

    if (!supabase) {
      alert('Supabase-yhteyttä ei ole konfiguroitu');
      return;
    }

    try {
      // Luo käyttäjä Supabase Admin API:lla
      // HUOM: Tämä vaatii service_role_key:n, joka EI voi olla frontendissä
      // Tämä on yksinkertaistettu versio - tuotannossa pitää tehdä backend-endpoint

      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
        user_metadata: {
          full_name: newUserName
        }
      });

      if (error) {
        // Jos admin API ei toimi, näytä ohjeet
        alert(`
Käyttäjän luonti vaatii admin-oikeudet.

Luo käyttäjä Supabase Dashboard:ssa:
1. Mene Supabase Dashboard → Authentication → Users
2. Klikkaa "Add user"
3. Email: ${newUserEmail}
4. Auto confirm: ✓ (päällä)
5. Password: ${newUserPassword}
6. Klikkaa "Create user"

Sitten päivitä user_profiles -taulu:
UPDATE user_profiles
SET full_name = '${newUserName}', is_admin = ${newUserIsAdmin}
WHERE email = '${newUserEmail}';
        `);
        return;
      }

      // Päivitä käyttäjäprofiili admin-statuksella
      await supabase
        .from('user_profiles')
        .update({ is_admin: newUserIsAdmin, full_name: newUserName })
        .eq('id', data.user.id);

      alert(`✅ Käyttäjä ${newUserEmail} luotu!`);
      setShowAddUserModal(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserIsAdmin(false);
      loadUsers();
    } catch (err) {
      console.error('Virhe luotaessa käyttäjää:', err);
      alert('Virhe luotaessa käyttäjää: ' + err.message);
    }
  };

  const handleResetPassword = async (userId, userEmail) => {
    if (!confirm(`Lähetä salasanan resetointilinkki osoitteeseen ${userEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;

      alert(`✅ Salasanan resetointilinkki lähetetty osoitteeseen ${userEmail}`);
    } catch (err) {
      alert('Virhe: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Haluatko varmasti poistaa käyttäjän ${userEmail}?\n\nTämä poistaa myös kaikki hänen luomansa tapahtumat, tehtävät ja somepostaukset!`)) {
      return;
    }

    if (!confirm('Oletko AIVAN VARMA? Tätä ei voi perua!')) {
      return;
    }

    try {
      // Poista käyttäjän luomat tiedot
      await supabase.from('events').delete().eq('created_by_id', userId);
      await supabase.from('tasks').delete().eq('created_by_id', userId);
      await supabase.from('social_media_posts').delete().eq('created_by_id', userId);

      // Poista käyttäjäprofiili (CASCADE poistaa auth.users rivin)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      alert(`✅ Käyttäjä ${userEmail} ja hänen luomansa data poistettu`);
      loadUsers();
      loadStats();
    } catch (err) {
      alert('Virhe poistaessa käyttäjää: ' + err.message);
    }
  };

  const toggleAdmin = async (userId, currentIsAdmin, userEmail) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: !currentIsAdmin })
        .eq('id', userId);

      if (error) throw error;

      alert(`✅ Käyttäjän ${userEmail} admin-oikeudet ${!currentIsAdmin ? 'lisätty' : 'poistettu'}`);
      loadUsers();
    } catch (err) {
      alert('Virhe: ' + err.message);
    }
  };

  const loadGuidelines = async () => {
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/brand-guidelines/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setGuidelines(result.guidelines || []);
      }
    } catch (err) {
      console.error('Virhe ladattaessa dokumentteja:', err);
    }
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();

    if (!uploadFile || !uploadTitle) {
      alert('Valitse tiedosto ja anna otsikko');
      return;
    }

    setUploadLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Kirjaudu sisään ensin');
        return;
      }

      // Lue tiedosto base64-muotoon
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;

        const response = await fetch('/api/brand-guidelines/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: uploadTitle,
            fileName: uploadFile.name,
            fileData: fileData,
            contentType: uploadFile.type
          })
        });

        const result = await response.json();

        if (result.success) {
          alert('✅ Dokumentti ladattu onnistuneesti! Käsittely käynnissä taustalla.');
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadTitle('');
          loadGuidelines();
        } else {
          alert('Virhe: ' + (result.error || 'Tuntematon virhe'));
        }

        setUploadLoading(false);
      };

      reader.readAsDataURL(uploadFile);
    } catch (err) {
      console.error('Virhe ladattaessa tiedostoa:', err);
      alert('Virhe: ' + err.message);
      setUploadLoading(false);
    }
  };

  const handleDeleteGuideline = async (id, title) => {
    if (!confirm(`Haluatko varmasti poistaa dokumentin "${title}"?`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/brand-guidelines/delete?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Dokumentti poistettu');
        loadGuidelines();
      } else {
        alert('Virhe: ' + (result.error || 'Tuntematon virhe'));
      }
    } catch (err) {
      alert('Virhe: ' + err.message);
    }
  };

  const handleProcessGuideline = async (id, title) => {
    if (!confirm(`Prosessoi dokumentti "${title}" uudelleen? Tämä luo uuden tiivistelmän.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/brand-guidelines/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Dokumentti prosessoitu onnistuneesti');
        loadGuidelines();
      } else {
        alert('Virhe: ' + (result.error || 'Tuntematon virhe'));
      }
    } catch (err) {
      alert('Virhe: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">⏳ Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-800">⚙️ Admin-paneeli</h1>
              <p className="text-gray-600">Käyttäjien hallinta</p>
            </div>
            <Link href="/">
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                ← Takaisin etusivulle
              </button>
            </Link>
          </div>
        </div>

        {/* Tilastot */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Tilastot</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Käyttäjä</th>
                  <th className="px-4 py-2 text-center">Tapahtumat</th>
                  <th className="px-4 py-2 text-center">Tehtävät</th>
                  <th className="px-4 py-2 text-center">Somepostaukset</th>
                  <th className="px-4 py-2 text-center">Yhteensä</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats).map(([userId, data]) => (
                  <tr key={userId} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{data.name}</div>
                      <div className="text-sm text-gray-600">{data.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{data.events}</td>
                    <td className="px-4 py-3 text-center">{data.tasks}</td>
                    <td className="px-4 py-3 text-center">{data.socialPosts}</td>
                    <td className="px-4 py-3 text-center font-bold">
                      {data.events + data.tasks + data.socialPosts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brändiohjedokumentit */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">📄 Brändiohjedokumentit</h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
            >
              + Lataa dokumentti
            </button>
          </div>

          {guidelines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Ei dokumentteja. Lataa ensimmäinen brändiohjedokumentti!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Otsikko</th>
                    <th className="px-4 py-2 text-left">Tiedosto</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Ladattu</th>
                    <th className="px-4 py-2 text-center">Toiminnot</th>
                  </tr>
                </thead>
                <tbody>
                  {guidelines.map(g => (
                    <tr key={g.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{g.title}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{g.file_name}</td>
                      <td className="px-4 py-3 text-center">
                        {g.processed_at ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            Prosessoitu
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                            Odottaa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {new Date(g.created_at).toLocaleDateString('fi-FI')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center flex-wrap">
                          <a
                            href={g.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            👁️ Avaa
                          </a>
                          <button
                            onClick={() => handleProcessGuideline(g.id, g.title)}
                            className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
                          >
                            🔄 Prosessoi
                          </button>
                          <button
                            onClick={() => handleDeleteGuideline(g.id, g.title)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                          >
                            🗑️ Poista
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Käyttäjälista */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">👥 Käyttäjät</h2>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
            >
              + Lisää käyttäjä
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Nimi</th>
                  <th className="px-4 py-2 text-left">Sähköposti</th>
                  <th className="px-4 py-2 text-center">Admin</th>
                  <th className="px-4 py-2 text-center">Liittynyt</th>
                  <th className="px-4 py-2 text-center">Toiminnot</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{u.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      {u.is_admin ? (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                          Admin
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          Käyttäjä
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {new Date(u.created_at).toLocaleDateString('fi-FI')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => toggleAdmin(u.id, u.is_admin, u.email)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          {u.is_admin ? '⬇️ Poista admin' : '⬆️ Tee admin'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(u.id, u.email)}
                          className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
                        >
                          🔑 Resetoi salasana
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                          >
                            🗑️ Poista
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lataa dokumentti -modaali */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">📤 Lataa brändiohjedokumentti</h3>

            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Otsikko
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Esim. Brändiohje 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PDF-tiedosto
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Vain PDF-tiedostot, max 10 MB</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
                >
                  {uploadLoading ? '⏳ Ladataan...' : '✅ Lataa dokumentti'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadLoading}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium disabled:opacity-50"
                >
                  Peruuta
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="font-semibold text-blue-800">💡 Huom:</p>
              <p className="text-blue-700 mt-1">
                Dokumentti prosessoidaan automaattisesti: PDF luetaan ja AI luo siitä tiivistelmän
                joka lisätään automaattisesti kaikkiin markkinointisisällön luontiin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lisää käyttäjä -modaali */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">➕ Lisää uusi käyttäjä</h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nimi
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Janne Suominen"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sähköposti
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="janne@kirkkopuisto.local"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Salasana
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Vähintään 6 merkkiä</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-admin"
                  checked={newUserIsAdmin}
                  onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="is-admin" className="text-sm font-semibold text-gray-700">
                  Admin-oikeudet
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  ✅ Luo käyttäjä
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Peruuta
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-semibold text-yellow-800">💡 Huom:</p>
              <p className="text-yellow-700 mt-1">
                Jos käyttäjän luonti ei toimi, voit luoda käyttäjät manuaalisesti Supabase Dashboard:ssa.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
