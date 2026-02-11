# Meta Graph API -integraation käyttöönotto

Tämä ohje näyttää miten otat käyttöön Instagram ja Facebook -integraation, joka mahdollistaa:
- 📷 Instagram Business -postausten automaattisen haun
- 📘 Facebook-sivun postausten automaattisen haun
- 💾 Postausten tallennuksen historialliseen sisältöön
- 🤖 AI:n käyttämän aiempia postauksia inspiraationa uusille

## Esivalmistelut

### 1. Meta Business Account & Facebook-sivu
- Tarvitset **Meta Business Account** (ilmainen)
- Tarvitset **Facebook-sivun** joka on yhdistetty Business Accountiin
- Jos haluat Instagram-integraation, tarvitset **Instagram Business** -tilin joka on yhdistetty Facebook-sivuun

### 2. Meta Developer Account

1. Mene osoitteeseen: https://developers.facebook.com/
2. Kirjaudu Facebook-tunnuksillasi
3. Klikkaa oikeasta yläkulmasta **My Apps** → **Create App**
4. Valitse **Business** app type
5. Täytä:
   - **App Name**: esim. "Kirkkopuisto Marketing"
   - **App Contact Email**: sähköpostiosoitteesi
   - **Business Account**: Valitse Meta Business Accountisi
6. Klikkaa **Create App**

## Vaihe 1: Facebook-sovelluksen konfigurointi

### Lisää tarvittavat tuotteet

1. Sovelluksesi dashboardista, valitse **Add Products**
2. Lisää seuraavat:
   - **Facebook Login** (klikkaa "Set Up")
   - **Instagram Graph API** (klikkaa "Set Up", jos haluat Instagram-integraation)

### Facebook Login -asetukset

1. Siirry: **Facebook Login** → **Settings**
2. Lisää **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/
   https://yourdomain.com/
   ```
3. Tallenna muutokset

## Vaihe 2: Hanki tarvittavat käyttöoikeudet (Permissions)

### App Review → Permissions and Features

1. Siirry: **App Review** → **Permissions and Features**
2. Pyydä seuraavat käyttöoikeudet:

**Instagram-integraatiota varten:**
- `instagram_basic`
- `instagram_content_publish` (jos haluat myös julkaista)
- `pages_show_list`
- `pages_read_engagement`

**Facebook-integraatiota varten:**
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts` (jos haluat myös julkaista)

**HUOM:** Kehitysvaiheessa voit testata ilman App Review:tä, mutta julkaistavassa sovelluksessa tarvitset Metan hyväksynnän näille käyttöoikeuksille.

## Vaihe 3: Hanki Access Token

### Kehitysvaiheessa (Graph API Explorer)

1. Mene: https://developers.facebook.com/tools/explorer/
2. Valitse sovelluksesi ylhäältä
3. Valitse **User Token** → **Get User Access Token**
4. Valitse käyttöoikeudet:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
   - `pages_manage_metadata`
5. Klikkaa **Generate Access Token**
6. Kirjaudu ja hyväksy käyttöoikeudet
7. **Kopioi token** (alkaa `EAAE...`)

⚠️ **TÄRKEÄÄ**: Tämä token on lyhytikäinen (1-2 tuntia). Alla ohjeet pitkäikäisen tokenin hankkimiseen.

### Hanki pitkäikäinen Access Token (60 päivää)

1. Ota ylös:
   - `APP_ID` (sovelluksesi ID, löytyy Settings → Basic)
   - `APP_SECRET` (sovelluksesi salaisuus, löytyy Settings → Basic)
   - `SHORT_LIVED_TOKEN` (juuri luomasi token)

2. Suorita terminaalissa:

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

Korvaa `APP_ID`, `APP_SECRET` ja `SHORT_LIVED_TOKEN` omilla arvoillasi.

