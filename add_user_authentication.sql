-- Käyttäjähallinta - Supabase Auth integraatio
-- Aja tämä Supabase SQL Editorissa

-- 1. Luo user_profiles taulu
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lisää käyttäjäkentät events-tauluun
ALTER TABLE events
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by_email TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- 3. Lisää käyttäjäkentät tasks-tauluun
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by_email TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- 4. Lisää käyttäjäkentät social_media_posts-tauluun
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by_email TEXT,
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- 5. Lisää käyttäjäkentät brainstorm_messages-tauluun
ALTER TABLE brainstorm_messages
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_email TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- 6. Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_created_by ON social_media_posts(created_by_id);

-- 7. Trigger user_profiles updated_at:lle
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. RLS user_profiles:lle
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 9. Päivitetyt RLS policies - Vaatii kirjautumisen
-- EVENTS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "Enable insert access for all users" ON events;
DROP POLICY IF EXISTS "Enable update access for all users" ON events;
DROP POLICY IF EXISTS "Enable delete access for all users" ON events;

CREATE POLICY "Authenticated users can read events" ON events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert events" ON events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update events" ON events
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete events" ON events
  FOR DELETE USING (auth.role() = 'authenticated');

-- TASKS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable insert access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable update access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable delete access for all users" ON tasks;

CREATE POLICY "Authenticated users can read tasks" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tasks" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tasks" ON tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tasks" ON tasks
  FOR DELETE USING (auth.role() = 'authenticated');

-- SOCIAL_MEDIA_POSTS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON social_media_posts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON social_media_posts;
DROP POLICY IF EXISTS "Enable update access for all users" ON social_media_posts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON social_media_posts;

CREATE POLICY "Authenticated users can read social posts" ON social_media_posts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert social posts" ON social_media_posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update social posts" ON social_media_posts
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete social posts" ON social_media_posts
  FOR DELETE USING (auth.role() = 'authenticated');

-- BRAINSTORM_MESSAGES policies
DROP POLICY IF EXISTS "Enable read access for all users" ON brainstorm_messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON brainstorm_messages;
DROP POLICY IF EXISTS "Enable delete access for all users" ON brainstorm_messages;

CREATE POLICY "Authenticated users can read brainstorm" ON brainstorm_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert brainstorm" ON brainstorm_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete brainstorm" ON brainstorm_messages
  FOR DELETE USING (auth.role() = 'authenticated');

-- USER_PROFILES policies
CREATE POLICY "Users can read all profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 10. Funktio user_profilen automaattiseen luomiseen kun uusi käyttäjä luodaan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger joka ajaa funktion kun uusi käyttäjä luodaan
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Kommentit
COMMENT ON TABLE user_profiles IS 'Käyttäjäprofiilit - admin-rooli ja lisätiedot';
COMMENT ON COLUMN user_profiles.is_admin IS 'Onko käyttäjä admin (voi hallita muita käyttäjiä)';
COMMENT ON COLUMN events.created_by_name IS 'Tapahtuman luoneen käyttäjän nimi';
COMMENT ON COLUMN tasks.created_by_name IS 'Tehtävän luoneen käyttäjän nimi';
COMMENT ON COLUMN social_media_posts.created_by_name IS 'Somepostauksen luoneen käyttäjän nimi';
