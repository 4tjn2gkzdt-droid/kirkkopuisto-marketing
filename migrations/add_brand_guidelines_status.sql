-- Lisää status ja error_message kentät brand_guidelines tauluun

-- Lisää status kenttä (uploaded, processing, processed, error)
ALTER TABLE brand_guidelines
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error'));

-- Lisää error_message kenttä virheilmoituksille
ALTER TABLE brand_guidelines
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Päivitä olemassa olevat rivit
-- Jos processed_at on asetettu, status = 'processed'
-- Muuten status = 'uploaded'
UPDATE brand_guidelines
SET status = CASE
  WHEN processed_at IS NOT NULL THEN 'processed'
  ELSE 'uploaded'
END
WHERE status IS NULL OR status = 'uploaded';

-- Luo indeksi statukselle (parantaa kyselyjen suorituskykyä)
CREATE INDEX IF NOT EXISTS idx_brand_guidelines_status ON brand_guidelines(status);

COMMENT ON COLUMN brand_guidelines.status IS 'Dokumentin tila: uploaded (ladattu), processing (prosessoidaan), processed (prosessoitu), error (virhe)';
COMMENT ON COLUMN brand_guidelines.error_message IS 'Virheilmoitus jos prosessointi epäonnistui';
