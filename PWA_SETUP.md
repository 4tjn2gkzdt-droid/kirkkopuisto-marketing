# PWA (Progressive Web App) -asetukset

## 📱 Mobiilisovellus käyttöön

Sovellus on nyt PWA-valmis! Tämä tarkoittaa, että käyttäjät voivat asentaa sen älypuhelimeen kuten tavallisen sovelluksen.

## ✅ Toteutetut ominaisuudet:

1. **Web App Manifest** (`/public/manifest.json`)
   - Määrittelee sovelluksen nimen, kuvauksen, värit ja ikonit

2. **Service Worker** (`/public/sw.js`)
   - Mahdollistaa offline-toiminnallisuuden
   - Cachettaa tärkeimmät tiedostot paikallisesti
   - Sovellus toimii ilman nettiyhteyttä!

3. **Meta-tagit** (`/pages/_document.js`)
   - iOS- ja Android-tuki
   - Teeman värit ja kuvakkeet

4. **Asennusprompt** (`/components/InstallPrompt.js`)
   - Ehdottaa sovelluksen asentamista ensimmäisellä käynnillä
   - Näyttää selkeän ohjeen kuinka asentaa

## 🎨 Ikonit (TÄRKEÄÄ!)

Tällä hetkellä sovellus tarvitsee oikeat ikonit. Luo seuraavat kuvat ja tallenna ne `/public`-kansioon:

### Tarvittavat ikonit:

1. **icon-192.png** (192x192 pikseliä)
   - Käytetään aloitusnäytön pikkukuvakkeena

2. **icon-512.png** (512x512 pikseliä)
   - Käytetään sovelluksen pääkuvakkeena

### Suositukset ikoneille:

- Käytä Kirkkopuiston Terassin logoa
- Varmista että kuvat näkyvät hyvin myös pienessä koossa
- Käytä kirkkaita värejä (vihreä/keltainen teema sopii hyvin)
- PNG-muoto läpinäkyvällä taustalla tai yhtenäisellä väritaustalla

### Voit luoda ikonit esim:

- **Canva**: Ilmainen, helppokäyttöinen
- **Adobe Express**: Nopea luontiväline
- **Figma**: Ammattilaisille
- **Realfavicongenerator.net**: Luo kaikki tarvittavat koot automaattisesti

## 🚀 Käyttöönotto:

### 1. Lisää ikonit
Tallenna `icon-192.png` ja `icon-512.png` tiedostot `/public`-kansioon.

### 2. Buildaa sovellus
```bash
npm run build
```

### 3. Testaa paikallisesti
```bash
npm run start
```

### 4. Avaa selaimessa (mobiililla)
- Chrome/Edge: "Lisää aloitusnäyttöön"
- Safari (iOS): Jaa → "Lisää Koti-valikkoon"

## 📲 Käyttäjäohje:

### Android (Chrome):
1. Avaa sovellus selaimessa
2. Paina kolmea pistettä (⋮)
3. Valitse "Lisää aloitusnäyttöön"
4. Vahvista asennus

### iOS (Safari):
1. Avaa sovellus Safarissa
2. Paina Jaa-nappia (⬆️)
3. Valitse "Lisää Koti-valikkoon"
4. Anna nimi ja vahvista

## 🎯 Hyödyt:

- ✅ Toimii offline-tilassa
- ✅ Nopea lataus (cachettu)
- ✅ Näyttää aloitusnäytöllä muiden sovellusten kanssa
- ✅ Ei selainpalkkia - näyttää natiivilta sovellukselta
- ✅ Push-notifikaatiot mahdollisia (tulevaisuudessa)

## 🔧 Ylläpito:

Kun päivität sovellusta, muista päivittää myös Service Workerin `CACHE_NAME` `/public/sw.js` tiedostossa:

```javascript
const CACHE_NAME = 'kirkkopuisto-v2' // Kasvata versio numeroa
```

Tämä varmistaa että käyttäjät saavat uuden version cachetusta sisällöstä.
