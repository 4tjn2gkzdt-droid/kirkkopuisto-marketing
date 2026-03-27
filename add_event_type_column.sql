-- Lisää event_type-sarake events-tauluun
-- Aja tämä SQL Editor -näkymässä Supabasessa

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'artist';

-- Valinnainen: lisää tarkistusrajoite sallituille tyypeille
-- ALTER TABLE events ADD CONSTRAINT events_event_type_check
--   CHECK (event_type IN ('artist', 'dj', 'market', 'other'));
