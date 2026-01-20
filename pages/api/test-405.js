// Yksinkertainen testi-endpoint 405-virheen diagnosointiin
export default async function handler(req, res) {
  // Pakota CORS-headerit suoraan
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Diagnostiikka-info
  const diagnostics = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: {
      origin: req.headers.origin || 'none',
      'content-type': req.headers['content-type'] || 'none',
      'user-agent': req.headers['user-agent'] || 'none'
    },
    corsTest: {
      message: 'Jos näet tämän viestin, API-reitti toimii',
      nextStep: 'Kokeile lähettää POST-pyyntö tähän samaan endpointiin'
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform
    }
  }

  // Palauta aina 200 OK kaikille metodeille
  return res.status(200).json(diagnostics)
}
