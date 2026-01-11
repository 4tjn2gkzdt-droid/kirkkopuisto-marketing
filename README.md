# Kirkkopuiston Terassi - Markkinoinnin Työkalut

Markkinoinnin suunnittelutyökalu tapahtumille ja sisällöntuotannolle.

## 🚀 Ominaisuudet

- ✅ **Tapahtumakalenteri** - Lista-, kuukausi- ja viikkonäkymä
- ✅ **Tehtävähallinta** - Automaattisesti luodut markkinointitehtävät per tapahtuma
- ✅ **AI-ideointi** - Claude AI -pohjainen sisältöideoija
- ✅ **Pilvipalvelu** - Data tallennetaan Supabaseen (ei vain selaimeen)
- ✅ **Synkronointi** - Käytä samaa dataa kaikilla laitteilla

## 📦 Asennus

### 1. Kloonaa repo

\`\`\`bash
git clone <repo-url>
cd kirkkopuisto-marketing
npm install
\`\`\`

### 2. Luo Supabase-projekti

#### A) Mene Supabaseen
1. Avaa: https://supabase.com/
2. Kirjaudu sisään (tai luo tili)
3. Klikkaa **"New Project"**

#### B) Projektin asetukset
- **Name:** \`kirkkopuisto-marketing\` (tai mikä tahansa)
- **Database Password:** Luo vahva salasana (tallenna turvalliseen paikkaan!)
- **Region:** Valitse \`Europe (Frankfurt)\` tai lähin
- **Pricing Plan:** \`Free\` (riittää hyvin aloitukseen)
- Klikkaa **"Create new project"**

⏳ Odota 1-2 minuuttia kunnes projekti on valmis.

#### C) Kopioi API-avaimet

1. Kun projekti on valmis, mene **Settings** (vasen sivupalkki)
2. Valitse **API**
3. Kopioi seuraavat arvot:

   - **Project URL** (esim. \`https://xxxxxxxxxx.supabase.co\`)
   - **anon/public key** (pitkä merkkijono alkaa \`eyJ...\`)

#### D) Luo tietokantataulut

1. Mene **SQL Editor** (vasen sivupalkki)
2. Klikkaa **"New query"**
3. Kopioi **koko sisältö** tiedostosta \`supabase-schema.sql\` editoriin
4. Klikkaa **"Run"** (tai paina F5)
5. Tarkista että näet vihreän "Success"-viestin

✅ Tietokanta on nyt valmis!

### 3. Konfiguroi ympäristömuuttujat

Lisää \`.env.local\` tiedostoon:

\`\`\`bash
# Anthropic API Key (Claude AI)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
\`\`\`

**HUOM:** Korvaa arvot omillasi!

### 4. Käynnistä sovellus

\`\`\`bash
npm run dev
\`\`\`

Avaa selaimessa: http://localhost:3000

## 🔧 Vercel Deployment

### 1. Pushaa koodi GitHubiin

\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

### 2. Deployaa Verceliin

1. Mene: https://vercel.com/
2. Klikkaa **"Import Project"**
3. Valitse GitHub-repo
4. Klikkaa **"Deploy"**

### 3. Lisää Environment Variables Verceliin

1. Vercel Dashboard → Projektisi → **Settings** → **Environment Variables**
2. Lisää seuraavat muuttujat (kaikki ympäristöt: Production, Preview, Development):

   \`\`\`
   ANTHROPIC_API_KEY=sk-ant-api03-...
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   \`\`\`

3. **Redeploy** projekti muutosten jälkeen

✅ Sovellus on nyt tuotannossa!

## 📚 Käyttöohjeet

### Tapahtumat

1. **Lisää tapahtumia** - Klikkaa "➕ Tuo taulukosta" ja liitä Excel/Google Sheets -data
2. **Vaihda näkymää** - Lista / Kuukausi / Viikko
3. **Hallitse tehtäviä** - Avaa tapahtuma klikkaamalla ▶ -ikonia
4. **Merkitse kuvat** - Klikkaa "📸 Kuvat" ja valitse mitä kuvaformaatteja tarvitset

### Ideointi

1. Klikkaa **"💡 Ideoi sisältöä"**
2. Kirjoita kysymys tai pyyntö, esim:
   - "Anna ideoita Instagram-postaukseen kesäterassista"
   - "Minkälaisen uutiskirjeen voisin tehdä heinäkuun tapahtumista?"
3. Claude vastaa ja auttaa ideoimaan!

## 🗄️ Tietorakenne

### Supabase-taulut

- **events** - Tapahtumat (title, date, time, artist, images)
- **tasks** - Tehtävät (event_id, title, channel, due_date, completed)
- **brainstorm_messages** - AI-keskustelut (role, content)

## 🔐 Tietoturva

- ✅ Supabase Row Level Security (RLS) käytössä
- ✅ API-avaimet .env.local -tiedostossa (ei versionhallinnassa)
- ✅ HTTPS-yhteydet kaikkeen dataan

## 🛠️ Teknologiat

- **Next.js 14** - React-framework
- **Tailwind CSS** - Tyylittely
- **Supabase** - PostgreSQL-tietokanta
- **Claude AI (Anthropic)** - Tekoälyassistentti
- **Vercel** - Hosting

---

**Kehittäjä:** Claude AI
**Versio:** 1.0
**Päivitetty:** 2026-01-11
