import { withCorsAndErrorHandling } from '../../lib/errorHandler'
import { createClaudeMessage } from '../../lib/api/claudeService'

export const config = {
  maxDuration: 30,
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { caption, url } = req.body

  if (!caption || caption.trim().length === 0) {
    return res.status(400).json({ error: 'Caption is required' })
  }

  const urlSection = url ? `\n\nLISÄTIETOJA VARTEN LINKKI:\n${url}\n\nVoit käyttää tätä linkkiä artistin tai tapahtuman lisätietojen hakemiseen.` : '';

  const prompt = `Sinun tehtäväsi on viimeistellä somepostauksen teksti Kirkkopuiston Terassille.

ALKUPERÄINEN TEKSTI:
"${caption}"${urlSection}

Luo kolme eri versiota tästä tekstistä:

1. LYHYT versio (50-100 merkkiä): Napakka ja ytimekäs, sopii storeihin ja TikTokiin
2. KESKIPITKÄ versio (100-200 merkkiä): Tasapainoinen, sopii Instagram-feediin
3. PITKÄ versio (200-300 merkkiä): Kattava ja houkutteleva, sopii Facebookiin ja uutiskirjeeseen

OHJEET:
- Säilytä alkuperäisen tekstin tarkoitus ja viesti
- Käytä myönteistä, kutsuvaa sävyä
- Sisällytä tarvittaessa relevantteja emojeja luonnollisesti
- Älä käytä hashtag-merkkejä (#)
- Kirjoita suomeksi
- Tee tekstistä houkutteleva ja helppolukuinen

TÄRKEÄÄ - ARTISTIEN JA BÄNDIEN KUVAUKSET:
Jos tekstissä mainitaan artisti tai bändi:
1. Tunnista että kyseessä on artisti/bändi
2. Jos linkki on annettu, käytä sitä ensisijaisesti tiedonlähteenä
3. Etsi tarvittaessa myös internetistä artistin/bändin virallinen kuvaus, biografia tai esittelyteksti
4. Pidä sisältö USKOLLISENA alkuperäiselle kuvaukselle - älä keksi faktoja
5. Säilytä tärkeät tiedot kuten:
   - Bändin tyylisuunta ja musiikkigenre
   - Keskeiset jäsenet tai kokoonpano
   - Erityispiirteet ja tunnusmerkit
   - Saavutukset ja tausta
6. Voit muotoilla tekstin Kirkkopuiston brändin mukaiseen tyyliin, mutta sisältö tulee pysyä samana
7. Jos et löydä luotettavaa tietoa artistista, käytä vain käytettävissä olevaa tietoa äläkä spekuloi
8. Mikäli merkkimäärä antaa periksi, lisää artistista mielenkiintoisia faktoja tekstiin

Palauta vastaus JSON-muodossa:
{
  "short": "lyhyt versio tähän",
  "medium": "keskipitkä versio tähän",
  "long": "pitkä versio tähän"
}`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt: 'Olet luova somemarkkinoinnin asiantuntija joka osaa kirjoittaa houkuttelevia ja tehokkaita somepostauksia. Vastaat aina JSON-muodossa.',
      maxTokens: 1500,
      temperature: 0.7
    })

    // Tarkista että vastaus on olemassa
    if (!result || !result.response) {
      console.error('Empty response from Claude API')
      return res.status(500).json({
        error: 'AI ei palauttanut vastausta',
        details: 'Tyhjä vastaus Claude API:lta'
      })
    }

    let contentText = result.response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const jsonMatch = contentText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      contentText = jsonMatch[0]
    }

    let versions
    try {
      versions = JSON.parse(contentText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return res.status(500).json({
        error: 'AI palautti virheellisen JSON-muodon',
        details: contentText.substring(0, 200)
      })
    }

    // Validoi että kaikki versiot ovat olemassa
    if (!versions.short || !versions.medium || !versions.long) {
      console.error('Missing versions in AI response:', versions)
      return res.status(500).json({
        error: 'AI palautti puutteellisia versioita',
        details: `Saatiin: short=${!!versions.short}, medium=${!!versions.medium}, long=${!!versions.long}`
      })
    }

    return res.status(200).json({
      success: true,
      versions: {
        short: versions.short,
        medium: versions.medium,
        long: versions.long
      }
    })
  } catch (error) {
    console.error('Error in polish-caption:', error)
    // Jos virhe on jo AppError, anna sen mennä läpi wrapperin
    throw error
  }
}

export default withCorsAndErrorHandling(handler)
