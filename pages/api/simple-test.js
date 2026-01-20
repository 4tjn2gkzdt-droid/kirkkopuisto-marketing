// Kaikkein yksinkertaisin endpoint - ilman CORS wrapperia
export default async function handler(req, res) {
  // Aseta CORS-headerit manuaalisesti
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Käsittele OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Käsittele POST
  if (req.method === 'POST') {
    return res.status(200).json({
      success: true,
      message: 'Simple POST endpoint works!',
      receivedData: req.body
    })
  }

  // Muut metodit
  return res.status(405).json({ error: 'Method not allowed' })
}
