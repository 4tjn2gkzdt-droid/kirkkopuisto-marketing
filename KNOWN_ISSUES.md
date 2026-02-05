# Tunnetut ongelmat ja parannusehdotukset

## 1. Tapahtumien tallennusongelma - KRIITTINEN ⚠️

### Ongelma
`pages/index.js:331` - `savePosts`-funktio tallentaa tapahtumia ilman transaktioita, mikä voi johtaa datan epäkonsistenssi:

```javascript
// Nykyinen toteutus:
1. INSERT INTO events           // Jos onnistuu
2. INSERT INTO event_instances  // Jos epäonnistuu --> event jää ilman päivämääriä
3. INSERT INTO tasks            // Jos epäonnistuu --> event jää ilman tehtäviä
```

Jos jokin INSERT-operaatio epäonnistuu, aiemmat onnistuneet operaatiot eivät peruutu (rollback), jolloin:
- Event voi olla tietokannassa ilman event_instances-rivejä
- Event voi olla ilman tasks-rivejä
- Päivityksissä DELETE-operaatiot voivat jäädä kesken

### Vaikutus
- Viisi peräkkäistä korjausyritystä commiteissa (e2afe17, 24dcd24, edab1e4, 6fba391, 4ae79cf)
- Käyttäjät raportoivat jumittumisesta tallennuksen aikana
- Data voi jäädä epäkonsistenttiin tilaan

### Ratkaisu: Supabase RPC -funktio

Luo PostgreSQL-funktio, joka hoitaa koko tallennuksen yhdessä transaktiossa:

```sql
-- supabase/functions/save_event_atomic.sql
CREATE OR REPLACE FUNCTION save_event_atomic(
  p_event_data JSONB,
  p_instances_data JSONB[],
  p_tasks_data JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id INTEGER;
  v_result JSONB;
BEGIN
  -- Transaktio alkaa automaattisesti

  -- 1. Tallenna event
  IF (p_event_data->>'id')::INTEGER > 1000000000000 THEN
    -- Uusi tapahtuma
    INSERT INTO events (title, date, time, artist, year, images, created_by_id, created_by_email, created_by_name)
    VALUES (
      p_event_data->>'title',
      (p_event_data->>'date')::DATE,
      p_event_data->>'time',
      p_event_data->>'artist',
      (p_event_data->>'year')::INTEGER,
      (p_event_data->'images')::JSONB,
      (p_event_data->>'created_by_id')::UUID,
      p_event_data->>'created_by_email',
      p_event_data->>'created_by_name'
    )
    RETURNING id INTO v_event_id;
  ELSE
    -- Päivitä olemassa oleva
    v_event_id := (p_event_data->>'id')::INTEGER;

    UPDATE events
    SET
      title = p_event_data->>'title',
      date = (p_event_data->>'date')::DATE,
      time = p_event_data->>'time',
      artist = p_event_data->>'artist',
      images = (p_event_data->'images')::JSONB,
      updated_by_id = (p_event_data->>'updated_by_id')::UUID,
      updated_by_email = p_event_data->>'updated_by_email',
      updated_by_name = p_event_data->>'updated_by_name'
    WHERE id = v_event_id;

    -- Poista vanhat instances ja tasks
    DELETE FROM event_instances WHERE event_id = v_event_id;
    DELETE FROM tasks WHERE event_id = v_event_id;
  END IF;

  -- 2. Tallenna event_instances
  INSERT INTO event_instances (event_id, date, start_time, end_time)
  SELECT
    v_event_id,
    (value->>'date')::DATE,
    value->>'start_time',
    value->>'end_time'
  FROM jsonb_array_elements(p_instances_data::JSONB);

  -- 3. Tallenna tasks
  IF array_length(p_tasks_data, 1) > 0 THEN
    INSERT INTO tasks (event_id, title, channel, due_date, due_time, completed, content, assignee, notes, created_by_id, created_by_email, created_by_name)
    SELECT
      v_event_id,
      value->>'title',
      value->>'channel',
      (value->>'due_date')::DATE,
      value->>'due_time',
      (value->>'completed')::BOOLEAN,
      value->>'content',
      value->>'assignee',
      value->>'notes',
      (value->>'created_by_id')::UUID,
      value->>'created_by_email',
      value->>'created_by_name'
    FROM jsonb_array_elements(p_tasks_data::JSONB);
  END IF;

  -- Palauta tulokset
  v_result := jsonb_build_object(
    'success', true,
    'event_id', v_event_id
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Rollback tapahtuu automaattisesti
  RAISE EXCEPTION 'Tapahtuman tallennus epäonnistui: %', SQLERRM;
END;
$$;
```

### Frontend-muutokset

