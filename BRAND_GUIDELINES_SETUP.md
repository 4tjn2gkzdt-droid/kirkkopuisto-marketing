# Brändiohjedokumenttien hallinta

Tämä järjestelmä mahdollistaa brändiohjedokumenttien lataamisen, lukemisen ja automaattisen integroinnin kaikkiin AI-generoituihin markkinointisisältöihin.

**Tuetut tiedostomuodot:** PDF (.pdf), Markdown (.md), JSON (.json)

## Ominaisuudet

- Usean tiedostomuodon tuki: PDF, Markdown, JSON
- Dokumenttien lataus suoraan Supabase Storageen (ohittaa Vercel payload-rajoitukset)
- Automaattinen tiedoston lukeminen ja tekstin poimiminen
- AI-generoitu tiivistelmä dokumenteista
- Automaattinen integrointi kaikkiin Claude API -kutsuihin
- Admin-käyttöliittymä dokumenttien hallintaan

## Asennus

### 1. Suorita SQL-skripti Supabasessa

Aja seuraava SQL-skripti Supabase SQL Editorissa:

```bash
cat add_brand_guidelines_table.sql
```

Tämä luo:
- `brand_guidelines` -taulun dokumenttien metatiedoille
- `brand-guidelines` -storage bucketin PDF-tiedostoille
- Tarvittavat RLS-policyt

### 2. Tarkista ympäristömuuttujat

Varmista että `.env.local` -tiedostossa on seuraavat muuttujat:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Asenna riippuvuudet

```bash
npm install
```

`pdf-parse` -kirjasto on jo asennettu.

## Käyttö

### Admin-käyttöliittymä

1. Kirjaudu sisään admin-käyttäjänä
2. Mene osoitteeseen `/admin`
3. Näet "Brändiohjedokumentit" -osion
4. Klikkaa "Lataa dokumentti"
5. Valitse tiedosto (PDF, Markdown tai JSON) ja anna sille otsikko
6. Klikkaa "Lataa dokumentti"
7. Kun lataus valmis, klikkaa "Prosessoi AI:lla" luodaksesi tiivistelmän

### Mitä tapahtuu taustalla?

1. **Lataus**: Tiedosto ladataan suoraan Supabase Storageen frontend-puolelta
2. **Metadata**: Dokumentin metatiedot tallennetaan `brand_guidelines` -tauluun
3. **Prosessointi** (manuaalinen):
   - Tiedoston sisältö luetaan tiedostotyypin mukaan:
     - **PDF**: `pdf-parse` -kirjastolla
     - **Markdown**: Suoraan UTF-8 tekstinä
     - **JSON**: Parsitaan ja muotoillaan luettavaksi
   - Claude API luo tiivistelmän dokumentista (max 300 sanaa)
   - Sisältö ja tiivistelmä tallennetaan tietokantaan
4. **Integrointi**: Jatkossa kaikki Claude API -kutsut sisältävät automaattisesti brändiohjedokumenttien tiivistelmän system promptissa

## Arkkitehtuuri

### Tiedostorakenne

```
lib/api/
  brandGuidelineService.js  # Pääpalvelu dokumenttien hallintaan
  claudeService.js          # Claude API -integraatio (päivitetty)

pages/api/brand-guidelines/
  upload.js                 # Dokumenttien lataus
  list.js                   # Dokumenttien listaus
  delete.js                 # Dokumenttien poisto
  process.js                # Dokumenttien prosessointi

pages/
  admin.js                  # Admin-käyttöliittymä (päivitetty)
```

### Palvelut

#### `brandGuidelineService.js`

Pääfunktiot:
- `loadBrandGuidelines()` - Lataa kaikki aktiiviset dokumentit
- `createBrandGuideline()` - Luo uusi dokumentti
- `deleteBrandGuideline()` - Poistaa dokumentin (soft delete)
- `downloadAndReadFile()` - Lataa ja lue tiedosto Supabasesta (PDF/MD/JSON)
- `readPDFContent()` - Lue PDF-tiedosto
- `readMarkdownContent()` - Lue Markdown-tiedosto
- `readJSONContent()` - Lue ja formatoi JSON-tiedosto
- `summarizeBrandGuideline()` - Luo AI-tiivistelmä dokumentista
- `processBrandGuideline()` - Prosessoi dokumentti kokonaisuudessaan
- `getBrandGuidelinesContext()` - Palauttaa brändiohjedokumenttien kontekstin system promptiin

#### `claudeService.js`

Muutokset:
- `getEnhancedSystemPrompt()` - Lisää brändiohjedokumenttien kontekstin system promptiin
- Kaikki Claude API -kutsut käyttävät nyt automaattisesti brändiohjedokumenttien kontekstia

## API-endpointit

### POST `/api/brand-guidelines/upload`

