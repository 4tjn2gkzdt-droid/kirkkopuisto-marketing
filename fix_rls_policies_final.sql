-- LOPULLINEN RLS-KORJAUS
-- Tämä varmistaa että kaikki policyt ovat oikein

-- 1. Poista kaikki vanhat user_profiles policyt
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- 2. Luo uudet, yksinkertaiset policyt
CREATE POLICY "Anyone authenticated can read profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can do anything" ON user_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 3. Varmista että RLS on päällä
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Testaa että policy toimii
-- Tämä pitäisi palauttaa rivejä jos olet kirjautunut:
SELECT COUNT(*) as profile_count FROM user_profiles;
