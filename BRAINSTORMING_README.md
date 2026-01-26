# Ideointi & Brainstorming -ominaisuus

## Yleiskuvaus

Ideointisivun avulla voit:
- **Ideoida AI:n kanssa** markkinointikampanjoita, tapahtumia ja sisältöä
- **Hyödyntää historiallista dataa** - AI käyttää aikaisempien vuosien uutisia, uutiskirjeitä ja tapahtumia inspiraationa
- **Tallentaa hyviä ideoita** ideavarastoon myöhempää käyttöä varten
- **Hallita brainstorming-sessioita** - tallenna ja palaa aikaisempiin keskusteluihin

## Asennus

### 1. Tietokantamigraatio

Aja SQL-skripti Supabase SQL Editorissa:

```bash
supabase-schema.sql      # Perus-taulut (jos ei vielä ajettu)
brainstorming-schema.sql # Brainstorming-taulut
```

Tai kopioi `brainstorming-schema.sql` sisältö Supabase Dashboard → SQL Editor → New query ja aja.

### 2. Uudelleenkäynnistä sovellus

Jos sovellus on jo käynnissä, uudelleenkäynnistä se:

```bash
npm run dev
```

## Käyttö

### Ideointi-sivu (Käyttäjille)

1. **Navigoi ideointisivulle**
   - Etusivulla klikkaa "💡 Ideointi" -painiketta

2. **Aloita keskustelu AI:n kanssa**
   - Kerro mitä ideoit (esim. "Tarvitsemme ideoita kesän 2026 markkinointikampanjaan")
   - AI hyödyntää automaattisesti:
     - Aikaisempien vuosien uutisia ja uutiskirjeitä
     - Historiallisia tapahtumia (2023-2025)
     - Brändidokumentteja

3. **Tallenna hyviä ideoita**
   - Kun AI ehdottaa jotain hyvää, klikkaa "💡 Tallenna ideana"
   - Anna idealle otsikko ja tagit
   - Idea tallentuu ideavarastoon

4. **Hallitse sessioita**
   - Klikkaa "➕ Uusi sessio" aloittaaksesi alusta
   - Sidebar näyttää aikaisemmat sessiot - klikkaa ladataksesi
   - Sidebar näyttää myös tallennetut ideat

### Historiallisen sisällön hallinta (Admin)

1. **Navigoi admin-sivulle**
   - Etusivu → "⚙️ Admin" (vain admin-käyttäjille)
   - Klikkaa "📚 Historiallinen sisältö"

2. **Lisää uutisia ja uutiskirjeitä**
   - Klikkaa "➕ Lisää sisältö"
   - Täytä lomake:
     - **Tyyppi**: Uutinen, Uutiskirje, Artikkeli, Somepostaus, Kampanja
     - **Otsikko**: Sisällön otsikko
     - **Sisältö**: Koko tekstisisältö
     - **Yhteenveto**: Lyhyt kuvaus (valinnainen, mutta suositeltu)
     - **Vuosi** ja **Julkaisupäivä**
     - **URL**: Linkki alkuperäiseen sisältöön (jos saatavilla)
   - Klikkaa "💾 Tallenna"

3. **Suodata sisältöä**
   - Käytä suodattimia nähdäksesi vain tietyntyyppistä sisältöä
   - Muokkaa tai poista sisältöä tarpeen mukaan

### Vinkkejä

**Historiallisen sisällön lisääminen:**
- Lisää vanhoja uutiskirjeitä kokonaisina teksteinä
- Kopioi uutisia www.kirkkopuistonterassi.com sivustolta
- Kirjoita yhteenveto AI:n helpottamiseksi
- Merkitse vuosi ja tyyppi oikein

**Ideoinnin tehostaminen:**
- Ole spesifi pyynnöissäsi ("kesän 2026 jazz-iltojen markkinointi")
- Kysy AI:lta aikaisempien vuosien esimerkkejä
- Tallenna parhaat ideat välittömästi ideavarastoon
- Käytä tageja löytääksesi ideat helposti myöhemmin

## Tietokantarakenne

### Uudet taulut

