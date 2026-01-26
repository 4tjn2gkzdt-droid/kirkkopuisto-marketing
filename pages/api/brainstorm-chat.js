/**
 * API-reitti brainstorming-chatille
 * Hyödyntää historiallista sisältöä AI-kontekstissa
 */

import { createChatMessage, SystemPrompts } from '../../lib/api/claudeService'
import {
  buildBrainstormContext,
  saveBrainstormMessage,
  getBrainstormMessages,
  createBrainstormSession
} from '../../lib/api/brainstormService'
import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  // Salli vain POST-pyynnöt
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      messages,
      sessionId,
      sessionTitle,
      includeHistoricalContent = true,
      includeSocialPosts = true,
      includeEvents = true,
      includeBrandGuidelines = true,
      attachmentContext = null
    } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    // Luo uusi sessio jos ei ole olemassa
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const newSession = await createBrainstormSession({
        title: sessionTitle || 'Uusi brainstorming-sessio',
        user
      })
      currentSessionId = newSession.id
    }

    // Rakenna rikas konteksti AI:lle
    console.log('Building brainstorm context...')
    const contextString = await buildBrainstormContext({
      includeHistoricalContent,
      includeSocialPosts,
      includeEvents,
      includeBrandGuidelines
    })

    // Lisää liitetiedostojen konteksti jos saatavilla
    let fullContext = contextString
    if (attachmentContext) {
      fullContext += `\n\n# LIITETIEDOSTOT\n\n${attachmentContext}\n`
    }

    // Rakenna system prompt kontekstilla
    const systemPromptWithContext = `${SystemPrompts.BRAINSTORM_ASSISTANT}

---

# KONTEKSTI JA RESURSSIT

${fullContext}

---

Käytä yllä olevaa kontekstia inspiraationa ja taustatietona. Viittaa konkreettisiin tapahtumiin ja sisältöihin kun se on relevanttia.`

    console.log('Context built, length:', fullContext.length)

    // Lähetä viestit Claude:lle
    const response = await createChatMessage({
      messages,
      systemPrompt: systemPromptWithContext,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
      temperature: 0.9 // Korkeampi lämpötila luovempaa ajattelua varten
    })

    // Tallenna viestit tietokantaan
    try {
      // Tallenna käyttäjän viimeinen viesti
      const lastUserMessage = messages[messages.length - 1]
      if (lastUserMessage && lastUserMessage.role === 'user') {
        await saveBrainstormMessage(
          currentSessionId,
          'user',
          lastUserMessage.content
        )
      }

      // Tallenna AI:n vastaus
      await saveBrainstormMessage(
        currentSessionId,
        'assistant',
        response.response,
        {
          usage: response.usage,
          model: response.model
        }
      )
    } catch (saveError) {
      console.error('Error saving messages:', saveError)
      // Jatka silti, vaikka tallennus epäonnistuisi
    }

    // Palauta vastaus
    res.status(200).json({
      response: response.response,
      usage: response.usage,
      model: response.model,
      sessionId: currentSessionId
    })
  } catch (error) {
    console.error('Error in brainstorm-chat API:', error)

    // Palauta selkeä virheviesti
    const errorMessage = error.message || 'Internal server error'
    const statusCode = error.status || 500

    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
