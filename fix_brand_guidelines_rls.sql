-- Korjaa RLS-policyt brand_guidelines taulussa
-- Ongelma: Service role ei näe rivejä vaikka is_active = true

-- Poista vanha policy
DROP POLICY IF EXISTS "Anyone can read active brand guidelines" ON brand_guidelines;
DROP POLICY IF EXISTS "Service role can read all" ON brand_guidelines;

-- Luo uusi policy: Service role näkee KAIKKI
CREATE POLICY "Service role can read all"
ON brand_guidelines FOR SELECT
TO service_role
USING (true);

-- Luo uusi policy: Muut näkevät vain aktiiviset
CREATE POLICY "Anyone can read active brand guidelines"
ON brand_guidelines FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Testaa
SELECT id, title, is_active, status FROM brand_guidelines;
