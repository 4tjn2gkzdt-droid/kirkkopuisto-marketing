// Debug-versio newsletter-endpointista
import cors from '../../lib/cors'

async function handler(req, res) {
  // Logaa KAIKKI
  console.log('=== DEBUG NEWSLETTER API ===')
  console.log('Time:', new Date().toISOString())
  console.log('Method:', req.method)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('URL:', req.url)
  console.log('Query:', req.query)

  // Palauta debug-info
  res.status(200).json({
    success: true,
    debug: {
      method: req.method,
      timestamp: new Date().toISOString(),
      headers: req.headers,
      message: 'Debug endpoint works! CORS wrapper is active.',
      corsHeadersSet: {
        'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      }
    }
  })
}

export default cors(handler)
