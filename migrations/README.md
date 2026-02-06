# Tietokantamigraatiot

## Atomic Event Insert (20260206)

Luo Supabase RPC-funktion joka tallentaa tapahtumat atomisesti yhdessä transaktiossa.

### Asennus

1. Avaa Supabase Dashboard: https://supabase.com/dashboard
2. Navigoi projektiin
3. Klikkaa SQL Editor
4. Kopioi `20260206_atomic_event_insert.sql` sisältö
5. Liitä SQL Editoriin
6. Klikkaa "Run"

### Mitä tämä tekee?

- Luo `create_event_atomic()` RPC-funktion
- Tallentaa tapahtuman, päivämäärät ja tehtävät yhdessä transaktiossa
- Jos mikä tahansa vaihe epäonnistuu, koko operaatio peruutetaan (rollback)
- Palauttaa luodun tapahtuman kaikkine liitoksineen JSON-muodossa

### Testaus

Testaa että funktio toimii:

```sql
SELECT create_event_atomic(
  'Test Event',
  'Test Artist',
  'Test Summary',
  'https://example.com',
  2026,
  '[{"date":"2026-06-01","startTime":"18:00","endTime":"22:00"}]'::jsonb,
  '[{"title":"Test Task","channel":"instagram","dueDate":"2026-05-25"}]'::jsonb,
  NULL,
  NULL,
  NULL
);
```

Jos tämä palauttaa JSONB-objektin, funktio toimii!
