// Minimaalinen newsletter-testi joka näyttää TARKALLEEN missä kohtaa kaatuu

export const config = {
  runtime: 'nodejs', // Varmista että EI ole edge runtime
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req, res) {
  const steps = []

  try {
    steps.push('1. Handler started')

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', steps })
    }
    steps.push('2. Method check passed')

    const body = req.body
    steps.push(`3. Body parsed: ${JSON.stringify(body)}`)

    // Testaa env-muuttujat
    steps.push(`4. ANTHROPIC_API_KEY exists: ${!!process.env.ANTHROPIC_API_KEY}`)
    steps.push(`4b. ANTHROPIC_API_KEY starts with: ${process.env.ANTHROPIC_API_KEY?.substring(0, 10)}...`)
    steps.push(`5. SUPABASE_URL exists: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    steps.push(`6. SUPABASE_SERVICE_KEY exists: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)

    // Testaa Supabase import
    try {
      const { supabaseAdmin } = await import('../../lib/supabase-admin')
      steps.push('7. Supabase admin imported successfully')

      // Testaa yksinkertainen kysely
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('id, title')
        .limit(5)

      if (error) {
        steps.push(`8. Supabase query ERROR: ${error.message}`)
      } else {
        steps.push(`8. Supabase query OK, found ${data?.length || 0} events`)
      }
    } catch (supabaseError) {
      steps.push(`7. Supabase import FAILED: ${supabaseError.message}`)
    }

    // Testaa Anthropic import
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      steps.push('9. Anthropic SDK imported successfully')

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
      steps.push('10. Anthropic client created successfully')
    } catch (anthropicError) {
      steps.push(`9. Anthropic import/init FAILED: ${anthropicError.message}`)
      steps.push(`   Error stack: ${anthropicError.stack}`)
    }

    res.status(200).json({
      success: true,
      message: 'All checks passed!',
      steps,
      environment: process.env.VERCEL ? 'Vercel' : 'Local'
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      errorName: error.name,
      errorConstructor: error.constructor.name,
      stack: error.stack,
      steps,
      possibleCause:
        error.message.includes('pattern') ? 'Regex or validation error (check API keys format)' :
        error.message.includes('fetch') ? 'Network error (Supabase or Anthropic)' :
        'Unknown - check stack trace'
    })
  }
}
