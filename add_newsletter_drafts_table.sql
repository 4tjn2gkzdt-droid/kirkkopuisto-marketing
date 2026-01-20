-- Luo taulu uutiskirjeluonnoksille
CREATE TABLE IF NOT EXISTS newsletter_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Luonnoksen nimi (käyttäjän antama)
  name TEXT NOT NULL,

  -- Uutiskirjeen sisältö (JSON)
  content JSONB NOT NULL,

  -- Valitut tapahtumat
  selected_event_ids UUID[] DEFAULT '{}',

  -- Sävy (casual, formal, energetic)
  tone TEXT DEFAULT 'casual',

  -- Generoitu HTML
  html TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_created_at ON newsletter_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_name ON newsletter_drafts(name);

-- RLS (Row Level Security) - Kaikki voivat lukea ja kirjoittaa
ALTER TABLE newsletter_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kaikki voivat lukea uutiskirjeluonnoksia" ON newsletter_drafts
  FOR SELECT USING (true);

CREATE POLICY "Kaikki voivat lisätä uutiskirjeluonnoksia" ON newsletter_drafts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Kaikki voivat päivittää uutiskirjeluonnoksia" ON newsletter_drafts
  FOR UPDATE USING (true);

CREATE POLICY "Kaikki voivat poistaa uutiskirjeluonnoksia" ON newsletter_drafts
  FOR DELETE USING (true);

-- Kommentti
COMMENT ON TABLE newsletter_drafts IS 'Tallennetut uutiskirjeluonnokset';
