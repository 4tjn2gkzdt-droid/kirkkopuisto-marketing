-- DEBUG: Tarkista miksi admin-status ei näy
-- Aja tämä Supabase SQL Editorissa

-- 1. Näytä kaikki user_profiles-rivit
SELECT
  id,
  email,
  full_name,
  is_admin,
  created_at,
  updated_at
FROM user_profiles
ORDER BY created_at DESC;

-- 2. Tarkista nykyiset RLS policyt user_profiles-taulussa
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 3. Tarkista onko RLS päällä
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles';

-- 4. Testaa että voit lukea profiilin
-- Korvaa 'YOUR_USER_ID' omalla käyttäjä-ID:lläsi (löydät sen profile-debug sivulta)
-- SELECT * FROM user_profiles WHERE id = 'YOUR_USER_ID';
