/**
 * Tämä skripti simuloi mitä tapahtuu kun käyttäjä yrittää luoda uutiskirjeen
 * "Turku Craft Beer Festival" -tapahtumasta oletusnäkymästä.
 *
 * KÄYTTÄJÄN TOIMENPITEET:
 * 1. Käyttäjä avaa oletusnäkymän (index.js) jossa näkee tapahtumat
 * 2. Käyttäjä näkee "Turku Craft Beer Festival" -tapahtuman
 * 3. Käyttäjä valitsee tapahtuman ja klikkaa "Luo uutiskirje" -nappia
 * 4. Frontend lähettää POST-pyynnön /api/generate-newsletter
 */

const http = require('http');

// Simuloidaan käyttäjän valitsema tapahtuma
const mockEventIds = [123]; // Oikea ID tulisi Supabasesta

console.log('\n=== SIMULOITU UUTISKIRJEEN LUONTI ===\n');
console.log('Käyttäjän toimenpiteet:');
console.log('1. ✅ Avasi oletusnäkymän (http://localhost:3000)');
console.log('2. ✅ Näki "Turku Craft Beer Festival" -tapahtuman listassa');
console.log('3. ✅ Valitsi tapahtuman ja klikkasi "Luo uutiskirje" -nappia');
console.log('4. ⏳ Frontend lähettää nyt POST-pyynnön /api/generate-newsletter\n');

const postData = JSON.stringify({
  selectedEventIds: mockEventIds,
  tone: 'casual',
  sendEmails: false
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-newsletter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Lähetetään pyyntö...');
console.log('URL: http://localhost:3000/api/generate-newsletter');
console.log('Payload:', postData);
console.log('\nVastaus API:sta:\n');

const req = http.request(options, (res) => {
  console.log(`HTTP Status: ${res.statusCode}`);
  console.log(`Headers:`, JSON.stringify(res.headers, null, 2));
  console.log('\nBody:');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));

      console.log('\n=== YHTEENVETO ===\n');
      if (res.statusCode === 200) {
        console.log('✅ API-kutsu onnistui!');
        if (jsonData.variants) {
          console.log(`✅ Generoitiin ${jsonData.variants.length} uutiskirjevarianttia`);
        }
        if (jsonData.html) {
          console.log('✅ HTML-esikatselu luotu');
          console.log(`   HTML-pituus: ${jsonData.html.length} merkkiä`);
        }
      } else {
        console.log('❌ API-kutsu epäonnistui');
        if (jsonData.error) {
          console.log(`   Virhe: ${jsonData.error}`);
        }
        if (jsonData.debug) {
          console.log('   Debug-tiedot:');
          console.log(JSON.stringify(jsonData.debug, null, 2));
        }
      }

      // Analysoitu ongelma
      if (res.statusCode !== 200) {
        console.log('\n=== ONGELMAN ANALYYSI ===\n');
        console.log('Todennäköinen syy:');
        if (jsonData.error && jsonData.error.includes('löytynyt')) {
          console.log('  → Tapahtumaa (ID: ' + mockEventIds[0] + ') ei löydy tietokannasta');
          console.log('  → Tietokantayhteys saattaa olla poikki tai tapahtumaa ei ole lisätty');
        } else if (jsonData.error && jsonData.error.includes('ANTHROPIC_API_KEY')) {
          console.log('  → Claude AI API-avain puuttuu tai on virheellinen');
        } else {
          console.log('  → Muu virhe, katso error-kenttä');
        }
      }

    } catch (e) {
      console.log(data);
      console.log('\n❌ Vastausta ei voitu parsea JSON:ksi');
    }

    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.error('❌ Virhe:', error.message);
  console.log('\nMahdollisia syitä:');
  console.log('  - Development server ei ole käynnissä');
  console.log('  - Yhteys porttiin 3000 epäonnistui');
  process.exit(1);
});

req.write(postData);
req.end();
