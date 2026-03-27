# Kirkkopuiston Terassi - Markkinoinnin Työkalut

Markkinoinnin suunnittelutyökalu tapahtumille ja sisällöntuotannolle.

## Ominaisuudet

- **Tapahtumakalenteri** - Lista-, kuukausi- ja viikkonäkymä
- **Tehtävähallinta** - Automaattisesti luodut markkinointitehtävät per tapahtuma
- **Some-postauskalenteri** - Toistuva ja kertaluonteinen somepostausten suunnittelu
- **AI-ideointi** - Claude AI -pohjainen sisältöideoija
- **AI-sisällöntuotanto** - Automaattinen markkinointitekstien generointi tehtäville
- **Sisältökalenteri** - Integroitu näkymä kaikesta sisällöstä
- **Uutiskirje** - Sähköpostimarkkinoinnin hallinta
- **Pilvipalvelu** - Data tallennetaan Supabaseen (käytä samaa dataa kaikilla laitteilla)

---

## Asennus

### 1. Kloonaa repo

```bash
git clone <repo-url>
cd kirkkopuisto-marketing
npm install
```

### 2. Luo Supabase-projekti

#### A) Mene Supabaseen
1. Avaa: https://supabase.com/
2. Kirjaudu sisään (tai luo tili)
3. Klikkaa **"New Project"**

#### B) Projektin asetukset
- **Name:** `kirkkopuisto-marketing` (tai mikä tahansa)
- **Database Password:** Luo vahva salasana (tallenna turvalliseen paikkaan!)
- **Region:** Valitse `Europe (Frankfurt)` tai lähin
- **Pricing Plan:** `Free` (riittää hyvin aloitukseen)
- Klikkaa **"Create new project"**

⏳ Odota 1-2 minuuttia kunnes projekti on valmis.

#### C) Kopioi API-avaimet

1. Kun projekti on valmis, mene **Settings** (vasen sivupalkki)
2. Valitse **API**
3. Kopioi seuraavat arvot:
   - **Project URL** (esim. `https://xxxxxxxxxx.supabase.co`)
   - **anon/public key** (pitkä merkkijono alkaa `eyJ...`)

#### D) Luo tietokantataulut

1. Mene **SQL Editor** (vasen sivupalkki)
2. Klikkaa **"New query"**
3. Kopioi **koko sisältö** tiedostosta `supabase-schema.sql` editoriin
4. Klikkaa **"Run"** (tai paina F5)
5. Tarkista että näet vihreän "Success"-viestin

Aja sen jälkeen myös seuraavat migratiot samalla tavalla (järjestyksessä):
- `add_summary_column.sql`
- `add_notes_column.sql`
- `add_user_authentication.sql`
- `add_social_media_posts_table.sql`
- `add_recurrence_to_social_posts.sql`
- `add_email_to_team_members.sql`
- `add_newsletter_drafts_table.sql`
- `fix_rls_policies_final.sql`
- `add_event_type_column.sql`

✅ Tietokanta on nyt valmis!

### 3. Konfiguroi ympäristömuuttujat

Luo tiedosto `.env.local` projektin juureen:

```bash
# Anthropic API Key (Claude AI)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Resend (sähköpostimarkkinointi, valinnainen)
RESEND_API_KEY=re_...
```

**HUOM:** Korvaa arvot omillasi! Älä lisää `.env.local`-tiedostoa versionhallintaan.

### 4. Käynnistä sovellus

```bash
npm run dev
```

Avaa selaimessa: http://localhost:3000

---

## Vercel Deployment

### 1. Pushaa koodi GitHubiin

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deployaa Verceliin

1. Mene: https://vercel.com/
2. Klikkaa **"Import Project"**
3. Valitse GitHub-repo
4. Klikkaa **"Deploy"**

### 3. Lisää Environment Variables Verceliin

