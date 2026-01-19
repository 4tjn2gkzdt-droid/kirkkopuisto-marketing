-- TÄYDELLINEN KORJAUS: Admin-oikeudet ja RLS
-- Aja tämä Supabase SQL Editorissa

-- VAIHE 1: Poista kaikki vanhat policyt user_profiles-taulusta
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone authenticated can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can do anything" ON user_profiles;

-- VAIHE 2: Luo yksinkertaiset, toimivat policyt
-- Luku: Kaikki kirjautuneet voivat lukea KAIKKI kentät (myös is_admin)
CREATE POLICY "select_all_authenticated" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Päivitys: Käyttäjät voivat päivittää omaa profiiliaan
CREATE POLICY "update_own_profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin-oikeudet: Adminit voivat tehdä kaiken
CREATE POLICY "admin_all" ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- VAIHE 3: Varmista että RLS on päällä (mutta ei estä lukemista)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- VAIHE 4: Aseta oma käyttäjäsi adminiksi
-- HUOM: Korvaa 'YOUR_EMAIL_HERE@example.com' omalla sähköpostiosoitteellasi!
UPDATE user_profiles
SET is_admin = true
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- VAIHE 5: Tarkista että toimii
SELECT
  email,
  full_name,
  is_admin,
  CASE
    WHEN is_admin THEN '✅ ADMIN'
    ELSE '❌ EI ADMIN'
  END as status
FROM user_profiles
ORDER BY created_at DESC;
