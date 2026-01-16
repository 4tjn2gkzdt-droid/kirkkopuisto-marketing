-- Luo taulu somepostauksille
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  date DATE NOT NULL,
  time TIME,

  -- Postauksen tyyppi
  type TEXT NOT NULL CHECK (type IN (
    'viikko-ohjelma',
    'kuukausiohjelma',
    'artisti-animaatio',
    'artisti-karuselli',
    'fiilistelypostaus',
    'reels',
    'tapahtuma-mainospostaus',
    'muu'
  )),

  -- Kanavat (voi olla useita)
  channels TEXT[] DEFAULT '{}',

  -- Vastuuhenkilö
  assignee TEXT,

  -- Linkki tapahtumaan (valinnainen)
  linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'suunniteltu' CHECK (status IN (
    'suunniteltu',
    'työn alla',
    'valmis',
    'julkaistu'
  )),

  -- Sisältö
  title TEXT NOT NULL,
  caption TEXT,
  notes TEXT,

  -- Kuvien/videoiden linkit (myöhemmin mahdollisesti file upload)
  media_links TEXT[],

  -- Aikaleima
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_social_media_posts_date ON social_media_posts(date);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_year ON social_media_posts(year);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_type ON social_media_posts(type);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_linked_event ON social_media_posts(linked_event_id);

-- RLS (Row Level Security) - Kaikki voivat lukea ja kirjoittaa (voit muokata tarpeen mukaan)
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kaikki voivat lukea somepostauksia" ON social_media_posts
  FOR SELECT USING (true);

CREATE POLICY "Kaikki voivat lisätä somepostauksia" ON social_media_posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Kaikki voivat päivittää somepostauksia" ON social_media_posts
  FOR UPDATE USING (true);

CREATE POLICY "Kaikki voivat poistaa somepostauksia" ON social_media_posts
  FOR DELETE USING (true);

-- Kommentti
COMMENT ON TABLE social_media_posts IS 'Somepostausten suunnittelu ja seuranta';
