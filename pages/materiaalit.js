import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Materiaalit() {
  const [links, setLinks] = useState([]);
  const [brandColors, setBrandColors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    // Tässä voidaan myöhemmin ladata Supabasesta
    // Nyt käytämme kovakoodattuja arvoja jotka voit päivittää
    setLinks([
      { id: 1, title: 'Google Drive Kuvapankki', url: 'https://drive.google.com/drive/folders/1aOQFykFOi8GTinKxHV9uPhmrwSvcA6An', icon: '📸', category: 'Materiaalit' },
      { id: 2, title: 'Brändikirja', url: '', icon: '📘', category: 'Brändi' },
      { id: 3, title: 'Viestintästrategia', url: '', icon: '📊', category: 'Strategia' },
      { id: 4, title: 'Viime vuoden raportti', url: '', icon: '📈', category: 'Raportit' },
      { id: 5, title: 'Nettisivut', url: 'https://kirkkopuistonterassi.fi', icon: '🌐', category: 'Somekanavat' },
      { id: 6, title: 'Instagram', url: '', icon: '📱', category: 'Somekanavat' },
      { id: 7, title: 'Facebook', url: '', icon: '📘', category: 'Somekanavat' },
      { id: 8, title: 'TikTok', url: '', icon: '🎵', category: 'Somekanavat' },
    ]);

    setBrandColors([
      { name: 'Vihreä', hex: '#d2dbc1', usage: 'Pääväri - logot, taustat' },
      { name: 'Kerma', hex: '#f7f1d1', usage: 'Toissijainen - taustat, korostukset' },
      { name: 'Oranssi', hex: '#f89d79', usage: 'Aksentti - painikkeet, korostukset' },
      { name: 'Sininen', hex: '#88b3c0', usage: 'Lisäväri - linkit, korostukset' },
      { name: 'Musta', hex: '#2d2d2d', usage: 'Tekstit, otsikot' },
      { name: 'Valkoinen', hex: '#ffffff', usage: 'Taustat, tekstit' },
    ]);

    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Kopioitu leikepöydälle: ' + text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center text-gray-600">Ladataan...</div>
      </div>
    );
  }

  const groupedLinks = links.reduce((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category].push(link);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Otsikko ja navigaatio */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">📁 Materiaalit</h1>
          <div className="space-x-4">
            <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              ← Etusivu
            </Link>
          </div>
        </div>

        {/* Ohje */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">💡 Tervetuloa materiaalipankkiin!</h2>
          <p className="text-sm text-gray-700">
            Täältä löydät kaikki tärkeät linkit, brändi-ohjeet ja materiaalit yhdessä paikassa.
            Voit päivittää linkkejä ja tietoja suoraan tältä sivulta myöhemmin.
          </p>
        </div>

        {/* Brändivärit */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🎨 Brändivärit</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brandColors.map((color, idx) => (
              <div key={idx} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div
                  className="w-full h-24 rounded-lg mb-3 border-2 border-gray-200"
                  style={{ backgroundColor: color.hex }}
                ></div>
                <h3 className="font-semibold text-lg">{color.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{color.hex}</code>
                  <button
                    onClick={() => copyToClipboard(color.hex)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    📋 Kopioi
                  </button>
                </div>
                <p className="text-gray-600 text-sm mt-2">{color.usage}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            💡 Voit päivittää värejä myöhemmin. Tallenna oikeat värikoodit brändikirjastasi.
          </p>
        </div>

        {/* Linkit ryhmiteltyinä */}
        {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
          <div key={category} className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{link.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold">{link.title}</h3>
                      {link.url ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          {link.url}
                        </a>
                      ) : (
                        <p className="text-gray-500 text-sm italic">
                          Linkki puuttuu - lisää myöhemmin
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sisältöpohjat */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📝 Sisältöpohjat ja vakiofraasit</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
              <h3 className="font-semibold">Osoite ja yhteystiedot</h3>
              <p className="text-sm text-gray-700">Kirkkopuiston Terassi, Turku</p>
              <button
                onClick={() => copyToClipboard('Kirkkopuiston Terassi, Turku')}
                className="text-blue-600 hover:underline text-sm mt-1"
              >
                📋 Kopioi
              </button>
            </div>

            <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
              <h3 className="font-semibold">Vakio-hashtagit</h3>
              <p className="text-sm text-gray-700 font-mono">
                #kirkkopuistonterassi #turku #kesä2026 #livemusic
              </p>
              <button
                onClick={() => copyToClipboard('#kirkkopuistonterassi #turku #kesä2026 #livemusic')}
                className="text-blue-600 hover:underline text-sm mt-1"
              >
                📋 Kopioi
              </button>
            </div>

            <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
              <h3 className="font-semibold">Caption-pohja</h3>
              <p className="text-sm text-gray-700">
                "Tänään lavalla: [Artisti] 🎵<br/>
                Aika: [Kellonaika]<br/>
                Tervetuloa viettämään iltaa kanssamme! ☀️"
              </p>
              <button
                onClick={() => copyToClipboard('Tänään lavalla: [Artisti] 🎵\nAika: [Kellonaika]\nTervetuloa viettämään iltaa kanssamme! ☀️')}
                className="text-blue-600 hover:underline text-sm mt-1"
              >
                📋 Kopioi
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            💡 Lisää omia pohjia ja fraaseja myöhemmin. Nämä ovat esimerkkejä.
          </p>
        </div>

        {/* Ohje tiedostojen lisäämiseen */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-2">📌 Kuinka päivitän linkit ja tiedot?</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>Voit päivittää linkit kahdella tavalla:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Kerro Claudelle: "Päivitä Google Drive linkki materiaalit-sivulle" ja anna linkki</li>
              <li>Tallenna tiedostot projektiin ja Claude päivittää koodin</li>
            </ol>
            <p className="mt-3 font-medium">Mitä kannattaa lisätä:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Google Drive kuvapankki-linkki</li>
              <li>Brändikirja (PDF tai Google Docs linkki)</li>
              <li>Instagram, Facebook, TikTok profiilit</li>
              <li>Oikeat brändivärit ja fontit</li>
              <li>Yhteystiedot ja vakiofraasit</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
