# Brändiohjedokumenttien asetusohjeet

## Ongelma

Brändidokumentit eivät näy admin-sivulla ja debug-sivu näyttää "storage bucket missing".

## Syy

Storage bucket `brand-guidelines` ei ole luotu Supabasessa.

## Ratkaisu

### Vaihtoehto 1: Aja SQL-skripti Supabase Dashboardissa

1. Mene Supabase Dashboard → SQL Editor
2. Aja seuraava komento:

```sql
-- Luo storage bucket brändiohjedokumenteille
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-guidelines', 'brand-guidelines', true)
ON CONFLICT (id) DO NOTHING;

-- Aseta storage policies: Kaikki voivat lukea, vain adminit voivat ladata
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-guidelines');

CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-guidelines'
  AND auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-guidelines'
  AND auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);
```

### Vaihtoehto 2: Luo bucket manuaalisesti Supabase Dashboardissa

1. Mene Supabase Dashboard → Storage
2. Klikkaa "New bucket"
3. Nimi: `brand-guidelines`
4. Public: ✅ (kyllä)
5. Klikkaa "Create bucket"

6. Klikkaa äsken luotua buckettia → "Policies"
7. Lisää seuraavat policyt:

**Read policy:**
- Policy name: `Public read access`
- Target roles: `public`
- SELECT: ✅
- Using expression: `bucket_id = 'brand-guidelines'`

**Insert policy:**
- Policy name: `Admin upload access`
- Target roles: `authenticated`
- INSERT: ✅
- With check: `bucket_id = 'brand-guidelines' AND auth.uid() IN (SELECT id FROM user_profiles WHERE is_admin = true)`

**Delete policy:**
- Policy name: `Admin delete access`
- Target roles: `authenticated`
- DELETE: ✅
- Using: `bucket_id = 'brand-guidelines' AND auth.uid() IN (SELECT id FROM user_profiles WHERE is_admin = true)`

### Vaihtoehto 3: Aja koko setup-skripti

Aja tiedosto `add_brand_guidelines_table.sql` kokonaisuudessaan Supabase SQL Editorissa.

## Testaus

1. Mene admin-sivulle: `/admin`
2. Klikkaa "🔍 Debug" -nappia brändidokumenttien osiossa
3. Tarkista että "Tietokannassa yhteensä" ja "Näkyvissä admin-sivulla" näyttävät samat luvut

4. Mene debug-sivulle: `/debug-upload`
5. Tarkista että "Storage Bucket" näyttää "OK" (ei "MISSING")

## Yhteenveto muutoksista

Tein seuraavat korjaukset koodiin:

1. **Debug-sivun bucket-tarkistus** (`pages/debug-upload.js`):
   - Muutettu käyttämään `storage.from('brand-guidelines').list()` sijasta `storage.listBuckets()`
   - Parempi virheenkäsittely

2. **Admin-sivun debug-nappi** (`pages/admin.js`):
   - Lisätty "🔍 Debug" -nappi joka näyttää kaikki dokumentit tietokannasta
   - Näyttää selkeästi jos jokin dokumentti puuttuu näkyvistä

3. **Debug-endpoint** (`pages/api/brand-guidelines/debug-list.js`):
   - Uusi endpoint joka palauttaa KAIKKI dokumentit (myös poistetut)
   - Hyödyllinen debuggaukseen

4. **Lisätty debug-lokitusta**:
   - `pages/api/brand-guidelines/list.js`: Lisätty console.logit
   - `lib/api/brandGuidelineService.js`: Lisätty yksityiskohtaiset logit

## Seuraavat askeleet

1. Luo storage bucket yllä olevien ohjeiden mukaan
2. Testaa että debug-sivu näyttää "OK" storage bucketille
3. Lataa testibrändidokumentti admin-sivulla
4. Synkronoi storage napista
5. Tarkista että dokumentti näkyy admin-sivulla
6. Prosessoi dokumentti AI:lla
7. Tarkista että status muuttuu "Prosessoitu":ksi
