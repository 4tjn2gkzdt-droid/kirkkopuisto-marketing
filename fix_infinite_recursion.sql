-- KORJAA INFINITE RECURSION ONGELMA
-- Aja tämä Supabase SQL Editorissa
-- Päivitetty: 2026-01-19

-- ============================================================================
-- VAIHE 1: POISTA KAIKKI VANHAT POLICYT
-- ============================================================================
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone authenticated can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "select_all_authenticated" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can do anything" ON user_profiles;
DROP POLICY IF EXISTS "admin_all" ON user_profiles;

-- ============================================================================
-- VAIHE 2: LUO YKSINKERTAISET POLICYT (ILMAN REKURSIOTA!)
-- ============================================================================

-- Policy 1: LUKEMINEN - Kaikki kirjautuneet voivat lukea kaikkien profiilit
-- Tämä on turvallista koska ei sisällä arkaluontoista tietoa
CREATE POLICY "authenticated_read_profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: PÄIVITTÄMINEN - Käyttäjät voivat päivittää vain omaa profiiliaan
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: LISÄÄMINEN - Käyttäjät voivat lisätä vain oman profiilinsa
CREATE POLICY "users_insert_own_profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- VAIHE 3: VARMISTA ETTÄ RLS ON PÄÄLLÄ
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VAIHE 4: LUO/PÄIVITÄ PROFIILISI (KORVAA SÄHKÖPOSTIOSOITE!)
-- ============================================================================
-- HUOM: Tämä toimii nyt koska ei ole enää infinite recursion ongelmaa!

-- Hae ensin kirjautuneen käyttäjän tiedot
DO $$
DECLARE
  current_user_id uuid;
  current_user_email text;
BEGIN
  -- Hae nykyinen käyttäjä auth.users taulusta
  SELECT id, email INTO current_user_id, current_user_email
  FROM auth.users
  WHERE email = 'samuli@foodandwineturku.com'  -- KORVAA TÄMÄ OMALLA SÄHKÖPOSTILLASI!
  LIMIT 1;

  -- Jos käyttäjä löytyi, luo/päivitä profiili
  IF current_user_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, email, full_name, is_admin)
    VALUES (
      current_user_id,
      current_user_email,
      'Admin Käyttäjä',
      true
    )
    ON CONFLICT (id) DO UPDATE
    SET
      is_admin = true,
      email = EXCLUDED.email,
      updated_at = now();

    RAISE NOTICE 'Profiili luotu/päivitetty käyttäjälle: %', current_user_email;
  ELSE
    RAISE NOTICE 'Käyttäjää ei löytynyt sähköpostilla. Tarkista että olet kirjautunut sisään!';
  END IF;
END $$;

-- ============================================================================
-- VAIHE 5: TARKISTA ETTÄ KAIKKI TOIMII
-- ============================================================================
SELECT
  id,
  email,
  full_name,
  is_admin,
  created_at,
  updated_at,
  CASE
    WHEN is_admin THEN '✅ ADMIN'
    ELSE '❌ Ei admin'
  END as admin_status
FROM user_profiles
ORDER BY created_at DESC;