Rekisteröi uusi brändiohjedokumentti (tiedosto on jo ladattu Supabase Storageen frontend-puolella).

**HUOM:** Tiedosto ladataan suoraan Supabase Storageen frontend-puolella, ei API:n kautta.
Tämä ohittaa Vercel payload-rajoitukset (4.5 MB).

**Pyyntö:**
```json
{
  "title": "Brändiohje 2024",
  "fileName": "brandguide.pdf",
  "filePath": "1234567890-brandguide.pdf",
  "fileUrl": "https://xxx.supabase.co/storage/v1/object/public/brand-guidelines/..."
}
```

**Vastaus:**
```json
{
  "success": true,
  "guideline": { ... },
  "message": "Dokumentti ladattu onnistuneesti. Käsittely käynnissä taustalla."
}
```

### GET `/api/brand-guidelines/list`

Hae kaikki brändiohjedokumentit.

**Vastaus:**
```json
{
  "success": true,
  "guidelines": [
    {
      "id": "uuid",
      "title": "Brändiohje 2024",
      "file_name": "brandguide.pdf",
      "file_url": "https://...",
      "summary": "Tiivistelmä dokumentista...",
      "processed_at": "2024-01-20T10:00:00Z",
      "created_at": "2024-01-20T09:00:00Z"
    }
  ]
}
```

### DELETE `/api/brand-guidelines/delete?id=uuid`

Poista brändiohjedokumentti (soft delete).

**Vastaus:**
```json
{
  "success": true,
  "message": "Dokumentti poistettu onnistuneesti"
}
```

### POST `/api/brand-guidelines/process`

Prosessoi dokumentti uudelleen (luo uusi tiivistelmä).

**Pyyntö:**
```json
{
  "id": "uuid"
}
```

**Vastaus:**
```json
{
  "success": true,
  "message": "Dokumentti prosessoitu onnistuneesti",
  "summary": "Uusi tiivistelmä..."
}
```

## Tietoturva

- **RLS (Row Level Security)**: Kaikki taulut suojattu RLS-policyilla
- **Admin-oikeudet**: Vain adminit voivat ladata ja poistaa dokumentteja
- **Julkinen luku**: Kaikki kirjautuneet käyttäjät voivat lukea aktiivisia dokumentteja
- **Storage policies**: Supabase Storage -bucketilla on omat policyt

## Rajoitukset

- Maksimi tiedostokoko: 50 MB (Supabase Storage -raja)
- Tuetut tiedostomuodot: PDF (.pdf), Markdown (.md), JSON (.json)
- Tiedoston sisältö rajoitettu 50 000 merkkiin tietokannassa
- Tiivistelmä maksimissaan 1024 tokenia (~300 sanaa)

## Tekninen toteutus: Suora Supabase Storage -lataus

Tiedostot ladataan **suoraan Supabase Storageen frontend-puolelta**, ei Vercel-funktion kautta.
Tämä ohittaa Vercelin 4.5 MB payload-rajoituksen ja mahdollistaa suurempien tiedostojen latauksen.

### Kulku:
1. Frontend lataa PDF:n suoraan Supabase Storageen (`supabase.storage.from('brand-guidelines').upload()`)
2. Frontend lähettää API:lle vain metatiedot (title, fileName, filePath, fileUrl)
3. API tallentaa metatiedot tietokantaan
4. Prosessointi lataa PDF:n Storagesta ja käsittelee sen

## Vianetsintä

### Dokumentti ei prosessoidu

1. Tarkista Supabase lokit: API → Logs
2. Tarkista Claude API -avain: `.env.local`
3. Tarkista että `pdf-parse` on asennettu: `npm list pdf-parse`

### Storage-virheet

1. Varmista että `brand-guidelines` -bucket on olemassa Supabasessa
2. Tarkista storage policies: Storage → Policies
3. Varmista että `SUPABASE_SERVICE_ROLE_KEY` on oikein

### Claude API -virheet

1. Tarkista API-avain
2. Tarkista API-quota ja rate limits
3. Katso server-lokit: `npm run dev`

## Kehitysideat

- [x] Tuki Markdown ja JSON tiedostoille
- [ ] Tuki muille tiedostoformaateille (Word, TXT)
- [ ] Dokumenttien versiointi
- [ ] Manuaalinen tiivistelmän muokkaus
- [ ] Dokumenttien ryhmittely kategorioittain
- [ ] Hakutoiminto dokumenteista
- [ ] Dokumenttien esikatselu admin-paneelissa

## Tuki

Jos kohtaat ongelmia, tarkista:
1. Supabase-lokit
2. Server-lokit (`npm run dev`)
3. Browser console -virheet
4. SQL-skriptin ajo onnistui

---

**Luotu:** 2024-01-22
**Versio:** 1.0.0
