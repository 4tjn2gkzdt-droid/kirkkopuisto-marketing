/**
 * Content service
 * Sisältöön liittyvät toiminnot: monikanava, kierrätys, viimeistely jne.
 */

import { createClaudeMessage, analyzeImageWithClaude, SystemPrompts } from './claudeService'
import { validateRequired, AppError, ErrorTypes } from '../errorHandler'

/**
 * Generoi somepäivitys
 */
export async function generateSocialPost({
  eventTitle,
  eventDate,
  eventDescription,
  postType,
  channel,
  tone = 'casual'
}) {
  validateRequired(eventTitle, 'eventTitle')

  const prompt = `Luo somepostaus tapahtumalle:

Tapahtuma: ${eventTitle}
${eventDate ? `Päivämäärä: ${eventDate}` : ''}
${eventDescription ? `Kuvaus: ${eventDescription}` : ''}
${postType ? `Postauksen tyyppi: ${postType}` : ''}
${channel ? `Kanava: ${channel}` : ''}
Sävy: ${tone}

Luo houkutteleva somepostaus joka:
- Herättää huomion
- Luo kiinnostusta
- Sisältää call-to-action
- Sopii annettuun kanavaan ja tyyliin
- Käyttää sopivia hashtageja

Palauta JSON-muodossa:
{
  "caption": "postauksen teksti",
  "hashtags": ["hashtag1", "hashtag2"],
  "cta": "toimintakehotus"
}`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt: SystemPrompts.MARKETING_WRITER,
      maxTokens: 1024
    })

    // Yritä parsia JSON
    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        success: true,
        post: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      // Jos JSON-parsinta epäonnistuu, palauta teksti sellaisenaan
      return {
        success: true,
        post: {
          caption: result.response,
          hashtags: ['#kirkkopuistonterassi', '#turku'],
          cta: 'Tule mukaan!'
        },
        usage: result.usage,
        rawText: true
      }
    }
  } catch (error) {
    console.error('Social post generation error:', error)
    throw error
  }
}

/**
 * Optimoi sisältö monelle kanavalle
 */
export async function optimizeMultiChannel({
  baseContent,
  channels = [],
  tone = 'casual',
  targetAudience = 'yleinen'
}) {
  validateRequired(baseContent, 'baseContent')

  if (!channels || channels.length === 0) {
    channels = ['Instagram', 'Facebook', 'Twitter/X']
  }

  const prompt = `Optimoi tämä sisältö eri somekanaviin:

Perussisältö:
${baseContent}

Kohdekanavat: ${channels.join(', ')}
Sävy: ${tone}
Kohderyhmä: ${targetAudience}

Luo jokaiselle kanavalle sopiva versio joka:
- Ottaa huomioon kanavan erityispiirteet (merkkirajoitukset, tyylit, yleisö)
- Säilyttää viestin ytimen
- Optimoi hashtagit ja emojit kanaville sopiviksi

Palauta JSON-muodossa:
{
  "channels": [
    {
      "name": "kanavan nimi",
      "content": "optimoitu sisältö",
      "hashtags": ["hashtag1", "hashtag2"],
      "notes": "huomiot tästä versiosta"
    }
  ]
}`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt: SystemPrompts.CONTENT_ASSISTANT,
      maxTokens: 2048
    })

    // Yritä parsia JSON
    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        success: true,
        result: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      console.error('JSON parse error in multiChannelOptimize:', parseError)

      // Fallback
      return {
        success: true,
        result: {
          channels: channels.map(channel => ({
            name: channel,
            content: baseContent,
            hashtags: ['#kirkkopuistonterassi', '#turku'],
            notes: 'Automaattinen fallback-sisältö'
          }))
        },
        usage: result.usage,
        fallback: true
      }
    }
  } catch (error) {
    console.error('Multi-channel optimization error:', error)
    throw error
  }
}

/**
 * Viimeistele caption/teksti
 */
export async function polishCaption({
  caption,
  context = '',
  targetLength = null,
  style = 'engaging'
}) {
  validateRequired(caption, 'caption')

  let prompt = `Viimeistele ja paranna tämä somepostauksen teksti:\n\n${caption}`

  if (context) {
    prompt += `\n\nKonteksti: ${context}`
  }

  if (targetLength) {
    prompt += `\n\nTavoitepituus: noin ${targetLength} merkkiä`
  }

  prompt += `\n\nTyyli: ${style}`
  prompt += `\n\nParanna tekstiä:
- Tee siitä houkuttelevampi ja kiinnostavampi
- Varmista että call-to-action on selkeä
- Tarkista kielioppi ja ilmaisut
- Optimoi emojien käyttö
- Lisää sopivat hashtagit loppuun

Palauta JSON-muodossa:
{
  "polished": "viimeistelly teksti",
  "improvements": "mitä muutoksia tehtiin",
  "hashtags": ["hashtag1", "hashtag2"]
}`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt: SystemPrompts.MARKETING_WRITER,
      maxTokens: 1024
    })

    // Yritä parsia JSON
    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        success: true,
        result: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      // Fallback: palauta teksti sellaisenaan
      return {
        success: true,
        result: {
          polished: result.response,
          improvements: 'Teksti viimeistelty',
          hashtags: ['#kirkkopuistonterassi', '#turku']
        },
        usage: result.usage,
        fallback: true
      }
    }
  } catch (error) {
    console.error('Caption polish error:', error)
    throw error
  }
}

/**
 * Kierrätä sisältöä uuteen kontekstiin
 */
