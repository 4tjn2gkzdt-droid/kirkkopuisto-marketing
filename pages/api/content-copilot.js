import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../../lib/supabase'
import cors from '../../lib/cors'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, sessionId } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages-lista puuttuu' })
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY puuttuu')
    }

    const anthropic = new Anthropic({ apiKey })

    console.log('Content copilot request, messages:', messages.length)

    // Muotoile viestit Claude API:lle
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.8,
      messages: formattedMessages,
      system: `Olet interaktiivinen sisältöassistentti Kirkkopuiston Terassille Turussa.

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
    })

    const textContent = response.content.find(block => block.type === 'text')
    const assistantMessage = textContent?.text || 'Anteeksi, en pystynyt luomaan vastausta.'

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

    res.status(200).json({
      success: true,
      message: assistantMessage,
      usage: response.usage
    })

  } catch (error) {
    console.error('Content copilot error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}

export default cors(handler)
