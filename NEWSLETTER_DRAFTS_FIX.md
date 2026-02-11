# Uutiskirjeluonnosten korjaus

## Ongelma

Uutiskirjeluonnoksia tallennettaessa tuli virhe:
```
Virhe tallennuksessa: invalid input syntax for type uuid: "64"
```

## Syy

`newsletter_drafts`-taulussa `selected_event_ids`-kenttä oli määritelty `UUID[]`-tyypiksi, mutta `events`-taulussa ID:t ovat `BIGSERIAL` (numeerisia). Tämä aiheutti tyyppikonfliktin.

## Ratkaisu

### 1. Aja migraatio tietokantaan

Aja seuraava SQL-tiedosto Supabase SQL Editorissa:

```bash
cat fix_newsletter_drafts_event_ids.sql
```

Tai kopioi ja aja Supabase SQL Editorissa:

```sql
-- Korjaa newsletter_drafts-taulun selected_event_ids-kentän tyyppi
-- UUID[] -> BIGINT[] koska events-taulun ID on BIGSERIAL (numeerinen)

ALTER TABLE newsletter_drafts
  ALTER COLUMN selected_event_ids TYPE BIGINT[]
  USING selected_event_ids::text::bigint[];

COMMENT ON COLUMN newsletter_drafts.selected_event_ids IS 'Valitut tapahtumat (event ID:t)';
```

### 2. Varmista että muutokset on tehty

Korjaukset tehtiin seuraaviin tiedostoihin:

- `add_newsletter_drafts_table.sql` - Päivitetty käyttämään BIGINT[] UUID[]:n sijaan
- `lib/api/newsletterService.js` - Korjattu `saveNewsletterDraft`-funktio vastaamaan oikeaa skeemaa
- `fix_newsletter_drafts_event_ids.sql` - Luotu migraatiotiedosto

### 3. Testaa

Mene uutiskirje-sivulle ja yritä tallentaa luonnos. Nyt sen pitäisi toimia ongelmitta!

## Mitä muutettiin?

### Ennen:
```sql
selected_event_ids UUID[] DEFAULT '{}'
```

### Jälkeen:
```sql
selected_event_ids BIGINT[] DEFAULT '{}'
```

Tämä vastaa nyt `events`-taulun ID-tyyppiä (BIGSERIAL = BIGINT).
