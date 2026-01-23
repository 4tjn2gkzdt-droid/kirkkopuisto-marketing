# Tietokantamigraatiot

## Monipäiväisten tapahtumien tuki

Tämä migraatio lisää tuen monipäiväisille tapahtumille, joilla jokaisella päivällä voi olla omat kellonaikansa.

### Muutokset:

1. **Uusi taulu: `event_instances`**
   - Sisältää yksittäisen tapahtumapäivän tiedot
   - Kentät: `id`, `event_id`, `date`, `start_time`, `end_time`
   - Yksi tapahtuma (events) voi sisältää useita päiviä (event_instances)

2. **Muutokset `events`-tauluun:**
   - `date` ja `time` kentät muutettu optionaalisiksi (backward compatibility)
   - Uudet tapahtumat käyttävät `event_instances`-taulua

### Migraation ajaminen:

1. Kirjaudu Supabase-konsoliin: https://supabase.com/dashboard
2. Valitse projektisi
3. Siirry **SQL Editor** -osioon
4. Kopioi `add-event-instances.sql` tiedoston sisältö
5. Liitä se SQL-editoriin
6. Paina **Run** tai **F5**

### Mitä migraatio tekee:

- ✅ Luo `event_instances` taulun
- ✅ Luo tarvittavat indeksit
- ✅ Asettaa Row Level Security (RLS) policyt
- ✅ Migroi vanhat tapahtumat uuteen rakenteeseen
- ✅ Säilyttää backward compatibility

### Käyttö frontendin kanssa:

Ei tarvita mitään lisätoimenpiteitä - frontend on jo päivitetty käyttämään uutta rakennetta!

**Huom:** Migraatio on turvallinen ajaa useita kertoja (`IF NOT EXISTS` ja `ON CONFLICT DO NOTHING`).
