import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'API-avain puuttuu. Lisää ANTHROPIC_API_KEY ympäristömuuttujiin Vercelissä.'
      });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: message
      }],
      system: `Olet markkinointisisällön kirjoittaja Kirkkopuiston Terassille Turussa.
Luo houkuttelevia, napakkoja ja ammattimaisesti kirjoitettuja markkinointitekstejä eri kanaviin.
Käytä rennoa mutta selkeää suomen kieltä.
Sisällytä aina relevantti CTA (call-to-action).
Käytä sopivia emojeja säästeliäästi.
Lisää hashtagit loppuun: #kirkkopuistonterassi #turku ja muita relevantteja.`
    });

    const textContent = response.content.find(block => block.type === 'text');

    res.status(200).json({
      response: textContent?.text || 'Ei vastausta',
      usage: response.usage
    });

  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({
      error: 'Virhe AI-pyynnössä',
      details: error.message
    });
  }
}
