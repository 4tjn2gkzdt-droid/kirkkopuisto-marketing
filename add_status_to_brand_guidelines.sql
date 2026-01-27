-- Lisää status ja error_message kentät brand_guidelines -tauluun
-- Status-kentän avulla seurataan dokumentin prosessointitilaa

-- Lisää status-sarake (oletusarvo 'uploaded')
ALTER TABLE brand_guidelines
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded';

-- Lisää error_message-sarake virheviesteille
ALTER TABLE brand_guidelines
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Luo indeksi status-kentälle (optimoi hakuja)
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_status ON brand_guidelines(status);

-- Päivitä olemassa olevat rivit joilla ei ole statusta
UPDATE brand_guidelines
SET status = CASE
  WHEN processed_at IS NOT NULL AND summary IS NOT NULL THEN 'processed'
  WHEN processed_at IS NOT NULL THEN 'processing'
  ELSE 'uploaded'
END
WHERE status IS NULL;

-- Lisää kommentti selventämään kentän käyttötarkoitus
COMMENT ON COLUMN brand_guidelines.status IS 'Dokumentin tila: uploaded, processing, processed, error';
COMMENT ON COLUMN brand_guidelines.error_message IS 'Virheilmoitus jos prosessointi epäonnistui';
