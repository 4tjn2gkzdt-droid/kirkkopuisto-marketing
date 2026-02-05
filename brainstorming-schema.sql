-- Kirkkopuiston Terassi - Brainstorming/Ideointi -ominaisuus
-- Tietokantalaajennukset ideointisivulle
-- Aja tämä skripti Supabase SQL Editorissa

-- 1. Historiallinen sisältö (uutiset, uutiskirjeet, artikkelit)
CREATE TABLE IF NOT EXISTS historical_content (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('news', 'newsletter', 'article', 'social_post', 'campaign')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT, -- Lyhyt yhteenveto AI-kontekstia varten
  publish_date DATE,
  year INTEGER,
  url TEXT, -- Linkki alkuperäiseen sisältöön (jos web)
  metadata JSONB DEFAULT '{}', -- Vapaamuotoiset lisätiedot (tags, channels, jne.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  is_active BOOLEAN DEFAULT TRUE -- Voidaan piilottaa vanhentunut sisältö
);

-- 2. Brainstorming-sessiot
CREATE TABLE IF NOT EXISTS brainstorm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT, -- Vapaaehtoinen otsikko sessiolle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  created_by_name TEXT
);

-- 3. Päivitetty brainstorm_messages (linkitys sessioon)
-- Tarkista onko taulu jo olemassa
DO $$
BEGIN
  -- Lisää session_id jos ei ole
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='brainstorm_messages' AND column_name='session_id') THEN
    ALTER TABLE brainstorm_messages ADD COLUMN session_id UUID REFERENCES brainstorm_sessions(id) ON DELETE CASCADE;
  END IF;

  -- Lisää metadata jos ei ole
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='brainstorm_messages' AND column_name='metadata') THEN
    ALTER TABLE brainstorm_messages ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- 4. Tallennetut ideat
CREATE TABLE IF NOT EXISTS saved_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES brainstorm_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[], -- Array tageja helpompaan hakuun
  category TEXT, -- Esim: "kesämarkkinointi", "tapahtuma-idea", "somepostaus"
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'implemented', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  created_by_name TEXT,
  notes TEXT -- Lisähuomioita ideasta
);

-- 5. Liitetiedostot brainstorming-sessioille
CREATE TABLE IF NOT EXISTS brainstorm_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES brainstorm_sessions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size BIGINT, -- Tavua
  file_url TEXT, -- Supabase Storage URL
  file_path TEXT, -- Polku storagessa
  extracted_text TEXT, -- PDF:stä/kuvasta poimittu teksti AI-kontekstia varten
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by_id UUID REFERENCES auth.users(id),
  uploaded_by_email TEXT,
  uploaded_by_name TEXT
);

-- Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_historical_content_type ON historical_content(type);
CREATE INDEX IF NOT EXISTS idx_historical_content_year ON historical_content(year);
CREATE INDEX IF NOT EXISTS idx_historical_content_date ON historical_content(publish_date);
CREATE INDEX IF NOT EXISTS idx_historical_content_active ON historical_content(is_active);

CREATE INDEX IF NOT EXISTS idx_brainstorm_sessions_created_by ON brainstorm_sessions(created_by_id);
CREATE INDEX IF NOT EXISTS idx_brainstorm_sessions_created_at ON brainstorm_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brainstorm_messages_session ON brainstorm_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_saved_ideas_session ON saved_ideas(session_id);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_status ON saved_ideas(status);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_tags ON saved_ideas USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_created_by ON saved_ideas(created_by_id);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_created_at ON saved_ideas(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brainstorm_attachments_session ON brainstorm_attachments(session_id);

-- Triggerit updated_at-päivitykseen
CREATE TRIGGER update_historical_content_updated_at
  BEFORE UPDATE ON historical_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brainstorm_sessions_updated_at
  BEFORE UPDATE ON brainstorm_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_ideas_updated_at
  BEFORE UPDATE ON saved_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE historical_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Kirjautuneet käyttäjät voivat lukea ja kirjoittaa
CREATE POLICY "Authenticated users can read historical content"
  ON historical_content FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert historical content"
  ON historical_content FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update historical content"
  ON historical_content FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete historical content"
  ON historical_content FOR DELETE
  USING (auth.role() = 'authenticated');

-- Brainstorm sessions
CREATE POLICY "Authenticated users can read brainstorm sessions"
  ON brainstorm_sessions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create brainstorm sessions"
  ON brainstorm_sessions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update brainstorm sessions"
  ON brainstorm_sessions FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete brainstorm sessions"
  ON brainstorm_sessions FOR DELETE
  USING (auth.role() = 'authenticated');

-- Saved ideas
CREATE POLICY "Authenticated users can read saved ideas"
  ON saved_ideas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create saved ideas"
  ON saved_ideas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update saved ideas"
  ON saved_ideas FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete saved ideas"
  ON saved_ideas FOR DELETE
  USING (auth.role() = 'authenticated');

-- Brainstorm attachments
CREATE POLICY "Authenticated users can read brainstorm attachments"
  ON brainstorm_attachments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create brainstorm attachments"
  ON brainstorm_attachments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete brainstorm attachments"
  ON brainstorm_attachments FOR DELETE
  USING (auth.role() = 'authenticated');

-- Supabase Storage bucket brainstorming-liitetiedostoille
-- Huom: Tämä on informatiivinen kommentti. Storage bucketit luodaan Supabase Dashboardissa.
-- Bucket nimi: brainstorm-attachments
-- Public: false
-- Allowed file types: PDF, images, text
-- Max file size: 10MB
