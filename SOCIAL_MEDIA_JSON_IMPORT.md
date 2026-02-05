# Sosiaalisen median postausten tuonti JSON-tiedostosta

Tämä ohje kertoo, miten voit viedä Instagram- ja Facebook-postauksesi ja tuoda ne järjestelmään JSON-tiedoston kautta.

## Vaihtoehto 1: Meta-alustojen virallinen datavienti

### Instagram-datan vienti

1. **Avaa Instagram** älypuhelimessa tai selaimessa
2. Mene **Asetukset** > **Tietosi ja käyttöoikeudet** > **Lataa tai siirrä tietosi**
3. Valitse **Lataa tietosi**
4. Valitse **JSON**-formaatti (ei HTML)
5. Valitse mitä haluat ladata:
   - Postaukset (Posts)
   - Kuvat (Media)
   - Kommentit (Comments)
6. Lähetä pyyntö
7. **Odota 1-48 tuntia** - Instagram lähettää sähköpostin kun data on valmis
8. Lataa ZIP-tiedosto sähköpostista (linkki voimassa 4 päivää)
9. Pura ZIP-tiedosto ja etsi `posts_1.json` tai vastaava

### Facebook-datan vienti

1. Mene osoitteeseen [accountscenter.facebook.com](https://accountscenter.facebook.com)
2. Klikkaa **Tietosi ja käyttöoikeudet** > **Lataa tietosi**
3. Valitse **JSON**-formaatti
4. Valitse mitä haluat ladata:
   - Julkaisut (Posts)
   - Kuvat ja videot
   - Kommentit
5. Lähetä pyyntö
6. **Odota 1-30 päivää** (yleensä alle viikko)
7. Lataa ZIP-tiedosto
8. Pura ja etsi `your_posts_1.json` tai vastaava

**Lähteet:**
- [How to request and download your Instagram data](https://pirg.org/resources/how-to-request-and-download-instagram-data/)
- [How to Export Your Instagram Data in 2025 (Step-by-Step)](https://dontfollowback.com/blog/2025-09-22-how-to-export-your-instagram-data-in-2025)
- [Download Facebook Data Before Deleting Account](https://www.bitrecover.com/blog/download-facebook-data-before-deleting-account/)

---

## Vaihtoehto 2: Luo oma JSON-tiedosto

Jos et halua odottaa Metan dataviennin valmistumista, voit luoda oman JSON-tiedoston.

### JSON-tiedoston rakenne

Järjestelmä hyväksyy JSON-tiedoston joka sisältää listan postauksia seuraavassa muodossa:

```json
[
  {
    "type": "social_post",
    "title": "Kesän jazzfestivaali 2024",
    "content": "Upea ilta Kirkkopuiston kesäjazzissa! 🎷 Tunnelma oli mahtava ja yleisö innostunut. #kirkko puistojazz #kesä2024",
    "summary": "Jazzfestivaali oli menestys",
    "publish_date": "2024-06-15",
    "year": 2024,
    "url": "https://instagram.com/p/example123",
    "metadata": {
      "platform": "instagram",
      "likes": 245,
      "comments": 18,
      "shares": 5
    }
  },
  {
    "type": "social_post",
    "title": "Syksyn konserttisarja alkaa",
    "content": "Syyskuun konsertit starttaa ensi viikolla! Liput nyt myynnissä. Tervetuloa nauttimaan hienoa musiikkia. 🎵",
    "summary": "Konserttisarjan aloitus",
    "publish_date": "2024-08-25",
    "year": 2024,
    "url": "https://facebook.com/kirkkopuisto/posts/123456",
    "metadata": {
      "platform": "facebook",
      "likes": 89,
      "comments": 12,
      "shares": 7
    }
  }
]
```

### Pakolliset kentät

- `title` - Postauksen otsikko tai lyhyt kuvaus
- `content` - Postauksen sisältö

### Valinnaiset kentät

- `type` - Sisällön tyyppi (oletus: `social_post`)
  - `social_post` - Somepostaus
  - `news` - Uutinen
  - `newsletter` - Uutiskirje
  - `article` - Artikkeli
  - `campaign` - Kampanja
- `summary` - Lyhyt yhteenveto
- `publish_date` - Julkaisupäivä (YYYY-MM-DD)
- `year` - Vuosi (esim. 2024)
- `url` - Linkki alkuperäiseen postaukseen
- `metadata` - Lisätietoja objektina (esim. tykkäykset, kommentit, alusta)

---

## JSON-tiedoston tuonti järjestelmään

1. Avaa **Admin** > **Historiallinen sisältö**
2. Klikkaa **📄 Tuo JSON-tiedosto** -painiketta
3. Valitse JSON-tiedosto koneeltasi
4. Järjestelmä lataa ja validoi tiedoston
5. Näet esikatselun kaikista tuotavista kohteista
6. Voit muokata jokaista kohdetta ennen tallentamista:
   - Otsikko
   - Yhteenveto
   - Sisältö
   - Tyyppi
   - Vuosi
   - Julkaisupäivä
   - URL
7. Klikkaa **💾 Tallenna kaikki** tallentaaksesi kaikki kohteet tietokantaan
8. Postaukset ovat nyt käytettävissä AI:n kontekstina ideointisivulla

---

## Esimerkkitiedosto

Katso `example-social-posts.json` tiedosto täydellisestä esimerkistä.

---

## Vinkkejä

### Meta-viennin käsittely

Meta-viennin JSON-tiedostot voivat olla monimutkaisempia. Jos Instagram/Facebook-vienti ei toimi suoraan:

1. Avaa JSON-tiedosto tekstieditorissa (VS Code, Notepad++, ym.)
2. Etsi postaukset - ne ovat yleensä listassa `data` tai `posts` -kentässä
3. Muunna formaatti vastaamaan yllä olevaa rakennetta
4. Voit käyttää apuna esim. ChatGPT:tä muuntamiseen

### Excel/CSV-muunnos

Jos sinulla on postaukset Excel- tai CSV-muodossa:
1. Vie Excel/CSV JSON-muotoon (esim. [convertcsv.com/csv-to-json.htm](https://www.convertcsv.com/csv-to-json.htm))
2. Varmista että kenttien nimet vastaavat yllä olevaa rakennetta
3. Tuo JSON-tiedosto järjestelmään

### Manuaalinen luonti

Voit myös luoda JSON-tiedoston käsin:
1. Kopioi yllä oleva esimerkkirakenne
2. Muokkaa tekstieditorissa
3. Tallenna `.json`-tiedostona
4. Tuo järjestelmään

---

## Ongelmatilanteet

### "JSON-tiedoston pitää sisältää lista postauksia"

Tiedostosi ei ole lista. Varmista että JSON alkaa `[` ja loppuu `]`.

### "Kohde X: Puuttuu title tai content"

Jokaisella postauksella pitää olla vähintään `title` ja `content` kentät.

### "Virhe JSON-tiedoston lukemisessa"

Tiedostosi ei ole validia JSON-muotoa. Tarkista:
- Että kaikilla kentillä on lainausmerkit
- Että pilkut ovat oikeissa paikoissa
- Että kaikki sulkeet `{}` ja `[]` on suljettu oikein

Voit validoida JSON-tiedoston esim. [jsonlint.com](https://jsonlint.com) -palvelussa.

---

## Tuki

Jos tarvitset apua JSON-tiedoston muodostamisessa, ota yhteyttä.
