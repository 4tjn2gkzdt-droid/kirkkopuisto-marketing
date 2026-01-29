import { withCorsAndErrorHandling } from '../../lib/errorHandler'
import { createClaudeMessage, SystemPrompts } from '../../lib/api/claudeService'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Invalid message format',
      receivedType: typeof message,
      receivedValue: message ? 'exists' : 'null/undefined'
    })
  }

  // Käytä claudeService:ä
  const result = await createClaudeMessage({
    message,
    systemPrompt: SystemPrompts.MARKETING_WRITER,
    maxTokens: 1024
  })

  return res.status(200).json({
    response: result.response || 'Ei vastausta',
    usage: result.usage
  })
}

export default withCorsAndErrorHandling(handler)
