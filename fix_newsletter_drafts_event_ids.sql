-- Korjaa newsletter_drafts-taulun selected_event_ids-kentän tyyppi
-- UUID[] -> BIGINT[] koska events-taulun ID on BIGSERIAL (numeerinen)

-- Jos taulu on jo olemassa ja siinä on dataa, muutetaan tyyppi
ALTER TABLE newsletter_drafts
  ALTER COLUMN selected_event_ids TYPE BIGINT[]
  USING selected_event_ids::text::bigint[];

-- Päivitä kommentti
COMMENT ON COLUMN newsletter_drafts.selected_event_ids IS 'Valitut tapahtumat (event ID:t)';
