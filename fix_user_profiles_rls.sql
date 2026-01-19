-- Korjaa user_profiles RLS policies
-- Salli kirjautuneiden käyttäjien lukea user_profiles ilman ehtoja

DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;

CREATE POLICY "Authenticated users can read all profiles" ON user_profiles
  FOR SELECT USING (true);

-- Varmista että trigger toimii
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
