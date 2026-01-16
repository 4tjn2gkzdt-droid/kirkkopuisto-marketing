# Resend Sähköpostipalvelun Asennus

## 1. Lisää API-avain ympäristömuuttujiin

Avaa tiedosto `.env.local` ja korvaa rivi:
```
RESEND_API_KEY=your_resend_api_key_here
```

Omalla Resend API-avaimellasi:
```
RESEND_API_KEY=re_123abc...
```

## 2. Käynnistä development-palvelin uudelleen

```bash
npm run dev
```

Tämä lataa uudet ympäristömuuttujat.

## 3. Testaa sähköpostilähetys

1. Mene sivulle: **Tiimi** (👥-nappi yläpalkissa)
2. Varmista että tiimin jäsenillä on sähköpostiosoitteet
3. Klikkaa **"👁️ Esikatsele viikkoraportti"** nähdäksesi miltä viesti näyttää
4. Klikkaa **"✉️ Lähetä viikkoraportti"** lähettääksesi sähköpostit

## 4. Tärkeää tietää

### Testiympäristö (oletuksena)

Tällä hetkellä sähköpostit lähetetään Resendin testiosoitteesta:
```
from: 'Kirkkopuiston Terassi <onboarding@resend.dev>'
```

**Rajoitukset:**
- Voit lähettää vain **omaan Resend-tilisi sähköpostiosoitteeseen**
- Muut vastaanottajat eivät saa viestejä
- Tämä on tarkoitettu testaamiseen

### Tuotantokäyttö - Oman domainin käyttö

Jotta voit lähettää sähköposteja kaikille, sinun täytyy:

1. **Varmenna oma domain Resendissä:**
   - Mene: https://resend.com/domains
   - Klikkaa "Add Domain"
   - Lisää esim. `kirkkopuistonterassi.fi`
   - Lisää DNS-tietueet (SPF, DKIM, DMARC) domain-asetuksiin
   - Odota vahvistusta (yleensä 15-30 min)

2. **Päivitä lähettäjän osoite koodissa:**

   Avaa tiedosto: `pages/api/send-weekly-tasks.js`

   Etsi rivi (noin rivi 144):
   ```javascript
   from: 'Kirkkopuiston Terassi <onboarding@resend.dev>',
   ```

   Korvaa se:
   ```javascript
   from: 'Kirkkopuiston Terassi <noreply@kirkkopuistonterassi.fi>',
   ```

3. **Testaa uudelleen** - nyt sähköpostit menevät kaikille!

## 5. Automaattiset viikkoraportit (valinnainen)

Jos haluat automaattisesti lähettää viikkoraportit joka viikko:

### Vercel Cron Job (suositus jos käytät Verceliä)

1. Luo tiedosto `vercel.json` projektin juureen:
```json
{
  "crons": [
    {
      "path": "/api/send-weekly-tasks",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

Tämä lähettää raportit joka maanantai klo 8:00.

2. Päivitä `pages/api/send-weekly-tasks.js` tukemaan GET-pyyntöjä:
```javascript
if (req.method !== 'POST' && req.method !== 'GET') {
  return res.status(405).json({ error: 'Method not allowed' })
}

// Cron job käyttää GET, UI käyttää POST
const { sendEmails = false } = req.method === 'GET' ? { sendEmails: true } : req.body
```

### GitHub Actions

Vaihtoehtoisesti voit käyttää GitHub Actionsia:

Luo tiedosto `.github/workflows/weekly-email.yml`:
```yaml
name: Send Weekly Task Emails

on:
  schedule:
    - cron: '0 8 * * 1'  # Maanantaisin klo 8:00 UTC

jobs:
  send-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Send weekly email
        run: |
          curl -X POST https://your-app.vercel.app/api/send-weekly-tasks \
            -H "Content-Type: application/json" \
            -d '{"sendEmails": true}'
```

## Tuki

- **Resend dokumentaatio:** https://resend.com/docs
- **Resend hinnoittelu:** Ilmainen 3,000 emailia/kk, sen jälkeen $0.001/email
- **API rajoitukset:** 10 emailia/sekunti (Free plan)

## Testausvinkki

Ennen kuin lisäät automaattiset lähetykset, testaa muutaman kerran manuaalisesti varmistaaksesi että:
1. Kaikilla tiimin jäsenillä on oikeat sähköpostiosoitteet
2. Viestit näyttävät hyvältä
3. Viestit eivät mene roskapostiin (tarkista SPF/DKIM asetukset)