export async function recycleContent({
  originalContent,
  originalContext,
  newContext,
  targetChannel = null
}) {
  validateRequired(originalContent, 'originalContent')
  validateRequired(newContext, 'newContext')

  const prompt = `Kierrätä ja muokkaa tämä sisältö uuteen kontekstiin:

Alkuperäinen sisältö:
${originalContent}

${originalContext ? `Alkuperäinen konteksti: ${originalContext}` : ''}

Uusi konteksti:
${newContext}

${targetChannel ? `Kohdekanava: ${targetChannel}` : ''}

Luo uusi versio joka:
- Hyödyntää alkuperäistä sisältöä
- Sopii uuteen kontekstiin täydellisesti
- Säilyttää brändin äänen
- On tuore ja kiinnostava

Palauta JSON-muodossa:
{
  "recycled": "uusi sisältö",
  "changes": "mitä muutettiin",
  "reasoning": "miksi nämä muutokset"
}`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt: SystemPrompts.CONTENT_ASSISTANT,
      maxTokens: 1024
    })

    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        success: true,
        result: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      return {
        success: true,
        result: {
          recycled: result.response,
          changes: 'Sisältö kierrätetty',
          reasoning: 'Mukautettu uuteen kontekstiin'
        },
        usage: result.usage,
        fallback: true
      }
    }
  } catch (error) {
    console.error('Content recycle error:', error)
    throw error
  }
}

/**
 * Analysoi kuva ja luo sisältöehdotukset
 */
export async function analyzeImageForContent({
  imageUrl,
  imageBase64,
  imageMediaType = 'image/jpeg',
  context = ''
}) {
  if (!imageUrl && !imageBase64) {
    throw new AppError(
      'Kuva puuttuu: anna joko imageUrl tai imageBase64',
      ErrorTypes.VALIDATION
    )
  }

  const prompt = `Analysoi tämä kuva ja ehdota somepostaukseen sopivaa sisältöä.

${context ? `Konteksti: ${context}` : ''}

Anna seuraavat tiedot JSON-muodossa:
{
  "description": "mitä kuvassa näkyy",
  "mood": "kuvan tunnelma",
  "suggestedCaption": "ehdotus somepostauksen tekstiksi",
  "hashtags": ["ehdotetut", "hashtagit"],
  "tips": "vinkkejä kuvan käyttöön"
}`

  try {
    const result = await analyzeImageWithClaude({
      imageUrl,
      imageBase64,
      imageMediaType,
      prompt,
      systemPrompt: SystemPrompts.CONTENT_ASSISTANT
    })

    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        success: true,
        analysis: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      console.error('JSON parse error in image analysis:', parseError)

      // Fallback
      return {
        success: true,
        analysis: {
          description: result.response,
          mood: 'positiivinen',
          suggestedCaption: 'Tule nauttimaan!',
          hashtags: ['#kirkkopuistonterassi', '#turku'],
          tips: 'Käytä kuvaa somepostauksessa'
        },
        usage: result.usage,
        fallback: true
      }
    }
  } catch (error) {
    console.error('Image analysis error:', error)
    throw error
  }
}

/**
 * Luo sisältötemplate
 */
export async function generateContentTemplate({
  templateType,
  occasion,
  targetAudience = 'yleinen',
  includeVariants = false
}) {
  validateRequired(templateType, 'templateType')
  validateRequired(occasion, 'occasion')

  const prompt = `Luo sisältömalli (template) seuraavaan tarkoitukseen:

Tyyppi: ${templateType}
Tilaisuus: ${occasion}
Kohderyhmä: ${targetAudience}

Luo uudelleenkäytettävä sisältömalli joka:
- Sopii annettuun tarkoitukseen
- On helppo muokata eri tilanteisiin
- Sisältää selkeät [TÄYTETTÄVÄT KOHDAT]
- Antaa esimerkkejä käytöstä

${includeVariants ? 'Luo myös 2-3 erilaista varianttia.' : ''}

Palauta JSON-muodossa:
{
  "template": "sisältömalli [TÄYTETTÄVÄT KOHDAT] mukaan lukien",
  "instructions": "ohjeet mallin käyttöön",
  "example": "esimerkki täytettynä",
  ${includeVariants ? '"variants": ["variantti1", "variantti2"],' : ''}
  "tips": "vinkkejä mallin hyödyntämiseen"
}`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt: SystemPrompts.CONTENT_ASSISTANT,
      maxTokens: 2048
    })

    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        success: true,
        template: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      return {
        success: true,
        template: {
          template: result.response,
          instructions: 'Muokkaa tarvittaessa',
          example: '',
          tips: 'Käytä pohjana omille sisällöillesi'
        },
        usage: result.usage,
        fallback: true
      }
    }
  } catch (error) {
    console.error('Template generation error:', error)
    throw error
  }
}

/**
 * Hae sisältöehdotuksia kalenteriin
 */
export async function getContentCalendarSuggestions({
  startDate,
  endDate,
  eventTypes = [],
  frequency = 'weekly'
}) {
  validateRequired(startDate, 'startDate')
  validateRequired(endDate, 'endDate')

  const prompt = `Ehdota sisältökalenterin sisältöjä ajalle ${startDate} - ${endDate}.

${eventTypes.length > 0 ? `Tapahtumatyypit: ${eventTypes.join(', ')}` : ''}
Julkaisutiheys: ${frequency}

Anna ehdotuksia:
- Somepostauksille
- Uutiskirjeille
- Kampanjoille

Palauta JSON-muodossa kalenteriehdotukset päivämäärineen.`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt: SystemPrompts.CONTENT_ASSISTANT,
      maxTokens: 2048
    })

    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        success: true,
        suggestions: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      return {
        success: true,
        suggestions: {
          items: [],
          note: 'Ei voitu luoda ehdotuksia tällä hetkellä'
        },
        usage: result.usage,
        fallback: true
      }
    }
  } catch (error) {
    console.error('Calendar suggestions error:', error)
    throw error
  }
}
