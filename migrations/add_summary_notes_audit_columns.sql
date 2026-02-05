-- Migraatio: Lisää summary, notes ja audit-sarakkeet
-- Aja tämä Supabase SQL Editorissa
--
-- Puutteet löydetty: saveNewEvent() (pages/index.js:1629) tekee INSERT näillä
-- sarakkeilla, joita ei ole olemassa -> 42703-virhe -> tapahtuma ei tallennu.

-- ── events ─────────────────────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_email TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- ── tasks ──────────────────────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_email TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_name TEXT;
