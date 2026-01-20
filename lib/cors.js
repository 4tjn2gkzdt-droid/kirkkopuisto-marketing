// CORS wrapper for API routes
// Usage: export default cors(handler)

export default function cors(handler) {
  return async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    // Continue to the actual handler
    return handler(req, res)
  }
}
