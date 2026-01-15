import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid message format',
        receivedType: typeof message,
        receivedValue: message ? 'exists' : 'null/undefined'
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Debug info - näyttää onko avain olemassa
    console.log('API Key check:', {
      exists: !!apiKey,
      length: apiKey?.length || 0,
      prefix: apiKey?.substring(0, 7) || 'none',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('API'))
    });

    if (!apiKey) {
      return res.status(500).json({
        error: 'API-avain puuttuu',
        details: 'ANTHROPIC_API_KEY ei löydy ympäristömuuttujista',
        help: 'Lisää ANTHROPIC_API_KEY Vercel Environment Variables -asetuksiin ja redeploy',
        envKeysFound: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('API'))
      });
    }

    if (!apiKey.startsWith('sk-ant-')) {
      return res.status(500).json({
        error: 'Virheellinen API-avain',
        details: 'API-avaimen pitää alkaa "sk-ant-"',
        currentPrefix: apiKey.substring(0, 7),
        help: 'Tarkista että kopioit avaimen oikein Claude Console:sta'
      });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    console.log('Sending request to Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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

    console.log('Claude API response received:', {
      hasContent: !!response.content,
      contentLength: response.content?.length || 0,
      usage: response.usage
    });

    const textContent = response.content.find(block => block.type === 'text');

    res.status(200).json({
      response: textContent?.text || 'Ei vastausta',
      usage: response.usage
    });

  } catch (error) {
    console.error('Claude API Error:', error);

    // Tarkempi virheanalyysi
    let errorDetails = {
      message: error.message,
      type: error.constructor.name,
      statusCode: error.status || error.statusCode || 'unknown'
    };

    // Anthropic-spesifiset virheet
    if (error.error?.type) {
      errorDetails.anthropicError = error.error.type;
      errorDetails.anthropicMessage = error.error.message;
    }

    res.status(500).json({
      error: 'Virhe AI-pyynnössä',
      details: error.message,
      debugInfo: errorDetails,
      help: error.status === 401 ? 'API-avain on virheellinen tai vanhentunut. Luo uusi avain Claude Console:sta.' :
            error.status === 429 ? 'API rate limit ylitetty. Odota hetki ja yritä uudelleen.' :
            'Tarkista Vercel Logs lisätietojen saamiseksi.'
    });
  }
}
