# Brändiohjedokumenttien latausopas

## Yleiskatsaus

Brändiohjedokumenttien lataus ja prosessointi on jaettu kahteen vaiheeseen:

1. **Lataus** - Dokumentti ladataan Supabase Storageen
2. **Prosessointi** - AI lukee dokumentin ja luo tiivistelmän

## Käyttöohje

### 1. Lataa dokumentti

1. Mene admin-paneeliin
2. Klikkaa "Lataa dokumentti" -nappia
3. Anna dokumentille otsikko (esim. "Brändiohje 2024")
4. Valitse PDF-tiedosto (max 50 MB)
5. Klikkaa "Lataa dokumentti"

**Mitä tapahtuu:**
- Näet latauksen edistymisen prosentteina
- Dokumentti lähetetään Supabase Storageen
- Status: **Ladattu** ✅

### 2. Prosessoi dokumentti AI:lla

Kun dokumentti on ladattu:

1. Klikkaa dokumentin "🤖 Prosessoi AI:lla" -nappia
2. Vahvista toiminto

**Mitä tapahtuu:**
- Status muuttuu: **Prosessoidaan...** (animoitu)
- Lista päivittyy automaattisesti 5 sekunnin välein
- AI lukee PDF:n sisällön
- AI luo tiivistelmän brändiohjeista (fokus: ääni, sävy, avainsanat, värit, arvot)
- Tiivistelmä tallennetaan tietokantaan
- Status muuttuu: **Prosessoitu** ✅

Prosessointi kestää tyypillisesti **30-120 sekuntia** dokumentin koosta riippuen.

### 3. Virhetilanteet

Jos prosessointi epäonnistuu:
- Status: **Virhe** ❌
- Virheilmoitus näkyy statuksen alla
- Voit yrittää uudelleen klikkaamalla "🤖 Prosessoi AI:lla"

## Tekniset yksityiskohdat

### Tietokantarakenne

```sql
brand_guidelines:
  - id (uuid)
  - title (text)
  - file_name (text)
  - file_url (text)
  - file_path (text)
  - content (text) - PDF:n tekstisisältö
  - summary (text) - AI:n luoma tiivistelmä
  - status (text) - 'uploaded' | 'processing' | 'processed' | 'error'
  - error_message (text) - Virheilmoitus
  - processed_at (timestamp)
  - created_at (timestamp)
  - uploaded_by_id (uuid)
  - uploaded_by_email (text)
  - is_active (boolean)
```

### Status-vaiheet

1. **uploaded** - Dokumentti ladattu, odottaa prosessointia
2. **processing** - AI prosessoi dokumenttia
3. **processed** - Valmis, tiivistelmä luotu
4. **error** - Virhe prosessoinnissa

### Integrointi AI-sisältöön

Kun dokumentti on prosessoitu (`status = 'processed'`):
- Tiivistelmä haetaan automaattisesti `getBrandGuidelinesContext()` funktiolla
- Lisätään kaikkiin Claude API -kutsuihin system promptissa
- Vaikuttaa:
  - Somepostausten luontiin
  - Uutiskirjeiden luontiin
  - Ideoinnin tuloksiin
  - Muuhun AI-sisällöntuotantoon

## Migraatio

Jos teet puhtaan asennuksen tai päivität olemassa olevaa tietokantaa:

```bash
# Aja migraatio Supabase SQL Editorissa:
cat migrations/add_brand_guidelines_status.sql
```

Tämä lisää:
- `status` kenttä (default: 'uploaded')
- `error_message` kenttä
- Indeksi statukselle
- Päivittää vanhat rivit ('processed' tai 'uploaded')

## Testaus

1. Lataa pieni PDF (esim. 1-2 sivua)
2. Tarkkaile latauksen edistymistä
3. Klikkaa "Prosessoi AI:lla"
4. Tarkkaile statuksen muutoksia (pitäisi päivittyä automaattisesti)
5. Kun valmis, klikkaa "Avaa" nähdäksesi dokumentin
6. Tarkista että tiivistelmä on luotu:
   ```sql
   SELECT title, status, length(summary), error_message
   FROM brand_guidelines
   ORDER BY created_at DESC
   LIMIT 1;
   ```

## Vianmääritys

### Lataus jumittuu 0%:ssa
- Tarkista selaimen console (F12)
- Tarkista että Supabase Storage on konfiguroitu
- Varmista että `brand-guidelines` bucket on olemassa

### Prosessointi epäonnistuu
- Tarkista että ANTHROPIC_API_KEY on asetettu
- Tarkista palvelimen lokit virheistä
- Varmista että PDF on validi (ei vaurioitunut)

### Status ei päivity
- Päivitä sivu manuaalisesti (F5)
- Tarkista että auto-refresh toimii (5 sek välein kun status = 'processing')

### Dokumentti näkyy "Ladattu" mutta ei "Prosessoitu"
- Klikkaa "🤖 Prosessoi AI:lla" -nappia manuaalisesti
- Jos virhe, lue virheilmoitus statuksen alta
- Yritä uudelleen

## API Endpoints

- `POST /api/brand-guidelines/upload` - Lataa dokumentti
- `POST /api/brand-guidelines/process` - Prosessoi dokumentti
- `GET /api/brand-guidelines/list` - Listaa dokumentit
- `DELETE /api/brand-guidelines/delete?id=X` - Poista dokumentti

## Turvallisuus

- Vain admin-käyttäjät voivat ladata dokumentteja
- JWT token validoidaan jokaisessa API-kutsussa
- Supabase RLS policyt suojaavat tietokantaa
- Storage on julkinen (public bucket) mutta vain adminit voivat ladata