3. Saat vastauksena:
```json
{
  "access_token": "EAAxxxxxxxxxxxxx",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

Tämä token on voimassa ~60 päivää. Kopioi `access_token`.

### Hanki ei-vanhene -token (Page Access Token)

Jos haluat tokenin joka ei vanhene:

1. Käytä pitkäikäistä User Access Tokenia
2. Hae sivusi tiedot:

```bash
curl -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_LONG_LIVED_TOKEN"
```

3. Etsi vastauksesta sivusi ID ja sen `access_token`
4. Tämä Page Access Token ei vanhene (jos käyttöoikeudet eivät muutu)

## Vaihe 4: Hanki Instagram Business Account ID

1. Hae Facebook-sivun tiedot:

```bash
curl -X GET "https://graph.facebook.com/v18.0/PAGE_ID?fields=instagram_business_account&access_token=ACCESS_TOKEN"
```

Korvaa `PAGE_ID` ja `ACCESS_TOKEN`.

2. Saat vastauksena:
```json
{
  "instagram_business_account": {
    "id": "1234567890"
  },
  "id": "987654321"
}
```

Kopioi `instagram_business_account.id`.

## Vaihe 5: Lisää ympäristömuuttujat

1. Avaa `.env.local` tiedostosi
2. Lisää seuraavat:

```env
# Meta Graph API - Instagram ja Facebook -integraatio
FACEBOOK_ACCESS_TOKEN=EAAxxxxxxxxxxxxx_your_long_lived_page_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=1234567890
FACEBOOK_PAGE_ID=987654321
```

3. Tallenna tiedosto
4. Käynnistä sovellus uudelleen

## Vaihe 6: Testaa integraatio

1. Kirjaudu adminina sovellukseen
2. Siirry: **Admin** → **📚 Historiallinen sisältö**
3. Klikkaa: **📱 Synkronoi Meta**
4. Valitse: **Synkronoi molemmat (Instagram + Facebook)**
5. Odota hetki - järjestelmä hakee postaukset

Jos kaikki toimii, näet viestin:
```
Synkronointi onnistui!

Haettu:
- Instagram: 50
- Facebook: 50

Tallennettu: XX uutta postausta
```

## Yleisiä ongelmia

### Virhe: "Token is invalid"
- Token on vanhentunut → Hanki uusi pitkäikäinen token
- Tokenilla ei ole tarvittavia käyttöoikeuksia → Tarkista Graph API Explorerissa

### Virhe: "Instagram Business Account not found"
- Instagram-tilisi ei ole Business-tili → Muuta se Business-tiliksi Instagramin asetuksista
- Instagram ei ole yhdistetty Facebook-sivuun → Yhdistä ne Facebook-sivun asetuksista

### Virhe: "(#100) Insufficient permission"
- Tokenilla ei ole tarvittavia käyttöoikeuksia
- Uudelleengeneroi token Graph API Explorerissa oikeilla käyttöoikeuksilla

### Virhe: "Page ID not found"
- Väärä Page ID → Tarkista ID `me/accounts` -kyselyllä
- Token ei ole Page Access Token → Hanki Page-kohtainen token

## Tokenin uusiminen automaattisesti

⚠️ **HUOM**: Meta ei suosittele automaattista token-uusimista tuotannossa. Käytä mieluummin:

1. **Webhook-pohjaista uusimista**: Meta lähettää webhookin kun token on vanhenemassa
2. **Business Integration**: Käytä Meta Business Integrationia joka hoitaa tokenin automaattisesti

Yksinkertaisempi vaihtoehto kehitykseen: Aseta kalenteriin muistutus uusia token 60 päivän välein.

## Postausten hyödyntäminen AI:ssa

Kun olet synkronoinut postaukset:

1. Siirry **Ideointi & Brainstorming** -sivulle
2. AI saa automaattisesti käyttöönsä:
   - Kaikki haetut Instagram-postaukset
   - Kaikki haetut Facebook-postaukset
   - Vanhat uutiskirjeet ja uutiset
3. AI analysoi:
   - Millaisia teemoja olet käyttänyt
   - Mikä tyyli toimii parhaiten
   - Mitkä postaukset saivat eniten sitoutumista (tykkäykset, kommentit)
4. AI käyttää näitä inspiraationa ja voi:
   - Ehdottaa samankaltaisia postauksia
   - Jatkaa aiempia teemoja
   - Luoda variaatioita menestyneistä postauksista

### Esimerkki AI-promptista

```
Luo uusi Instagram-postaus kesän tapahtumasta.
Katso aiempia onnistuneita postauksia ja käytä samankaltaista tyyliä.
```

AI analysoi automaattisesti:
- Aiemmat tapahtumapostaukset
- Niiden tykkäysmäärät
- Käytetyn kielen ja tyylin
- Hashtag-strategian
- Ja luo uuden postauksen joka todennäköisesti resonoi yleisön kanssa

## Lisätietoja

- [Meta for Developers](https://developers.facebook.com/)
- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Access Token Debug Tool](https://developers.facebook.com/tools/debug/accesstoken/)

## Tuki

Jos kohtaat ongelmia, tarkista:
1. Token on voimassa: https://developers.facebook.com/tools/debug/accesstoken/
2. Sovelluksella on tarvittavat käyttöoikeudet
3. Instagram Business Account on yhdistetty Facebook-sivuun
4. .env.local -tiedosto on oikein konfiguroitu

---

**Luotu**: 2026-01-26
**Päivitetty**: 2026-01-26
