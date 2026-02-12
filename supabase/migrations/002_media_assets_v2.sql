-- =============================================
-- KUVAPANKKI V2: Uudet kentät + käyttöhistoria
-- =============================================

-- 1. Lisää uudet kentät media_assets-tauluun
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS use_count integer default 0,
  ADD COLUMN IF NOT EXISTS orientation text;

-- 2. Kuvan käyttöhistoria
CREATE TABLE IF NOT EXISTS media_usage_log (
  id uuid default gen_random_uuid() primary key,
  media_asset_id uuid references media_assets(id) on delete cascade,
  usage_type text not null,
  usage_context text,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_media_usage_asset ON media_usage_log(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_usage_type ON media_usage_log(usage_type);

-- 3. RLS media_usage_log-taululle
ALTER TABLE media_usage_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'media_usage_log public read' AND tablename = 'media_usage_log') THEN
    CREATE POLICY "media_usage_log public read" ON media_usage_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'media_usage_log auth insert' AND tablename = 'media_usage_log') THEN
    CREATE POLICY "media_usage_log auth insert" ON media_usage_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
