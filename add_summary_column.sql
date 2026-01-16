-- Lisää yhteenveto-kenttä events-tauluun
-- Aja tämä SQL-komento Supabase SQL Editorissa

ALTER TABLE events
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Lisää kommentti kuvaamaan saraketta
COMMENT ON COLUMN events.summary IS 'Tapahtuman lyhyt yhteenveto (100-300 merkkiä), joka näkyy listanäkymässä';
