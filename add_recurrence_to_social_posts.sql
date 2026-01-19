-- Lisää toisto-kenttä somepostauksiin
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS recurrence TEXT CHECK (recurrence IN ('none', 'weekly', 'monthly'));

-- Lisää kentät toiston hallintaan
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;

ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS parent_post_id BIGINT REFERENCES social_media_posts(id) ON DELETE CASCADE;

-- Aseta oletusarvot
UPDATE social_media_posts
SET recurrence = 'none'
WHERE recurrence IS NULL;

ALTER TABLE social_media_posts
ALTER COLUMN recurrence SET DEFAULT 'none';

-- Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_social_media_posts_recurrence ON social_media_posts(recurrence);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_parent_post ON social_media_posts(parent_post_id);

-- Kommentit
COMMENT ON COLUMN social_media_posts.recurrence IS 'Toistuuko postaus: none, weekly, monthly';
COMMENT ON COLUMN social_media_posts.recurrence_end_date IS 'Mihin päivään asti toistoa jatketaan';
COMMENT ON COLUMN social_media_posts.parent_post_id IS 'Viittaus alkuperäiseen postaukseen jos kyseessä toistuva kopio';
