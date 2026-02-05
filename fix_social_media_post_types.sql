-- Päivitä social_media_posts taulun type-kenttä sisältämään kaikki tyypit
-- Tämä korjaa "violates check constraint social_media_posts_type_check" virheen

-- Poista vanha constraint
ALTER TABLE social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_type_check;

-- Lisää uusi constraint kaikilla tyypeillä
ALTER TABLE social_media_posts ADD CONSTRAINT social_media_posts_type_check
  CHECK (type IN (
    'viikko-ohjelma',
    'kuukausiohjelma',
    'artisti-animaatio',
    'artisti-karuselli',
    'fiilistelypostaus',
    'reels',
    'tapahtuma-mainospostaus',
    'tapahtuma-muistutus',
    'last-minute',
    'kiitos',
    'teaser',
    'tiedote',
    'tarinat',
    'kilpailu',
    'muu'
  ));

-- Kommentti
COMMENT ON CONSTRAINT social_media_posts_type_check ON social_media_posts
  IS 'Sallitut somepostausten tyypit - päivitetty 2026-01-27';
