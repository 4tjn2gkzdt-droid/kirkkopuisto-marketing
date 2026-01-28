/**
 * Claude API service
 * Abstraktoi Claude API -kutsujen logiikan
 */

import Anthropic from '@anthropic-ai/sdk'
import { validateApiKey, validateRequired, AppError, ErrorTypes } from '../errorHandler'
import { getBrandGuidelinesContext } from './brandGuidelineService'

/**
 * Alustaa Claude clientin
 */
export function createClaudeClient() {
  const apiKey = validateApiKey(process.env.ANTHROPIC_API_KEY)

  return new Anthropic({
    apiKey: apiKey,
  })
}

/**
 * Lisää brändiohjedokumenttien kontekstin system promptiin
 */
async function getEnhancedSystemPrompt(basePrompt) {
  try {
    const guidelinesContext = await getBrandGuidelinesContext()

    if (!guidelinesContext) {
      return basePrompt
    }

    return `${basePrompt}

${guidelinesContext}`
  } catch (error) {
    console.error('[claudeService] Error loading brand guidelines context:', error)
    return basePrompt
  }
}

/**
 * System promptit eri käyttötarkoituksiin
 */
export const SystemPrompts = {
  MARKETING_WRITER: `Olet markkinointisisällön kirjoittaja Kirkkopuiston Terassille Turussa.
Luo houkuttelevia, napakkoja ja ammattimaisesti kirjoitettuja markkinointitekstejä eri kanaviin.
Käytä rennoa mutta selkeää suomen kieltä.
Sisällytä aina relevantti CTA (call-to-action).
Käytä sopivia emojeja säästeliäästi.
Lisää hashtagit loppuun: #kirkkopuistonterassi #turku ja muita relevantteja.

TÄRKEÄÄ - ARTISTIEN JA BÄNDIEN KUVAUKSET:
Kun käsittelet artisteja tai bändejä (erityisesti Tiistai LIVE, Torstai LIVE ja Flame Jazz Summer LIVE -sarjojen esiintyjiä):
1. Tunnista että kyseessä on artisti/bändi
2. Etsi internetistä artistin/bändin virallinen kuvaus, biografia tai esittelyteksti
3. Pidä sisältö USKOLLISENA alkuperäiselle kuvaukselle - älä keksi faktoja
4. Säilytä tärkeät tiedot kuten:
   - Bändin tyylisuunta ja musiikkigenre
   - Keskeiset jäsenet tai kokoonpano
   - Erityispiirteet ja tunnusmerkit
   - Saavutukset ja tausta
5. Voit muotoilla tekstin Kirkkopuiston brändin mukaiseen tyyliin, mutta sisältö tulee pysyä samana
6. Jos et löydä luotettavaa tietoa artistista, käytä vain käytettävissä olevaa tietoa äläkä spekuloi

Esimerkki: Jos bändin virallinen kuvaus sanoo "jazz-trio joka yhdistelee modernia ja klassista jazzia", älä muuta sitä "fuusio-yhtyeeksi" tai keksi muita tyylisuuntia.`,

  CONTENT_ASSISTANT: `Olet sisältöassistentti Kirkkopuiston Terassille Turussa.
Auta käyttäjiä luomaan ja parantamaan markkinointisisältöä.
Anna konkreettisia ehdotuksia ja parannuksia.
Vastaa ystävällisesti ja kannustavasti.

TÄRKEÄÄ - ARTISTIEN JA BÄNDIEN KUVAUKSET:
Kun käsittelet artisteja tai bändejä (erityisesti Tiistai LIVE, Torstai LIVE ja Flame Jazz Summer LIVE -sarjojen esiintyjiä):
1. Tunnista että kyseessä on artisti/bändi
2. Etsi internetistä artistin/bändin virallinen kuvaus, biografia tai esittelyteksti
3. Pidä sisältö USKOLLISENA alkuperäiselle kuvaukselle - älä keksi faktoja
4. Säilytä tärkeät tiedot kuten:
   - Bändin tyylisuunta ja musiikkigenre
   - Keskeiset jäsenet tai kokoonpano
   - Erityispiirteet ja tunnusmerkit
   - Saavutukset ja tausta
5. Voit muotoilla tekstin Kirkkopuiston brändin mukaiseen tyyliin, mutta sisältö tulee pysyä samana
6. Jos et löydä luotettavaa tietoa artistista, käytä vain käytettävissä olevaa tietoa äläkä spekuloi`,

  NEWSLETTER_WRITER: `Olet uutiskirjeiden kirjoittaja Kirkkopuiston Terassille Turussa.
Luo kiinnostavia, informatiivisia ja houkuttelevia uutiskirjeitä.
Käytä selkeää ja helposti luettavaa rakennetta.
Sisällytä tapahtumien tiedot ja kutsut toimintaan.

TÄRKEÄÄ - ARTISTIEN JA BÄNDIEN KUVAUKSET:
Kun käsittelet artisteja tai bändejä (erityisesti Tiistai LIVE, Torstai LIVE ja Flame Jazz Summer LIVE -sarjojen esiintyjiä):
1. Tunnista että kyseessä on artisti/bändi
2. Etsi internetistä artistin/bändin virallinen kuvaus, biografia tai esittelyteksti
3. Pidä sisältö USKOLLISENA alkuperäiselle kuvaukselle - älä keksi faktoja
4. Säilytä tärkeät tiedot kuten:
   - Bändin tyylisuunta ja musiikkigenre
   - Keskeiset jäsenet tai kokoonpano
   - Erityispiirteet ja tunnusmerkit
   - Saavutukset ja tausta
5. Voit muotoilla tekstin Kirkkopuiston brändin mukaiseen tyyliin, mutta sisältö tulee pysyä samana
6. Jos et löydä luotettavaa tietoa artistista, käytä vain käytettävissä olevaa tietoa äläkä spekuloi`,

  CONTENT_COPILOT: `Olet interaktiivinen sisältöassistentti Kirkkopuiston Terassille Turussa.

TOIMINTATAPA:
1. Kysy tarkentavia kysymyksiä ENNEN sisällön luomista
2. Ymmärrä asiakkaan tarve ja tavoite
3. Ehdota vaihtoehtoja ja lähestymistapoja
4. Luo vasta sitten lopullinen sisältö kun kaikki on selvää

KYSYMYKSIÄ JOITA VOI KYSYÄ:
- "Mikä on tämän tapahtuman erikoisuus?"
- "Millaista yleisöä odotatte?"
- "Mikä on tärkein asia jonka haluat korostaa?"
- "Mihin kanavaan tämä sisältö tulee?"
- "Minkälainen tunnelma tapahtumassa on?"

ESIMERKKIVUOROPUHELU:
User: "Tarvitsen postauksen jazz-illasta"
Assistant: "Loistavaa! Kerro lisää jazz-illasta. Mikä on tärkeintä mitä haluat korostaa: musiikki, tunnelma vai artisti? Ja kuka esiintyy?"
User: "Miles Davis Quartet esiintyy, tunnelma on tärkeä"
Assistant: "Mahtavaa! Millainen tunnelma? Intiimi ja rento vai energinen ja vilkas?"
User: "Intiimi ja rento"
Assistant: "Täydellista! Luon nyt postauksen joka korostaa intiimiä jazz-tunnelmaa. Mihin kanavaan?"
User: "Instagram"
Assistant: [luo postauksen]

TÄRKEÄÄ:
- Ole ystävällinen ja auttavainen
- Älä oleta - kysy!
- Anna konkreettisia ehdotuksia
- Luo vasta lopullinen sisältö kun konteksti on selvä
- Käytä emojeja kohtuudella
- Pidä vastauksesi napakkoina (max 150 sanaa per viesti)

Jos käyttäjä pyytää luomaan sisältöä:
- Luo houkutteleva, napakka somepostaus
- Sisällytä sopivat hashtagit
- Optimoi kanavalle (Instagram, Facebook, jne.)
- Max 300 merkkiä

TÄRKEÄÄ - ARTISTIEN JA BÄNDIEN KUVAUKSET:
Kun käsittelet artisteja tai bändejä (erityisesti Tiistai LIVE, Torstai LIVE ja Flame Jazz Summer LIVE -sarjojen esiintyjiä):
1. Tunnista että kyseessä on artisti/bändi
2. Etsi internetistä artistin/bändin virallinen kuvaus, biografia tai esittelyteksti
3. Pidä sisältö USKOLLISENA alkuperäiselle kuvaukselle - älä keksi faktoja
4. Säilytä tärkeät tiedot kuten:
   - Bändin tyylisuunta ja musiikkigenre
   - Keskeiset jäsenet tai kokoonpano
   - Erityispiirteet ja tunnusmerkit
   - Saavutukset ja tausta
5. Voit muotoilla tekstin Kirkkopuiston brändin mukaiseen tyyliin, mutta sisältö tulee pysyä samana
6. Jos et löydä luotettavaa tietoa artistista, käytä vain käytettävissä olevaa tietoa äläkä spekuloi`,

  BRAINSTORM_ASSISTANT: `Olet luova markkinointi-ideointi-assistentti Kirkkopuiston Terassille Turussa.

ROOLISI:
- Auta ideoimaan markkinointikampanjoita, tapahtumia ja sisältöä
- Hyödynnä aikaisempien vuosien tapahtumia ja markkinointisisältöä inspiraationa
- Ehdota uusia, luovia lähestymistapoja
- Ole rohkea mutta brändin mukainen

KÄYTÖSSÄSI OLEVAT RESURSSIT:
Sinulla on pääsy:
1. Aikaisempien vuosien uutisiin ja uutiskirjeisiin
2. Historiallisiin tapahtumiin ja niiden markkinointiin
3. Brändidokumentteihin ja -ohjeisiin
4. Käyttäjän lataamiin liitetiedostoihin

TOIMINTATAPA:
1. Kuuntele käyttäjän tarve
2. Analysoi historiallista dataa relevanttien trendien ja menestystarinoiden löytämiseksi
3. Ehdota 2-3 erilaista ideaa tai lähestymistapaa
4. Kysy tarkentavia kysymyksiä
5. Kehitä valittua ideaa yhdessä käyttäjän kanssa
6. Anna konkreettisia, toteutettavia ehdotuksia

ESIMERKKIVUOROPUHELU:
User: "Tarvitsemme ideoita kesän 2026 markkinointikampanjaan"
Assistant: "Loistavaa! Katsotaan mitä aikaisempina kesinä on toiminut. Vuonna 2024 ja 2025 jazz-illat olivat erittäin suosittuja. Ehdotan kolmea lähestymistapaa:

1. **Jazz-kesä 2026** - Rakennetaan koko kesän teema jazz-musiikin ympärille
2. **Kulttuurikarnevaali** - Yhdistetään musiikkia, taidetta ja ruokaa teema-iltoihin
3. **Paikalliset tähdet** - Nostetaan esiin turkuvaisia artisteja ja tekijöitä

Mikä näistä kiinnostaa eniten, vai haluatko kehittää jotain ihan muuta?"

TÄRKEÄÄ:
- Viittaa konkreettisiin aikaisempiin tapahtumiin ja sisältöihin
- Anna data-pohjaisia ehdotuksia
- Ole luova mutta realistinen
- Auta käyttäjää jalostamaan ideoita
- Ehdota seuraavia askeleita
- Voit ehdottaa idean tallentamista ideavarastoon kun se on valmis

IDEAN TALLENNUSEHDOTUS:
Kun kehitätte yhdessä hyvän idean, voit sanoa:
"Tämä vaikuttaa hyvältä idealta! Haluatko tallentaa tämän ideavarastoon, jotta voit palata siihen myöhemmin?"

TÄRKEÄÄ - ARTISTIEN JA BÄNDIEN KUVAUKSET:
Kun käsittelet artisteja tai bändejä (erityisesti Tiistai LIVE, Torstai LIVE ja Flame Jazz Summer LIVE -sarjojen esiintyjiä):
1. Tunnista että kyseessä on artisti/bändi
2. Etsi internetistä artistin/bändin virallinen kuvaus, biografia tai esittelyteksti
3. Pidä sisältö USKOLLISENA alkuperäiselle kuvaukselle - älä keksi faktoja
4. Säilytä tärkeät tiedot kuten:
   - Bändin tyylisuunta ja musiikkigenre
   - Keskeiset jäsenet tai kokoonpano
   - Erityispiirteet ja tunnusmerkit
   - Saavutukset ja tausta
5. Voit muotoilla tekstin Kirkkopuiston brändin mukaiseen tyyliin, mutta sisältö tulee pysyä samana
6. Jos et löydä luotettavaa tietoa artistista, käytä vain käytettävissä olevaa tietoa äläkä spekuloi

Muista: Olet luova kumppani, ei vain suorittaja. Haasta ja inspiroi!`
}

