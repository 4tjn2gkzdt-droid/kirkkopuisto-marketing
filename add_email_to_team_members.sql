-- Lisää email-kenttä team_members-tauluun
-- Aja tämä SQL-komento Supabase SQL Editorissa

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS email TEXT;

-- Lisää kommentti kuvaamaan saraketta
COMMENT ON COLUMN team_members.email IS 'Tiimin jäsenen sähköpostiosoite viikkoraportointia varten';

-- Lisää indeksi nopeuttamaan hakuja
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
