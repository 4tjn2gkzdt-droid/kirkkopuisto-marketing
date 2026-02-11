-- Lisää URL-kenttä events-tauluun
-- Tämä mahdollistaa artistin/tapahtuman linkin tallennuksen

ALTER TABLE events ADD COLUMN IF NOT EXISTS url TEXT;

-- Kommentoi sarake
COMMENT ON COLUMN events.url IS 'URL linkki artistin sivuille tai tapahtuman lisätietoihin';
