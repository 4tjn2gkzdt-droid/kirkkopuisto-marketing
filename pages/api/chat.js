import Anthropic from '@anthropic-ai/sdk';
import cors from '../../lib/cors';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: messages,
      system: `Olet luova markkinointi-assistentti Kirkkopuiston Terassille.
Autoit käyttäjää ideoimaan sisältöä someen, uutiskirjeisiin ja muihin markkinointikanaviin.
Vastaa aina suomeksi ja ole inspiroiva mutta myös käytännönläheinen.
Kysy tarkentavia kysymyksiä ja anna konkreettisia ideoita.`
    });

    const textContent = response.content.find(block => block.type === 'text');

    res.status(200).json({
      message: textContent?.text || 'Ei vastausta',
      usage: response.usage
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Failed to get response',
      details: error.message
    });
  }
}

export default cors(handler);