1. **`historical_content`** - Historiallinen sisältö (uutiset, uutiskirjeet)
   - Tyyppi, otsikko, sisältö, yhteenveto
   - Julkaisupäivä, vuosi, URL
   - Metadata (JSON)

2. **`brainstorm_sessions`** - Brainstorming-sessiot
   - Otsikko, luoja, aikaleima

3. **`brainstorm_messages`** - Viestit (käyttäjä/AI)
   - Linkitetty sessioon
   - Rooli (user/assistant)
   - Sisältö, metadata

4. **`saved_ideas`** - Tallennetut ideat
   - Otsikko, sisältö
   - Tagit (array), kategoria, status
   - Linkki sessioon (valinnainen)

5. **`brainstorm_attachments`** - Liitetiedostot (tulevaisuudessa)
   - Tiedostonimi, tyyppi, URL
   - Poimittu teksti (PDF/kuva)

## API-reitit

### Brainstorming Chat
```
POST /api/brainstorm-chat
Body: {
  messages: [...],          // Viestihistoria
  sessionId: "uuid",        // Valinnainen
  sessionTitle: "Otsikko",
  includeHistoricalContent: true,
  includeEvents: true,
  includeBrandGuidelines: true
}
```

### Ideoiden hallinta
```
GET  /api/brainstorm/save-idea        # Hae tallennetut ideat
POST /api/brainstorm/save-idea        # Tallenna uusi idea
PUT  /api/brainstorm/save-idea        # Päivitä idea
DELETE /api/brainstorm/save-idea?id=  # Poista idea
```

### Sessioiden hallinta
```
GET  /api/brainstorm/sessions              # Hae sessiot
GET  /api/brainstorm/sessions?sessionId=   # Hae session viestit
POST /api/brainstorm/sessions              # Luo uusi sessio
PUT  /api/brainstorm/sessions              # Päivitä sessio
DELETE /api/brainstorm/sessions?sessionId= # Poista sessio
```

### Historiallinen sisältö
```
GET  /api/brainstorm/historical-content        # Hae sisältöä
POST /api/brainstorm/historical-content        # Lisää sisältö
PUT  /api/brainstorm/historical-content        # Päivitä sisältö
DELETE /api/brainstorm/historical-content?id=  # Poista sisältö
```

## Palvelut (lib/api/)

- **`brainstormService.js`** - Pääpalvelu
  - `buildBrainstormContext()` - Rakentaa rikkaan kontekstin AI:lle
  - `getHistoricalContent()` - Hae historiallista sisältöä
  - `getHistoricalEvents()` - Hae aikaisempia tapahtumia
  - `saveIdea()`, `getSavedIdeas()` - Ideanhallinta
  - `createBrainstormSession()`, `saveBrainstormMessage()` - Session hallinta

## Arkkitehtuuri

```
Käyttäjä
  ↓
[brainstorming.js]
  ↓
[/api/brainstorm-chat]
  ↓
[brainstormService.buildBrainstormContext()]
  ├─ Hae historiallista sisältöä (uutiset, uutiskirjeet)
  ├─ Hae aikaisempien vuosien tapahtumia
  └─ Hae brändiohjeet
  ↓
[claudeService.createChatMessage()]
  ↓
Claude AI (+ rikas konteksti)
  ↓
← Vastaus
```

## Tulevat ominaisuudet

- [ ] Liitetiedostojen lataus (PDF, kuvat)
- [ ] PDF-tekstin poiminta AI-kontekstia varten
- [ ] Ideoiden jako tiimin kesken
- [ ] Ideoiden vienti (PDF, Word)
- [ ] AI-ehdotukset perustuen aikaisempiin ideoihin
- [ ] Integraatio sisältökalenteriin (ideoista suoraan kalenteriin)

## Tuki

Jos kohtaat ongelmia:
1. Tarkista että tietokantamigraatio on ajettu
2. Tarkista että ANTHROPIC_API_KEY on asetettu .env.local:ssa
3. Tarkista selaimen konsolista (F12) virheviestit
4. Tarkista Supabase Dashboard → Logs mahdollisia tietokantavirheitä

---

Luotu: 2026-01-26
Versio: 1.0
