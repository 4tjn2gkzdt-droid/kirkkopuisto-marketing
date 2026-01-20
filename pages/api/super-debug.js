// SUPER DEBUG ENDPOINT - Näyttää KAIKEN mitä tapahtuu
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req, res) {
  const timestamp = new Date().toISOString()

  // Aseta CORS headers HETI
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Max-Age', '86400')

  // Käsittele OPTIONS preflight HETI
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] OPTIONS preflight request handled`)
    return res.status(200).json({
      message: 'CORS preflight OK',
      timestamp
    })
  }

  // Kerää KAIKKI tiedot
  const debugInfo = {
    timestamp,
    success: true,
    message: '✅ API endpoint toimii!',

    // Request basics
    request: {
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion,
    },

    // Headers (kaikki)
    headers: {
      ...req.headers,
      // Erikseen näkyville tärkeimmät
      important: {
        'content-type': req.headers['content-type'],
        'origin': req.headers['origin'],
        'referer': req.headers['referer'],
        'user-agent': req.headers['user-agent'],
        'accept': req.headers['accept'],
      }
    },

    // Query parameters
    query: req.query,

    // Body
    body: req.body,
    bodySize: JSON.stringify(req.body || {}).length,

    // Environment
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasResendKey: !!process.env.RESEND_API_KEY,
      platform: process.platform,
      nodeVersion: process.version,
    },

    // CORS info
    cors: {
      origin: req.headers.origin || 'NO ORIGIN HEADER',
      preflight: req.method === 'OPTIONS',
      responseHeaders: {
        'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
      }
    },

    // Next.js specific
    nextjs: {
      buildId: process.env.BUILD_ID || 'unknown',
      isDev: process.env.NODE_ENV === 'development',
    }
  }

  console.log('=== SUPER DEBUG API CALLED ===')
  console.log(JSON.stringify(debugInfo, null, 2))

  return res.status(200).json(debugInfo)
}