```javascript
// pages/index.js - Päivitetty savePosts
const savePosts = async (year, updatedPosts) => {
  if (supabase) {
    try {
      for (const post of updatedPosts) {
        // Valmistele data
        const eventData = {
          id: post.id,
          title: post.title,
          date: post.date,
          time: post.time || null,
          artist: post.artist || null,
          year: year,
          images: post.images || {},
          created_by_id: user?.id || null,
          created_by_email: user?.email || null,
          created_by_name: userProfile?.full_name || user?.email || null,
          updated_by_id: user?.id || null,
          updated_by_email: user?.email || null,
          updated_by_name: userProfile?.full_name || user?.email || null
        };

        const instancesData = post.dates && Array.isArray(post.dates)
          ? post.dates.map(dateEntry => ({
              date: dateEntry.date,
              start_time: dateEntry.startTime || null,
              end_time: dateEntry.endTime || null
            }))
          : [{
              date: post.date,
              start_time: post.time || null,
              end_time: null
            }];

        const tasksData = (post.tasks || []).map(task => ({
          title: task.title,
          channel: task.channel,
          due_date: task.dueDate,
          due_time: task.dueTime || null,
          completed: task.completed || false,
          content: task.content || null,
          assignee: task.assignee || null,
          notes: task.notes || null,
          created_by_id: user?.id || null,
          created_by_email: user?.email || null,
          created_by_name: userProfile?.full_name || user?.email || null
        }));

        // Kutsu RPC-funktio
        const { data, error } = await supabase.rpc('save_event_atomic', {
          p_event_data: eventData,
          p_instances_data: instancesData,
          p_tasks_data: tasksData
        });

        if (error) throw error;

        logger.info('Tapahtuma tallennettu atomisesti:', data);
      }
    } catch (error) {
      logger.error('Virhe tallennettaessa Supabaseen:', error);
      throw new Error(`Tietokannan tallennus epäonnistui: ${error.message}`);
    }
  } else {
    // LocalStorage fallback
    localStorage.setItem(`posts-${year}`, JSON.stringify(updatedPosts));
  }

  setPosts(prev => ({ ...prev, [year]: updatedPosts }));
};
```

### Edut
1. ✅ **Atominen tallennus** - Kaikki tai ei mitään
2. ✅ **Automaattinen rollback** - Jos joku operaatio epäonnistuu, kaikki peruuntuvat
3. ✅ **Parempi suorituskyky** - Yksi tietokantayhteys useamman sijaan
4. ✅ **Yksinkertaisempi virheenkäsittely** - Ei tarvitse huolehtia osittaisista epäonnistumisista
5. ✅ **Turvallisempi** - Ei race conditioneja monipäiväisten tapahtumien kanssa

### Toteutus
1. Luo SQL-funktio Supabase SQL Editorissa
2. Päivitä `pages/index.js` savePosts-funktio käyttämään RPC:tä
3. Testaa perusteellisesti:
   - Uuden tapahtuman luonti
   - Olemassa olevan tapahtuman päivitys
   - Virhetilanteet (epäkelvot arvot, verkkovirhe)
4. Monitoroi Supabase Dashboard > Logs virheille

### Prioriteetti
🔴 **KORKEA** - Seuraava toteutettava ominaisuus

---

## 2. Liiallinen alert()-käyttö

### Ongelma
- 172 alert()-kutsua koko projektissa
- Primitiiviset JavaScript-dialogit, huono UX
- Estävät käyttäjän vuorovaikutuksen

### Ratkaisu
Käytä toast-ilmoituksia (esim. `react-toastify`):

```bash
npm install react-toastify
```

```javascript
// Korvaa: alert('✅ Tallennettu!')
// Korvauksella: toast.success('Tallennettu!')
```

---

## 3. Herkän datan loggaus

### Status: ✅ KORJATTU

Luotu `/lib/logger.js`-moduuli, joka:
- Sanitoi automaattisesti sähköpostit, tokenit ja muun herkän datan
- Loggaa vain development-ympäristössä
- Korjattu seuraavissa tiedostoissa:
  - pages/index.js
  - pages/login.js
  - pages/test-auth.js
  - pages/simple-test.js
  - pages/api/brand-guidelines/* (kaikki)
  - lib/errorHandler.js

---

## 4. Puuttuva TypeScript

### Ongelma
- Projekti käyttää pelkkää JavaScriptiä
- Ei tyyppitarkistusta build-aikana
- Suurempi riski runtime-virheisiin

### Ratkaisu
Asteittainen TypeScript-migraatio:
1. Asenna TypeScript ja tyyppimäärittelyt
2. Nimeä `.js` -> `.tsx` kriittisissä komponenteissa
3. Määrittele tyypit tapahtuma-objekteille
4. Lisää API-vastauksille interface-määrittelyt

---

## 5. TODO/DEPRECATED-kommentit

Seuraavat asiat vaativat huomiota:

### DEPRECATED-kentät tietokannassa
- `supabase-schema.sql:8-9` - `events.date` ja `events.time` kentät merkitty DEPRECATED
- Käytetään edelleen backward compatibility -syistä
- **Toimenpide:** Poista ja käytä vain `event_instances`-taulua

### Deprecated funktiot
- `lib/api/brandGuidelineService.js:295` - `downloadAndReadFile()` suositellaan
- `lib/api/brandGuidelineService.js:442` - Vanha latauslogiikka ei käytössä

---

Päivitetty: 2026-01-30
