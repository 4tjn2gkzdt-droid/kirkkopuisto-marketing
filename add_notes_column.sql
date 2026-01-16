-- Lisää muistiinpanot-kenttä tasks-tauluun
-- Aja tämä SQL-komento Supabase SQL Editorissa

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Lisää kommentti kuvaamaan saraketta
COMMENT ON COLUMN tasks.notes IS 'Vapaamuotoiset muistiinpanot ja kommentit tehtävään liittyen';
