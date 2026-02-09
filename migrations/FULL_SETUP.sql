-- =====================================================
-- TÄYDELLINEN MIGRAATIO: Monipäiväisten tapahtumien tuki
-- =====================================================
-- Tämä skripti sisältää KAIKKI tarvittavat muutokset.
-- Aja tämä Supabase SQL Editorissa kerran.
-- =====================================================

-- ==========================================
-- VAIHE 1: Event Instances -taulu
-- ==========================================

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_event_instances_updated_at'
  ) THEN
    CREATE TRIGGER update_event_instances_updated_at
      BEFORE UPDATE ON event_instances
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 4. Row Level Security
ALTER TABLE event_instances ENABLE ROW LEVEL SECURITY;

-- Poista vanhat policyt jos olemassa
DROP POLICY IF EXISTS "Enable read access for all users" ON event_instances;
DROP POLICY IF EXISTS "Enable insert access for all users" ON event_instances;
DROP POLICY IF EXISTS "Enable update access for all users" ON event_instances;
DROP POLICY IF EXISTS "Enable delete access for all users" ON event_instances;

-- Luo uudet policyt
CREATE POLICY "Enable read access for all users" ON event_instances FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON event_instances FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON event_instances FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON event_instances FOR DELETE USING (true);

-- 5. Migroi vanhat tapahtumat event_instances-tauluun
-- (Tämä ei tee mitään jos instanssit on jo luotu)
INSERT INTO event_instances (event_id, date, start_time, end_time)
SELECT
  id as event_id,
  date,
  time as start_time,
  NULL as end_time
FROM events
WHERE date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_instances WHERE event_id = events.id
  );

-- 6. Tee vanhat date ja time kentät optionaalisiksi
DO $$
BEGIN
  ALTER TABLE events ALTER COLUMN date DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Ignooraa jos jo tehty
END $$;

-- ==========================================
-- VAIHE 2: Atomic Event Insert -funktio
-- ==========================================

CREATE OR REPLACE FUNCTION create_event_atomic(
  p_title TEXT,
  p_artist TEXT,
  p_summary TEXT,
  p_url TEXT,
  p_year INTEGER,
  p_dates JSONB,
  p_tasks JSONB,
  p_created_by_id UUID,
  p_created_by_email TEXT,
  p_created_by_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id BIGINT;
  v_date JSONB;
  v_task JSONB;
  v_result JSONB;
BEGIN
  -- Vaihe 1: Luo master-tapahtuma
  INSERT INTO events (
    title,
    artist,
    summary,
    url,
    year,
    images,
    created_by_id,
    created_by_email,
    created_by_name
  ) VALUES (
    p_title,
    p_artist,
    p_summary,
    p_url,
    p_year,
    '{}'::JSONB,
    p_created_by_id,
    p_created_by_email,
    p_created_by_name
  )
  RETURNING id INTO v_event_id;

  -- Vaihe 2: Luo päivämäärät (event_instances)
  FOR v_date IN SELECT * FROM jsonb_array_elements(p_dates)
  LOOP
    INSERT INTO event_instances (
      event_id,
      date,
      start_time,
      end_time
    ) VALUES (
      v_event_id,
      (v_date->>'date')::DATE,
      v_date->>'startTime',
      v_date->>'endTime'
    );
  END LOOP;

  -- Vaihe 3: Luo tehtävät (jos annettu)
  IF p_tasks IS NOT NULL AND jsonb_array_length(p_tasks) > 0 THEN
    FOR v_task IN SELECT * FROM jsonb_array_elements(p_tasks)
    LOOP
      INSERT INTO tasks (
        event_id,
        title,
        channel,
        due_date,
        due_time,
        completed,
        content,
        assignee,
        notes,
        created_by_id,
        created_by_email,
        created_by_name
      ) VALUES (
        v_event_id,
        v_task->>'title',
        v_task->>'channel',
        (v_task->>'dueDate')::DATE,
        v_task->>'dueTime',
        false,
        v_task->>'content',
        v_task->>'assignee',
        v_task->>'notes',
        p_created_by_id,
        p_created_by_email,
        p_created_by_name
      );
    END LOOP;
  END IF;

  -- Palauta luotu tapahtuma kaikkine liitoksineen
  SELECT jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'artist', e.artist,
    'summary', e.summary,
    'url', e.url,
    'year', e.year,
    'images', e.images,
    'created_at', e.created_at,
    'created_by_id', e.created_by_id,
    'created_by_email', e.created_by_email,
    'created_by_name', e.created_by_name,
    'event_instances', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ei.id,
          'event_id', ei.event_id,
          'date', ei.date,
          'start_time', ei.start_time,
          'end_time', ei.end_time
        )
      )
      FROM event_instances ei
      WHERE ei.event_id = e.id
    ),
    'tasks', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'event_id', t.event_id,
          'title', t.title,
          'channel', t.channel,
          'due_date', t.due_date,
          'due_time', t.due_time,
          'completed', t.completed,
          'content', t.content,
          'assignee', t.assignee,
          'notes', t.notes,
          'created_at', t.created_at
        )
      ), '[]'::jsonb)
      FROM tasks t
      WHERE t.event_id = e.id
    )
  )
  INTO v_result
  FROM events e
  WHERE e.id = v_event_id;

  RETURN v_result;
END;
$$;

-- ==========================================
-- VAIHE 3: Testaa että kaikki toimii
-- ==========================================

DO $$
DECLARE
  test_result JSONB;
BEGIN
  -- Testaa että funktio toimii
  SELECT create_event_atomic(
    'TEST EVENT - POISTA TÄMÄ',
    'Test Artist',
    'Test Summary',
    'https://example.com',
    2026,
    '[{"date":"2026-06-01","startTime":"18:00","endTime":"22:00"}]'::jsonb,
    '[{"title":"Test Task","channel":"instagram","dueDate":"2026-05-25"}]'::jsonb,
    NULL,
    NULL,
    NULL
  ) INTO test_result;

  -- Poista testitapahtuma
  DELETE FROM events WHERE title = 'TEST EVENT - POISTA TÄMÄ';

  RAISE NOTICE '✅ Testi onnistui! Kaikki toimii.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Testi epäonnistui: %', SQLERRM;
    RAISE;
END $$;

-- ==========================================
-- VALMIS! 🎉
-- ==========================================
-- Nyt voit käyttää monipäiväisiä tapahtumia.
-- Testaa sovelluksessa lisäämällä tapahtuma usealla päivällä.
-- ==========================================
