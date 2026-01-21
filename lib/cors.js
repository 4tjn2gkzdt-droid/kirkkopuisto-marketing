// CORS wrapper for API routes
// Usage: export default cors(handler)

export default function cors(handler) {
  return async (req, res) => {
    try {
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
      return await handler(req, res)
    } catch (error) {
      // Catch any unhandled errors and return JSON
      console.error('CORS wrapper caught error:', error)
      res.setHeader('Content-Type', 'application/json')
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Internal server error',
          details: error.toString(),
          stack: error.stack
        })
      }
    }
  }
}
