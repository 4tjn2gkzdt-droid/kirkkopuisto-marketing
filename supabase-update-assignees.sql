-- Lisää vastuuhenkilö-kenttä tasks-tauluun
-- Aja tämä Supabase SQL Editorissa

-- 1. Lisää assignee-kenttä olemassa olevaan tasks-tauluun
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee TEXT;

-- 2. Luo team_members-taulu vastuuhenkilöiden hallintaan
CREATE TABLE IF NOT EXISTS team_members (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lisää oletusvastuuhenkilöt
INSERT INTO team_members (name) VALUES
  ('Ei määritetty'),
  ('Henkilö 1'),
  ('Henkilö 2'),
  ('Henkilö 3'),
  ('Henkilö 4')
ON CONFLICT (name) DO NOTHING;

-- 4. Indeksi vastuuhenkilölle
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);

-- 5. RLS-policy team_members-taululle
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON team_members FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON team_members FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON team_members FOR DELETE USING (true);
