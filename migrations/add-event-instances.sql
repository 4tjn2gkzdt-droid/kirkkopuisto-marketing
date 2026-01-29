-- Migraatio: Monipäiväisten tapahtumien tuki
-- Luo event_instances-taulu ja migroi vanhat tapahtumat

-- 1. Luo event_instances taulu
CREATE TABLE IF NOT EXISTS event_instances (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_event_instances_event_id ON event_instances(event_id);
CREATE INDEX IF NOT EXISTS idx_event_instances_date ON event_instances(date);

-- 3. Trigger päivittämään updated_at automaattisesti
CREATE TRIGGER update_event_instances_updated_at
  BEFORE UPDATE ON event_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Row Level Security
ALTER TABLE event_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON event_instances FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON event_instances FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON event_instances FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON event_instances FOR DELETE USING (true);

-- 5. Migroi vanhat tapahtumat event_instances-tauluun
-- Tämä luo yhden instanssin jokaiselle vanhalle tapahtumalle
INSERT INTO event_instances (event_id, date, start_time, end_time)
SELECT
  id as event_id,
  date,
  time as start_time,
  NULL as end_time
FROM events
WHERE date IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. Tee vanhat date ja time kentät optionaalisiksi (säilytetään backward compatibility)
-- Huom: Emme poista kenttiä, koska se rikkoo olemassa olevan koodin
-- Uusi koodi käyttää event_instances-taulua
ALTER TABLE events ALTER COLUMN date DROP NOT NULL;

-- 7. Kommentti selventämään uutta rakennetta
COMMENT ON TABLE event_instances IS 'Yksittäisen päivän tiedot monipäiväisille tapahtumille. Yksi tapahtuma (events) voi sisältää useita päiviä (event_instances).';
COMMENT ON COLUMN event_instances.start_time IS 'Aloitusaika muodossa HH:MM (esim. 14:00)';
COMMENT ON COLUMN event_instances.end_time IS 'Lopetusaika muodossa HH:MM (esim. 22:00). Voi olla NULL jos vain aloitusaika näytetään.';
