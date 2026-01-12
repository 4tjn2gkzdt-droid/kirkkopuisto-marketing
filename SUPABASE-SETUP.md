# Supabase-Asennusohje

Nopea ohje Supabasen konfigurointiin.

## 1. Luo Supabase-projekti

1. **Mene:** https://supabase.com/
2. **Kirjaudu sisään** tai luo tili
3. Klikkaa **"New Project"**
4. Täytä:
   - **Name:** `kirkkopuisto-marketing`
   - **Database Password:** (luo vahva salasana)
   - **Region:** `Europe (Frankfurt)`
   - **Plan:** `Free`
5. Klikkaa **"Create new project"**
6. ⏳ Odota 1-2 minuuttia

## 2. Kopioi API-avaimet

1. Mene **Settings** → **API**
2. Kopioi:
   - **Project URL:** `https://xxx.supabase.co`
   - **anon public key:** `eyJhbG...` (pitkä merkkijono)

## 3. Luo tietokantataulut

1. Mene **SQL Editor**
2. Klikkaa **"New query"**
3. Kopioi **koko sisältö** tiedostosta `supabase-schema.sql`
4. Liitä editoriin
5. Klikkaa **"Run"** tai paina **F5**
6. Tarkista että näet vihreän ✅ "Success"-viestin

## 4. Lisää avaimet .env.local -tiedostoon

Lisää rivit:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
\`\`\`

## 5. Lisää avaimet Verceliin (tuotantoa varten)

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Lisää samat avaimet (Production, Preview, Development)
3. Redeploy

---

✅ **Valmista!** Nyt data tallentuu Supabaseen.

## Tarkista että toimii

1. Lisää tapahtuma kalenteriin
2. Mene Supabase → **Table Editor** → **events**
3. Pitäisi näkyä lisäämäsi tapahtuma!

## Ongelmia?

- Tarkista että avaimet ovat oikein `.env.local`-tiedostossa
- Tarkista että `supabase-schema.sql` on ajettu onnistuneesti
- Katso selaimen konsoli (F12) virheiden varalta
