// Debug endpoint - palauttaa kaikki pyynnön tiedot
export default async function handler(req, res) {
  // Salli debug-reitit vain development-ympäristössä
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' })
  }

  // Aseta CORS-headerit
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Käsittele OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Palauta kaikki debug-tiedot
  const debugInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
    },
    nextVersion: process.env.npm_package_dependencies_next || 'unknown'
  }

  return res.status(200).json(debugInfo)
}
