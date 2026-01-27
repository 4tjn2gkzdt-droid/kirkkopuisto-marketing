-- ======================================
-- STORAGE BUCKET SETUP
-- ======================================
-- Aja tämä Supabase SQL Editorissa jos storage bucket puuttuu

-- 1. Luo storage bucket brändiohjedokumenteille
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-guidelines', 'brand-guidelines', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Poista vanhat policyt jos ne ovat olemassa
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;

-- 3. Luo uudet policyt

-- Kaikki voivat lukea brand-guidelines bucketin tiedostoja
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-guidelines');

-- Vain adminit voivat ladata tiedostoja
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-guidelines'
  AND auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- Vain adminit voivat poistaa tiedostoja
CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-guidelines'
  AND auth.uid() IN (
    SELECT id FROM user_profiles WHERE is_admin = true
  )
);

-- 4. Tarkista että bucket luotiin
SELECT * FROM storage.buckets WHERE id = 'brand-guidelines';
