# CLAUDE.md - Kirkkopuisto Marketing

## Projektin yleiskuvaus

Kirkkopuiston Terassin markkinointityökalu. Next.js-pohjainen web-sovellus, joka sisältää tapahtumakalenterin, brainstorming-työkalun, admin-paneelin ja AI-pohjaisen sisällöntuotannon.

## Tech Stack

- Framework: Next.js 14 (Pages Router)
- UI: React 18, Tailwind CSS 3
- Tietokanta: Supabase
- AI: Anthropic Claude API (@anthropic-ai/sdk)
- Muut: Resend (sähköpostit), jsPDF, cheerio, DOMPurify

## Projektin rakenne

- `pages/` - Next.js sivut ja API-reitit
- `pages/api/` - Backend API-endpointit
- `lib/api/` - Palvelukerros / API-logiikka
- `components/` - React-komponentit
- `styles/` - Tailwind-tyylit

## Ominaisuudet

1. **Tapahtumakalenteri** - tapahtumien hallinta ja näyttö
2. **Brainstorming-työkalu** - ideoiden generointi markkinointiin
3. **Admin-paneeli** - sisällön ja asetusten hallinta
4. **AI-sisällöntuotanto** - Claude API:n avulla tuotettu markkinointisisältö

## Nykyinen tilanne (helmikuu 2025)

Kaikki perusominaisuudet on rakennettu. Keskitytään kolmeen pääprioritettiin:

1. **Bugien korjaus** - Vakauttaminen ja olemassa olevien virheiden korjaaminen
2. **UI/UX:n hiominen** - Käyttöliittymän ja käyttökokemuksen parantaminen
3. **AI-markkinoinnin kehitys** - Tekoälypohjaisen sisällöntuotannon kehittäminen Kirkkopuiston Terassin markkinointiin eri kanavissa (some, sähköposti, verkkosivut)

## Säännöt Claudelle

### Git-käytännöt

- Työskentele AINA main-branchissa, ellei erikseen pyydetä luomaan feature-branchia
- ÄLÄ luo uusia brancheja automaattisesti
- Commit-viestit suomeksi
- Tee pieniä, selkeitä committeja

### Koodaustyyli

- UI-tekstit suomeksi
- Kommentit suomeksi tai englanniksi
- Noudata olemassa olevaa koodaustyyliä
- Älä lisää uusia riippuvuuksia ilman lupaa

### Tärkeää

- Kysy ennen suuria rakenteellisia muutoksia
- Älä poista olemassa olevaa toiminnallisuutta korjatessasi bugeja
- Testaa muutokset ennen committia (npm run build)
- Keskity yhteen tehtävään kerrallaan
