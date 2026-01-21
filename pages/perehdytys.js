import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Perehdytys() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('yleiskatsaus');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    setLoading(false);
  };

  const sections = [
    { id: 'yleiskatsaus', name: 'Yleiskatsaus', icon: '🏠' },
    { id: 'tapahtumat', name: 'Tapahtumat', icon: '📅' },
    { id: 'ideoi', name: 'AI-ideointi', icon: '💡' },
    { id: 'sisalto', name: 'Sisältökalenteri', icon: '📊' },
    { id: 'tehtavat', name: 'Tehtävät', icon: '✅' },
    { id: 'mallit', name: 'Sisältömallit', icon: '📝' },
    { id: 'uutiskirje', name: 'Uutiskirjeet', icon: '📧' },
    { id: 'tiimi', name: 'Tiimityöskentely', icon: '👥' },
    { id: 'vinkit', name: 'Vinkit', icon: '💫' }
  ];

  const features = {
    yleiskatsaus: {
      title: 'Tervetuloa Kirkkopuiston markkinointityökaluun!',
      description: 'Tämä sovellus on suunniteltu helpottamaan markkinoinnin suunnittelua ja toteutusta. Yhdistämme tapahtumien hallinnan, tekoälyavusteisen sisällöntuotannon ja tiimityöskentelyn samaan alustaan.',
      points: [
        'Hallitse tapahtumakalenteria ja markkinointitehtäviä yhdessä paikassa',
        'Hyödynnä tekoälyä sisällön ideoinnissa ja tuottamisessa',
        'Suunnittele some-sisältöä ja uutiskirjeitä tehokkaasti',
        'Jaa tehtäviä tiimillesi ja seuraa edistymistä',
        'Vie tietoja Excel-, PDF- ja iCal-muodoissa'
      ]
    },
    tapahtumat: {
      title: 'Tapahtumien hallinta',
      description: 'Etusivu on sovelluksen sydän, jossa hallitset kaikki tapahtumat ja niihin liittyvät markkinointitoimenpiteet.',
      points: [
        '📅 <strong>Kalenterinäkymät:</strong> Vaihtele kuukausi-, viikko-, lista- ja työpöytänäkymien välillä',
        '➕ <strong>Lisää tapahtumia:</strong> Luo uusia tapahtumia ja järjestelmä luo automaattisesti markkinointitehtävät',
        '🎨 <strong>Tapahtuman tiedot:</strong> Lisää artisti, päivämäärä, kellonaika ja yhteenveto',
        '📸 <strong>Kuvagalleria:</strong> Liitä tapahtumiin kuvia suoraan sovelluksessa',
        '🔄 <strong>Somepostaukset:</strong> Luo ja aikatauluta somepostauksia kalenteriin',
        '📥 <strong>Tuonti:</strong> Tuo tapahtumia tekstimuodossa nopeasti',
        '📤 <strong>Vienti:</strong> Vie kalenteria PDF-, Excel- tai iCal-muodoissa'
      ],
      link: '/',
      linkText: 'Siirry kalenteriin'
    },
    ideoi: {
      title: 'AI-avusteinen ideointi',
      description: 'Ideointi-sivulla pääset keskustelemaan Claude AI:n kanssa markkinointisisällön luomisesta.',
      points: [
        '💬 <strong>Vuorovaikutteinen keskustelu:</strong> Kysy neuvoja, ideoita ja apua AI:lta',
        '✨ <strong>Sisällön luominen:</strong> Pyydä AI:ta kirjoittamaan some-päivityksiä, uutiskirjeitä tai kampanjoita',
        '🎯 <strong>Strategiset vinkit:</strong> Saat ehdotuksia markkinointistrategioista ja kampanjoista',
        '📝 <strong>Sisältömallit:</strong> Luo helposti sisältömalleja eri kanaviin',
        '💾 <strong>Keskustelut tallennetaan:</strong> Voit palata aikaisempiin keskusteluihin',
        '➕ <strong>Lisää suoraan somepostaukseksi:</strong> Tallenna AI:n tuottama sisältö suoraan kalenteriin'
      ],
      link: '/ideoi',
      linkText: 'Aloita ideointi'
    },
    sisalto: {
      title: 'Sisältökalenteri',
      description: 'Sisältökalenterissa näet yhteenvedon kaikesta tulevasta sisällöstä ja saat AI-avusteisia ehdotuksia.',
      points: [
        '📊 <strong>Visuaalinen aikajana:</strong> Näe kaikki tapahtumat ja somepostaukset aikajanalla',
        '🔍 <strong>Aukkojen havaitseminen:</strong> Järjestelmä tunnistaa päivät, joille ei ole suunniteltu sisältöä',
        '🤖 <strong>AI-ehdotukset:</strong> Saat automaattisia sisältöideoita tyhjille päiville',
        '🎨 <strong>Kanavajako:</strong> Näet sisällön jakauman eri somekanavilla',
        '📈 <strong>Tilastot:</strong> Yhteenveto tulevasta sisällöstä ja sen määrästä',
        '🔗 <strong>Nopea navigointi:</strong> Siirry suoraan muokkaamaan sisältöjä'
      ],
      link: '/sisaltokalenteri',
      linkText: 'Avaa sisältökalenteri'
    },
    tehtavat: {
      title: 'Tehtävien hallinta',
      description: 'Tehtävät-sivulla näet kaikki markkinointitehtävät ja voit seurata niiden edistymistä.',
      points: [
        '✅ <strong>Kaikki tehtävät yhdessä paikassa:</strong> Näe kaikki avoimet ja valmiit tehtävät',
        '🔍 <strong>Suodattimet:</strong> Rajaa tehtäviä deadlinen, kanavan, vastuuhenkilön tai tilan mukaan',
        '👤 <strong>Omat tehtävät:</strong> Näe helposti sinulle osoitetut tehtävät',
        '⚠️ <strong>Kiireelliset tehtävät:</strong> Korosta myöhässä olevat ja lähestyvät deadlinet',
        '📝 <strong>Tehtävän tiedot:</strong> Lisää sisältöä, muistiinpanoja ja linkkejä tehtäviin',
        '🤖 <strong>AI-sisältö:</strong> Luo tehtävään sisältöä AI:n avulla suoraan tehtävänäkymästä',
        '✔️ <strong>Merkitse valmiiksi:</strong> Seuraa tehtävien valmistumista'
      ],
      link: '/tehtavat',
      linkText: 'Näytä tehtävät'
    },
    mallit: {
      title: 'Sisältömallit',
      description: 'Mallit-sivulla löydät valmiita sisältömalleja eri kanaviin ja voit luoda uusia AI:n avulla.',
      points: [
        '📱 <strong>Kanavakohtaiset mallit:</strong> Instagram, Facebook, TikTok ja uutiskirje',
        '✨ <strong>AI-generointi:</strong> Luo uusia malleja AI:n avulla',
        '📝 <strong>Valmiit pohjat:</strong> Käytä valmiita malleja nopeaan sisällöntuotantoon',
        '🔄 <strong>Muokkaa ja tallenna:</strong> Muokkaa malleja tarpeidesi mukaan',
        '🎯 <strong>Tehokas workflow:</strong> Käytä malleja pohjaksi somepostauksille',
        '💾 <strong>Mallipankki:</strong> Kaikki mallit tallennetaan ja ovat käytettävissä jatkossa'
      ],
      link: '/mallit',
      linkText: 'Selaa malleja'
    },
    uutiskirje: {
      title: 'Uutiskirjeiden luominen',
      description: 'Uutiskirje-sivulla luot ja lähetät uutiskirjeitä AI:n avustuksella.',
      points: [
        '📧 <strong>AI-pohjainen luominen:</strong> Anna AI:n kirjoittaa uutiskirje tapahtumien perusteella',
        '📅 <strong>Automaattinen sisältö:</strong> Valitse ajankohta ja AI kerää relevantit tapahtumat',
        '✏️ <strong>Muokkaa sisältöä:</strong> Muokkaa AI:n tuottamaa sisältöä haluamaksesi',
        '👀 <strong>Esikatsele:</strong> Näe miltä uutiskirje näyttää ennen lähettämistä',
        '📤 <strong>Lähetä:</strong> Lähetä uutiskirje suoraan sovelluksesta',
        '💾 <strong>Tallenna luonnokset:</strong> Tallenna keskeneräiset uutiskirjeet myöhempää käsittelyä varten'
      ],
      link: '/uutiskirje',
      linkText: 'Luo uutiskirje'
    },
    tiimi: {
      title: 'Tiimityöskentely',
      description: 'Tee yhteistyötä tiimisi kanssa ja jaa tehtäviä tehokkaasti.',
      points: [
        '👥 <strong>Tiimin jäsenet:</strong> Lisää tiimisi jäsenet sovellukseen',
        '📋 <strong>Tehtävien delegointi:</strong> Osoita tehtäviä eri henkilöille',
        '🔔 <strong>Muistutukset:</strong> Tiimin jäsenet saavat muistutuksia tehtävistään',
        '📊 <strong>Työnjako:</strong> Näe kuka tekee mitäkin',
        '✉️ <strong>Viikoittainen yhteenveto:</strong> Lähetä automaattisesti viikon tehtävät tiimille',
        '🎯 <strong>Vastuualueet:</strong> Määrittele vastuuhenkilöt eri tehtäville'
      ],
      link: '/tiimi',
      linkText: 'Hallinnoi tiimiä'
    },
    vinkit: {
      title: 'Vinkkejä tehokkaaseen käyttöön',
      description: 'Näillä vinkeillä saat kaiken irti sovelluksesta!',
      points: [
        '🎯 <strong>Aloita tapahtumista:</strong> Lisää ensin tapahtumat kalenteriin, niin markkinointitehtävät luodaan automaattisesti',
        '💡 <strong>Käytä AI:ta aktiivisesti:</strong> AI auttaa sisällöntuotannossa - älä epäröi kysyä apua',
        '📅 <strong>Suunnittele etukäteen:</strong> Käytä sisältökalenteria tunnistamaan aukot sisällöntuotannossa',
        '✅ <strong>Päivitä tehtävät säännöllisesti:</strong> Merkitse tehtävät valmiiksi heti kun ne on tehty',
        '🔄 <strong>Hyödynnä malleja:</strong> Luo sisältömalleja usein toistuviin postauksiin',
        '📤 <strong>Vie dataa tarvittaessa:</strong> Käytä Excel- ja PDF-vientejä raportteihin ja jakamiseen',
        '👥 <strong>Jaa vastuuta:</strong> Delegoi tehtäviä tiimillesi ja seuraa edistymistä',
        '📱 <strong>Asenna sovellus:</strong> Asenna sovellus puhelimeesi PWA:na helpompaa käyttöä varten',
        '🔍 <strong>Käytä suodattimia:</strong> Tehtävä- ja kalenterinäkymissä on tehokkaita suodattimia',
        '💬 <strong>Pidä AI-keskustelut relevanttina:</strong> Tyhjennä ideointisivu tarvittaessa ja aloita uusi aihe'
      ]
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  const currentSection = features[activeSection];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Perehdytys</h1>
              <span className="text-3xl">🎓</span>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              ← Takaisin etusivulle
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sivupalkki - Navigaatio */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Sisällysluettelo
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.name}
                  </button>
                ))}
              </nav>

              {/* Pikalinkit */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Pikalinkit
                </h4>
                <div className="space-y-2">
                  <Link href="/" className="block text-sm text-indigo-600 hover:text-indigo-800">
                    → Kalenteri
                  </Link>
                  <Link href="/ideoi" className="block text-sm text-indigo-600 hover:text-indigo-800">
                    → Ideoi sisältöä
                  </Link>
                  <Link href="/tehtavat" className="block text-sm text-indigo-600 hover:text-indigo-800">
                    → Tehtävät
                  </Link>
                  <Link href="/mallit" className="block text-sm text-indigo-600 hover:text-indigo-800">
                    → Sisältömallit
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Pääsisältö */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {currentSection.title}
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                {currentSection.description}
              </p>

              <div className="space-y-4">
                {currentSection.points.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-indigo-600">
                        {index + 1}
                      </span>
                    </div>
                    <div
                      className="flex-1 text-gray-700"
                      dangerouslySetInnerHTML={{ __html: point }}
                    />
                  </div>
                ))}
              </div>

              {currentSection.link && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <Link
                    href={currentSection.link}
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {currentSection.linkText} →
                  </Link>
                </div>
              )}
            </div>

            {/* Lisätietoja-laatikko */}
            {activeSection === 'yleiskatsaus' && (
              <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">🚀 Aloita tästä!</h3>
                <p className="text-lg mb-6 text-indigo-50">
                  Suosittelemme aloittamaan tutustumisen seuraavasti:
                </p>
                <ol className="space-y-3 text-indigo-50">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Tutustu <strong className="text-white">Tapahtumien hallintaan</strong> ja lisää ensimmäinen tapahtumasi</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Kokeile <strong className="text-white">AI-ideointia</strong> sisällön luomiseen</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Tarkista <strong className="text-white">Tehtävät</strong> ja merkitse niitä valmiiksi</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>Tutustu <strong className="text-white">Sisältömalleihin</strong> tehokkaampaan työskentelyyn</span>
                  </li>
                </ol>
                <div className="mt-6 pt-6 border-t border-indigo-400">
                  <p className="text-sm text-indigo-100">
                    💡 <strong>Vinkki:</strong> Voit aina palata tälle sivulle valitsemalla "Perehdytys" navigaatiosta!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