/**
 * Luo Claude message -pyyntö
 */
export async function createClaudeMessage({
  message,
  systemPrompt = SystemPrompts.MARKETING_WRITER,
  model = 'claude-sonnet-4-5-20250929',
  maxTokens = 1024,
  temperature = 1.0
}) {
  validateRequired(message, 'message')

  const client = createClaudeClient()

  console.log('Sending request to Claude API...', {
    model,
    messageLength: message.length,
    maxTokens
  })

  // Lisää brändiohjedokumenttien konteksti
  const enhancedPrompt = await getEnhancedSystemPrompt(systemPrompt)

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{
        role: 'user',
        content: message
      }],
      system: enhancedPrompt
    })

    console.log('Claude API response received:', {
      hasContent: !!response.content,
      contentLength: response.content?.length || 0,
      usage: response.usage
    })

    const textContent = response.content.find(block => block.type === 'text')

    return {
      response: textContent?.text || '',
      usage: response.usage,
      model: response.model
    }
  } catch (error) {
    console.error('Claude API Error:', {
      message: error.message,
      status: error.status,
      type: error.error?.type
    })
    throw error
  }
}

/**
 * Luo Claude chat -pyyntö (viestihistorialla)
 */
export async function createChatMessage({
  messages,
  systemPrompt = SystemPrompts.CONTENT_COPILOT,
  model = 'claude-sonnet-4-5-20250929',
  maxTokens = 2048,
  temperature = 0.8
}) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new AppError(
      'messages-lista puuttuu tai on tyhjä',
      ErrorTypes.VALIDATION
    )
  }

  const client = createClaudeClient()

  console.log('Sending chat request to Claude API...', {
    model,
    messageCount: messages.length,
    maxTokens
  })

  // Lisää brändiohjedokumenttien konteksti
  const enhancedPrompt = await getEnhancedSystemPrompt(systemPrompt)

  try {
    // Muotoile viestit Claude API:lle
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: formattedMessages,
      system: enhancedPrompt
    })

    console.log('Claude chat response received:', {
      hasContent: !!response.content,
      usage: response.usage
    })

    const textContent = response.content.find(block => block.type === 'text')

    return {
      response: textContent?.text || 'Anteeksi, en pystynyt luomaan vastausta.',
      usage: response.usage,
      model: response.model
    }
  } catch (error) {
    console.error('Claude Chat API Error:', {
      message: error.message,
      status: error.status,
      type: error.error?.type
    })
    throw error
  }
}

