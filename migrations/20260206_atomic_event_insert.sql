-- Atomic event insert function
-- Tallentaa tapahtuman, päivämäärät ja tehtävät yhdessä transaktiossa

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
