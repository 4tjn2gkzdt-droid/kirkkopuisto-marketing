-- Lisää media_links-sarake events-tauluun
ALTER TABLE events ADD COLUMN IF NOT EXISTS media_links jsonb default '[]'::jsonb;