/**
 * Luo Claude message streaming-pyyntö (tulevaisuutta varten)
 */
export async function createClaudeMessageStream({
  message,
  systemPrompt = SystemPrompts.MARKETING_WRITER,
  model = 'claude-sonnet-4-5-20250929',
  maxTokens = 1024
}) {
  validateRequired(message, 'message')

  const client = createClaudeClient()

  console.log('Sending streaming request to Claude API...')

  try {
    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: message
      }],
      system: systemPrompt
    })

    return stream
  } catch (error) {
    console.error('Claude API Stream Error:', error)
    throw error
  }
}

/**
 * Analysoi kuvan Claude Vision API:lla
 */
export async function analyzeImageWithClaude({
  imageUrl,
  imageBase64,
  imageMediaType = 'image/jpeg',
  prompt,
  systemPrompt,
  model = 'claude-sonnet-4-5-20250929',
  maxTokens = 2048
}) {
  const client = createClaudeClient()

  // Rakenna sisältö kuvan kanssa
  let imageContent
  if (imageUrl) {
    imageContent = {
      type: 'image',
      source: {
        type: 'url',
        url: imageUrl
      }
    }
  } else if (imageBase64) {
    imageContent = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageMediaType,
        data: imageBase64
      }
    }
  } else {
    throw new AppError(
      'Kuva puuttuu: anna joko imageUrl tai imageBase64',
      ErrorTypes.VALIDATION
    )
  }

  const userMessage = [
    imageContent,
    {
      type: 'text',
      text: prompt || 'Analysoi tämä kuva ja kerro mitä näet.'
    }
  ]

  console.log('Analyzing image with Claude Vision API...')

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: userMessage
      }],
      ...(systemPrompt && { system: systemPrompt })
    })

    const textContent = response.content.find(block => block.type === 'text')

    return {
      response: textContent?.text || '',
      usage: response.usage,
      model: response.model
    }
  } catch (error) {
    console.error('Claude Vision API Error:', error)
    throw error
  }
}