1. Vercel Dashboard → Projektisi → **Settings** → **Environment Variables**
2. Lisää seuraavat muuttujat (kaikki ympäristöt: Production, Preview, Development):

   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   RESEND_API_KEY=re_...
   ```

3. **Redeploy** projekti muutosten jälkeen

✅ Sovellus on nyt tuotannossa!

---

## Käyttöohjeet

### Kirjautuminen

Avaa sovellus ja kirjaudu sisään käyttäjätunnuksellasi ja salasanallasi. Ensimmäinen käyttäjätili luodaan Supabase Dashboardissa (Authentication → Users → Invite user).

Admin-käyttäjät voivat hallinnoida muita käyttäjiä **Admin**-sivulta.

---

### Tapahtumakalenteri (Etusivu)

Etusivulla näet kaikki tapahtumat ja niiden markkinointitehtävät.

#### Tapahtuman lisääminen manuaalisesti

1. Klikkaa **"+ Lisää tapahtuma"** -painiketta
2. Täytä lomake:
   - **Tapahtuman nimi** – pakollinen
   - **Tyyppi** – Artisti/Bändi, DJ tai Kirppis/Markkinat
   - **Päivämäärä** – pakollinen
   - **Aika** – valinnainen (esim. 19:00)
   - **Esiintyjä** – artisti tai DJ:n nimi
   - **Lyhyt kuvaus** – 100–300 merkkiä, käytetään AI-sisällöntuotannossa
3. Valitse **markkinointikanavat** (Instagram, Facebook, TikTok jne.) joille tehtävät luodaan
4. Valitse vastuuhenkilö tehtäville (valinnainen)
5. Klikkaa **"Esikatsele tehtävät"** tarkistaaksesi automaattisesti luodut tehtävät
6. Klikkaa **"Tallenna tapahtuma"**

Tehtävät luodaan automaattisesti valituille kanaville, ja niille asetetaan määräajat suhteessa tapahtumapäivään.

#### Tapahtumien tuominen taulukosta

Voit tuoda useita tapahtumia kerralla Excel- tai Google Sheets -taulukosta:

1. Klikkaa **"Tuo taulukosta"**
2. Kopioi rivit taulukosta (muoto: `Päivämäärä[TAB]Tyyppi[TAB]Esiintyjä[TAB]Aika`)
   - Esimerkki: `15.6.2026	Artisti: Bändi	The Beatles	19:00`
   - Päivämäärä muodossa PP.KK.VVVV
3. Liitä teksti kenttään ja klikkaa **"Tuo tapahtumat"**

Tehtävät luodaan automaattisesti jokaiselle tuodulle tapahtumalle.

#### Tapahtuman muokkaaminen

1. Etsi tapahtuma listalta
2. Klikkaa **kynä-ikonia** (✏️) tapahtuman kohdalla
3. Muokkaa tietoja ja klikkaa **"Tallenna muutokset"**

#### Tapahtuman poistaminen

1. Klikkaa **roskakorikuvaketta** (🗑️) tapahtuman kohdalla
2. Vahvista poisto – kaikki tapahtuman tehtävät poistetaan automaattisesti

#### Kalenterinäkymät

Vaihda näkymää oikeassa yläkulmassa olevilla painikkeilla:
- **Lista** – kaikki tapahtumat aikajärjestyksessä
- **Kuukausi** – kuukausinäkymä
- **Viikko** – viikkonäkymä

#### Tehtävien hallinta

1. Klikkaa tapahtuman nimeä tai **▶**-ikonia avataksesi tehtävälistan
2. Merkitse tehtävä valmiiksi rastittamalla se
3. Klikkaa tehtävää muokataksesi sisältöä, määräaikaa tai vastuuhenkilöä
4. Klikkaa **"✨ Generoi AI-sisältö"** luodaksesi markkinointitekstin tehtävälle

#### Kuvaformaatit

1. Klikkaa **"📸 Kuvat"** tapahtuman kohdalla
2. Valitse tarvittavat kuvaformaatit (Instagram Feed, Story, Facebook jne.)
3. Tallenna – tiimi tietää mitä kuvia pitää tehdä

#### Tehtäväsuodattimet

Filtteröi tehtäviä yläpalkin valinnoilla:
- **Kaikki** – näytä kaikki tehtävät
- **Omat tehtävät** – vain sinulle osoitetut
- **Kiireelliset** – tehtävät joiden deadline lähestyy
- **Tekemättä** – vain avoimet tehtävät

#### Vienti

Klikkaa **"Vie/Tulosta"** -painiketta:
- **Excel** – vie tapahtumat ja tehtävät Excel-tiedostoon
- **CSV** – vie CSV-muodossa
- **Kalenteri (ICS)** – vie kalenteritiedosto (Google Calendar, Outlook jne.)
- **Tulosta** – tulosta kalenteri

---

### Some-postaukset

Hallitse toistuvia ja kertaluonteisia some-postauksia tapahtumien lisäksi.

1. Klikkaa **"+ Lisää somepostaus"**
2. Täytä tiedot: otsikko, päivämäärä, kanava, vastuuhenkilö
3. Valitse toistuvuus (kertaluonteinen, viikoittain, kuukausittain)
4. Klikkaa **"Tallenna"**

---

### AI-ideointi

1. Klikkaa **"💡 Ideoi sisältöä"** (tai siirry Ideoi-sivulle)
2. Kirjoita kysymys tai pyyntö, esim:
   - "Anna ideoita Instagram-postaukseen kesäterassista"
   - "Minkälaisen uutiskirjeen voisin tehdä heinäkuun tapahtumista?"
   - "Kirjoita Facebook-postaus lauantain konserttiin"
3. Claude vastaa ja auttaa ideoimaan – voit jatkaa keskustelua

---

### Sisältökalenteri

Integroitu näkymä, jossa näet sekä tapahtumamarkkinoinnin tehtävät että some-postaukset samassa kalenterissa.

---

### Uutiskirje

Hallitse sähköpostimarkkinointia:
1. Siirry **Uutiskirje**-sivulle
2. Luo uusi uutiskirjeluonnos
3. Käytä AI-apua tekstin kirjoittamiseen
4. Lähetä sähköposti Resend-palvelun kautta

---

### Admin-paneeli

Admin-käyttäjät voivat hallinnoida tiimin jäseniä:

1. Siirry **Admin**-sivulle (näkyy vain admin-käyttäjille)
2. Näet kaikki käyttäjät ja heidän tilastot
3. Voit lisätä admin-oikeuksia tai poistaa käyttäjiä
4. Uudet käyttäjät lisätään Supabase Dashboardissa (Authentication → Users)

---

## Tietorakenne

### Supabase-taulut

| Taulu | Sisältö |
|-------|---------|
| `events` | Tapahtumat (title, date, time, artist, event_type, summary, images) |
| `tasks` | Tehtävät (event_id, title, channel, due_date, completed, content, assignee, notes) |
| `social_media_posts` | Some-postaukset |
| `brainstorm_messages` | AI-ideointikeskustelut |
| `user_profiles` | Käyttäjäprofiilit ja roolit |
| `newsletter_drafts` | Uutiskirjeluonnokset |

---

## Tietoturva

- Supabase Row Level Security (RLS) käytössä – vain kirjautuneet käyttäjät pääsevät dataan
- API-avaimet `.env.local`-tiedostossa (ei versionhallinnassa)
- HTTPS-yhteydet kaikkeen dataan
- Admin-toiminnot vaativat admin-roolin

---

## Teknologiat

- **Next.js 14** – React-framework (Pages Router)
- **Tailwind CSS** – Tyylittely
- **Supabase** – PostgreSQL-tietokanta ja autentikointi
- **Claude AI (Anthropic)** – Tekoälyassistentti
- **Resend** – Sähköpostipalvelu
- **Vercel** – Hosting

---

**Versio:** 1.1
**Päivitetty:** 2026-03-27
