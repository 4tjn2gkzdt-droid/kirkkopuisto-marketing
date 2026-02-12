-- Kuvapankki: media_assets taulu
create table if not exists media_assets (
  id uuid default gen_random_uuid() primary key,
  storage_path text not null,
  public_url text not null,
  file_name text not null,
  file_type text not null, -- 'image' | 'video'
  file_size bigint,
  width integer,
  height integer,

  -- AI-generated metadata
  description_fi text,
  description_en text,
  tags text[] default '{}',
  mood text,
  season text,
  content_type text,
  colors text[] default '{}',
  ai_analyzed boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indeksit hakua varten
create index if not exists idx_media_tags on media_assets using gin(tags);
create index if not exists idx_media_mood on media_assets(mood);
create index if not exists idx_media_content_type on media_assets(content_type);
create index if not exists idx_media_season on media_assets(season);

-- Storage bucket (ajetaan Supabase dashboardista tai CLI:llä)
-- insert into storage.buckets (id, name, public) values ('media-bank', 'media-bank', true);
