# Monipäiväisten tapahtumien tuki - Muutosloki

## Yhteenveto

Toteutettu tuki monipäiväisille tapahtumille, joilla jokaisella päivällä voi olla omat aloitus- ja lopetuskellonajat.

## Muutokset

### 🗄️ Tietokanta

#### Uusi taulu: `event_instances`
- Sisältää yksittäisen tapahtumapäivän tiedot
- Kentät:
  - `id` - Primary key
  - `event_id` - Foreign key viittaus events-tauluun
  - `date` - Päivämäärä (DATE)
  - `start_time` - Aloitusaika (TEXT, HH:MM muodossa, valinnainen)
  - `end_time` - Lopetusaika (TEXT, HH:MM muodossa, valinnainen)
  - `created_at`, `updated_at` - Aikaleimoja

#### Muutokset `events`-tauluun
- `date` kenttä muutettu optionaaliseksi (backward compatibility)
- `time` kenttä pysyy optionaalisena
- Uudet tapahtumat käyttävät `event_instances`-taulua

#### Migraatio
- Sijainti: `migrations/add-event-instances.sql`
- Migroi automaattisesti vanhat tapahtumat uuteen rakenteeseen
- Säilyttää backward compatibility

### 🎨 Frontend

#### Uuden tapahtuman lomake (`pages/index.js`)
- **Monipäiväinen käyttöliittymä:**
  - Mahdollisuus lisätä useita päiviä tapahtumalle
  - "➕ Lisää päivä" -nappi
  - Jokaiselle päivälle:
    - Päivämäärä (pakollinen)
    - Aloitusaika (valinnainen)
    - Lopetusaika (valinnainen)
  - Mahdollisuus poistaa yksittäisiä päiviä
  - Visuaalisesti selkeä jako: eri väritausta jokaiselle päivälle

#### State-rakenne
```javascript
newEvent: {
  title: '',
  dates: [
    { date: '', startTime: '', endTime: '' }
  ],
  artist: '',
  eventType: 'artist',
  summary: '',
  tasks: []
}
```

#### Tallennus
- Tallennetaan master event `events`-tauluun
- Tallennetaan jokainen päivä erikseen `event_instances`-tauluun
- Automaattinen tehtävien luonti perustuu ensimmäiseen päivään

#### Lataus
- SQL query lataa sekä `events` että `event_instances` tiedot
- Muunnetaan automaattisesti `dates`-arrayksi frontendissä
- Backward compatibility: `event.date` ja `event.time` kentät säilyvät

#### Esikatselu-modaali
- Näyttää kaikki päivät ja kellonajat selkeästi
- Lista-muodossa jokainen päivä omana rivinään
- Näyttää aloitus- ja lopetusajan (jos asetettu)

#### Muokkaus-toiminto
- Tuki monipäiväisten tapahtumien muokkaukselle
- Mahdollisuus lisätä/poistaa päiviä muokkauksessa
- Päivittää `event_instances`-taulun kokonaisuudessaan:
  1. Poistaa vanhat instanssit
  2. Lisää uudet instanssit

#### Kalenterinäkymät
- **Tulostusmodaali:** Näyttää kaikki tapahtuman päivät
- **Lista-näkymä:** Backward compatible (näyttää ensimmäisen päivän)
- **Muut näkymät:** Toimivat ensimmäisen päivän perusteella

### ✅ Validointi

#### Lisää tapahtuma
- Vähintään yksi päivä pakollinen
- Kaikilla päivillä oltava päivämäärä täytettynä
- Kellonajat valinnaisia

#### Muokkaa tapahtumaa
- Samat validoinnit kuin lisäyksessä
- Ei voi poistaa viimeistä päivää

### 🔄 Backward Compatibility

- Vanhat tapahtumat migroituvat automaattisesti
- `event.date` ja `event.time` kentät säilyvät käytössä
- Kentät osoittavat ensimmäiseen päivään/aikaan
- LocalStorage-tallennukset toimivat ennallaan

### 📋 Ohjeet käyttöönotolle

1. **Aja tietokantamigraatio:**
   - Kirjaudu Supabase-konsoliin
   - Avaa SQL Editor
   - Kopioi ja aja `migrations/add-event-instances.sql`

2. **Deployaa frontend:**
   - Ei vaadi erityistoimenpiteitä
   - Kaikki muutokset frontendissä valmiina

3. **Testaa toiminnallisuus:**
   - Luo uusi tapahtuma usealla päivällä
   - Muokkaa olemassa olevaa tapahtumaa
   - Tarkista että kellonajat näkyvät oikein

## Esimerkkitapaukset

### Esimerkki 1: Viikonlopputapahtuma
- Perjantai 14.2.2025, klo 18:00 - 23:00
- Lauantai 15.2.2025, klo 14:00 - 00:00
- Sunnuntai 16.2.2025, klo 12:00 - 20:00

### Esimerkki 2: Festivaali
- Torstai 20.6.2025, klo 16:00 - 22:00
- Perjantai 21.6.2025, klo 12:00 - 02:00
- Lauantai 22.6.2025, klo 12:00 - 02:00
- Sunnuntai 23.6.2025, klo 12:00 - 22:00

### Esimerkki 3: Yksipäiväinen tapahtuma (ennallaan)
- Lauantai 5.4.2025, klo 20:00
- (Lopetusaika jätetty tyhjäksi)

## Huomioitavaa

- **Tehtävien deadlinet** lasketaan ensimmäisen päivän perusteella
- **Tapahtuman poisto** poistaa automaattisesti kaikki instanssit (CASCADE)
- **Järjestäminen** kalenterissa tapahtuu ensimmäisen päivän mukaan
- **Kellonajat** ovat vapaavalintaisia - voi jättää tyhjäksi

## Tekniset yksityiskohdat

### SQL Query esimerkki (lataus)
```sql
SELECT
  events.*,
  event_instances.*,
  tasks.*
FROM events
LEFT JOIN event_instances ON event_instances.event_id = events.id
LEFT JOIN tasks ON tasks.event_id = events.id
WHERE events.year = 2025
ORDER BY event_instances.date ASC;
```

### Frontend mapping
```javascript
const formattedEvents = events.map(event => ({
  id: event.id,
  title: event.title,
  dates: (event.event_instances || [])
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(inst => ({
      date: inst.date,
      startTime: inst.start_time,
      endTime: inst.end_time
    })),
  // Backward compatibility
  date: event.event_instances?.[0]?.date || event.date,
  time: event.event_instances?.[0]?.start_time || event.time,
  // ... muut kentät
}));
```

## Tiedostot

### Muokatut tiedostot:
- `pages/index.js` - Pääkalenteri ja lomakkeet
- `supabase-schema.sql` - Päivitetty tietokantaschema

### Uudet tiedostot:
- `migrations/add-event-instances.sql` - Migraatioskripti
- `migrations/README.md` - Migraatio-ohjeet
- `CHANGELOG_MULTIDAY_EVENTS.md` - Tämä tiedosto

## Päivityshistoria

- 2025-01-23: Ensimmäinen versio - Monipäiväisten tapahtumien tuki lisätty