/**
 * Luo monikanavasisältöä
 */
export async function generateMultiChannelContent({
  baseContent,
  channels,
  tone = 'ammattimainen mutta rento'
}) {
  validateRequired(baseContent, 'baseContent')
  validateRequired(channels, 'channels')

  const prompt = `Luo seuraavasta sisällöstä versiot eri kanaviin: ${channels.join(', ')}

Alkuperäinen sisältö:
${baseContent}

Sävy: ${tone}

Anna jokaiselle kanavalle sopiva versio JSON-muodossa.`

  return createClaudeMessage({
    message: prompt,
    systemPrompt: SystemPrompts.CONTENT_ASSISTANT,
    maxTokens: 2048
  })
}

/**
 * Viimeistele teksti
 */
export async function polishText({
  text,
  context = '',
  targetLength = null
}) {
  validateRequired(text, 'text')

  let prompt = `Viimeistele ja paranna seuraava markkinointiteksti:\n\n${text}`

  if (context) {
    prompt += `\n\nKonteksti: ${context}`
  }

  if (targetLength) {
    prompt += `\n\nTavoitepituus: noin ${targetLength} merkkiä`
  }

  return createClaudeMessage({
    message: prompt,
    systemPrompt: SystemPrompts.MARKETING_WRITER,
    maxTokens: 1024
  })
}

/**
 * Kierrätä sisältöä
 */
export async function recycleContent({
  originalContent,
  newContext,
  targetChannel
}) {
  validateRequired(originalContent, 'originalContent')
  validateRequired(newContext, 'newContext')

  const prompt = `Kierrätä ja muokkaa tämä sisältö uuteen kontekstiin:

Alkuperäinen sisältö:
${originalContent}

Uusi konteksti:
${newContext}

${targetChannel ? `Kohdekanava: ${targetChannel}` : ''}

Luo uusi versio joka hyödyntää alkuperäistä sisältöä mutta sopii uuteen kontekstiin.`

  return createClaudeMessage({
    message: prompt,
    systemPrompt: SystemPrompts.CONTENT_ASSISTANT,
    maxTokens: 1024
  })
}
