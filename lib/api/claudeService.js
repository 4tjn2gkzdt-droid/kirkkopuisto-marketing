/**
 * Claude API service
 * Abstraktoi Claude API -kutsujen logiikan
 */

import Anthropic from '@anthropic-ai/sdk'
import { validateApiKey, validateRequired, AppError, ErrorTypes } from '../errorHandler'

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
 * System promptit eri käyttötarkoituksiin
 */
export const SystemPrompts = {
  MARKETING_WRITER: `Olet markkinointisisällön kirjoittaja Kirkkopuiston Terassille Turussa.
Luo houkuttelevia, napakkoja ja ammattimaisesti kirjoitettuja markkinointitekstejä eri kanaviin.
Käytä rennoa mutta selkeää suomen kieltä.
Sisällytä aina relevantti CTA (call-to-action).
Käytä sopivia emojeja säästeliäästi.
Lisää hashtagit loppuun: #kirkkopuistonterassi #turku ja muita relevantteja.`,

  CONTENT_ASSISTANT: `Olet sisältöassistentti Kirkkopuiston Terassille Turussa.
Auta käyttäjiä luomaan ja parantamaan markkinointisisältöä.
Anna konkreettisia ehdotuksia ja parannuksia.
Vastaa ystävällisesti ja kannustavasti.`,

  NEWSLETTER_WRITER: `Olet uutiskirjeiden kirjoittaja Kirkkopuiston Terassille Turussa.
Luo kiinnostavia, informatiivisia ja houkuttelevia uutiskirjeitä.
Käytä selkeää ja helposti luettavaa rakennetta.
Sisällytä tapahtumien tiedot ja kutsut toimintaan.`,

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
- Max 300 merkkiä`
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

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{
        role: 'user',
        content: message
      }],
      system: systemPrompt
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
      system: systemPrompt
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
