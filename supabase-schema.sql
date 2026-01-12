-- Kirkkopuiston Terassi - Tietokantamalli
-- Aja tämä skripti Supabase SQL Editorissa

-- 1. Tapahtumat-taulu
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  artist TEXT,
  year INTEGER NOT NULL,
  images JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tehtävät-taulu
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  due_date DATE NOT NULL,
  due_time TEXT,
  completed BOOLEAN DEFAULT FALSE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Brainstorming-viestit
CREATE TABLE IF NOT EXISTS brainstorm_messages (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_events_year ON events(year);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_brainstorm_created ON brainstorm_messages(created_at);

-- Trigger päivittämään updated_at automaattisesti
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Salli kaikille pääsy (voit muuttaa myöhemmin)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_messages ENABLE ROW LEVEL SECURITY;

-- Julkiset käyttöoikeudet (muuta tarvittaessa kirjautumiseen perustuvaksi)
CREATE POLICY "Enable read access for all users" ON events FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON events FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON events FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON tasks FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON tasks FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON brainstorm_messages FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON brainstorm_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON brainstorm_messages FOR DELETE USING (true);
