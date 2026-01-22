import { withCorsAndErrorHandling } from '../../lib/errorHandler'
import { createChatMessage, SystemPrompts } from '../../lib/api/claudeService'
import { supabase } from '../../lib/supabase'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, sessionId } = req.body

  console.log('Content copilot request, messages:', messages?.length || 0)

  // Käytä claudeService:ä
  const result = await createChatMessage({
    messages,
    systemPrompt: SystemPrompts.CONTENT_COPILOT,
    maxTokens: 2048,
    temperature: 0.8
  })

  const assistantMessage = result.response

  // Tallenna keskustelu jos sessionId annettu
  if (sessionId && supabase) {
    try {
      await supabase
        .from('copilot_sessions')
        .upsert({
          session_id: sessionId,
          messages: messages.concat([{ role: 'assistant', content: assistantMessage }]),
          updated_at: new Date().toISOString()
        })
    } catch (dbError) {
      console.error('Failed to save copilot session:', dbError)
      // Jatka silti, tietokantavirhe ei kaada koko pyyntöä
    }
  }

  return res.status(200).json({
    success: true,
    message: assistantMessage,
    usage: result.usage
  })
}

export default withCorsAndErrorHandling(handler)
